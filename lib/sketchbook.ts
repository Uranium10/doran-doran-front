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
/** 고정 크기의 선 데이터로 화면 크기가 변해도 원본 좌표를 보존한다. */
export function paintStroke(ctx:CanvasRenderingContext2D,s:Stroke,W=SKETCH_WIDTH,H=SKETCH_HEIGHT){
  if(!s.points.length)return
  ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.globalAlpha=s.opacity??1;ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round'
  if(s.fillRuns){
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
    if(s.brush==='pencil'){ctx.globalAlpha*=.68;ctx.lineWidth=s.width*.75}
    if(s.points.length===1){const p=s.points[0];ctx.arc(p.x*W,p.y*H,ctx.lineWidth/2,0,Math.PI*2);ctx.fill()}else ctx.stroke()
    // 같은 선을 다시 그릴 때도 무늬가 바뀌지 않는 작은 종이결.
    if(s.brush==='pencil'){
      ctx.globalAlpha=(s.opacity??1)*.2;ctx.lineWidth=Math.max(1,s.width*.18);ctx.setLineDash([1,3]);ctx.stroke()
    }
  }
  ctx.restore()
}
export function paintSketch(canvas:HTMLCanvasElement,strokes:Stroke[]){const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,canvas.width,canvas.height);for(const s of strokes)paintStroke(ctx,s,canvas.width,canvas.height)}
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
export async function sketchBlob(strokes:Stroke[],background='#fffaf0',W=SKETCH_WIDTH,H=SKETCH_HEIGHT):Promise<Blob>{
  const ink=document.createElement('canvas');ink.width=W;ink.height=H;paintSketch(ink,strokes)
  const flat=document.createElement('canvas');flat.width=W;flat.height=H;const ctx=flat.getContext('2d')!;ctx.fillStyle=background;ctx.fillRect(0,0,flat.width,flat.height);ctx.drawImage(ink,0,0)
  return new Promise((resolve,reject)=>flat.toBlob(b=>b?resolve(b):reject(new Error('그림을 준비하지 못했어요.')),'image/jpeg',.92))
}
