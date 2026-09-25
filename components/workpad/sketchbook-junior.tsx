"use client"
import {useEffect,useRef,type CSSProperties} from 'react'
import {X,FolderOpen,Check,Save,ImagePlus,ChevronRight} from 'lucide-react'
import styles from './sketchbook.module.css'

export type SketchMode='full'|'junior'
export const SKETCH_MODE_KEY='doran-sketch-mode'
export function SketchMenu({mode,onMode,onClose,onStorage,onPhoto}:{mode:SketchMode;onMode:(mode:SketchMode)=>void;onClose:()=>void;onStorage?:(action:'save'|'load')=>void;onPhoto:()=>void}){
  const ref=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const d=ref.current,opener=document.activeElement
    d?.showModal()
    // 다이얼로그가 제거된 뒤에도 키보드 사용자가 원래 도구에서 이어갈 수 있게 한다.
    return()=>{d?.close();queueMicrotask(()=>{if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true})})}
  },[])
  return <dialog ref={ref} className={styles.modeMenu} aria-labelledby="sketch-mode-title" onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target!==e.currentTarget)return;const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)onClose()}}>
    <header><h3 id="sketch-mode-title">스케치북</h3><button type="button" aria-label="스케치북 메뉴 닫기" onClick={onClose}><X size={20}/></button></header>
    <section className={styles.modeCards} aria-label="도구 모드">
      {([{id:'junior',title:'저학년용'},{id:'full',title:'전체 기능'}] as const).map(({id,title})=><button className={styles.modeCard} key={id} type="button" aria-pressed={mode===id} onClick={()=>onMode(id)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/images/sketchbook/mode-${id}.webp`} alt="" width={256} height={256} draggable={false}/>
        <span className={styles.modeCaption}><span>{title}</span><span className={styles.modeCheck} aria-hidden>{mode===id&&<Check size={14}/>}</span></span>
      </button>)}
    </section>
    <section className={styles.menuGroup} aria-label="사진">
      <button className={styles.menuRow} type="button" onClick={onPhoto}><ImagePlus size={20} aria-hidden/><span>사진 가져오기</span><ChevronRight size={16} aria-hidden/></button>
    </section>
    {onStorage&&<section className={styles.fileActions} aria-label="그림 파일">
      <button type="button" onClick={()=>onStorage('save')}><Save size={20} aria-hidden/>저장</button>
      <button type="button" onClick={()=>onStorage('load')}><FolderOpen size={20} aria-hidden/>불러오기</button>
    </section>}
    <footer>도구 모드는 이 기기에 저장됩니다.</footer>
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
