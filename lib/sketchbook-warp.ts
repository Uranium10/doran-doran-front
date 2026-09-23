export type PixelPoint={x:number;y:number}
/** 작은 사각형만 역방향 샘플링한다. 투명 픽셀의 RGB가 검은 테두리가 되지 않도록 알파를 곱해 보간한다. */
export function warpRegion(source:Uint8ClampedArray,w:number,h:number,cx:number,cy:number,dx:number,dy:number,radius:number,strength:number){
  const out=new Uint8ClampedArray(source),r2=radius*radius
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const distance=((x-cx)**2+(y-cy)**2)/r2
    if(distance>=1)continue
    const weight=(1-distance)**3*strength
    const sx=Math.max(0,Math.min(w-1,x-dx*weight)),sy=Math.max(0,Math.min(h-1,y-dy*weight)),x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),fx=sx-x0,fy=sy-y0
    const a=(y0*w+x0)*4,b=(y0*w+x1)*4,c=(y1*w+x0)*4,d=(y1*w+x1)*4,wa=(1-fx)*(1-fy),wb=fx*(1-fy),wc=(1-fx)*fy,wd=fx*fy,k=(y*w+x)*4
    const alpha=source[a+3]*wa+source[b+3]*wb+source[c+3]*wc+source[d+3]*wd
    out[k+3]=alpha
    for(let channel=0;channel<3;channel++)out[k+channel]=alpha>0?(source[a+channel]*source[a+3]*wa+source[b+channel]*source[b+3]*wb+source[c+channel]*source[c+3]*wc+source[d+channel]*source[d+3]*wd)/alpha:0
  }
  return out
}
/** 빠른 손 움직임도 반경의 1/3 이하로 나눠 구멍이 생기지 않게 한다. 전체 캔버스는 읽지 않는다. */
export function pushPixels(ctx:CanvasRenderingContext2D,from:PixelPoint,to:PixelPoint,radius:number,strength:number){
  const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy)
  if(distance<.01||strength<=0)return
  const steps=Math.max(1,Math.ceil(distance/Math.max(2,radius/3)))
  for(let step=1;step<=steps;step++){
    const cx=from.x+dx*step/steps,cy=from.y+dy*step/steps,pad=Math.ceil(radius+2),left=Math.max(0,Math.floor(cx-pad)),top=Math.max(0,Math.floor(cy-pad)),right=Math.min(ctx.canvas.width,Math.ceil(cx+pad)),bottom=Math.min(ctx.canvas.height,Math.ceil(cy+pad)),w=right-left,h=bottom-top
    if(w<=0||h<=0)continue
    const image=ctx.getImageData(left,top,w,h)
    image.data.set(warpRegion(image.data,w,h,cx-left,cy-top,dx/steps,dy/steps,radius,strength))
    ctx.putImageData(image,left,top)
  }
}
