import type {Stroke} from './drawing-story'

const pictures=new WeakMap<Blob,HTMLImageElement>()
const pending=new WeakMap<Blob,Promise<HTMLImageElement>>()
export const photoImage=(blob:Blob)=>pictures.get(blob)
// 디코딩 결과는 Blob과 함께 수거된다. 실행 취소 기록마다 사진 픽셀을 복제하지 않는다.
export function decodePhoto(blob:Blob):Promise<HTMLImageElement>{
  const cached=pictures.get(blob);if(cached)return Promise.resolve(cached)
  const inFlight=pending.get(blob);if(inFlight)return inFlight
  const promise=new Promise<HTMLImageElement>((resolve,reject)=>{
    const url=URL.createObjectURL(blob),img=new Image()
    img.onload=()=>{URL.revokeObjectURL(url);pictures.set(blob,img);resolve(img)}
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('사진을 열지 못했어요. 다른 사진을 골라 주세요.'))}
    img.src=url
  }).finally(()=>pending.delete(blob))
  pending.set(blob,promise);return promise
}
export const photosReady=(strokes:Stroke[])=>strokes.every(s=>!s.photo||pictures.has(s.photo))
export const preparePhotos=async(strokes:Stroke[])=>{await Promise.all([...new Set(strokes.flatMap(s=>s.photo?[s.photo]:[]))].map(decodePhoto))}

export async function importPhoto(file:File,W:number,H:number):Promise<Stroke>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('20MB 이하의 JPG, PNG, WEBP 사진을 골라 주세요.')
  const image=await createImageBitmap(file)
  try{
    const ratio=Math.min(1,1280/Math.max(image.width,image.height)),canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio))
    canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height)
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('사진을 가져오지 못했어요.')),'image/webp',.88))
    if(blob.size>2*1024*1024)throw new Error('사진이 너무 복잡해요. 조금 작은 사진을 골라 주세요.')
    await decodePhoto(blob)
    const fit=Math.min(W*.7/canvas.width,H*.7/canvas.height),dx=canvas.width*fit/W/2,dy=canvas.height*fit/H/2
    // 별도 개체로 추가하여 기존 레이어의 선은 선택하거나 변형하지 않는다.
    return {id:crypto.randomUUID(),photo:blob,color:'#000000',width:0,erase:false,layer:'outline',points:[{x:.5-dx,y:.5-dy},{x:.5+dx,y:.5-dy},{x:.5+dx,y:.5+dy},{x:.5-dx,y:.5+dy}]}
  }finally{image.close()}
}
