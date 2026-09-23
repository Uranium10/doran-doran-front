export type XY={x:number;y:number}
export type View={x:number;y:number;scale:number}
const limit=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n))
export const IDENTITY:View={x:0,y:0,scale:1}
const center=(a:XY,b:XY)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
/** 좌표는 작업 영역의 중심 기준. 두 손가락 사이의 종이 지점을 그대로 유지한다. */
export function pinchView(view:View,start:[XY,XY],next:[XY,XY]):View{
  const a=center(...start),b=center(...next)
  const distance=Math.max(1,Math.hypot(start[0].x-start[1].x,start[0].y-start[1].y))
  const scale=limit(view.scale*Math.hypot(next[0].x-next[1].x,next[0].y-next[1].y)/distance,.5,6)
  return {scale,x:b.x-(a.x-view.x)*scale/view.scale,y:b.y-(a.y-view.y)*scale/view.scale}
}
/** 한 손가락이 먼저 떨어져도 남은 손가락을 새 붓질로 해석하지 않는다. */
export class TouchView {
  points=new Map<number,XY>(); locked=false
  private baseline:{view:View;points:[XY,XY]}|null=null
  down(id:number,p:XY,view:View){this.points.set(id,p);if(this.points.size>=2){this.locked=true;this.rebase(view)}return this.locked}
  move(id:number,p:XY){if(!this.points.has(id))return null;this.points.set(id,p);return this.points.size>=2&&this.baseline?pinchView(this.baseline.view,this.baseline.points,Array.from(this.points.values()).slice(0,2) as [XY,XY]):null}
  up(id:number,view:View){this.points.delete(id);const consumed=this.locked;if(this.points.size>=2)this.rebase(view);else this.baseline=null;if(!this.points.size)this.locked=false;return consumed}
  reset(){this.points.clear();this.baseline=null;this.locked=false}
  private rebase(view:View){this.baseline={view:{...view},points:Array.from(this.points.values()).slice(0,2) as [XY,XY]}}
}
export const draggedValue=(value:number,dy:number,min:number,max:number)=>Math.round(limit(value-dy*(max-min)/180,min,max))
export function hexToHsv(hex:string){
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),v=Math.max(r,g,b),d=v-Math.min(r,g,b)
  const h=!d?0:v===r?60*((g-b)/d%6):v===g?60*((b-r)/d+2):60*((r-g)/d+4)
  return {h:(h+360)%360,s:v?d/v:0,v}
}
export function hsvToHex(h:number,s:number,v:number){
  const f=(n:number)=>{const k=(n+h/60)%6;return Math.round(255*v*(1-s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0')}
  return '#'+f(5)+f(3)+f(1)
}
/** 고정 시드의 다중 크기 입자. 저장/실행 취소/미리보기에서 같은 종이 결을 재현한다. */
export function pencilGrain(color:string,size=128){
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),data=new Uint8ClampedArray(size*size*4)
  let seed=7331;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const coarse=Array.from({length:Math.ceil(size/4)**2},rand),stride=Math.ceil(size/4)
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const k=(y*size+x)*4,n=rand(),grain=coarse[Math.floor(y/4)*stride+Math.floor(x/4)]
    data[k]=rgb[0];data[k+1]=rgb[1];data[k+2]=rgb[2]
    data[k+3]=n<.13?0:Math.round(255*(.14+.68*n)*(.55+.45*grain))
  }
  return data
}
