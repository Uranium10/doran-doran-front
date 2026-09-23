export type XY={x:number;y:number}
export type View={x:number;y:number;scale:number;rotation:number}
const limit=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n))
export const IDENTITY:View={x:0,y:0,scale:1,rotation:0}
const center=(a:XY,b:XY)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2})
const radians=(degrees:number)=>degrees*Math.PI/180
const normalize=(degrees:number)=>((degrees+180)%360+360)%360-180
const rotate=(p:XY,degrees:number)=>{const r=radians(degrees),c=Math.cos(r),s=Math.sin(r);return{x:p.x*c-p.y*s,y:p.x*s+p.y*c}}
/** 종이 중심 기준 화면 좌표를 역변환한다. 회전한 종이의 바깥 사각형을 좌표로 쓰면 붓 위치가 틀어진다. */
export function paperPoint(p:XY,view:View,width:number,height:number):XY{
  const local=rotate({x:p.x-view.x,y:p.y-view.y},-(view.rotation??0))
  return{x:.5+local.x/(width*view.scale),y:.5+local.y/(height*view.scale)}
}
/** 좌표는 작업 영역의 중심 기준. 두 손가락 사이의 종이 지점을 그대로 유지한다. */
export function pinchView(view:View,start:[XY,XY],next:[XY,XY],snapped=false):View{
  const a=center(...start),b=center(...next)
  const distance=Math.max(1,Math.hypot(start[0].x-start[1].x,start[0].y-start[1].y))
  const nextDistance=Math.hypot(next[0].x-next[1].x,next[0].y-next[1].y)
  const scale=limit(view.scale*nextDistance/distance,.5,6)
  const angle=(points:[XY,XY])=>Math.atan2(points[1].y-points[0].y,points[1].x-points[0].x)*180/Math.PI
  const raw=normalize((view.rotation??0)+(distance<2||nextDistance<2?0:normalize(angle(next)-angle(start))))
  // 들어올 때 4도, 벗어날 때 7도: 수평 근처의 작은 손떨림으로 스냅이 반복되지 않는다.
  const rotation=Math.abs(raw)<=(snapped?7:4)?0:raw
  const anchor=rotate({x:a.x-view.x,y:a.y-view.y},rotation-(view.rotation??0))
  return {scale,rotation,x:b.x-anchor.x*scale/view.scale,y:b.y-anchor.y*scale/view.scale}
}
/** 한 손가락이 먼저 떨어져도 남은 손가락을 새 붓질로 해석하지 않는다. */
export class TouchView {
  points=new Map<number,XY>(); locked=false
  private baseline:{view:View;points:[XY,XY]}|null=null
  private snapped=false
  down(id:number,p:XY,view:View){this.points.set(id,p);if(this.points.size>=2){this.locked=true;this.rebase(view)}return this.locked}
  move(id:number,p:XY){if(!this.points.has(id))return null;this.points.set(id,p);if(this.points.size<2||!this.baseline)return null;const next=pinchView(this.baseline.view,this.baseline.points,Array.from(this.points.values()).slice(0,2) as [XY,XY],this.snapped);this.snapped=next.rotation===0;return next}
  up(id:number,view:View){this.points.delete(id);const consumed=this.locked;if(this.points.size>=2)this.rebase(view);else this.baseline=null;if(!this.points.size)this.locked=false;return consumed}
  reset(){this.points.clear();this.baseline=null;this.locked=false;this.snapped=false}
  private rebase(view:View){this.snapped=(view.rotation??0)===0;this.baseline={view:{...view},points:Array.from(this.points.values()).slice(0,2) as [XY,XY]}}
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
    // 종이 결은 남기되 입자 사이가 지나치게 비어 보이지 않도록 심지 밀도를 높인다.
    data[k+3]=n<.035?0:Math.round(255*(.34+.66*n)*(.75+.25*grain))
  }
  return data
}
