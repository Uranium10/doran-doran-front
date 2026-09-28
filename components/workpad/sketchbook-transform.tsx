"use client"
import {useEffect,useRef,useState,type PointerEvent,type RefObject,type CSSProperties} from 'react'
import {Check,X,Link as LinkIcon,Unlink,FlipHorizontal2,FlipVertical2,RotateCcw} from 'lucide-react'
import {createPortal} from 'react-dom'
import {paintSketch} from '@/lib/sketchbook'
import {HANDLES,quadCenter,projectQuad,rotateQuad,transformQuad,translateQuad,type Quad,type TransformHandle} from '@/lib/sketchbook-transform'
import {transformedStrokes,type TransformSession} from '@/lib/sketchbook-transform-session'
import type {Point,Stroke} from '@/lib/drawing-story'
import type {LayerSettings} from '@/lib/sketchbook-document'
import styles from './sketchbook.module.css'
type Props={session:TransformSession;W:number;H:number;layers:LayerSettings;scale:number;pixelScale:number;screenToPoint:(e:{clientX:number;clientY:number})=>Point;toolbar:RefObject<HTMLDivElement|null>;onApply:(strokes:Stroke[],id:string)=>void;onCancel:()=>void}
export function FreeTransform({session,W,H,layers,scale,pixelScale,screenToPoint,toolbar,onApply,onCancel}:Props){
  const [quad,setQuad]=useState<Quad>(session.quad),current=useRef(quad),[linked,setLinked]=useState(true),[revision,setRevision]=useState(0)
  const canvas=useRef<HTMLCanvasElement>(null),raf=useRef(0),past=useRef<Quad[]>([]),future=useRef<Quad[]>([])
  const drag=useRef<{id:number;start:Point;quad:Quad;handle:TransformHandle}|null>(null)
  const modifiers=useRef({shift:false,alt:false,ctrl:false}),last=useRef<Point|null>(null)
  const callbacks=useRef({onApply,onCancel});callbacks.current={onApply,onCancel}
  const update=(q:Quad)=>{current.current=q;if(!raf.current)raf.current=requestAnimationFrame(()=>{raf.current=0;setQuad(current.current)})}
  const remember=(q:Quad)=>{if(JSON.stringify(q)===JSON.stringify(current.current))return;past.current=[...past.current.slice(-49),q];future.current=[];setRevision(n=>n+1)}
  const action=(q:Quad)=>{const before=current.current;update(q);remember(before)}
  const cancelDrag=()=>{if(drag.current){update(drag.current.quad);drag.current=null;last.current=null}}
  const apply=()=>{if(drag.current)return;callbacks.current.onApply(JSON.stringify(session.quad)===JSON.stringify(current.current)?session.original:transformedStrokes(session,current.current,W,H),session.item.id)}
  useEffect(()=>{if(canvas.current)paintSketch(canvas.current,transformedStrokes(session,quad,W,H),layers)},[quad,session,W,H,layers])
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[])
  const point=(e:{clientX:number;clientY:number})=>{const p=screenToPoint(e);return{x:p.x*W,y:p.y*H}}
  const down=(e:PointerEvent<HTMLDivElement>)=>{
    e.stopPropagation();if(e.button!==0||drag.current)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId)
    const handle=(e.target as HTMLElement).closest<HTMLElement>('[data-transform-handle]')?.dataset.transformHandle as TransformHandle|undefined
    const p=point(e);modifiers.current={shift:e.shiftKey,alt:e.altKey,ctrl:e.ctrlKey||e.metaKey};last.current=p
    drag.current={id:e.pointerId,start:p,quad:current.current,handle:handle??'rotate'}
  }
  const move=(e:PointerEvent<HTMLDivElement>)=>{
    e.stopPropagation();const d=drag.current;if(!d||d.id!==e.pointerId)return;e.preventDefault();const p=point(e);last.current=p
    modifiers.current={shift:e.shiftKey,alt:e.altKey,ctrl:e.ctrlKey||e.metaKey}
    update(transformQuad(d.quad,d.handle,d.start,p,{...modifiers.current,proportional:linked}))
  }
  const end=(e:PointerEvent<HTMLDivElement>,cancel=false)=>{
    e.stopPropagation();const d=drag.current;if(!d||d.id!==e.pointerId)return
    if(cancel)cancelDrag();else{move(e);remember(d.quad);drag.current=null;last.current=null}
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  }
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.isComposing||e.defaultPrevented)return
      const el=e.target as HTMLElement
      if(el?.isContentEditable||el?.closest('input,textarea,select,dialog,[role="textbox"]'))return
      const m={shift:e.shiftKey,alt:e.altKey,ctrl:e.ctrlKey||e.metaKey};modifiers.current=m
      if(drag.current&&last.current)update(transformQuad(drag.current.quad,drag.current.handle,drag.current.start,last.current,{...m,proportional:linked}))
      if(e.type==='keyup')return
      const code=e.code||e.key,arrows:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}
      if(code==='Escape'){e.preventDefault();e.stopPropagation();callbacks.current.onCancel()}
      else if(code==='Enter'||code==='NumpadEnter'){e.preventDefault();e.stopPropagation();apply()}
      else if(arrows[code]&&!drag.current){e.preventDefault();e.stopPropagation();const [x,y]=arrows[code],n=e.shiftKey?10:1;action(translateQuad(current.current,x*n,y*n))}
      else if(m.ctrl&&(code==='KeyZ'||code==='KeyY')){
        e.preventDefault();e.stopPropagation();if(drag.current){cancelDrag();return}
        const redo=code==='KeyY'||e.shiftKey,source=redo?future:past,target=redo?past:future,q=source.current.pop();if(q){target.current.push(current.current);update(q);setRevision(n=>n+1)}
      }else if(m.ctrl&&code==='KeyT'){e.preventDefault();e.stopPropagation()}
    }
    const blur=()=>cancelDrag()
    document.addEventListener('keydown',key,true);document.addEventListener('keyup',key,true);window.addEventListener('blur',blur)
    return()=>{document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',key,true);window.removeEventListener('blur',blur)}
  })
  const center=quadCenter(quad),angle=Math.atan2(quad[1].y-quad[0].y,quad[1].x-quad[0].x),mid=projectQuad(quad,.5,0),length=Math.hypot(mid.x-center.x,mid.y-center.y)||1
  const rotation={x:mid.x+(mid.x-center.x)/length*32/pixelScale,y:mid.y+(mid.y-center.y)/length*32/pixelScale}
  const position=(p:Point)=>({left:`${p.x/W*100}%`,top:`${p.y/H*100}%`})
  const flip=(vertical:boolean)=>{const q=current.current;action((vertical?[q[3],q[2],q[1],q[0]]:[q[1],q[0],q[3],q[2]]) as Quad)}
  return <>
    <div className={styles.freeTransform} aria-label="자유 변형 작업 영역" onPointerDown={down} onPointerMove={move} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)} onLostPointerCapture={e=>end(e,true)} onDoubleClick={e=>{if((e.target as HTMLElement).dataset.transformHandle==='move'){e.preventDefault();e.stopPropagation();apply()}}}>
      <canvas ref={canvas} width={W} height={H} aria-hidden/>
      <svg className={styles.transformFrame} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <polygon points={quad.map(p=>`${p.x},${p.y}`).join(' ')} fill="transparent" stroke="#48775d" strokeWidth={1.5/pixelScale} data-transform-handle="move" style={{cursor:'move',pointerEvents:'all'}}/>
        <line x1={mid.x} y1={mid.y} x2={rotation.x} y2={rotation.y} stroke="#48775d" strokeWidth={1/pixelScale}/>
      </svg>
      {HANDLES.map(([handle,u,v,label])=><button type="button" key={handle} data-transform-handle={handle} aria-label={`자유 변형 ${label}`} title="크기 · Shift 비율 전환 · Alt 중심 · Ctrl 왜곡" className={styles.transformHandle} style={{...position(projectQuad(quad,u,v)),transform:`translate(-50%,-50%) scale(${1/scale})`,cursor:`${handle}-resize`}} />)}
      <button type="button" data-transform-handle="rotate" aria-label="자유 변형 회전" className={styles.transformHandle} style={{...position(rotation),transform:`translate(-50%,-50%) scale(${1/scale})`,borderRadius:'50%',cursor:'grab'}}/>
    </div>
    {toolbar.current&&createPortal(<div className={styles.transformBar} role="toolbar" aria-label="자유 변형 옵션" data-revision={revision}>
      <strong>자유 변형</strong><span>{Math.round(angle*180/Math.PI)}°</span>
      <button type="button" aria-label="비율 유지" aria-pressed={linked} onClick={()=>setLinked(v=>!v)} title="비율 유지 · Shift로 전환">{linked?<LinkIcon size={18}/>:<Unlink size={18}/>}</button>
      <button type="button" aria-label="좌우 뒤집기" title="좌우 뒤집기" onClick={()=>flip(false)}><FlipHorizontal2 size={19}/></button>
      <button type="button" aria-label="상하 뒤집기" title="상하 뒤집기" onClick={()=>flip(true)}><FlipVertical2 size={19}/></button>
      <button type="button" aria-label="변형 초기화" title="변형 초기화" onClick={()=>action(session.quad)}><RotateCcw size={18}/></button>
      <button type="button" aria-label="자유 변형 취소" title="취소 (Esc)" onClick={onCancel}><X size={20}/></button>
      <button type="button" aria-label="자유 변형 적용" title="적용 (Enter)" onClick={apply}><Check size={20}/></button>
      <small>Enter 적용 · Esc 취소 · Shift 비율/15° · Alt 중심</small>
    </div>,toolbar.current)}
  </>
}
