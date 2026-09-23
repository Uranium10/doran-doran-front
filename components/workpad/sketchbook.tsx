"use client"
import {useEffect,useRef,useState} from 'react'
import {Pencil,Eraser,LassoSelect,Undo2,Trash2,Minus,Plus,Move} from 'lucide-react'
import type {Point,Stroke} from '@/lib/drawing-story'
import {SKETCH_WIDTH,SKETCH_HEIGHT,clamp,insidePolygon,moveSelection,resizeSelection,selectionBounds,paintSketch,paintStroke} from '@/lib/sketchbook'
import styles from './drawing-story.module.css'
const COLORS=['#303d43','#b84839','#e5a339','#527a53','#467ba1','#8961a1','#d87a96']
export function Sketchbook({value,onChange,disabled=false}:{value:Stroke[];onChange:(v:Stroke[])=>void;disabled?:boolean}){
  const canvas=useRef<HTMLCanvasElement>(null),overlay=useRef<HTMLCanvasElement>(null),base=useRef<HTMLCanvasElement|null>(null),raf=useRef(0),active=useRef<{id:number;start:Point;points:Point[];stroke?:Stroke;moving:boolean}|null>(null)
  const [tool,setTool]=useState<'draw'|'erase'|'lasso'>('draw'),[color,setColor]=useState(COLORS[0]),[width,setWidth]=useState(7),[selected,setSelected]=useState<string[]>([]),[history,setHistory]=useState<Stroke[][]>([]),[clear,setClear]=useState(false),[notice,setNotice]=useState('')
  const latest=useRef(value);latest.current=value
  const commit=(next:Stroke[])=>{setHistory(h=>[...h.slice(-29),latest.current]);onChange(next)}
  useEffect(()=>{if(canvas.current)paintSketch(canvas.current,value)},[value])
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[])
  const point=(event:React.PointerEvent<HTMLCanvasElement>):Point=>{const box=event.currentTarget.getBoundingClientRect();return {x:clamp((event.clientX-box.left)/box.width),y:clamp((event.clientY-box.top)/box.height)}}
  const drawOverlay=()=>{const ctx=overlay.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,SKETCH_WIDTH,SKETCH_HEIGHT);const a=active.current;if(!a)return
    if(a.stroke){if(a.stroke.erase){const ink=canvas.current?.getContext('2d');if(ink&&base.current){ink.clearRect(0,0,SKETCH_WIDTH,SKETCH_HEIGHT);ink.drawImage(base.current,0,0);paintStroke(ink,a.stroke)}}else paintStroke(ctx,a.stroke)}
    else if(a.moving){const last=a.points.at(-1)!;if(canvas.current)paintSketch(canvas.current,moveSelection(latest.current,selected,last.x-a.start.x,last.y-a.start.y))}
    else {ctx.strokeStyle='#ba7442';ctx.lineWidth=3;ctx.setLineDash([10,7]);ctx.beginPath();a.points.forEach((p,i)=>i?ctx.lineTo(p.x*900,p.y*650):ctx.moveTo(p.x*900,p.y*650));ctx.closePath();ctx.stroke();ctx.setLineDash([])}
  }
  const queuePaint=()=>{cancelAnimationFrame(raf.current);raf.current=requestAnimationFrame(drawOverlay)}
  const down=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    if(disabled||active.current||e.button!==0)return
    if(tool!=='lasso'&&(value.length>=500||value.reduce((sum,s)=>sum+s.points.length,0)>100000)){setNotice('종이가 꽉 찼어요. 몇 번 되돌리거나 새로 그려 주세요.');return}
    const p=point(e),b=selectionBounds(value,selected)
    if(!base.current){base.current=document.createElement('canvas');base.current.width=SKETCH_WIDTH;base.current.height=SKETCH_HEIGHT}
    const cached=base.current.getContext('2d')!;cached.clearRect(0,0,SKETCH_WIDTH,SKETCH_HEIGHT);if(canvas.current)cached.drawImage(canvas.current,0,0)
    const moving=tool==='lasso'&&Boolean(b&&p.x>=b.left-.025&&p.x<=b.right+.025&&p.y>=b.top-.025&&p.y<=b.bottom+.025)
    active.current={id:e.pointerId,start:p,points:[p],moving,stroke:tool!=='lasso'?{id:crypto.randomUUID(),color,width:tool==='erase'?width*3:width,erase:tool==='erase',points:[p]}:undefined}
    e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();queuePaint()
  }
  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const a=active.current;if(!a||a.id!==e.pointerId)return;e.preventDefault()
    const box=e.currentTarget.getBoundingClientRect();const events=e.nativeEvent.getCoalescedEvents?.()??[e.nativeEvent]
    for(const event of events){const p={x:clamp((event.clientX-box.left)/box.width),y:clamp((event.clientY-box.top)/box.height)};const last=a.points.at(-1)!;if(Math.hypot(p.x-last.x,p.y-last.y)<.0015||a.points.length>=5000)continue;a.points.push(p);if(a.stroke)a.stroke.points=a.points}
    queuePaint()
  }
  const finish=(e:React.PointerEvent<HTMLCanvasElement>,cancel=false)=>{
    const a=active.current;if(!a||a.id!==e.pointerId)return;active.current=null;cancelAnimationFrame(raf.current)
    overlay.current?.getContext('2d')?.clearRect(0,0,SKETCH_WIDTH,SKETCH_HEIGHT)
    if(cancel){if(canvas.current)paintSketch(canvas.current,value);return}
    if(a.stroke){commit([...value,a.stroke]);setSelected([])}
    else if(a.moving){const last=a.points.at(-1)!;commit(moveSelection(value,selected,last.x-a.start.x,last.y-a.start.y))}
    else setSelected(a.points.length>=3?value.filter(s=>s.points.some(p=>insidePolygon(p,a.points))).map(s=>s.id):[])
  }
  const undo=()=>{if(!history.length)return;onChange(history.at(-1)!);setHistory(h=>h.slice(0,-1));setSelected([])}
  const b=selectionBounds(value,selected)
  return <div className={styles.sketch} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo()}}}>
    <div className={styles.tools} role="toolbar" aria-label="그리기 도구">
      {([{id:'draw',label:'그리기',Icon:Pencil},{id:'erase',label:'지우개',Icon:Eraser},{id:'lasso',label:'올가미',Icon:LassoSelect}] as const).map(({id,label,Icon})=><button type="button" disabled={disabled} key={id} aria-pressed={tool===id} onClick={()=>{setTool(id);setSelected([])}}><Icon size={21}/><span>{label}</span></button>)}
      <button type="button" onClick={undo} disabled={disabled||!history.length} aria-label="실행 취소"><Undo2 size={21}/></button>
      <button type="button" onClick={()=>setClear(true)} disabled={disabled||!value.length} aria-label="전부 지우기"><Trash2 size={21}/></button>
    </div>
    <div className={styles.palette}>{COLORS.map((c,i)=><button type="button" key={c} aria-label={['검정','빨강','노랑','초록','파랑','보라','분홍'][i]} aria-pressed={color===c} disabled={disabled} style={{background:c}} onClick={()=>{setColor(c);setTool('draw')}}/>)}<label>굵기<input aria-label="붓 굵기" type="range" min={3} max={16} value={width} disabled={disabled} onChange={e=>setWidth(+e.target.value)}/></label></div>
    <div className={styles.canvasWrap}>
      <canvas width={SKETCH_WIDTH} height={SKETCH_HEIGHT} ref={canvas} aria-hidden/>
      <canvas width={SKETCH_WIDTH} height={SKETCH_HEIGHT} ref={overlay} className={styles.inkLayer} aria-label="여기에 자유롭게 그려 주세요" tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}/>
      {b&&<div className={styles.selection} style={{left:`${b.left*100}%`,top:`${b.top*100}%`,width:`${(b.right-b.left)*100}%`,height:`${(b.bottom-b.top)*100}%`}}/>}
    </div>
    {tool==='lasso'&&<div className={styles.lassoHelp}><Move size={16}/>{selected.length?'고른 그림을 끌어서 옮겨요':'선을 둘러서 그림을 골라요'}{selected.length>0&&<>
      <button type="button" disabled={disabled} aria-label="선택한 그림 작게" onClick={()=>commit(resizeSelection(value,selected,.85))}><Minus size={20}/></button>
      <button type="button" disabled={disabled} aria-label="선택한 그림 크게" onClick={()=>commit(resizeSelection(value,selected,1.15))}><Plus size={20}/></button>
      <button type="button" disabled={disabled} aria-label="선택한 그림 삭제" onClick={()=>{commit(value.filter(s=>!selected.includes(s.id)));setSelected([])}}><Trash2 size={20}/></button></>}</div>}
    {notice&&<p role="status">{notice}</p>}
    {clear&&<ConfirmDialog title="그림을 모두 지울까요?" description="지운 뒤에도 실행 취소로 되돌릴 수 있어요." confirm="모두 지우기" onCancel={()=>setClear(false)} onConfirm={()=>{commit([]);setSelected([]);setClear(false)}}/>}
  </div>
}
export function ConfirmDialog({title,description,confirm,onConfirm,onCancel}:{title:string;description:string;confirm:string;onConfirm:()=>void;onCancel:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[])
  return <dialog ref={dialog} className={styles.dialog} onCancel={e=>{e.preventDefault();onCancel()}} aria-labelledby="drawing-dialog-title"><h3 id="drawing-dialog-title">{title}</h3><p>{description}</p><div><button type="button" autoFocus onClick={onCancel}>아니요</button><button type="button" onClick={onConfirm}>{confirm}</button></div></dialog>
}
