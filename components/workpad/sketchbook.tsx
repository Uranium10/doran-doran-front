"use client"
import {useEffect,useRef,useState,type PointerEvent,type CSSProperties} from 'react'
import {PenTool,Pencil,Eraser,LassoSelect,Undo2,Redo2,Trash2,PaintBucket,SprayCan,ArrowLeftRight,Pipette,Palette,RotateCcw} from 'lucide-react'
import type {Point,Stroke} from '@/lib/drawing-story'
import {SKETCH_WIDTH,SKETCH_HEIGHT,clamp,insidePolygon,moveSelection,selectionBounds,paintSketch,paintStroke,transformSelection,type SelectionHandle} from '@/lib/sketchbook'
import {IDENTITY,TouchView,type View} from '@/lib/sketchbook-controls'
import {BrushDial,ColorPanel} from './sketchbook-controls'
import styles from './sketchbook.module.css'
const COLORS=['#303d43','#b84839','#edaa35','#527a53','#467ba1','#8961a1','#d87a96','#ffffff']
type Tool='pen'|'pencil'|'air'|'erase'|'fill'|'lasso'|'pick'
const TOOLS=[{id:'pen',label:'펜',Icon:PenTool},{id:'pencil',label:'색연필',Icon:Pencil},{id:'air',label:'에어브러시',Icon:SprayCan},{id:'erase',label:'지우개',Icon:Eraser},{id:'fill',label:'채우기',Icon:PaintBucket},{id:'lasso',label:'선택',Icon:LassoSelect},{id:'pick',label:'스포이드',Icon:Pipette}] as const
const HANDLES=[['nw',0,0,'왼쪽 위'],['n',50,0,'위'],['ne',100,0,'오른쪽 위'],['e',100,50,'오른쪽'],['se',100,100,'오른쪽 아래'],['s',50,100,'아래'],['sw',0,100,'왼쪽 아래'],['w',0,50,'왼쪽']] as const
type Input=PointerEvent<HTMLDivElement>
export function Sketchbook({value,onChange,background='#fffaf0',onBusyChange,disabled=false,width:paperWidth=SKETCH_WIDTH,height:paperHeight=SKETCH_HEIGHT}:{value:Stroke[];onChange:(v:Stroke[])=>void;background?:string;onBackgroundChange?:(color:string)=>void;onBusyChange?:(busy:boolean)=>void;disabled?:boolean;width?:number;height?:number}){
  const W=paperWidth,H=paperHeight
  const canvas=useRef<HTMLCanvasElement>(null),overlay=useRef<HTMLCanvasElement>(null),base=useRef<HTMLCanvasElement|null>(null),raf=useRef(0)
  const viewport=useRef<HTMLDivElement>(null),paper=useRef<HTMLDivElement>(null),touches=useRef(new TouchView()),viewRef=useRef<View>({...IDENTITY})
  const [view,setView]=useState<View>({...IDENTITY}),[fit,setFit]=useState(1),[preview,setPreview]=useState<'size'|'opacity'|null>(null)
  const active=useRef<{id:number;pointerType:string;start:Point;points:Point[];stroke?:Stroke;moving:boolean;tap?:'fill'|'pick';handle?:SelectionHandle}|null>(null)
  const [transformed,setTransformed]=useState<Stroke[]|null>(null),transformedRef=useRef<Stroke[]|null>(null)
  const [tool,setTool]=useState<Tool>('pen'),[color,setColor]=useState(COLORS[0]),[backColor,setBackColor]=useState('#ffffff'),[colorTarget,setColorTarget]=useState<'front'|'back'>('front')
  const previousTool=useRef<Tool>('pen')
  const [width,setWidth]=useState(8),[eraseWidth,setEraseWidth]=useState(32),[opacity,setOpacity]=useState(1),[selected,setSelected]=useState<string[]>([])
  const [history,setHistory]=useState<Stroke[][]>([]),[future,setFuture]=useState<Stroke[][]>([]),[clear,setClear]=useState(false),[notice,setNotice]=useState(''),[picker,setPicker]=useState(false),[custom,setCustom]=useState<string[]>([])
  const fillWorker=useRef<Worker|null>(null),fillBusy=useRef(false),[filling,setFilling]=useState(false)
  const blocked=disabled||filling
  const latest=useRef(value);latest.current=value
  const commit=(next:Stroke[])=>{setHistory(h=>[...h.slice(-29),latest.current]);setFuture([]);latest.current=next;onChange(next)}
  const changeView=(next:View)=>{viewRef.current=next;setView(next)}
  const painted=useRef<{strokes:Stroke[];width:number;height:number}|null>(null)
  useEffect(()=>{
    const c=canvas.current;if(!c)return;const previous=painted.current
    // 새 선 하나를 추가할 때는 기존 그림 전체를 다시 그리지 않는다.
    if(previous&&previous.width===W&&previous.height===H&&value.length===previous.strokes.length+1&&previous.strokes.every((s,i)=>s===value[i]))paintStroke(c.getContext('2d')!,value[value.length-1],W,H)
    else paintSketch(c,value)
    painted.current={strokes:value,width:W,height:H}
  },[value,W,H])
  useEffect(()=>{const el=paper.current;if(!el)return;const observer=new ResizeObserver(entries=>setFit(entries[0].contentRect.width/W));observer.observe(el);return()=>observer.disconnect()},[W,H])
  useEffect(()=>()=>{cancelAnimationFrame(raf.current);fillWorker.current?.terminate();onBusyChange?.(false)},[onBusyChange])
  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('doran-sketch-colors')||'[]');if(Array.isArray(stored))setCustom([...new Set(stored.filter((c:unknown)=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)))].slice(0,16))}catch{}},[])
  const saveColors=(colors:string[])=>{setCustom(colors);try{localStorage.setItem('doran-sketch-colors',JSON.stringify(colors))}catch{setNotice('색은 이 창에서만 보관돼요.')}}
  const point=(e:{clientX:number;clientY:number},unbounded=false):Point=>{const b=paper.current!.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;return{x:unbounded?x:clamp(x),y:unbounded?y:clamp(y)}}
  const inPaper=(e:Input)=>{const b=paper.current!.getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom}
  const viewPoint=(e:Input)=>{const b=e.currentTarget.getBoundingClientRect();return{x:e.clientX-b.left-b.width/2,y:e.clientY-b.top-b.height/2}}
  const clearOverlay=()=>{cancelAnimationFrame(raf.current);raf.current=0;overlay.current?.getContext('2d')?.clearRect(0,0,W,H)}
  const cancelStroke=()=>{active.current=null;transformedRef.current=null;setTransformed(null);clearOverlay();if(canvas.current)paintSketch(canvas.current,latest.current)}
  const drawOverlay=()=>{
    const ctx=overlay.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);const a=active.current;if(!a||a.tap)return
    if(a.stroke){if(a.stroke.erase){const ink=canvas.current?.getContext('2d');if(ink&&base.current){ink.clearRect(0,0,W,H);ink.drawImage(base.current,0,0);paintStroke(ink,a.stroke,W,H)}}else paintStroke(ctx,a.stroke,W,H)}
    else if(a.moving||a.handle){const last=a.points.at(-1)!,next=a.handle?transformSelection(latest.current,selected,a.handle,a.start,last,W,H):moveSelection(latest.current,selected,last.x-a.start.x,last.y-a.start.y);transformedRef.current=next;setTransformed(next);if(canvas.current)paintSketch(canvas.current,next)}
    else{ctx.strokeStyle='#ba7442';ctx.lineWidth=3;ctx.setLineDash([10,7]);ctx.beginPath();a.points.forEach((p,i)=>i?ctx.lineTo(p.x*W,p.y*H):ctx.moveTo(p.x*W,p.y*H));ctx.closePath();ctx.stroke();ctx.setLineDash([])}
  }
  // 색연필 입자는 캐시하고, 이벤트 횟수와 무관하게 한 프레임에 한 번만 그린다.
  const queuePaint=()=>{if(!raf.current)raf.current=requestAnimationFrame(()=>{raf.current=0;drawOverlay()})}
  const fillAt=(p:Point)=>{
    const flat=document.createElement('canvas');flat.width=W;flat.height=H;const ctx=flat.getContext('2d',{willReadFrequently:true})!;ctx.fillStyle=background;ctx.fillRect(0,0,W,H);ctx.drawImage(canvas.current!,0,0)
    const data=ctx.getImageData(0,0,W,H).data
    fillBusy.current=true;setFilling(true);onBusyChange?.(true)
    try{
      // 픽셀 탐색은 워커로 넘기고 원본 배열의 소유권도 함께 이전한다.
      if(!fillWorker.current)fillWorker.current=new Worker(new URL('../../lib/sketchbook-fill.worker.ts',import.meta.url))
      const worker=fillWorker.current,release=()=>{fillBusy.current=false;setFilling(false);onBusyChange?.(false)}
      worker.onmessage=event=>{if(event.data.length>500000){setNotice('너무 복잡한 부분이에요. 조금 작은 영역을 채워 주세요.');release();return}commit([...latest.current,{id:crypto.randomUUID(),color,width:1,erase:false,opacity,points:[{x:0,y:0}],fillRuns:Array.from(event.data as Int32Array)}]);release()}
      worker.onerror=()=>{setNotice('색을 채우지 못했어요. 다시 눌러 주세요.');worker.terminate();fillWorker.current=null;release()}
      worker.postMessage({data,width:W,height:H,x:p.x*W,y:p.y*H},[data.buffer])
    }catch{setNotice('이 브라우저에서는 채우기가 어려워요. 펜으로 칠해 주세요.');fillBusy.current=false;setFilling(false);onBusyChange?.(false)}
  }
  const sampleAt=(p:Point)=>{
    const pixel=canvas.current!.getContext('2d')!.getImageData(Math.min(W-1,Math.floor(p.x*W)),Math.min(H-1,Math.floor(p.y*H)),1,1).data
    const a=pixel[3]/255,hex='#'+[0,1,2].map(i=>Math.round(pixel[i]*a+parseInt(background.slice(1+i*2,3+i*2),16)*(1-a)).toString(16).padStart(2,'0')).join('')
    setColor(hex);setColorTarget('front');setTool(previousTool.current);setNotice('그림에서 고른 색으로 이어서 그려요.')
  }
  const down=(e:Input)=>{
    if(blocked||fillBusy.current||e.button!==0)return
    // 펜이 닿은 동안 들어오는 손바닥 터치는 그림/제스처로 받지 않는다.
    if(e.pointerType==='touch'&&active.current?.pointerType==='pen')return
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)
    if(e.pointerType==='touch'&&touches.current.down(e.pointerId,viewPoint(e),viewRef.current)){cancelStroke();return}
    const handle=(e.target as HTMLElement).closest<HTMLElement>('[data-handle]')?.dataset.handle as SelectionHandle|undefined
    if(active.current||touches.current.locked||(!inPaper(e)&&!handle))return
    if(tool!=='lasso'&&tool!=='pick'&&(value.length>=500||value.reduce((n,s)=>n+s.points.length+(s.fillRuns?.length??0),0)>500000)){setNotice('종이가 꽉 찼어요. 그림을 저장하거나 조금 되돌려 주세요.');return}
    const p=point(e,Boolean(handle));setNotice('')
    if(handle&&tool==='lasso'&&selected.length){active.current={id:e.pointerId,pointerType:e.pointerType,start:p,points:[p],moving:false,handle};return}
    // 채우기와 스포이드도 손을 뗄 때 확정해야 두 손가락 확대가 그림을 바꾸지 않는다.
    if(tool==='fill'||tool==='pick'){active.current={id:e.pointerId,pointerType:e.pointerType,start:p,points:[p],moving:false,tap:tool};return}
    const b=selectionBounds(value,selected)
    if(!base.current)base.current=document.createElement('canvas')
    if(base.current.width!==W||base.current.height!==H){base.current.width=W;base.current.height=H}
    const cached=base.current.getContext('2d')!;cached.clearRect(0,0,W,H);if(canvas.current)cached.drawImage(canvas.current,0,0)
    const moving=tool==='lasso'&&Boolean(b&&p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom)
    active.current={id:e.pointerId,pointerType:e.pointerType,start:p,points:[p],moving,stroke:tool!=='lasso'?{id:crypto.randomUUID(),color,width:tool==='erase'?eraseWidth:width,erase:tool==='erase',brush:tool==='erase'?'pen':tool,opacity,points:[p]}:undefined};queuePaint()
  }
  const move=(e:Input)=>{
    if(e.pointerType==='touch'){
      const next=touches.current.move(e.pointerId,viewPoint(e));if(next){changeView(next);e.preventDefault()}
      if(touches.current.locked)return
    }
    const a=active.current;if(!a||a.id!==e.pointerId||a.tap)return;e.preventDefault()
    const box=paper.current!.getBoundingClientRect(),samples=e.nativeEvent.getCoalescedEvents?.()??[]
    for(const event of samples.length?samples:[e.nativeEvent]){
      const p=a.handle?point(event,true):{x:clamp((event.clientX-box.left)/box.width),y:clamp((event.clientY-box.top)/box.height)},last=a.points.at(-1)!
      if(Math.hypot((p.x-last.x)*W,(p.y-last.y)*H)<1)continue
      if(a.points.length<12000){a.points.push(p);if(a.stroke)a.stroke.points=a.points}
    }queuePaint()
  }
  const finish=(e:Input,cancel=false)=>{
    const consumed=e.pointerType==='touch'&&touches.current.up(e.pointerId,viewRef.current),a=active.current
    if(a?.id===e.pointerId){
      if(cancel||consumed)cancelStroke()
      else{
        const p=point(e,Boolean(a.handle));a.points.push(p);if(a.stroke)a.stroke.points=a.points
        active.current=null;clearOverlay()
        if(a.tap){if(inPaper(e)){if(a.tap==='fill')fillAt(p);else sampleAt(p)}}
        else if(a.stroke){
          // 지우개 미리보기는 원본 캔버스에 그렸으므로 되돌린 뒤 한 번만 확정한다.
          if(a.stroke.erase&&base.current&&canvas.current){const ctx=canvas.current.getContext('2d')!;ctx.clearRect(0,0,W,H);ctx.drawImage(base.current,0,0)}
          commit([...latest.current,a.stroke])
        }
        else if(a.handle)commit(transformSelection(latest.current,selected,a.handle,a.start,p,W,H))
        else if(a.moving)commit(moveSelection(latest.current,selected,p.x-a.start.x,p.y-a.start.y))
        else setSelected(a.points.length>=3?latest.current.filter(s=>!s.fillRuns&&s.points.some(p=>insidePolygon(p,a.points))).map(s=>s.id):[])
      }
      transformedRef.current=null;setTransformed(null)
    }
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const undo=()=>{if(blocked||active.current||!history.length)return;setFuture(f=>[...f,value]);onChange(history.at(-1)!);setHistory(h=>h.slice(0,-1));setSelected([])}
  const redo=()=>{if(blocked||active.current||!future.length)return;setHistory(h=>[...h,value]);onChange(future.at(-1)!);setFuture(f=>f.slice(0,-1));setSelected([])}
  const swap=()=>{setColor(backColor);setBackColor(color)}
  const chooseColor=(c:string)=>{if(colorTarget==='front')setColor(c);else setBackColor(c)}
  const b=selectionBounds(transformed??value,selected),size=tool==='erase'?eraseWidth:width
  return <div className={styles.studio} onKeyDown={e=>{
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||blocked)return
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&e.target instanceof HTMLCanvasElement){e.preventDefault();setTool('lasso');setSelected(value.filter(s=>!s.fillRuns).map(s=>s.id))}
    else if(!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.key.toLowerCase()==='x')swap();if(e.key.toLowerCase()==='d'){setColor('#000000');setBackColor('#ffffff')}}
  }}>
    <aside className={styles.rail} aria-label="그리기 도구">
      <div className={styles.tools} role="toolbar" aria-label="붓 종류">{TOOLS.map(({id,label,Icon})=><button type="button" key={id} title={label} aria-label={label} aria-pressed={tool===id} disabled={blocked} onClick={()=>{if(id==='pick'&&tool!=='pick')previousTool.current=tool==='lasso'||tool==='fill'||tool==='erase'?'pen':tool;setTool(id);setSelected([])}}><Icon size={22}/><span>{label}</span></button>)}</div>
      <div className={styles.colorTools}>
        <div className={styles.swatches}>
          <button type="button" className={styles.backSwatch} aria-label="배경색 고르기" title="배경색 (종이색과 별개)" aria-pressed={colorTarget==='back'} disabled={blocked} style={{background:backColor}} onClick={()=>{setColorTarget('back');setPicker(true)}}/>
          <button type="button" className={styles.frontSwatch} aria-label="전경색 고르기" aria-pressed={colorTarget==='front'} disabled={blocked} style={{background:color}} onClick={()=>{setColorTarget('front');setPicker(true)}}/>
        </div>
        <div className={styles.colorActions}><button type="button" title="전경색·배경색 교환 (X)" aria-label="전경색·배경색 교환" disabled={blocked} onClick={swap}><ArrowLeftRight size={16}/></button><button type="button" title="기본 흑백 (D)" aria-label="기본 흑백으로" disabled={blocked} onClick={()=>{setColor('#000000');setBackColor('#ffffff')}}><span className={styles.defaultColors}/></button></div>
      </div>
      <BrushDial label={tool==='erase'?'지우개 크기':'브러시 크기'} value={size} min={2} max={96} unit="px" color={color} disabled={blocked} onChange={tool==='erase'?setEraseWidth:setWidth} onPreview={on=>setPreview(on?'size':null)}/>
      <BrushDial label="브러시 불투명도" value={Math.round(opacity*100)} min={1} max={100} unit="%" color={color} alpha disabled={blocked} onChange={v=>setOpacity(v/100)} onPreview={on=>setPreview(on?'opacity':null)}/>
    </aside>
    <div className={styles.stage}>
      <div className={styles.history}><button type="button" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소" disabled={blocked||!history.length} onClick={undo}><Undo2 size={22}/></button><button type="button" title="다시 실행" aria-label="다시 실행" disabled={blocked||!future.length} onClick={redo}><Redo2 size={22}/></button><button type="button" className={styles.zoomReset} aria-label="종이를 화면에 맞추기" title="화면에 맞추기" onClick={()=>{if(active.current||touches.current.points.size)return;changeView({...IDENTITY})}}><RotateCcw size={14}/>{Math.round(view.scale*100)}%</button><button type="button" title="전부 지우기" aria-label="전부 지우기" disabled={blocked||!value.length} onClick={()=>setClear(true)}><Trash2 size={20}/></button></div>
      <div ref={viewport} className={styles.canvasSlot} onPointerDown={down} onPointerMove={move} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}>
        <div ref={paper} className={styles.canvasWrap} style={{background,width:`min(100cqw,calc(100cqh * ${W} / ${H}))`,aspectRatio:`${W}/${H}`,transform:`translate(${view.x}px,${view.y}px) scale(${view.scale})`}}>
          <canvas width={W} height={H} ref={canvas} aria-hidden/>
          <canvas width={W} height={H} ref={overlay} className={styles.ink} aria-label="여기에 자유롭게 그려 주세요" tabIndex={0}/>
          {b&&<div className={styles.selection} style={{left:`${b.left*100}%`,top:`${b.top*100}%`,width:`${(b.right-b.left)*100}%`,height:`${(b.bottom-b.top)*100}%`,'--handle-scale':1/view.scale} as CSSProperties}>
            {HANDLES.map(([id,x,y,label])=><button key={id} type="button" data-handle={id} aria-label={`${label} 크기 조절`} title="끌어서 크기 조절" style={{left:`${x}%`,top:`${y}%`,cursor:`${id}-resize`}} onKeyDown={e=>{const delta=({ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();const p={x:b.left+(b.right-b.left)*x/100,y:b.top+(b.bottom-b.top)*y/100};commit(transformSelection(value,selected,id,p,{x:p.x+delta[0],y:p.y+delta[1]},W,H))}}}/>)}
            <span className={styles.rotationStem} style={{height:30/view.scale}}/><button type="button" data-handle="rotate" className={styles.rotateHandle} aria-label="선택한 그림 회전" title="끌어서 회전 · 방향키로 5도 회전" style={{left:'50%',top:-30/view.scale,cursor:'grab'}} onKeyDown={e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2,a=(e.key==='ArrowRight'?1:-1)*Math.PI/36;commit(transformSelection(value,selected,'rotate',{x:cx,y:cy-.1},{x:cx+Math.sin(a)*.1*H/W,y:cy-Math.cos(a)*.1},W,H))}}/>
          </div>}
        </div>
        {preview&&<div className={styles.brushPreview} aria-hidden><div className={preview==='opacity'?styles.checker:styles.previewPaper}><i style={{width:preview==='size'?size*fit*view.scale:64,height:preview==='size'?size*fit*view.scale:64,background:tool==='erase'?'#647267':color,opacity:preview==='opacity'?opacity:1}}/></div><span>{preview==='size'?`${size}px · 실제 크기`:`불투명도 ${Math.round(opacity*100)}%`}</span></div>}
      </div>
      <div className={styles.status} role="status">{filling?'색을 채우고 있어요…':notice||(tool==='lasso'?(selected.length?'가운데는 이동 · 테두리는 크기 · 위쪽은 회전':'선을 둘러서 그림을 골라요'):tool==='pick'?'그림에서 원하는 색을 짚어요':'두 손가락으로 확대하고 옮겨요')}{tool==='lasso'&&selected.length>0&&<button type="button" disabled={blocked} aria-label="선택한 그림 삭제" onClick={()=>{commit(value.filter(s=>!selected.includes(s.id)));setSelected([])}}><Trash2 size={20}/></button>}</div>
    </div>
    <div className={styles.paletteBar}>
      <div className={styles.palette}>{[...new Set([...COLORS,...custom])].map(c=><button type="button" key={c} title={c} aria-label={`색 ${c}`} aria-pressed={(colorTarget==='front'?color:backColor)===c} disabled={blocked} style={{background:c}} onClick={()=>chooseColor(c)}/>)}</div>
      <button className={styles.paletteToggle} type="button" title="HSV 휠과 내 팔레트" aria-label="색상 팔레트 열기" aria-expanded={picker} disabled={blocked} onClick={()=>setPicker(p=>!p)}><Palette size={23}/></button>
    </div>
    {picker&&!blocked&&<ColorPanel value={colorTarget==='front'?color:backColor} label={colorTarget==='front'?'전경색':'배경색'} onChange={chooseColor} custom={custom} onCustom={saveColors} onClose={()=>setPicker(false)}/>}
    {clear&&<ConfirmDialog title="그림을 모두 지울까요?" description="지운 뒤에도 실행 취소로 되돌릴 수 있어요." confirm="모두 지우기" onCancel={()=>setClear(false)} onConfirm={()=>{commit([]);setSelected([]);setClear(false)}}/>}
  </div>
}
export function ConfirmDialog({title,description,confirm,onConfirm,onCancel}:{title:string;description:string;confirm:string;onConfirm:()=>void;onCancel:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const d=dialog.current;d?.showModal();return()=>d?.close()},[])
  return <dialog ref={dialog} className={styles.dialog} onCancel={e=>{e.preventDefault();onCancel()}} aria-labelledby="drawing-dialog-title"><h3 id="drawing-dialog-title">{title}</h3><p>{description}</p><div><button type="button" autoFocus onClick={onCancel}>계속 할래요</button><button type="button" onClick={onConfirm}>{confirm}</button></div></dialog>
}
