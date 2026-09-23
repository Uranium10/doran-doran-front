import { request, API_BASE_URL, LONG_TIMEOUT_MS } from './api'
import { getSupabaseBrowserClient } from './supabase/client'
export type Point={x:number;y:number}
export type Stroke={id:string;color:string;width:number;erase:boolean;points:Point[]}
export type DrawingAnalysis={observed_elements:string[];characters:{label:string;appearance:string;center:Point}[];child_meaning:string;transcript:string;suggested_name:string;desired_event:string;preserve_features:string[];creative_space:string[];questions:string[];visual_style:string}
export type DrawingInput={id:string;profile_id:string;status:string;description:string;analysis:DrawingAnalysis|null;confirmed:unknown;has_image:boolean;has_audio:boolean;created_at:string}
const base='/stories/drawing-inputs'
export const listDrawings=(profile:string)=>request<{inputs:DrawingInput[]}>(`${base}?profile_id=${encodeURIComponent(profile)}`)
export const getDrawing=(id:string)=>request<DrawingInput>(`${base}/${id}`)
export const uploadDrawing=(profile:string,blob:Blob)=>request<DrawingInput>(`${base}?profile_id=${encodeURIComponent(profile)}`,{method:'POST',headers:{'Content-Type':blob.type},body:blob})
export const uploadVoice=(id:string,blob:Blob)=>request<DrawingInput>(`${base}/${id}/voice`,{method:'PUT',headers:{'Content-Type':'audio/wav'},body:blob})
export const deleteVoice=(id:string)=>request<DrawingInput>(`${base}/${id}/voice`,{method:'DELETE'})
export const analyzeDrawing=(id:string,description:string)=>request<DrawingInput>(`${base}/${id}/analyze`,{method:'POST',body:JSON.stringify({description})},{timeoutMs:LONG_TIMEOUT_MS})
export const confirmDrawing=(id:string,value:unknown)=>request<DrawingInput>(`${base}/${id}/confirm`,{method:'POST',body:JSON.stringify(value)},{timeoutMs:LONG_TIMEOUT_MS})
export const deleteDrawing=(id:string)=>request(`${base}/${id}`,{method:'DELETE'})
export async function drawingImage(id:string):Promise<Blob>{
  const client=getSupabaseBrowserClient(); const session=client?await client.auth.getSession():null
  const response=await fetch(`${API_BASE_URL}${base}/${id}/image`,{headers:{Authorization:`Bearer ${session?.data.session?.access_token??''}`},signal:AbortSignal.timeout(30000),cache:'no-store'})
  if(!response.ok)throw new Error('그림을 불러오지 못했어요.')
  return response.blob()
}

// 서버의 메모리 상한을 지키기 위해 브라우저에서 먼저 축소한다. EXIF 등 원본 메타데이터는 복사하지 않는다.
export async function normalizePicture(file:Blob):Promise<Blob>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('20MB 이하의 JPG, PNG, WEBP 그림을 골라 주세요.')
  const bitmap=await createImageBitmap(file)
  try{
    const scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('그림을 열지 못했어요.')),'image/jpeg',.9))
  }finally{bitmap.close()}
}

// 브라우저별 녹음 컨테이너 차이는 여기서 해소한다. 서버에는 최대1분·16kHz·모노만 보낸다.
export async function recordingToWav(blob:Blob):Promise<Blob>{
  const context=new AudioContext()
  try{
    const source=await context.decodeAudioData(await blob.arrayBuffer())
    const frames=Math.min(60*16000,Math.ceil(source.duration*16000))
    if(frames<1600)throw new Error('조금 더 길게 이야기해 주세요.')
    const offline=new OfflineAudioContext(1,frames,16000);const node=offline.createBufferSource();node.buffer=source;node.connect(offline.destination);node.start()
    const samples=(await offline.startRendering()).getChannelData(0); const buffer=new ArrayBuffer(44+samples.length*2);const view=new DataView(buffer)
    const word=(offset:number,text:string)=>[...text].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)))
    word(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,samples.length*2,true)
    samples.forEach((v,i)=>view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,v))*(v<0?32768:32767)),true))
    return new Blob([buffer],{type:'audio/wav'})
  }finally{await context.close()}
}

export type DrawingDraft={tab:'upload'|'sketch';upload?:Blob;strokes:Stroke[];description:string;inputId?:string;version:number}
// 바이너리를 localStorage/base64에 넣지 않는다. 짧게 보관하고 생성 접수·직접 삭제 시 함께 비운다.
async function draftDb(){return new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('doran-drawing-drafts',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function loadDrawingDraft(key:string):Promise<DrawingDraft|null>{
  const db=await draftDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts');const cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(Date.now()-c.value.savedAt>=24*3600000)c.delete();c.continue()}};const r=store.get(key);let value:DrawingDraft|null=null;r.onsuccess=()=>{value=r.result&&Date.now()-r.result.savedAt<24*3600000?r.result.value:null};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
export async function saveDrawingDraft(key:string,value:DrawingDraft|null){
  const db=await draftDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts');if(value)store.put({value,savedAt:Date.now()},key);else store.delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}finally{db.close()}
}
