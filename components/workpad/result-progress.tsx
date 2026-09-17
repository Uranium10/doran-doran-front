"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react"
import { getStageInfo, type LiteracyResult } from "@/lib/levels"
import { planProgress, progressFrame } from "@/lib/progress-plan"
import styles from "./result-progress.module.css"

export function ResultProgress({ result }: { result: LiteracyResult }) {
  // 결과가 바뀌면 이전 애니메이션의 타이머/화면 상태를 함께 폐기한다.
  const key = `${result.result_id ?? result.kind}:${result.level}:${result.achievement}:${result.delta}`
  return <AnimatedProgress key={key} level={result.level} achievement={result.achievement} delta={result.delta}/>
}

function AnimatedProgress({ level, achievement, delta }: Pick<LiteracyResult, "level" | "achievement" | "delta">) {
  const plan = useMemo(() => planProgress(level, achievement, delta), [level, achievement, delta])
  const [frame, setFrame] = useState(() => progressFrame(plan, 0))
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let requestId = 0, elapsed = 0, last = 0, inView = false, finished = false
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const stop = () => { cancelAnimationFrame(requestId);requestId = 0;last = 0 }
    const tick = (now: number) => {
      requestId = 0
      if (document.hidden || !inView || finished) return
      if (last) elapsed += now - last
      last = now
      const next = progressFrame(plan, elapsed)
      setFrame(next)
      if (next.phase === "done") finished = true
      else requestId = requestAnimationFrame(tick)
    }
    const sync = () => {
      stop()
      if (motion.matches) { finished = true;setFrame(progressFrame(plan, Infinity));return }
      if (!finished && inView && !document.hidden) requestId = requestAnimationFrame(tick)
    }
    // 보이지 않는 동안 시간을 진행하지 않아 다시 돌아왔을 때 승급 장면을 건너뛰지 않는다.
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting;sync() }, { threshold: 0.2 })
    if (root.current) observer.observe(root.current)
    document.addEventListener("visibilitychange", sync);motion.addEventListener("change", sync);sync()
    return () => { stop();observer.disconnect();document.removeEventListener("visibilitychange", sync);motion.removeEventListener("change", sync) }
  }, [plan])
  const current = getStageInfo(frame.stage)?.label ?? "씨앗 1단계"
  const next = getStageInfo(Math.min(20, frame.stage + 1))?.label ?? current
  const promote = frame.phase === "promote"
  const done = frame.phase === "done"
  const marker = Math.min(94, Math.max(6, frame.percent))
  const message = promote ? `${next}에 도착했어요!` : done
    ? plan.previous === null ? "우리 아이의 첫 읽기 단계예요" : (plan.delta ?? 0) > 0 ? "이야기 한 편만큼 자랐어요!" : "우리 아이의 읽기 여정을 이어가요"
    : "읽기 여정을 차근차근 담고 있어요"
  return <div ref={root} className={styles.root} data-phase={frame.phase} data-stage={frame.stage} data-testid="result-progress">
    <div className={styles.labels}><span className={styles.current}>{current}</span><span className={styles.caption}>단계 진척도</span><span key={`${frame.stage}:${promote}`} className={`${styles.next} ${promote ? styles.bounce : ""}`}>{frame.stage === 20 ? "최고 단계" : next}</span></div>
    <div className={`${styles.track} ${promote ? styles.full : ""}`} role="progressbar" aria-label="읽기 단계 진척도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={frame.percent} aria-valuetext={`${current}, ${frame.percent}%`}>
      <span className={styles.fill} style={{ transform: `scaleX(${frame.percent / 100})` }}/>
      <span className={styles.shine} aria-hidden="true"/>
    </div>
    <div className={styles.numbers} aria-hidden="true"><span style={{ left:`${marker}%` }}><strong>{frame.percent}%</strong></span></div>
    <div className={styles.feedback}>
      <p role="status" aria-live="polite" className={promote ? styles.celebrate : ""}>{promote && <Sparkles size={18} aria-hidden="true"/>}{message}</p>
      <p className={styles.delta}>{plan.delta !== null && <>{plan.delta > 0 ? <TrendingUp size={15}/> : plan.delta < 0 ? <TrendingDown size={15}/> : null}<span>{plan.delta === 0 ? "이전 단계를 유지했어요" : `레벨 ${plan.delta > 0 ? "+" : ""}${plan.delta}`}</span></>}</p>
    </div>
  </div>
}
