import type {DrawingLayer,Stroke} from './drawing-story'
import {paintLayer,strokeLayer} from './sketchbook'
import {decodePhoto,preparePhotos} from './sketchbook-photo'
import {prepareStickers} from './sketchbook-stickers'
import type {Quad} from './sketchbook-transform'
export type TransformSession={original:Stroke[];ids:string[];item:Stroke;quad:Quad;layer:DrawingLayer}
export function transformedStrokes(session:TransformSession,quad:Quad,W:number,H:number){
  const index=Math.max(...session.original.flatMap((s,i)=>session.ids.includes(s.id)?[i]:[]))
  const item={...session.item,points:quad.map(p=>({x:p.x/W,y:p.y/H}))}
  return session.original.flatMap((s,i)=>i===index?[item]:session.ids.includes(s.id)?[]:[s])
}
export async function prepareTransform(original:Stroke[],ids:string[],W:number,H:number,layer:DrawingLayer):Promise<TransformSession>{
  const chosen=original.filter(s=>ids.includes(s.id)&&strokeLayer(s)===layer)
  if(!chosen.length)throw new Error('변형할 그림을 먼저 골라 주세요.')
  ids=chosen.map(s=>s.id)
  await Promise.all([preparePhotos(original),prepareStickers(original)])
  // 이미 사진인 개체는 다시 인코딩하지 않아 반복 변형에도 원본 화질을 유지한다.
  if(chosen.length===1&&chosen[0].photo)return {original,ids,item:chosen[0],quad:chosen[0].points.map(p=>({x:p.x*W,y:p.y*H})) as Quad,layer}
  const source=document.createElement('canvas');source.width=W;source.height=H;paintLayer(source,chosen,layer)
  const ctx=source.getContext('2d',{willReadFrequently:true})!,data=ctx.getImageData(0,0,W,H).data
  let left=W,top=H,right=-1,bottom=-1
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
  if(right<left)throw new Error('이 레이어에는 변형할 그림이 없어요.')
  const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;crop.getContext('2d')!.drawImage(source,left,top,crop.width,crop.height,0,0,crop.width,crop.height)
  const blob=await new Promise<Blob>((resolve,reject)=>crop.toBlob(b=>b?resolve(b):reject(new Error('그림을 준비하지 못했어요.')),'image/png'))
  const rest=original.filter(s=>!ids.includes(s.id))
  if(blob.size>2*1024*1024||rest.filter(s=>s.photo).length>=8||rest.reduce((n,s)=>n+(s.photo?.size??0),0)+blob.size>12*1024*1024)throw new Error('변형할 그림이 너무 커요. 조금 작은 부분을 골라 주세요.')
  await decodePhoto(blob)
  const quad:Quad=[{x:left,y:top},{x:right+1,y:top},{x:right+1,y:bottom+1},{x:left,y:bottom+1}]
  return {original,ids,quad,layer,item:{id:crypto.randomUUID(),color:'#000000',width:0,erase:false,layer,photo:blob,points:quad.map(p=>({x:p.x/W,y:p.y/H}))}}
}
