"use client"
import {useRef,useState,type PointerEvent,type ReactNode} from 'react'
import {Eye,EyeOff} from 'lucide-react'
import type {LayerSettings} from '@/lib/sketchbook-document'
import styles from './sketchbook.module.css'

export function LayerControl({label,active,value,disabled,onSelect,onBegin,onChange,onEnd,children}:{label:string;active:boolean;value:LayerSettings['color'];disabled:boolean;onSelect:()=>void;onBegin:()=>boolean;onChange:(v:LayerSettings['color'])=>void;onEnd:(cancel:boolean)=>void;children:ReactNode}){
  const drag=useRef<{id:number;y:number;value:typeof value;moved:boolean}|null>(null)
  const [adjusting,setAdjusting]=useState(false)
  const end=(e:PointerEvent<HTMLButtonElement>,cancel=false)=>{
    const d=drag.current;if(!d||d.id!==e.pointerId)return
    drag.current=null;setAdjusting(false);onEnd(cancel)
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
  }
  return <div className={styles.layerControl} data-active={active}>
    <button type="button" aria-label={`${label} ${value.visible?'숨기기':'보이기'}`} aria-pressed={value.visible} disabled={disabled} title={`${label} 표시/숨김`} onClick={()=>{if(!onBegin())return;onChange({...value,visible:!value.visible});onEnd(false)}}>{value.visible?<Eye size={18}/>:<EyeOff size={18}/>}</button>
    <button type="button" aria-label={`${label}에 그리기`} aria-pressed={active} disabled={disabled} className={styles.layerTile} data-hidden={!value.visible} data-adjusting={adjusting} title={`${label} 선택 · 위아래로 밀어 불투명도`} aria-description={`불투명도 ${Math.round(value.opacity*100)}%. 위아래 방향키로도 조절할 수 있어요.`}
      onPointerDown={e=>{if(disabled||drag.current||e.button!==0)return;if(!onBegin())return;drag.current={id:e.pointerId,y:e.clientY,value,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}}
      onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const dy=d.y-e.clientY;if(Math.abs(dy)>5)d.moved=true;if(d.moved){e.preventDefault();setAdjusting(true);onChange({...d.value,opacity:Math.round(Math.max(0,Math.min(1,d.value.opacity+dy/150))*100)/100})}}}
      onPointerUp={e=>{const d=drag.current;const select=d?.id===e.pointerId&&!d.moved;end(e);if(select)onSelect()}}
      onPointerCancel={e=>end(e,true)} onLostPointerCapture={e=>end(e,true)}
      onClick={e=>{if(e.detail===0)onSelect()}}
      onKeyDown={e=>{const delta=({ArrowUp:1,ArrowDown:-1} as Record<string,number>)[e.key];if(!delta||disabled)return;e.preventDefault();if(!onBegin())return;onChange({...value,opacity:Math.max(0,Math.min(1,value.opacity+delta*(e.shiftKey?.1:.01)))});onEnd(false)}}>
      <span className={styles.layerName}>{label}</span><i className={styles.layerArtwork} style={{opacity:value.visible?value.opacity:.25}}>{children}</i>
      {adjusting&&<output className={styles.layerOpacity}>{Math.round(value.opacity*100)}%</output>}
    </button>
  </div>
}
