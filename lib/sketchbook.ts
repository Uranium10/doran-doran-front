import {photoImage,preparePhotos} from './sketchbook-photo'
import {DEFAULT_LAYERS,type LayerSettings} from './sketchbook-document'
import type {DrawingLayer,Point,Stroke} from './drawing-story'
import {pencilGrain} from './sketchbook-controls'
import {pushPixels} from './sketchbook-warp'
import {paintSticker} from './sketchbook-stickers'
export const SKETCH_WIDTH=900, SKETCH_HEIGHT=650
export const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n))
/** 레이어가 없던 기존 그림은 선이 가려지지 않도록 밑그림으로 해석한다. */
export const strokeLayer=(stroke:Stroke):DrawingLayer=>stroke.layer??'outline'
export const orderedStrokes=(strokes:Stroke[])=>[
  ...strokes.filter(stroke=>strokeLayer(stroke)==='color'),
  ...strokes.filter(stroke=>strokeLayer(stroke)==='outline'),
]
// 작은 색연필 타일만 최대 16색 캐시한다. 움직일 때마다 픽셀 노이즈를 만들지 않는다.
const pencilTiles=new Map<string,HTMLCanvasElement>()
const pencilPatterns=new WeakMap<CanvasRenderingContext2D,Map<string,CanvasPattern>>()
function pencilPattern(ctx:CanvasRenderingContext2D,color:string){
  let patterns=pencilPatterns.get(ctx);if(!patterns){patterns=new Map();pencilPatterns.set(ctx,patterns)}
  if(patterns.has(color))return patterns.get(color)!
  let tile=pencilTiles.get(color)
  if(!tile){tile=document.createElement('canvas');tile.width=tile.height=128;const c=tile.getContext('2d')!,data=c.createImageData(128,128);data.data.set(pencilGrain(color));c.putImageData(data,0,0);if(pencilTiles.size>=16)pencilTiles.delete(pencilTiles.keys().next().value!);pencilTiles.set(color,tile)}
  const pattern=ctx.createPattern(tile,'repeat')!;if(patterns.size>=16)patterns.delete(patterns.keys().next().value!);patterns.set(color,pattern);return pattern
}
export function insidePolygon(point:Point,polygon:Point[]){
  let inside=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j]
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside
  }
  return inside
}
export function selectionBounds(strokes:Stroke[],ids:string[]){
  const points=strokes.filter(s=>ids.includes(s.id)).flatMap(s=>s.fillRuns?.length ? [{x:s.points[0].x,y:s.points[0].y},{x:s.points[0].x+1,y:s.points[0].y+1}] : s.points)
  if(!points.length)return null
  let left=1,top=1,right=0,bottom=0
  for(const p of points){left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y)}
  return {left,top,right,bottom}
}
export function moveSelection(strokes:Stroke[],ids:string[],dx:number,dy:number){
  const b=selectionBounds(strokes,ids);if(!b)return strokes
  dx=clamp(dx,-b.left,1-b.right);dy=clamp(dy,-b.top,1-b.bottom)
  return strokes.map(s=>ids.includes(s.id)?{...s,points:s.points.map(p=>({x:p.x+dx,y:p.y+dy}))}:s)
}
export function resizeSelection(strokes:Stroke[],ids:string[],factor:number){
  const b=selectionBounds(strokes,ids);if(!b)return strokes
  const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2
  const f=Math.min(factor,...[b.right-cx,cx-b.left].filter(v=>v>0).map(v=>Math.min(cx,1-cx)/v),...[b.bottom-cy,cy-b.top].filter(v=>v>0).map(v=>Math.min(cy,1-cy)/v))
  return strokes.map(s=>ids.includes(s.id)&&!s.fillRuns?{...s,width:clamp(s.width*f,2,96),points:s.points.map(p=>({x:cx+(p.x-cx)*f,y:cy+(p.y-cy)*f}))}:s)
}
export type SelectionHandle='n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw'|'rotate'
/** 드래그 시작 시 원본에서 계산해 연속 변형의 반올림 오차가 쌓이지 않게 한다. */
export function transformSelection(strokes:Stroke[],ids:string[],handle:SelectionHandle,start:Point,end:Point,W=SKETCH_WIDTH,H=SKETCH_HEIGHT){
  const b=selectionBounds(strokes,ids);if(!b)return strokes
  const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2
  let sx=1,sy=1,ax=cx,ay=cy,angle=0
  if(handle==='rotate')angle=Math.atan2((end.y-cy)*H,(end.x-cx)*W)-Math.atan2((start.y-cy)*H,(start.x-cx)*W)
  else{
    if(handle.includes('e')){ax=b.left;sx=Math.max(.04,(clamp(end.x)-ax)/Math.max(.001,b.right-b.left))}
    if(handle.includes('w')){ax=b.right;sx=Math.max(.04,(ax-clamp(end.x))/Math.max(.001,b.right-b.left))}
    if(handle.includes('s')){ay=b.top;sy=Math.max(.04,(clamp(end.y)-ay)/Math.max(.001,b.bottom-b.top))}
    if(handle.includes('n')){ay=b.bottom;sy=Math.max(.04,(ay-clamp(end.y))/Math.max(.001,b.bottom-b.top))}
    // 네 모서리는 반대편 모서리를 기준으로 가로세로 비율을 보존한다.
    if(handle.length===2){const vx=(start.x-ax)*W,vy=(start.y-ay)*H,denominator=vx*vx+vy*vy;const uniform=denominator>0?Math.max(.04,(((end.x-ax)*W)*vx+((end.y-ay)*H)*vy)/denominator):1;sx=sy=uniform}
  }
  let next=strokes.map(s=>ids.includes(s.id)&&!s.fillRuns?{...s,width:clamp(s.width*Math.sqrt(sx*sy),2,96),points:s.points.map(p=>handle==='rotate'?{x:cx+((p.x-cx)*W*Math.cos(angle)-(p.y-cy)*H*Math.sin(angle))/W,y:cy+((p.x-cx)*W*Math.sin(angle)+(p.y-cy)*H*Math.cos(angle))/H}:{x:ax+(p.x-ax)*sx,y:ay+(p.y-ay)*sy})}:s)
  // 회전으로 종이 밖에 나갈 때는 모양을 찌그러뜨리지 않고 전체를 같은 비율로 맞춘다.
  const inkBounds=(list:Stroke[])=>{
    const chosen=list.filter(s=>ids.includes(s.id)),points=selectionBounds(list,ids)!,radius=Math.max(...chosen.map(s=>s.width/2),0)
    return {left:points.left-radius/W,right:points.right+radius/W,top:points.top-radius/H,bottom:points.bottom+radius/H}
  }
  const box=inkBounds(next),scale=Math.min(1,1/Math.max(.001,box.right-box.left),1/Math.max(.001,box.bottom-box.top))
  if(scale<1)next=next.map(s=>ids.includes(s.id)?{...s,width:s.width*scale,points:s.points.map(p=>({x:cx+(p.x-cx)*scale,y:cy+(p.y-cy)*scale}))}:s)
  const bounds=inkBounds(next),dx=bounds.left<0?-bounds.left:bounds.right>1?1-bounds.right:0,dy=bounds.top<0?-bounds.top:bounds.bottom>1?1-bounds.bottom:0
  return next.map(s=>ids.includes(s.id)?{...s,points:s.points.map(p=>({x:p.x+dx,y:p.y+dy}))}:s)
}
/** 고정 크기의 선 데이터로 화면 크기가 변해도 원본 좌표를 보존한다. */
export function paintStroke(ctx:CanvasRenderingContext2D,s:Stroke,W=SKETCH_WIDTH,H=SKETCH_HEIGHT){
  if(!s.points.length)return
  if(s.brush==='warp'){for(let i=1;i<s.points.length;i++)pushPixels(ctx,{x:s.points[i-1].x*W,y:s.points[i-1].y*H},{x:s.points[i].x*W,y:s.points[i].y*H},Math.max(12,s.width/2),s.opacity??1);return}
  ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.globalAlpha=s.opacity??1;ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round'
  if(s.photo){const image=photoImage(s.photo);if(image){const [a,b,,d]=s.points;ctx.transform((b.x-a.x)*W,(b.y-a.y)*H,(d.x-a.x)*W,(d.y-a.y)*H,a.x*W,a.y*H);ctx.drawImage(image,0,0,1,1)}}
  else if(s.sticker){const [a,b,,d]=s.points;ctx.transform((b.x-a.x)*W/100,(b.y-a.y)*H/100,(d.x-a.x)*W/100,(d.y-a.y)*H/100,a.x*W,a.y*H);paintSticker(ctx,s.sticker)}
  else if(s.fillRuns){
    ctx.translate(s.points[0].x*W,s.points[0].y*H)
    for(let i=0;i<s.fillRuns.length;i+=3)ctx.fillRect(s.fillRuns[i],s.fillRuns[i+1],s.fillRuns[i+2],1)
  }else if(s.brush==='air'){
    const radius=s.width/2
    for(let i=0;i<s.points.length;i++){
      const p=s.points[i],before=s.points[i-1]??p,dx=(p.x-before.x)*W,dy=(p.y-before.y)*H
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,radius*.35)))
      for(let j=1;j<=steps;j++){
        const x=before.x*W+dx*j/steps,y=before.y*H+dy*j/steps
        const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,s.color+'55');g.addColorStop(1,s.color+'00');ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,s.width,s.width)
      }
    }
  }else{
    ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(p.x*W,p.y*H):ctx.moveTo(p.x*W,p.y*H))
    if(s.brush==='pencil'){const grain=pencilPattern(ctx,s.color);ctx.strokeStyle=grain;ctx.fillStyle=grain;ctx.lineWidth=s.width}
    if(s.points.length===1){const p=s.points[0];ctx.arc(p.x*W,p.y*H,ctx.lineWidth/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()
    // 중앙은 조금 더 진하고 가장자리는 성기게 남긴다. 겹쳐 칠하면 종이 결 위에 색이 쌓인다.
    if(s.brush==='pencil'){
      ctx.globalAlpha=(s.opacity??1)*.32;ctx.lineWidth=s.width*.72
      if(s.points.length===1){ctx.beginPath();ctx.arc(s.points[0].x*W,s.points[0].y*H,ctx.lineWidth/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()
    }
  }
  ctx.restore()
}
const layerCanvases=new WeakMap<HTMLCanvasElement,{color:HTMLCanvasElement;outline:HTMLCanvasElement}>()
const layerHistory=new WeakMap<HTMLCanvasElement,{strokes:Stroke[];width:number;height:number}>()
export function paintLayer(canvas:HTMLCanvasElement,strokes:Stroke[],layer:DrawingLayer){
  const filtered=strokes.filter(s=>strokeLayer(s)===layer),previous=layerHistory.get(canvas),ctx=canvas.getContext('2d',{willReadFrequently:true})!
  const incremental=previous&&previous.width===canvas.width&&previous.height===canvas.height&&previous.strokes.length<=filtered.length&&previous.strokes.every((s,i)=>s===filtered[i])
  if(!incremental)ctx.clearRect(0,0,canvas.width,canvas.height)
  for(let i=incremental?previous.strokes.length:0;i<filtered.length;i++)paintStroke(ctx,filtered[i],canvas.width,canvas.height)
  layerHistory.set(canvas,{strokes:filtered,width:canvas.width,height:canvas.height})
}
function layerBuffers(canvas:HTMLCanvasElement){
  let buffers=layerCanvases.get(canvas)
  if(!buffers){buffers={color:document.createElement('canvas'),outline:document.createElement('canvas')};layerCanvases.set(canvas,buffers)}
  for(const buffer of [buffers.color,buffers.outline])if(buffer.width!==canvas.width||buffer.height!==canvas.height){buffer.width=canvas.width;buffer.height=canvas.height}
  return buffers
}
/** 유동화 시작/끝에서는 이미 그린 레이어를 복사해 긴 변형 기록을 재계산하지 않는다. */
export function copyLayer(canvas:HTMLCanvasElement,target:HTMLCanvasElement,strokes:Stroke[],layer:DrawingLayer){
  const source=layerBuffers(canvas)[layer];paintLayer(source,strokes,layer)
  const ctx=target.getContext('2d',{willReadFrequently:true})!;ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(source,0,0)
}
export function adoptLayer(canvas:HTMLCanvasElement,source:HTMLCanvasElement,strokes:Stroke[],layer:DrawingLayer){
  const target=layerBuffers(canvas)[layer],ctx=target.getContext('2d',{willReadFrequently:true})!;ctx.clearRect(0,0,target.width,target.height);ctx.drawImage(source,0,0)
  layerHistory.set(target,{strokes:strokes.filter(s=>strokeLayer(s)===layer),width:target.width,height:target.height})
}
/** 색칠을 먼저, 밑그림을 나중에 합성한다. 지우개도 선택한 레이어 안에서만 작동한다. */
export function compositeLayers(canvas:HTMLCanvasElement,color:HTMLCanvasElement,outline:HTMLCanvasElement,layers:LayerSettings=DEFAULT_LAYERS){
  const ctx=canvas.getContext('2d')!;ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height)
  for(const [layer,source] of [['color',color],['outline',outline]] as const){if(layers[layer].visible){ctx.globalAlpha=layers[layer].opacity;ctx.drawImage(source,0,0)}}
  ctx.restore()
}
export function paintSketch(canvas:HTMLCanvasElement,strokes:Stroke[],layers:LayerSettings=DEFAULT_LAYERS){
  const buffers=layerBuffers(canvas)
  for(const layer of ['color','outline'] as const)paintLayer(buffers[layer],strokes,layer)
  compositeLayers(canvas,buffers.color,buffers.outline,layers)
}
/** 비재귀 flood fill: 방문 배열과 정수 큐로 한 픽셀을 한 번만 처리한다. */
export function floodRuns(data:Uint8ClampedArray,width:number,height:number,x:number,y:number,tolerance=28):number[]{
  x=Math.floor(clamp(x,0,width-1));y=Math.floor(clamp(y,0,height-1));const seed=(y*width+x)*4,target=data.slice(seed,seed+4)
  const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0
  const matches=(p:number)=>{const k=p*4;return Math.abs(data[k]-target[0])<=tolerance&&Math.abs(data[k+1]-target[1])<=tolerance&&Math.abs(data[k+2]-target[2])<=tolerance&&Math.abs(data[k+3]-target[3])<=tolerance}
  const add=(p:number)=>{if(!seen[p]){seen[p]=1;if(matches(p)){seen[p]=2;queue[tail++]=p}}}
  add(y*width+x)
  while(head<tail){const p=queue[head++],px=p%width;if(px>0)add(p-1);if(px<width-1)add(p+1);if(p>=width)add(p-width);if(p<width*(height-1))add(p+width)}
  const runs:number[]=[]
  for(let row=0;row<height;row++){let start=-1;for(let col=0;col<=width;col++){if(col<width&&seen[row*width+col]===2){if(start<0)start=col}else if(start>=0){runs.push(start,row,col-start);start=-1}}}
  return runs
}
export async function sketchBlob(strokes:Stroke[],background='#fffaf0',W=SKETCH_WIDTH,H=SKETCH_HEIGHT,layers:LayerSettings=DEFAULT_LAYERS):Promise<Blob>{
  await preparePhotos(strokes)
  const ink=document.createElement('canvas');ink.width=W;ink.height=H;paintSketch(ink,strokes,layers)
  const flat=document.createElement('canvas');flat.width=W;flat.height=H;const ctx=flat.getContext('2d')!;ctx.fillStyle=background;ctx.fillRect(0,0,flat.width,flat.height);ctx.drawImage(ink,0,0)
  return new Promise((resolve,reject)=>flat.toBlob(b=>b?resolve(b):reject(new Error('그림을 준비하지 못했어요.')),'image/jpeg',.92))
}
