"use client"
import {useEffect,useRef,type CSSProperties} from 'react'
import {X,FolderOpen,Check,BookOpen,SlidersHorizontal,ImagePlus} from 'lucide-react'
import styles from './sketchbook.module.css'

export type SketchMode='full'|'junior'
export const SKETCH_MODE_KEY='doran-sketch-mode'
export function SketchMenu({mode,onMode,onClose,onStorage,onPhoto}:{mode:SketchMode;onMode:(mode:SketchMode)=>void;onClose:()=>void;onStorage?:()=>void;onPhoto:()=>void}){
  const ref=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close()},[])
  return <dialog ref={ref} className={`${styles.storageDialog} ${styles.modeMenu}`} aria-labelledby="sketch-mode-title" onCancel={e=>{e.preventDefault();onClose()}}>
    <header><div><h3 id="sketch-mode-title">나의 스케치북</h3><p>편한 도구로 그려요. 그림은 그대로예요.</p></div><button type="button" aria-label="스케치북 메뉴 닫기" onClick={onClose}><X size={20}/></button></header>
    <div className={styles.modeChoices}>{([{id:'junior',title:'저학년용',detail:'펜, 크레파스, 지우개로 쉽고 크게',Icon:BookOpen},{id:'full',title:'전체 도구',detail:'레이어와 다양한 도구로 꼼꼼하게',Icon:SlidersHorizontal,ImagePlus}] as const).map(({id,title,detail,Icon})=><button key={id} type="button" aria-pressed={mode===id} onClick={()=>onMode(id)}><Icon size={25}/><span><strong>{title}</strong><small>{detail}</small></span>{mode===id&&<Check size={20}/>}</button>)}</div>
    <button className={styles.openStorage} type="button" onClick={onPhoto}><ImagePlus size={20}/>사진 가져오기</button>
    {onStorage&&<button className={styles.openStorage} type="button" onClick={onStorage}><FolderOpen size={20}/>그림 저장 · 불러오기</button>}
    <p className={styles.storageHint}>고른 모드는 이 기기에서 다음에도 이어져요.</p>
  </dialog>
}

// 생성한 실사 필기구를 작은 WebP로 재사용하고, 이동 효과는 transform만으로 처리한다.
export function JuniorTools({tool,color,size,disabled,onTool,onSize}:{tool:string;color:string;size:number;disabled:boolean;onTool:(tool:'pen'|'pencil'|'erase')=>void;onSize:(size:number)=>void}){
  const sizes=tool==='erase'?[16,32,64]:[4,12,28]
  const nearest=sizes.reduce((a,b)=>Math.abs(b-size)<Math.abs(a-size)?b:a)
  return <section className={styles.juniorShelf} aria-label="쉬운 그리기 도구" style={{'--junior-ink':color} as CSSProperties}>
    <div className={styles.juniorTools}>{([{id:'pen',label:'펜'},{id:'pencil',label:'크레파스'},{id:'erase',label:'지우개'}] as const).map(({id,label})=><button type="button" key={id} aria-label={label} aria-pressed={tool===id} disabled={disabled} onClick={()=>onTool(id)} data-kind={id}><span className={styles.realTool} aria-hidden>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/images/sketchbook/${id==='pencil'?'crayon':id==='erase'?'eraser':'pen'}.webp`} alt="" draggable={false} width={id==='erase'?124:52} height={320}/></span><span className={styles.juniorToolName}>{label}</span></button>)}</div>
    <div className={styles.tipSizes} role="group" aria-label="촉 크기">{sizes.map((n,i)=><button type="button" key={n} aria-label={`${['가는','보통','굵은'][i]} ${tool==='erase'?'지우개':'촉'}`} aria-pressed={n===nearest} disabled={disabled} onClick={()=>onSize(n)}><i style={{width:[5,11,19][i],height:[5,11,19][i]}}/><span>{['가늘게','보통','굵게'][i]}</span></button>)}</div>
  </section>
}
