"use client"
import {useEffect,useRef,useState,type PointerEvent} from 'react'
import {PenTool,Pencil,Eraser,LassoSelect,Undo2,Redo2,Trash2,Minus,Plus,Move,PaintBucket,Wind,ArrowLeftRight} from 'lucide-react'
import type {Point,Stroke} from '@/lib/drawing-story'
import {SKETCH_WIDTH,SKETCH_HEIGHT,clamp,insidePolygon,moveSelection,resizeSelection,selectionBounds,paintSketch,paintStroke} from '@/lib/sketchbook'
import styles from './sketchbook.module.css'
const COLORS=['#303d43','#b84839','#edaa35','#527a53','#467ba1','#8961a1','#d87a96','#ffffff']
type Tool='pen'|'pencil'|'air'|'erase'|'fill'|'lasso'
const TOOLS=[{id:'pen',label:'펜',Icon:PenTool},{id:'pencil',label:'색연필',Icon:Pencil},{id:'air',label:'에어브러시',Icon:Wind},{id:'erase',label:'지우개',Icon:Eraser},{id:'fill',label:'채우기',Icon:PaintBucket},{id:'lasso',label:'선택',Icon:LassoSelect}] as const
export function Sketchbook({value,onChange,background='#fffaf0',onBackgroundChange,onBusyChange,disabled=false,width:paperWidth=SKETCH_WIDTH,height:paperHeight=SKETCH_HEIGHT}:{value:Stroke[];onChange:(v:Stroke[])=>void;background?:string;onBackgroundChange?:(color:string)=>void;onBusyChange?:(busy:boolean)=>void;disabled?:boolean;width?:number;height?:number}){
  const W=paperWidth,H=paperHeight
  const canvas=useRef<HTMLCanvasElement>(null),overlay=useRef<HTMLCanvasElement>(null),base=useRef<HTMLCanvasElement|null>(null),raf=useRef(0)
  const active=useRef<{id:number;start:Point;points:Point[];stroke?:Stroke;moving:boolean}|null>(null)
  const [tool,setTool]=useState<Tool>('pen'),[color,setColor]=useState(COLORS[0]),[width,setWidth]=useState(8),[eraseWidth,setEraseWidth]=useState(32),[opacity,setOpacity]=useState(1),[selected,setSelected]=useState<string[]>([])
  const [history,setHistory]=useState<Stroke[][]>([]),[future,setFuture]=useState<Stroke[][]>([]),[clear,setClear]=useState(false),[notice,setNotice]=useState(''),[picker,setPicker]=useState(false)
  const fillWorker=useRef<Worker|null>(null),[filling,setFilling]=useState(false)
  const blocked=disabled||filling
  const latest=useRef(value);latest.current=value
  const commit=(next:Stroke[])=>{setHistory(h=>[...h.slice(-29),latest.current]);setFuture([]);latest.current=next;onChange(next)}
  useEffect(()=>{if(canvas.current)paintSketch(canvas.current,value)},[value])
  useEffect(()=>()=>{cancelAnimationFrame(raf.current);fillWorker.current?.terminate();onBusyChange?.(false)},[onBusyChange])
  const point=(e:PointerEvent<HTMLCanvasElement>):Point=>{const b=e.currentTarget.getBoundingClientRect();return{x:clamp((e.clientX-b.left)/b.width),y:clamp((e.clientY-b.top)/b.height)}}
  const drawOverlay=()=>{
    const ctx=overlay.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);const a=active.current;if(!a)return
    if(a.stroke){if(a.stroke.erase){const ink=canvas.current?.getContext('2d');if(ink&&base.current){ink.clearRect(0,0,W,H);ink.drawImage(base.current,0,0);paintStroke(ink,a.stroke,W,H)}}else paintStroke(ctx,a.stroke,W,H)}
    else if(a.moving){const last=a.points.at(-1)!;if(canvas.current)paintSketch(canvas.current,moveSelection(latest.current,selected,last.x-a.start.x,last.y-a.start.y))}
    else{ctx.strokeStyle='#ba7442';ctx.lineWidth=3;ctx.setLineDash([10,7]);ctx.beginPath();a.points.forEach((p,i)=>i?ctx.lineTo(p.x*W,p.y*H):ctx.moveTo(p.x*W,p.y*H));ctx.closePath();ctx.stroke();ctx.setLineDash([])}
  }
  // 포인터 이벤트에서는 ref만 바꾸고, 디스플레이 한 프레임당 한 번만 그린다.
  const queuePaint=()=>{if(!raf.current)raf.current=requestAnimationFrame(()=>{raf.current=0;drawOverlay()})}
  const down=(e:PointerEvent<HTMLCanvasElement>)=>{
    if(blocked||active.current||e.button!==0)return
    if(tool!=='lasso'&&(value.length>=500||value.reduce((n,s)=>n+s.points.length+(s.fillRuns?.length??0),0)>500000)){setNotice('종이가 꽉 찼어요. 그림을 저장하거나 조금 되돌려 주세요.');return}
    const p=point(e);e.preventDefault();setNotice('')
    if(tool==='fill'){
      const flat=document.createElement('canvas');flat.width=W;flat.height=H;const ctx=flat.getContext('2d',{willReadFrequently:true})!;ctx.fillStyle=background;ctx.fillRect(0,0,W,H);ctx.drawImage(canvas.current!,0,0)
      // 큰 영역의 픽셀 탐색은 작업 스레드로 넘겨 터치/애니메이션을 멈추지 않는다.
      const data=ctx.getImageData(0,0,W,H).data
      setFilling(true);onBusyChange?.(true)
      try{
        if(!fillWorker.current)fillWorker.current=new Worker(new URL('../../lib/sketchbook-fill.worker.ts',import.meta.url))
        const worker=fillWorker.current
        const release=()=>{setFilling(false);onBusyChange?.(false)}
        worker.onmessage=event=>{if(event.data.length>500000){setNotice('너무 복잡한 부분이에요. 조금 작은 영역을 채워 주세요.');release();return}commit([...value,{id:crypto.randomUUID(),color,width:1,erase:false,opacity,points:[{x:0,y:0}],fillRuns:Array.from(event.data as Int32Array)}]);release()}
        worker.onerror=()=>{setNotice('색을 채우지 못했어요. 다시 눌러 주세요.');worker.terminate();fillWorker.current=null;release()}
        worker.postMessage({data,width:W,height:H,x:p.x*W,y:p.y*H},[data.buffer])
      }catch{setNotice('이 브라우저에서는 채우기가 어려워요. 펜으로 칠해 주세요.');setFilling(false);onBusyChange?.(false)}
      return
    }
    const b=selectionBounds(value,selected)
    if(!base.current){base.current=document.createElement('canvas');base.current.width=W;base.current.height=H}
    const cached=base.current.getContext('2d')!;cached.clearRect(0,0,W,H);if(canvas.current)cached.drawImage(canvas.current,0,0)
    const moving=tool==='lasso'&&Boolean(b&&p.x>=b.left-.025&&p.x<=b.right+.025&&p.y>=b.top-.025&&p.y<=b.bottom+.025)
    active.current={id:e.pointerId,start:p,points:[p],moving,stroke:tool!=='lasso'?{id:crypto.randomUUID(),color,width:tool==='erase'?eraseWidth:width,erase:tool==='erase',brush:tool==='erase'?'pen':tool,opacity,points:[p]}:undefined}
    e.currentTarget.setPointerCapture(e.pointerId);queuePaint()
  }
  const move=(e:PointerEvent<HTMLCanvasElement>)=>{
    const a=active.current;if(!a||a.id!==e.pointerId)return;e.preventDefault()
    const box=e.currentTarget.getBoundingClientRect(),samples=e.nativeEvent.getCoalescedEvents?.()??[]
    for(const event of samples.length?samples:[e.nativeEvent]){
      const p={x:clamp((event.clientX-box.left)/box.width),y:clamp((event.clientY-box.top)/box.height)},last=a.points.at(-1)!
      if(Math.hypot((p.x-last.x)*W,(p.y-last.y)*H)<1)continue
      if(a.points.length<12000){a.points.push(p);if(a.stroke)a.stroke.points=a.points}
    }queuePaint()
  }
  const finish=(e:PointerEvent<HTMLCanvasElement>,cancel=false)=>{
    const a=active.current;if(!a||a.id!==e.pointerId)return
    // 빠른 선에서도 마지막 pointerup 좌표를 저장해 끝점 누락을 막는다.
    if(!cancel){const p=point(e);a.points.push(p);if(a.stroke)a.stroke.points=a.points}
    active.current=null;cancelAnimationFrame(raf.current);raf.current=0;overlay.current?.getContext('2d')?.clearRect(0,0,W,H)
    if(cancel){if(canvas.current)paintSketch(canvas.current,value);return}
    if(a.stroke)commit([...value,a.stroke])
    else if(a.moving){const last=a.points.at(-1)!;commit(moveSelection(value,selected,last.x-a.start.x,last.y-a.start.y))}
    else setSelected(a.points.length>=3?value.filter(s=>!s.fillRuns&&s.points.some(p=>insidePolygon(p,a.points))).map(s=>s.id):[])
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const undo=()=>{if(blocked||active.current||!history.length)return;setFuture(f=>[...f,value]);onChange(history.at(-1)!);setHistory(h=>h.slice(0,-1));setSelected([])}
  const redo=()=>{if(blocked||active.current||!future.length)return;setHistory(h=>[...h,value]);onChange(future.at(-1)!);setFuture(f=>f.slice(0,-1));setSelected([])}
  const b=selectionBounds(value,selected),size=tool==='erase'?eraseWidth:width
  return <div className={styles.studio} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!(e.target instanceof HTMLInputElement)){e.preventDefault();if(e.shiftKey)redo();else undo()}}}>
    <aside className={styles.rail} aria-label="그리기 도구">
      <button type="button" className={styles.swatches} aria-label="색 고르기" aria-expanded={picker} onClick={()=>setPicker(p=>!p)}><span style={{background}}/><b style={{background:color}}/></button>
      <button type="button" title="그림색과 종이색 바꾸기" aria-label="그림색과 종이색 바꾸기" disabled={blocked||!onBackgroundChange} onClick={()=>{onBackgroundChange?.(color);setColor(background)}}><ArrowLeftRight size={19}/></button>
      <div className={styles.palette}>{COLORS.map((c,i)=><button type="button" key={c} aria-label={['검정','빨강','노랑','초록','파랑','보라','분홍','흰색'][i]} aria-pressed={color===c} disabled={blocked} style={{background:c}} onClick={()=>{setColor(c);if(tool==='erase')setTool('pen')}}/>)}</div>
      <div className={styles.tools} role="toolbar" aria-label="붓 종류">{TOOLS.map(({id,label,Icon})=><button type="button" key={id} title={label} aria-label={label} aria-pressed={tool===id} disabled={blocked} onClick={()=>{setTool(id);setSelected([])}}><Icon size={22}/><span>{label}</span></button>)}</div>
      <label className={styles.slider}><span>{size}<small>px</small></span><input aria-label={tool==='erase'?'지우개 크기':'브러시 크기'} type="range" min={2} max={96} value={size} disabled={blocked} onChange={e=>tool==='erase'?setEraseWidth(+e.target.value):setWidth(+e.target.value)}/></label>
      <label className={styles.slider}><span>{Math.round(opacity*100)}<small>%</small></span><input aria-label="브러시 불투명도" type="range" min={10} max={100} value={opacity*100} disabled={blocked} onChange={e=>setOpacity(+e.target.value/100)}/></label>
    </aside>
    <div className={styles.stage}>
      <div className={styles.history}><button type="button" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소" disabled={blocked||!history.length} onClick={undo}><Undo2 size={22}/></button><button type="button" title="다시 실행" aria-label="다시 실행" disabled={blocked||!future.length} onClick={redo}><Redo2 size={22}/></button><span>{TOOLS.find(t=>t.id===tool)?.label}</span><button type="button" title="전부 지우기" aria-label="전부 지우기" disabled={blocked||!value.length} onClick={()=>setClear(true)}><Trash2 size={20}/></button></div>
      <div className={styles.canvasSlot}><div className={styles.canvasWrap} style={{background,width:`min(100cqw,calc(100cqh * ${W} / ${H}))`,aspectRatio:`${W}/${H}`}}>
        <canvas width={W} height={H} ref={canvas} aria-hidden/>
        <canvas width={W} height={H} ref={overlay} className={styles.ink} aria-label="여기에 자유롭게 그려 주세요" tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}/>
        {b&&<div className={styles.selection} style={{left:`${b.left*100}%`,top:`${b.top*100}%`,width:`${(b.right-b.left)*100}%`,height:`${(b.bottom-b.top)*100}%`}}/>}
      </div></div>
      <div className={styles.status} role="status">{filling?'색을 채우고 있어요…':notice|| (tool==='lasso'?'선을 둘러서 고른 뒤, 끌어서 옮겨요':'마음 가는 대로 그려 보세요.')}{tool==='lasso'&&selected.length>0&&<div><Move size={16}/><button type="button" disabled={blocked} aria-label="선택한 그림 작게" onClick={()=>commit(resizeSelection(value,selected,.85))}><Minus size={20}/></button><button type="button" disabled={blocked} aria-label="선택한 그림 크게" onClick={()=>commit(resizeSelection(value,selected,1.15))}><Plus size={20}/></button><button type="button" disabled={blocked} aria-label="선택한 그림 삭제" onClick={()=>{commit(value.filter(s=>!selected.includes(s.id)));setSelected([])}}><Trash2 size={20}/></button></div>}</div>
    </div>
    {picker&&<div className={styles.colorPopup}><ColorPicker value={color} onChange={setColor}/><label>종이색<input aria-label="종이색" type="color" value={background} onChange={e=>onBackgroundChange?.(e.target.value)}/></label><button type="button" onClick={()=>setPicker(false)}>다 골랐어요</button></div>}
    {clear&&<ConfirmDialog title="그림을 모두 지울까요?" description="지운 뒤에도 실행 취소로 되돌릴 수 있어요." confirm="모두 지우기" onCancel={()=>setClear(false)} onConfirm={()=>{commit([]);setSelected([]);setClear(false)}}/>}
  </div>
}
function ColorPicker({value,onChange}:{value:string;onChange:(color:string)=>void}){
  const [hue,setHue]=useState(200),[sv,setSv]=useState({s:.7,v:.8})
  const update=(s:number,v:number,h=hue)=>{setSv({s,v});const f=(n:number)=>{const k=(n+h/60)%6;return Math.round(255*v*(1-s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0')};onChange('#'+f(5)+f(3)+f(1))}
  const pick=(e:PointerEvent<HTMLDivElement>)=>{if(e.type==='pointermove'&&!e.currentTarget.hasPointerCapture(e.pointerId))return;const b=e.currentTarget.getBoundingClientRect();update(clamp((e.clientX-b.left)/b.width),1-clamp((e.clientY-b.top)/b.height))}
  return <><div className={styles.sv} style={{backgroundColor:`hsl(${hue} 100% 50%)`}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pick(e)}} onPointerMove={pick} onPointerUp={e=>{pick(e);e.currentTarget.releasePointerCapture(e.pointerId)}} aria-hidden><i style={{left:`${sv.s*100}%`,top:`${(1-sv.v)*100}%`}}/></div><input className={styles.hue} aria-label="색상" type="range" min={0} max={360} value={hue} onChange={e=>{const h=+e.target.value;setHue(h);update(sv.s,sv.v,h)}}/><label>그림색<input type="color" aria-label="그림색" value={value} onChange={e=>onChange(e.target.value)}/></label></>
}
export function ConfirmDialog({title,description,confirm,onConfirm,onCancel}:{title:string;description:string;confirm:string;onConfirm:()=>void;onCancel:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const d=dialog.current;d?.showModal();return()=>d?.close()},[])
  return <dialog ref={dialog} className={styles.dialog} onCancel={e=>{e.preventDefault();onCancel()}} aria-labelledby="drawing-dialog-title"><h3 id="drawing-dialog-title">{title}</h3><p>{description}</p><div><button type="button" autoFocus onClick={onCancel}>계속 할래요</button><button type="button" onClick={onConfirm}>{confirm}</button></div></dialog>
}
