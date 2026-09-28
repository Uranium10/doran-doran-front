import type {Point,Stroke} from './drawing-story'

export const INPUT_SETTINGS_KEY='doran-sketch-input-v1'
export type InputSettings={pressure:boolean;stabilize:boolean}
export const DEFAULT_INPUT_SETTINGS:InputSettings={pressure:true,stabilize:false}
const clamp=(n:number,min=0,max=1)=>Math.max(min,Math.min(max,n))

/** 고정 강도 보정: 작은 흔들림만 누르고 빠른 이동은 즉시 따라간다. 좌표는 종이 픽셀 기준이다. */
export function brushPoint(raw:Point,last:Point|undefined,W:number,H:number,stabilize:boolean,pressure?:number):Point{
  const distance=last?Math.hypot((raw.x-last.x)*W,(raw.y-last.y)*H):0
  const follow=last&&stabilize?Math.max(.18,1-Math.exp(-distance/3.5)):1
  const point:Point={x:last?last.x+(raw.x-last.x)*follow:raw.x,y:last?last.y+(raw.y-last.y)*follow:raw.y}
  if(pressure!==undefined){
    const p=clamp(Number.isFinite(pressure)?pressure:.5),previous=last?.pressure
    point.pressure=Math.round((previous===undefined?p:previous+(p-previous)*Math.min(.85,.4+distance/20))*1000)/1000
  }
  return point
}

/** 새로 받은 구간만 투명 잉크 면에 누적한다. 전체 불투명도/지우기는 합성 시 한 번만 적용한다. */
export function paintPressureInk(ctx:CanvasRenderingContext2D,s:Stroke,W:number,H:number,from=0,grain?:CanvasPattern){
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle=grain??s.color
  const radius=(p:Point)=>Math.max(.35,s.width/2*(s.brush==='pencil'?.85+.15*clamp(p.pressure??.5):.18+.82*clamp(p.pressure??.5)))
  const dot=(p:Point)=>{
    const x=p.x*W,y=p.y*H,r=radius(p)
    if(s.brush==='air'){
      ctx.globalAlpha=.25+.75*clamp(p.pressure??.5)
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,s.color+'55');g.addColorStop(1,s.color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)
    }else{
      ctx.globalAlpha=s.brush==='pencil'?.12+.88*clamp(p.pressure??.5):1
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()
    }
  }
  for(let i=from;i<s.points.length;i++){
    const b=s.points[i],a=s.points[i-1]
    if(!a){dot(b);continue}
    const dx=(b.x-a.x)*W,dy=(b.y-a.y)*H,d=Math.hypot(dx,dy)
    if(s.brush==='pencil'||s.brush==='air'){
      const count=Math.max(1,Math.ceil(d/Math.max(1,s.width*.15)))
      for(let j=1;j<=count;j++){const f=j/count;dot({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,pressure:(a.pressure??.5)+((b.pressure??.5)-(a.pressure??.5))*f})}
    }else{
      // 불투명한 원과 사다리꼴을 같은 면에 겹쳐 반투명 펜의 이음새가 진해지지 않게 한다.
      if(d>.001){const nx=-dy/d,ny=dx/d,ra=radius(a),rb=radius(b)
        ctx.beginPath();ctx.moveTo(a.x*W+nx*ra,a.y*H+ny*ra);ctx.lineTo(b.x*W+nx*rb,b.y*H+ny*rb);ctx.lineTo(b.x*W-nx*rb,b.y*H-ny*rb);ctx.lineTo(a.x*W-nx*ra,a.y*H-ny*ra);ctx.closePath();ctx.fill()
      }
      dot(b)
    }
  }
  ctx.restore()
}
