import type {Point,Stroke} from './drawing-story'
export const SKETCH_WIDTH=900, SKETCH_HEIGHT=650
export const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n))
export function insidePolygon(point:Point,polygon:Point[]){
  let inside=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j]
    if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside
  }
  return inside
}
export function selectionBounds(strokes:Stroke[],ids:string[]){
  const points=strokes.filter(s=>ids.includes(s.id)).flatMap(s=>s.points)
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
  return strokes.map(s=>ids.includes(s.id)?{...s,width:clamp(s.width*f,2,48),points:s.points.map(p=>({x:cx+(p.x-cx)*f,y:cy+(p.y-cy)*f}))}:s)
}
export function paintStroke(ctx:CanvasRenderingContext2D,s:Stroke){
  if(!s.points.length)return
  ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath()
  s.points.forEach((p,i)=>i?ctx.lineTo(p.x*SKETCH_WIDTH,p.y*SKETCH_HEIGHT):ctx.moveTo(p.x*SKETCH_WIDTH,p.y*SKETCH_HEIGHT))
  if(s.points.length===1){const p=s.points[0];ctx.arc(p.x*SKETCH_WIDTH,p.y*SKETCH_HEIGHT,s.width/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()
  ctx.restore()
}
export function paintSketch(canvas:HTMLCanvasElement,strokes:Stroke[]){const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,canvas.width,canvas.height);for(const s of strokes)paintStroke(ctx,s)}
export async function sketchBlob(strokes:Stroke[]):Promise<Blob>{
  const ink=document.createElement('canvas');ink.width=SKETCH_WIDTH;ink.height=SKETCH_HEIGHT;paintSketch(ink,strokes)
  const flat=document.createElement('canvas');flat.width=SKETCH_WIDTH;flat.height=SKETCH_HEIGHT;const ctx=flat.getContext('2d')!;ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,flat.width,flat.height);ctx.drawImage(ink,0,0)
  return new Promise((resolve,reject)=>flat.toBlob(b=>b?resolve(b):reject(new Error('그림을 준비하지 못했어요.')),'image/jpeg',.92))
}
