"use client"
import {useEffect,useRef,useState,type PointerEvent,type CSSProperties} from 'react'
import {PenTool,Eraser,LassoSelect,Undo2,Redo2,Trash2,PaintBucket,SprayCan,ArrowLeftRight,Pipette,Palette,RotateCcw,Pointer,Sticker,Wallpaper,X} from 'lucide-react'
import type {DrawingLayer,Point,Stroke} from '@/lib/drawing-story'
import {SKETCH_WIDTH,SKETCH_HEIGHT,clamp,insidePolygon,moveSelection,selectionBounds,paintSketch,copyLayer,adoptLayer,paintStroke,strokeLayer,transformSelection,type SelectionHandle} from '@/lib/sketchbook'
import {pushPixels} from '@/lib/sketchbook-warp'
import {STICKERS,type StickerKind} from '@/lib/sketchbook-stickers'
import {IDENTITY,TouchView,paperPoint,type View} from '@/lib/sketchbook-controls'
import {BrushDial,ColorPanel} from './sketchbook-controls'
import styles from './sketchbook.module.css'
const COLORS=['#303d43','#b84839','#edaa35','#527a53','#467ba1','#8961a1','#d87a96','#ffffff']
type Tool='pen'|'pencil'|'air'|'erase'|'fill'|'lasso'|'pick'|'warp'
function Crayon({size=22}:{size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><g transform="rotate(42 12 12)"><rect x="8" y="2" width="8" height="20" rx="3.4" fill="#ee6e5f" stroke="currentColor" strokeWidth="1.35"/><path d="M8 7h8v10H8Z" fill="#f5a64b" stroke="currentColor" strokeWidth="1.1"/><path d="M8 10h8M8 14h8" stroke="#fff1c8" strokeWidth="1.1"/><path d="M10 3.2c1.2-.7 2.8-.7 4 0" stroke="#ffb19f" strokeWidth="1.2" strokeLinecap="round"/></g></svg>}
function LayerGlyph({kind}:{kind:DrawingLayer}){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>{kind==='outline'?<><path d="m4 8 8-4 8 4-8 4Z" fill="#fff8e8" stroke="currentColor"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>:<><path d="m4 8 8-4 8 4-8 4Z" fill="#e89a61" stroke="currentColor"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>}</svg>}
const TOOLS=[{id:'lasso',label:'올가미 선택',Icon:LassoSelect},{id:'pen',label:'펜',Icon:PenTool},{id:'pencil',label:'크레파스',Icon:Crayon},{id:'air',label:'에어브러시',Icon:SprayCan},{id:'erase',label:'지우개',Icon:Eraser},{id:'fill',label:'채우기',Icon:PaintBucket},{id:'pick',label:'스포이드',Icon:Pipette},{id:'warp',label:'손가락 · 모양 밀기',Icon:Pointer}] as const
const HANDLES=[['nw',0,0,'왼쪽 위'],['n',50,0,'위'],['ne',100,0,'오른쪽 위'],['e',100,50,'오른쪽'],['se',100,100,'오른쪽 아래'],['s',50,100,'아래'],['sw',0,100,'왼쪽 아래'],['w',0,50,'왼쪽']] as const
type Input=PointerEvent<HTMLDivElement>
export function Sketchbook({value,onChange,background='#fffaf0',onBackgroundChange,onBusyChange,disabled=false,width:paperWidth=SKETCH_WIDTH,height:paperHeight=SKETCH_HEIGHT}:{value:Stroke[];onChange:(v:Stroke[])=>void;background?:string;onBackgroundChange?:(color:string)=>void;onBusyChange?:(busy:boolean)=>void;disabled?:boolean;width?:number;height?:number}){
  const W=paperWidth,H=paperHeight
  const canvas=useRef<HTMLCanvasElement>(null),overlay=useRef<HTMLCanvasElement>(null),raf=useRef(0)
  const viewport=useRef<HTMLDivElement>(null),paper=useRef<HTMLDivElement>(null),touches=useRef(new TouchView()),viewRef=useRef<View>({...IDENTITY})
  const paperSize=useRef({width:W,height:H})
  const warpCursor=useRef<HTMLDivElement>(null)
  const [view,setView]=useState<View>({...IDENTITY}),[fit,setFit]=useState(1),[preview,setPreview]=useState<'size'|'opacity'|null>(null)
  const active=useRef<{id:number;pointerType:string;start:Point;points:Point[];stroke?:Stroke;moving:boolean;tap?:'fill'|'pick';handle?:SelectionHandle}|null>(null)
  const [transformed,setTransformed]=useState<Stroke[]|null>(null),transformedRef=useRef<Stroke[]|null>(null)
  const [tool,setTool]=useState<Tool>('pen'),[color,setColor]=useState(COLORS[0]),[backColor,setBackColor]=useState('#ffffff'),[colorTarget,setColorTarget]=useState<'front'|'back'>('front')
  const [activeLayer,setActiveLayer]=useState<DrawingLayer>('outline'),[eye,setEye]=useState<{x:number;y:number;sample:string;current:string}|null>(null)
  const inkColor=colorTarget==='front'?color:backColor
  const [toast,setToast]=useState(''),[layerLabel,setLayerLabel]=useState(false),[extras,setExtras]=useState<'stickers'|'paper'|null>(null)
  const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),layerTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const warpWork=useRef<{ink:HTMLCanvasElement;other:HTMLCanvasElement;done:number;layer:DrawingLayer}|null>(null)
  const announce=(label:string)=>{setToast(label);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),1600)}
  const selectLayer=(layer:DrawingLayer)=>{if(blocked||active.current)return;setActiveLayer(layer);setSelected([]);setLayerLabel(true);announce(layer==='outline'?'밑그림 레이어':'색칠 레이어');if(layerTimer.current)clearTimeout(layerTimer.current);layerTimer.current=setTimeout(()=>setLayerLabel(false),1700)}
  const previousTool=useRef<Tool>('pen')
  const [width,setWidth]=useState(8),[eraseWidth,setEraseWidth]=useState(32),[opacity,setOpacity]=useState(1),[selected,setSelected]=useState<string[]>([])
  const [history,setHistory]=useState<Stroke[][]>([]),[future,setFuture]=useState<Stroke[][]>([]),[clear,setClear]=useState(false),[notice,setNotice]=useState(''),[picker,setPicker]=useState(false),[custom,setCustom]=useState<string[]>([])
  const fillWorker=useRef<Worker|null>(null),fillBusy=useRef(false),[filling,setFilling]=useState(false)
  const blocked=disabled||filling
  const latest=useRef(value);latest.current=value
  const commit=(next:Stroke[])=>{setHistory(h=>[...h.slice(-29),latest.current]);setFuture([]);latest.current=next;onChange(next)}
  const viewTransform=(v:View)=>`translate(${v.x}px,${v.y}px) rotate(${v.rotation}deg) scale(${v.scale})`
  const changeView=(next:View)=>{viewRef.current=next;if(paper.current)paper.current.style.transform=viewTransform(next);setView(next)}
  const painted=useRef<{strokes:Stroke[];width:number;height:number}|null>(null)
  useEffect(()=>{
    const c=canvas.current;if(!c)return;const previous=painted.current
    // 새 선 하나를 추가할 때는 기존 그림 전체를 다시 그리지 않는다.
    const added=value[value.length-1]
    if(previous&&previous.width===W&&previous.height===H&&value.length===previous.strokes.length+1&&previous.strokes.every((s,i)=>s===value[i])&&strokeLayer(added)==='outline'&&!added.erase&&added.brush!=='warp')paintStroke(c.getContext('2d')!,added,W,H)
    else paintSketch(c,value)
    painted.current={strokes:value,width:W,height:H}
  },[value,W,H])
  useEffect(()=>{const el=paper.current;if(!el)return;const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;paperSize.current={width,height};setFit(width/W)});observer.observe(el);return()=>observer.disconnect()},[W,H])
  useEffect(()=>()=>{cancelAnimationFrame(raf.current);fillWorker.current?.terminate();onBusyChange?.(false)},[onBusyChange])
  useEffect(()=>()=>{if(toastTimer.current)clearTimeout(toastTimer.current);if(layerTimer.current)clearTimeout(layerTimer.current)},[])
  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem('doran-sketch-colors')||'[]');if(Array.isArray(stored))setCustom([...new Set(stored.filter((c:unknown)=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)))].slice(0,16))}catch{}},[])
  const saveColors=(colors:string[])=>{setCustom(colors);try{localStorage.setItem('doran-sketch-colors',JSON.stringify(colors))}catch{setNotice('색은 이 창에서만 보관돼요.')}}
  // 비대칭 도구 여백을 포함한 실제 종이 중심을 사용한다. 회전해도 사각형 중심은 동일하다.
  const viewPoint=(e:{clientX:number;clientY:number})=>{const b=paper.current!.getBoundingClientRect(),v=viewRef.current;return{x:e.clientX-(b.left+b.width/2)+v.x,y:e.clientY-(b.top+b.height/2)+v.y}}
  const point=(e:{clientX:number;clientY:number},unbounded=false):Point=>{const {width,height}=paperSize.current,{x,y}=paperPoint(viewPoint(e),viewRef.current,width,height);return{x:unbounded?x:clamp(x),y:unbounded?y:clamp(y)}}
  const inPaper=(e:Input)=>{const p=point(e,true);return p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1}
  const clearOverlay=()=>{cancelAnimationFrame(raf.current);raf.current=0;overlay.current?.getContext('2d')?.clearRect(0,0,W,H)}
  const cancelStroke=()=>{active.current=null;warpWork.current=null;transformedRef.current=null;setTransformed(null);clearOverlay();if(canvas.current)paintSketch(canvas.current,latest.current)}
  const drawWarp=(stroke:Stroke)=>{
    const work=warpWork.current;if(!work||!canvas.current)return
    const ctx=work.ink.getContext('2d',{willReadFrequently:true})!
    for(let i=work.done;i<stroke.points.length;i++){const a=stroke.points[i-1],b=stroke.points[i];pushPixels(ctx,{x:a.x*W,y:a.y*H},{x:b.x*W,y:b.y*H},Math.max(12,stroke.width/2),stroke.opacity??1)}
    work.done=stroke.points.length
    const output=canvas.current.getContext('2d')!;output.clearRect(0,0,W,H);output.drawImage(work.layer==='color'?work.ink:work.other,0,0);output.drawImage(work.layer==='outline'?work.ink:work.other,0,0)
  }
  const drawOverlay=()=>{
    const ctx=overlay.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);const a=active.current;if(!a||a.tap)return
    if(a.stroke){if(a.stroke.brush==='warp')drawWarp(a.stroke);else if(a.stroke.erase){if(canvas.current)paintSketch(canvas.current,[...latest.current,a.stroke])}else paintStroke(ctx,a.stroke,W,H)}
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
      worker.onmessage=event=>{if(event.data.length>500000){setNotice('너무 복잡한 부분이에요. 조금 작은 영역을 채워 주세요.');release();return}commit([...latest.current,{id:crypto.randomUUID(),color:inkColor,width:1,erase:false,opacity,layer:activeLayer,points:[{x:0,y:0}],fillRuns:Array.from(event.data as Int32Array)}]);release()}
      worker.onerror=()=>{setNotice('색을 채우지 못했어요. 다시 눌러 주세요.');worker.terminate();fillWorker.current=null;release()}
      worker.postMessage({data,width:W,height:H,x:p.x*W,y:p.y*H},[data.buffer])
    }catch{setNotice('이 브라우저에서는 채우기가 어려워요. 펜으로 칠해 주세요.');fillBusy.current=false;setFilling(false);onBusyChange?.(false)}
  }
  const colorAt=(p:Point)=>{
    const pixel=canvas.current!.getContext('2d')!.getImageData(Math.min(W-1,Math.floor(p.x*W)),Math.min(H-1,Math.floor(p.y*H)),1,1).data
    const a=pixel[3]/255
    return '#'+[0,1,2].map(i=>Math.round(pixel[i]*a+parseInt(background.slice(1+i*2,3+i*2),16)*(1-a)).toString(16).padStart(2,'0')).join('')
  }
  const previewEye=(e:Input)=>{if(tool!=='pick'||!inPaper(e)){setEye(null);return}const box=e.currentTarget.getBoundingClientRect();setEye({x:e.clientX-box.left,y:e.clientY-box.top,sample:colorAt(point(e)),current:inkColor})}
  const sampleAt=(p:Point)=>{
    const hex=colorAt(p)
    chooseColor(hex);setTool(previousTool.current);setNotice('그림에서 고른 색으로 이어서 그려요.')
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
    if(tool==='warp')updateWarpCursor(e)
    if(handle&&tool==='lasso'&&selected.length){active.current={id:e.pointerId,pointerType:e.pointerType,start:p,points:[p],moving:false,handle};return}
    // 채우기와 스포이드도 손을 뗄 때 확정해야 두 손가락 확대가 그림을 바꾸지 않는다.
    if(tool==='fill'||tool==='pick'){active.current={id:e.pointerId,pointerType:e.pointerType,start:p,points:[p],moving:false,tap:tool};if(tool==='pick')previewEye(e);return}
    const b=selectionBounds(value,selected)
    if(tool==='warp'){
      const ink=document.createElement('canvas'),other=document.createElement('canvas');ink.width=other.width=W;ink.height=other.height=H
      copyLayer(canvas.current!,ink,value,activeLayer);copyLayer(canvas.current!,other,value,activeLayer==='color'?'outline':'color');warpWork.current={ink,other,done:1,layer:activeLayer}
    }
    const moving=tool==='lasso'&&Boolean(b&&p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom)
    active.current={id:e.pointerId,pointerType:e.pointerType,start:p,points:[p],moving,stroke:tool!=='lasso'?{id:crypto.randomUUID(),color:inkColor,width:tool==='erase'?eraseWidth:width,erase:tool==='erase',brush:tool==='erase'?'pen':tool,opacity,layer:activeLayer,points:[p]}:undefined};queuePaint()
  }
  const move=(e:Input)=>{
    if(tool==='pick')previewEye(e)
    if(tool==='warp')updateWarpCursor(e)
    if(e.pointerType==='touch'){
      const next=touches.current.move(e.pointerId,viewPoint(e));if(next){changeView(next);e.preventDefault()}
      if(touches.current.locked)return
    }
    const a=active.current;if(!a||a.id!==e.pointerId||a.tap)return;e.preventDefault()
    const samples=e.nativeEvent.getCoalescedEvents?.()??[]
    for(const event of samples.length?samples:[e.nativeEvent]){
      const p=point(event,Boolean(a.handle)),last=a.points.at(-1)!
      if(Math.hypot((p.x-last.x)*W,(p.y-last.y)*H)<(a.stroke?.brush==='warp'?Math.max(2,a.stroke.width/8):1))continue
      if(a.points.length<(a.stroke?.brush==='warp'?2048:12000)){a.points.push(p);if(a.stroke)a.stroke.points=a.points}
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
          const next=[...latest.current,a.stroke]
          if(a.stroke.brush==='warp'&&warpWork.current&&canvas.current){drawWarp(a.stroke);adoptLayer(canvas.current,warpWork.current.ink,next,warpWork.current.layer)}
          else if(a.stroke.erase&&canvas.current)paintSketch(canvas.current,latest.current)
          commit(next)
        }
        else if(a.handle)commit(transformSelection(latest.current,selected,a.handle,a.start,p,W,H))
        else if(a.moving)commit(moveSelection(latest.current,selected,p.x-a.start.x,p.y-a.start.y))
        else setSelected(a.points.length>=3?latest.current.filter(s=>strokeLayer(s)===activeLayer&&!s.fillRuns&&s.brush!=='warp'&&(s.points.some(p=>insidePolygon(p,a.points))||(s.sticker&&insidePolygon({x:s.points.reduce((n,p)=>n+p.x,0)/4,y:s.points.reduce((n,p)=>n+p.y,0)/4},a.points)))).map(s=>s.id):[])
      }
      warpWork.current=null;transformedRef.current=null;setTransformed(null)
    }
    setEye(null);if(warpCursor.current&&e.pointerType!=='mouse')warpCursor.current.style.opacity='0';if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const undo=()=>{if(blocked||active.current||!history.length)return;setFuture(f=>[...f,value]);onChange(history.at(-1)!);setHistory(h=>h.slice(0,-1));setSelected([])}
  const redo=()=>{if(blocked||active.current||!future.length)return;setHistory(h=>[...h,value]);onChange(future.at(-1)!);setFuture(f=>f.slice(0,-1));setSelected([])}
  const swap=()=>{setColor(backColor);setBackColor(color);setColorTarget('front');announce('전경색으로 그려요')}
  const chooseColor=(c:string)=>{if(colorTarget==='front')setColor(c);else setBackColor(c)}
  const updateWarpCursor=(e:Input)=>{const el=warpCursor.current;if(!el)return;if(!inPaper(e)||touches.current.locked){el.style.opacity='0';return}const box=e.currentTarget.getBoundingClientRect(),diameter=Math.max(24,width)*fit*viewRef.current.scale;el.style.opacity='1';el.style.width=`${diameter}px`;el.style.height=`${diameter}px`;el.style.left=`${e.clientX-box.left}px`;el.style.top=`${e.clientY-box.top}px`}
  const addSticker=(kind:StickerKind)=>{
    if(blocked||active.current||value.length>=500)return
    const side=Math.min(W,H)*.24,dx=side/W/2,dy=side/H/2,id=crypto.randomUUID()
    commit([...latest.current,{id,color:'#000000',width:0,erase:false,layer:activeLayer,sticker:kind,points:[{x:.5-dx,y:.5-dy},{x:.5+dx,y:.5-dy},{x:.5+dx,y:.5+dy},{x:.5-dx,y:.5+dy}]}]);setTool('lasso');setSelected([id]);setExtras(null);announce(`${STICKERS[kind].label} · 끌어서 옮겨요`)
  }
  const b=selectionBounds(transformed??value,selected),size=tool==='erase'?eraseWidth:width
  return <div className={styles.studio} onKeyDown={e=>{
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||blocked)return
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo()}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&e.target instanceof HTMLCanvasElement){e.preventDefault();setTool('lasso');setSelected(value.filter(s=>strokeLayer(s)===activeLayer&&!s.fillRuns&&s.brush!=='warp').map(s=>s.id))}
    else if(!e.ctrlKey&&!e.metaKey&&!e.altKey){if(e.key.toLowerCase()==='x')swap();if(e.key.toLowerCase()==='d'){setColor('#000000');setBackColor('#ffffff');setColorTarget('front')}}
  }}>
    <aside className={styles.rail} aria-label="그리기 도구">
      <div className={styles.tools} role="toolbar" aria-label="붓 종류">{TOOLS.map(({id,label,Icon})=><button type="button" key={id} data-tool={id} title={label} aria-label={label} aria-pressed={tool===id} disabled={blocked} onClick={()=>{if(active.current)return;if(id==='pick'&&tool!=='pick')previousTool.current=tool==='lasso'||tool==='fill'||tool==='erase'||tool==='warp'?'pen':tool;if(id!=='pick')setEye(null);setTool(id);if(id==='warp'&&width<32)setWidth(64);setSelected([]);announce(label);setPicker(false);setExtras(null)}}><Icon size={22}/><span>{label}</span></button>)}</div>
      <div className={styles.colorTools}>
        <div className={styles.swatches}>
          <button type="button" className={styles.backSwatch} aria-label="배경색 고르기" title="배경색으로 그리기 (종이색과 별개)" aria-pressed={colorTarget==='back'} disabled={blocked} style={{background:backColor}} onClick={()=>{setColorTarget('back');setPicker(true);setExtras(null);announce('배경색으로 그려요')}}/>
          <button type="button" className={styles.frontSwatch} aria-label="전경색 고르기" aria-pressed={colorTarget==='front'} disabled={blocked} style={{background:color}} onClick={()=>{setColorTarget('front');setPicker(true);setExtras(null);announce('전경색으로 그려요')}}/>
        </div>
        <div className={styles.colorActions}><button type="button" title="전경색·배경색 교환 (X)" aria-label="전경색·배경색 교환" disabled={blocked} onClick={swap}><ArrowLeftRight size={16}/></button><button type="button" title="기본 흑백 (D)" aria-label="기본 흑백으로" disabled={blocked} onClick={()=>{setColor('#000000');setBackColor('#ffffff');setColorTarget('front');announce('기본 흑백')}}><span className={styles.defaultColors}/></button></div>
      </div>
      <BrushDial label={tool==='erase'?'지우개 크기':tool==='warp'?'밀기 범위':'브러시 크기'} value={size} min={tool==='warp'?24:2} max={96} unit="px" color={inkColor} disabled={blocked} onChange={tool==='erase'?setEraseWidth:setWidth} onPreview={on=>setPreview(on?'size':null)}/>
      <BrushDial label={tool==='warp'?'밀기 강도':'브러시 불투명도'} value={Math.round(opacity*100)} min={1} max={100} unit="%" color={inkColor} alpha disabled={blocked} onChange={v=>setOpacity(v/100)} onPreview={on=>setPreview(on?'opacity':null)}/>
    </aside>
    <div className={styles.stage}>
      <div className={styles.history}>
        <button type="button" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소" disabled={blocked||!history.length} onClick={undo}><Undo2 size={22}/></button>
        <button type="button" title="다시 실행" aria-label="다시 실행" disabled={blocked||!future.length} onClick={redo}><Redo2 size={22}/></button>
        <button type="button" className={styles.zoomReset} aria-label="종이를 화면에 맞추기" title={`화면에 맞추기 · 현재 ${Math.round(view.rotation)}도`} onClick={()=>{if(active.current||touches.current.points.size)return;changeView({...IDENTITY});announce('화면에 맞추기')}}><RotateCcw size={14}/>{Math.round(view.scale*100)}%</button>
        <div className={styles.extrasButtons}>
          <button type="button" aria-label="기본 스티커 붙이기" title="스티커 붙이기" disabled={blocked} aria-expanded={extras==='stickers'} onClick={()=>{setExtras(extras==='stickers'?null:'stickers');setPicker(false);announce('스티커 붙이기')}}><Sticker size={22}/></button>
          <button type="button" aria-label="종이 배경 변경" title="배경 변경" disabled={blocked||!onBackgroundChange} aria-expanded={extras==='paper'} onClick={()=>{setExtras(extras==='paper'?null:'paper');setPicker(false);announce('종이 배경')}}><Wallpaper size={22}/></button>
        </div>
        <button type="button" title="전부 지우기" aria-label="전부 지우기" disabled={blocked||!value.length} onClick={()=>{setClear(true);announce('전부 지우기')}}><Trash2 size={20}/></button>
      </div>
      <div className={styles.layerDock} role="radiogroup" aria-label="그림 레이어" data-expanded={layerLabel}>{(['outline','color'] as const).map(layer=><button type="button" role="radio" aria-label={layer==='outline'?'밑그림 레이어':'색칠 레이어'} aria-checked={activeLayer===layer} data-active={activeLayer===layer} disabled={blocked} key={layer} onClick={()=>selectLayer(layer)}><span>{layer==='outline'?'밑그림':'색칠'}</span><LayerGlyph kind={layer}/></button>)}</div>
      {extras&&!blocked&&<section className={styles.extrasPanel} role="dialog" aria-label={extras==='stickers'?'기본 스티커':'종이 배경'} onKeyDown={e=>{if(e.key==='Escape')setExtras(null)}}>
        <header><strong>{extras==='stickers'?'어떤 스티커를 붙일까요?':'종이색을 골라요'}</strong><button type="button" aria-label="꾸미기 닫기" onClick={()=>setExtras(null)}><X size={18}/></button></header>
        {extras==='stickers'?<div className={styles.stickerGrid}>{(Object.keys(STICKERS) as StickerKind[]).map(kind=><button type="button" key={kind} aria-label={`${STICKERS[kind].label} 붙이기`} onClick={()=>addSticker(kind)}><svg viewBox="0 0 104 104" aria-hidden><g transform="translate(2 2)" stroke="#715a42" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">{STICKERS[kind].parts.map(([path,fill],i)=><path key={i} d={path} fill={fill}/>)}</g></svg><span>{STICKERS[kind].label}</span></button>)}</div>:<><div className={styles.paperColors}>{['#fffaf0','#ffffff','#f6e0df','#e2edf3','#e7efdb','#ece4f4','#f9ebc5','#343c43'].map(c=><button type="button" key={c} aria-label={`종이색 ${c}`} aria-pressed={background===c} style={{background:c}} onClick={()=>onBackgroundChange?.(c)}/>)}</div><label className={styles.paperCustom}>직접 고르기<input type="color" aria-label="원하는 종이색" value={background} onChange={e=>onBackgroundChange?.(e.target.value)}/></label></>}
      </section>}
      <div ref={viewport} className={styles.canvasSlot} onPointerDown={down} onPointerMove={move} onPointerLeave={()=>{if(!active.current){setEye(null);if(warpCursor.current)warpCursor.current.style.opacity='0'}}} onPointerUp={e=>finish(e)} onPointerCancel={e=>finish(e,true)} onLostPointerCapture={e=>finish(e,true)}>
        <div ref={paper} className={styles.canvasWrap} style={{background,width:`min(100cqw,calc(100cqh * ${W} / ${H}))`,aspectRatio:`${W}/${H}`,transform:viewTransform(view)}}>
          <canvas width={W} height={H} ref={canvas} aria-hidden/>
          <canvas width={W} height={H} ref={overlay} className={styles.ink} aria-label="여기에 자유롭게 그려 주세요" tabIndex={0}/>
          {b&&<div className={styles.selection} style={{left:`${b.left*100}%`,top:`${b.top*100}%`,width:`${(b.right-b.left)*100}%`,height:`${(b.bottom-b.top)*100}%`,'--handle-scale':1/view.scale} as CSSProperties}>
            {HANDLES.map(([id,x,y,label])=><button key={id} type="button" data-handle={id} aria-label={`${label} 크기 조절`} title="끌어서 크기 조절" style={{left:`${x}%`,top:`${y}%`,cursor:`${id}-resize`}} onKeyDown={e=>{const delta=({ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]} as Record<string,number[]>)[e.key];if(delta){e.preventDefault();const p={x:b.left+(b.right-b.left)*x/100,y:b.top+(b.bottom-b.top)*y/100};commit(transformSelection(value,selected,id,p,{x:p.x+delta[0],y:p.y+delta[1]},W,H))}}}/>)}
            <span className={styles.rotationStem} style={{height:30/view.scale}}/><button type="button" data-handle="rotate" className={styles.rotateHandle} aria-label="선택한 그림 회전" title="끌어서 회전 · 방향키로 5도 회전" style={{left:'50%',top:-30/view.scale,cursor:'grab'}} onKeyDown={e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2,a=(e.key==='ArrowRight'?1:-1)*Math.PI/36;commit(transformSelection(value,selected,'rotate',{x:cx,y:cy-.1},{x:cx+Math.sin(a)*.1*H/W,y:cy-Math.cos(a)*.1},W,H))}}/>
          </div>}
        </div>
        {preview&&<div className={styles.brushPreview} aria-hidden><div className={preview==='opacity'?styles.checker:styles.previewPaper}><i style={{width:preview==='size'?size*fit*view.scale:64,height:preview==='size'?size*fit*view.scale:64,background:tool==='erase'?'#647267':inkColor,opacity:preview==='opacity'?opacity:1}}/></div><span>{preview==='size'?`${size}px · 실제 크기`:`${tool==='warp'?'밀기 강도':'불투명도'} ${Math.round(opacity*100)}%`}</span></div>}
        {eye&&<div className={styles.eyePreview} aria-hidden style={{left:eye.x,top:eye.y,'--sample':eye.sample,'--current':eye.current} as CSSProperties}><i/><span>{eye.sample.toUpperCase()}</span></div>}
        {tool==='warp'&&<div ref={warpCursor} className={styles.warpCursor} aria-hidden/>}
      </div>
      {toast&&<div className={styles.toolToast} role="status" key={toast}>{toast}</div>}
      <div className={styles.status} role="status">{filling?'색을 채우고 있어요…':notice||(tool==='lasso'?(selected.length?'가운데는 이동 · 테두리는 크기 · 위쪽은 회전':'선을 둘러서 그림을 골라요'):tool==='pick'?'고를 색과 지금 색을 함께 확인해요':tool==='fill'&&activeLayer==='color'?'밑그림 선을 경계로 색칠해요':'두 손가락으로 확대·이동·회전해요')}{tool==='lasso'&&selected.length>0&&<button type="button" disabled={blocked} aria-label="선택한 그림 삭제" onClick={()=>{commit(value.filter(s=>!selected.includes(s.id)));setSelected([])}}><Trash2 size={20}/></button>}</div>
    </div>
    <div className={styles.paletteBar}>
      <div className={styles.palette}>{[...new Set([...COLORS,...custom])].map(c=><button type="button" key={c} title={c} aria-label={`색 ${c}`} aria-pressed={(colorTarget==='front'?color:backColor)===c} disabled={blocked} style={{background:c}} onClick={()=>chooseColor(c)}/>)}</div>
      <button className={styles.paletteToggle} type="button" title="HSV 휠과 내 팔레트" aria-label="색상 팔레트 열기" aria-expanded={picker} disabled={blocked} onClick={()=>{setPicker(p=>!p);setExtras(null);announce('색상 팔레트')}}><Palette size={23}/></button>
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
