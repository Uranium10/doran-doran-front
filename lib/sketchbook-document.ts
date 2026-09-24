import type {DrawingLayer,Stroke} from './drawing-story'

export type LayerSettings=Record<DrawingLayer,{visible:boolean;opacity:number}>
export const DEFAULT_LAYERS:LayerSettings={outline:{visible:true,opacity:1},color:{visible:true,opacity:1}}
export type SketchDocument={strokes:Stroke[];background:string;width:number;height:number;layers:LayerSettings;activeLayer:DrawingLayer}
export const UNDO_LIMIT=50
export const AUTO_SAVE_MS=120000
export const SLOT_IDS=['manual-1','manual-2','auto'] as const
export type SketchSlotId=typeof SLOT_IDS[number]
export type SketchSlot={version:1;savedAt:number;document:SketchDocument}

// 로컬 자료도 손상될 수 있다. 잘못된 좌표/거대한 배열을 렌더러에 넘기지 않는다.
export function validSketchDocument(value:unknown):value is SketchDocument{
  if(!value||typeof value!=='object')return false
  const d=value as SketchDocument,hex=(v:unknown)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)
  if(d.width!==900||![650,1300].includes(d.height)||!hex(d.background)||!['outline','color'].includes(d.activeLayer))return false
  if(!d.layers||!['outline','color'].every(key=>{const l=d.layers[key as DrawingLayer];return l&&typeof l.visible==='boolean'&&Number.isFinite(l.opacity)&&l.opacity>=0&&l.opacity<=1}))return false
  if(!Array.isArray(d.strokes)||d.strokes.length>500)return false
  let points=0
  return d.strokes.every(s=>{
    if(!s||typeof s.id!=='string'||s.id.length>100||!hex(s.color)||!Number.isFinite(s.width)||s.width<0||s.width>300||typeof s.erase!=='boolean')return false
    if(s.layer!==undefined&&!['outline','color'].includes(s.layer))return false
    if(s.brush!==undefined&&!['pen','pencil','air','warp'].includes(s.brush))return false
    if(s.opacity!==undefined&&(!Number.isFinite(s.opacity)||s.opacity<0||s.opacity>1))return false
    if(!Array.isArray(s.points)||!s.points.length||s.points.length>12001)return false
    if(!s.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=100&&Math.abs(p.y)<=100))return false
    if(s.sticker!==undefined&&!['ribbon','sun','moon','star','heart','flower','cloud','leaf'].includes(s.sticker))return false
    if(s.sticker&&s.points.length!==4)return false
    if(s.fillRuns!==undefined){
      if(!Array.isArray(s.fillRuns)||s.fillRuns.length%3!==0)return false
      for(let i=0;i<s.fillRuns.length;i+=3){const [x,y,n]=s.fillRuns.slice(i,i+3);if(![x,y,n].every(Number.isInteger)||x<0||y<0||n<1||x+n>d.width||y>=d.height)return false}
    }
    points+=s.points.length+(s.fillRuns?.length??0)
    return points<=520000
  })
}

function database(){return new Promise<IDBDatabase>((resolve,reject)=>{
  let blocked=false
  const request=indexedDB.open('doran-sketch-slots',1)
  request.onupgradeneeded=()=>request.result.createObjectStore('slots')
  request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result)}
  request.onerror=()=>reject(request.error)
  request.onblocked=()=>{blocked=true;reject(new Error('다른 창을 닫고 다시 시도해 주세요.'))}
})}
function slotKey(scope:string,id:SketchSlotId){if(!scope||!SLOT_IDS.includes(id))throw new Error('저장 칸을 확인해 주세요.');return JSON.stringify([scope,id])}
export async function readSketchSlots(scope:string):Promise<Partial<Record<SketchSlotId,SketchSlot>>>{
  const db=await database()
  try{return await new Promise((resolve,reject)=>{
    const result:Partial<Record<SketchSlotId,SketchSlot>>={},tx=db.transaction('slots','readonly')
    for(const id of SLOT_IDS){const r=tx.objectStore('slots').get(slotKey(scope,id));r.onsuccess=()=>{const slot=r.result;if(slot?.version===1&&Number.isFinite(slot.savedAt)&&validSketchDocument(slot.document))result[id]=slot}}
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)
  })}finally{db.close()}
}
export async function writeSketchSlot(scope:string,id:SketchSlotId,document:SketchDocument):Promise<SketchSlot>{
  if(!validSketchDocument(document))throw new Error('그림 자료를 확인하지 못했어요. 저장을 다시 시도해 주세요.')
  const key=slotKey(scope,id),db=await database(),slot:SketchSlot={version:1,savedAt:Date.now(),document}
  try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('slots','readwrite');tx.objectStore('slots').put(slot,key)
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)
  });return slot}finally{db.close()}
}
