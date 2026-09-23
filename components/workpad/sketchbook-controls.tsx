"use client"
import {useRef,useState,type PointerEvent} from 'react'
import {Plus,Trash2,X} from 'lucide-react'
import {draggedValue,hexToHsv,hsvToHex} from '@/lib/sketchbook-controls'
import {clamp} from '@/lib/sketchbook'
import styles from './sketchbook.module.css'

export function BrushDial({label,value,min,max,unit,color,alpha=false,disabled,onChange,onPreview}:{label:string;value:number;min:number;max:number;unit:string;color:string;alpha?:boolean;disabled:boolean;onChange:(v:number)=>void;onPreview:(active:boolean)=>void}){
  const drag=useRef<{id:number;y:number;value:number}|null>(null)
  const end=(e:PointerEvent<HTMLDivElement>,cancel=false)=>{if(drag.current?.id!==e.pointerId)return;if(cancel)onChange(drag.current.value);drag.current=null;onPreview(false);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
  return <div className={styles.dial} role="slider" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value}${unit}`} aria-orientation="vertical" title={`${label}: 누른 채 위아래로 움직여요`} onPointerDown={e=>{if(disabled||drag.current||e.button!==0)return;e.preventDefault();drag.current={id:e.pointerId,y:e.clientY,value};e.currentTarget.setPointerCapture(e.pointerId);onPreview(true)}} onPointerMove={e=>{const d=drag.current;if(d?.id===e.pointerId){e.preventDefault();onChange(draggedValue(d.value,e.clientY-d.y,min,max))}}} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)} onLostPointerCapture={e=>end(e,true)} onBlur={()=>onPreview(false)} onKeyDown={e=>{if(disabled)return;const step=e.shiftKey?10:1;const next=({ArrowUp:value+step,ArrowRight:value+step,ArrowDown:value-step,ArrowLeft:value-step,PageUp:value+10,PageDown:value-10,Home:min,End:max} as Record<string,number>)[e.key];if(next!==undefined){e.preventDefault();onChange(clamp(next,min,max));onPreview(true)}}} onKeyUp={()=>onPreview(false)}>
    <span className={`${styles.dialFace} ${alpha?styles.checker:''}`}><i style={{width:alpha?32:value,height:alpha?32:value,background:color,opacity:alpha?value/100:1}}/></span><span>{value}<small>{unit}</small></span>
  </div>
}

export function ColorPanel({value,onChange,custom,onCustom,onClose,label}:{value:string;onChange:(v:string)=>void;custom:string[];onCustom:(colors:string[])=>void;onClose:()=>void;label:string}){
  const hsv=hexToHsv(value),[lastHue,setLastHue]=useState(hsv.h),[remove,setRemove]=useState(false)
  const h=hsv.s?hsv.h:lastHue
  const update=(s:number,v:number,hue=h)=>{setLastHue(hue);onChange(hsvToHex(hue,s,v))}
  const pickHue=(e:PointerEvent<HTMLDivElement>)=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect();update(hsv.s||1,hsv.v||1,(Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI+90+360)%360)}
  const pickSV=(e:PointerEvent<HTMLDivElement>)=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect();update(clamp((e.clientX-r.left)/r.width),1-clamp((e.clientY-r.top)/r.height))}
  return <section className={styles.colorPopup} role="dialog" aria-label="색상 팔레트" onKeyDown={e=>{if(e.key==='Escape')onClose()}}>
    <header><strong>{label}</strong><button type="button" aria-label="팔레트 닫기" onClick={onClose}><X size={19}/></button></header>
    <div className={styles.hueWheel} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pickHue(e)}} onPointerMove={pickHue} onPointerUp={e=>{pickHue(e);e.currentTarget.releasePointerCapture(e.pointerId)}} aria-hidden>
      <i className={styles.hueHandle} style={{left:`${50+44*Math.sin(h*Math.PI/180)}%`,top:`${50-44*Math.cos(h*Math.PI/180)}%`}}/>
      <div className={styles.wheelCenter}/>
      <div className={styles.sv} style={{backgroundColor:`hsl(${h} 100% 50%)`}} onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);pickSV(e)}} onPointerMove={e=>{e.stopPropagation();pickSV(e)}} onPointerUp={e=>{e.stopPropagation();pickSV(e);e.currentTarget.releasePointerCapture(e.pointerId)}}><i style={{left:`${hsv.s*100}%`,top:`${(1-hsv.v)*100}%`}}/></div>
    </div>
    <label className={styles.nativeColor}>정확한 색<input type="color" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/><span>{value.toUpperCase()}</span></label>
    <header><strong>내 팔레트</strong><button type="button" aria-label={remove?'색 삭제 마치기':'저장한 색 삭제'} aria-pressed={remove} onClick={()=>setRemove(!remove)}><Trash2 size={17}/></button></header>
    <div className={styles.customColors}>{custom.map(c=><button key={c} type="button" aria-label={`${c} ${remove?'삭제':'선택'}`} style={{background:c}} onClick={()=>remove?onCustom(custom.filter(x=>x!==c)):onChange(c)}>{remove&&<X size={15}/>}</button>)}<button type="button" aria-label="현재 색 팔레트에 저장" disabled={custom.includes(value)||custom.length>=16} onClick={()=>onCustom([...custom,value])}><Plus size={18}/></button></div>
    <p>마음에 드는 색은 +로 모아 두세요.</p>
  </section>
}
