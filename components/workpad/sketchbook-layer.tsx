"use client"
import {useRef,type PointerEvent,type ReactNode} from 'react'
import {EyeOff,PenTool} from 'lucide-react'
import type {LayerSettings} from '@/lib/sketchbook-document'
import styles from './sketchbook.module.css'

export function LayerControl({label,active,value,disabled,onSelect,onBegin,onChange,onEnd,children}:{label:string;active:boolean;value:LayerSettings['color'];disabled:boolean;onSelect:()=>void;onBegin:()=>boolean;onChange:(v:LayerSettings['color'])=>void;onEnd:(cancel:boolean)=>void;children:ReactNode}){
  const drag=useRef<{id:number;y:number;value:typeof value;moved:boolean}|null>(null)
  const end=(e:PointerEvent<HTMLDivElement>,cancel=false)=>{
    const d=drag.current;if(!d||d.id!==e.pointerId)return;drag.current=null
    if(!cancel&&!d.moved)onChange({...d.value,visible:!d.value.visible})
    onEnd(cancel);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  }
  return <div className={styles.layerControl} data-active={active}>
    <button type="button" aria-label={`${label}에 그리기`} aria-pressed={active} disabled={disabled} onClick={onSelect} title={`${label}에 그리기`}><PenTool size={14}/></button>
    <div role="slider" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label={`${label} 레이어 불투명도`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value.opacity*100)} aria-valuetext={`${Math.round(value.opacity*100)}%, ${value.visible?'보임':'숨김'}`} aria-orientation="vertical" className={styles.layerTile} data-hidden={!value.visible} title={`${label} · 눌러서 표시/숨김 · 위아래로 밀어 불투명도`} onPointerDown={e=>{if(disabled||drag.current||e.button!==0)return;e.preventDefault();if(!onBegin())return;drag.current={id:e.pointerId,y:e.clientY,value,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const dy=d.y-e.clientY;if(Math.abs(dy)>5)d.moved=true;if(d.moved){e.preventDefault();onChange({...d.value,opacity:Math.round(Math.max(0,Math.min(1,d.value.opacity+dy/150))*100)/100})}}} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)} onLostPointerCapture={e=>end(e,true)} onKeyDown={e=>{if(disabled)return;const delta=({ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1} as Record<string,number>)[e.key];if(delta||e.key===' '||e.key==='Enter'||e.key==='Home'||e.key==='End'){e.preventDefault();if(!onBegin())return;onChange(delta?{...value,opacity:Math.max(0,Math.min(1,Math.round(value.opacity*100+delta*(e.shiftKey?10:1))/100))}:e.key==='Home'||e.key==='End'?{...value,opacity:e.key==='Home'?0:1}:{...value,visible:!value.visible});onEnd(false)}}}>
      <span className={styles.layerName}>{label}</span>{value.visible?children:<EyeOff size={20}/>}<small>{Math.round(value.opacity*100)}%</small>
    </div>
  </div>
}
