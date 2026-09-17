"use client"

import { useEffect, useRef, useState } from "react"
import styles from "./paper-theatre.module.css"

/** 다섯 장의 공용 WebP만 사용한다. 진행률은 꾸며내지 않고 실제 작업 문구가 별도로 안내한다. */
export function PaperTheatre({ stopped = false }: { stopped?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [hidden, setHidden] = useState(false)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    const visibility = () => setHidden(document.hidden)
    visibility();document.addEventListener("visibilitychange", visibility)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (ref.current) observer.observe(ref.current)
    return () => {observer.disconnect();document.removeEventListener("visibilitychange", visibility)}
  }, [])
  const idle = stopped || paused || hidden || !visible
  return <div className={styles.wrap} ref={ref}>
    <div className={styles.stage} data-paused={idle} aria-hidden="true">
      <div className={styles.arch}/><div className={styles.hill}/>
      {/* 고정 영역 안에서 transform만 움직여 레이아웃/스크롤바를 흔들지 않는다. */}
      {(["sun","moon","dokkaebi","tiger","waves"] as const).map(name => <div key={name} className={`${styles.puppet} ${styles[name]}`}><img src={`/images/theatre/${name}.webp`} alt="" width={name === "waves" ? 880 : 360} height={name === "waves" ? 440 : 420} decoding="async" draggable={false}/></div>)}
      <span className={styles.curtainLeft}/><span className={styles.curtainRight}/><div className={styles.foot}>도란도란 작은 극장</div>
    </div>
    {!stopped && <button type="button" className={styles.pause} onClick={() => setPaused(v => !v)} aria-pressed={paused}>{paused ? "인형 움직이기" : "움직임 쉬기"}</button>}
  </div>
}
