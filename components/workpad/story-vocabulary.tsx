"use client"

import { useEffect, useId, useRef, useState } from "react"
import { BookOpen, Sparkles, X } from "lucide-react"
import { request } from "@/lib/api"
import { StoryNewWords } from "./story-new-words"
import { vocabAnalysis } from "@/lib/vocab-analysis"
import styles from "./story-vocabulary.module.css"

/** 책 마지막 화면에서만 가벼운 분석 API를 조회한다. 책 전체/삽화는 다시 받지 않는다. */
export function StoryVocabulary({ profileId, storyId, initialAnalysis, sourceMode, sourceTitle, referenceSourceTitle, active, open, onClose, onReady }: {
  profileId: string; storyId: string; initialAnalysis?: unknown
  sourceMode?: "original" | "personalized" | "drawing"; sourceTitle?: string | null; referenceSourceTitle?: string | null
  active: boolean; open: boolean; onClose: () => void; onReady?: (ready: boolean) => void
}) {
  const [analysis, setAnalysis] = useState(() => vocabAnalysis(initialAnalysis))
  useEffect(() => { onReady?.(Boolean(analysis)) }, [analysis, onReady])
  const [error, setError] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [retry, setRetry] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // 그림 모드의 source_title은 '내 그림 이야기'이므로 실제로 찾은 참고 원전과 구분한다.
  const folktaleTitle = sourceMode === "drawing" ? referenceSourceTitle?.trim() : sourceTitle?.trim() === "내 그림 이야기" ? null : sourceTitle?.trim()
  const folktaleLabel = "참고한 옛 이야기"
  useEffect(() => {
    const node = dialog.current
    if (open && node && !node.open) node.showModal()
    else if (!open && node?.open) node.close()
  }, [open])
  useEffect(() => {
    if (!active || analysis) return
    let alive = true, attempts = 0, inFlight = false, done = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    setError(false); setWaiting(false)
    const poll = async () => {
      if (!alive || inFlight || done) return
      // 숨은 탭에서는 조회하지 않는다. 다시 보일 때 남은 횟수만 이어간다.
      if (document.hidden) return
      controller = new AbortController()
      inFlight = true
      attempts += 1
      try {
        const result = await request<{ status: "ready" | "pending"; analysis: unknown }>(
          `/stories/${encodeURIComponent(storyId)}/vocab-analysis?profile_id=${encodeURIComponent(profileId)}`,
          { signal: controller.signal },
        )
        if (!alive) return
        const ready = vocabAnalysis(result.analysis)
        if (result.status === "ready" && ready) { done = true; setAnalysis(ready); return }
        // 최대 12번만 확인한다. GitHub 실행 지연을 무한 로딩/무한 요청으로 바꾸지 않는다.
        if (attempts < 12) { if (!document.hidden) timer = setTimeout(poll, 10_000) }
        else { done = true; setWaiting(true) }
      } catch {
        done = true
        if (alive) setError(true)
      } finally { inFlight = false }
    }
    // 타이머가 숨은 탭에서 멈춘 뒤에도 visibilitychange로 재개할 수 있게 한다.
    const visibility = () => {
      if (document.hidden) { if (timer) clearTimeout(timer); timer = undefined }
      else if (!done && !inFlight && attempts < 12) void poll()
    }
    void poll()
    document.addEventListener("visibilitychange", visibility)
    return () => { alive = false; if (timer) clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", visibility) }
  }, [active, analysis, profileId, storyId, retry])

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
    onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) {
      const r = e.currentTarget.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
    } }}>
    <div className={styles.sheet}>
      <header className={styles.header}><div><span className={styles.eyebrow}>책 속 단어 살펴보기</span><h2 id={titleId}>동화 수준 확인하기</h2></div><button type="button" className={styles.close} aria-label="분석 창 닫기" onClick={onClose}><X size={22}/></button></header>
      {folktaleTitle && <section className={styles.folktale} aria-label={folktaleLabel}><BookOpen size={20} aria-hidden="true"/><div><span>{folktaleLabel}</span><strong>{folktaleTitle}</strong></div></section>}
      {analysis ? <>
        <section className={styles.total}><BookOpen size={23} aria-hidden="true"/><div><p>뜻을 담은 단어가 총 <strong>{analysis.총_내용형태소_수.toLocaleString()}번</strong> 등장해요</p><small>장면 제목과 본문에서 센 수예요. 같은 단어가 다시 나오면 함께 세어요.</small></div></section>
        <section className={styles.challenge}>
          <div className={styles.sectionHeading}><h3>이번 동화의 새 낱말</h3></div>
          <StoryNewWords key={`${profileId}:${storyId}`} profileId={profileId} storyId={storyId} active={open}/>
          <p>이 책을 만들기 전 완독한 동화와 비교해요. 사전에 실린 낱말을 기본형·품사별로 한 번씩 세며, 아이가 모르는 말이라는 뜻은 아니에요.</p>
        </section>
        <section className={styles.challenge}><div className={styles.sectionHeading}><Sparkles size={21} aria-hidden="true"/><h3>이야기 속 도전 어휘</h3><strong>{analysis.상위등급_어휘_개수}종류</strong></div>
          {/* 실제 분류는 고정된 어휘 등급 기준이다. 아이의 나이·또래 사용 빈도와 비교한 결과로 표현하지 않는다. */}
          <p>국립국어원 어휘 등급 자료를 바탕으로, 이야기 속 2·3등급 단어를 모았어요.</p>
          {analysis.상위등급_어휘_개수 === 0 && <p>이번 이야기에서 이 기준에 해당하는 단어는 찾지 못했어요.</p>}
          <ul className={styles.chips}>{analysis.상위등급_어휘_목록.map(w => <li key={w}>{w}</li>)}</ul>
        </section>
        <section className={styles.expression}><div className={styles.sectionHeading}><h3>느낌과 모습을 표현하는 말</h3><strong>{analysis.표현_어휘_개수}종류</strong></div>
          <p>장면이나 마음을 더 생생하게 그려주는 형용사·부사 표현들을 모았어요.</p>
          {analysis.표현_어휘_개수 === 0 && <p>이번 이야기에서 형용사·부사로 분류된 말은 없어요.</p>}
          <ul className={styles.chips}>{analysis.표현_어휘_목록.map(w => <li key={w}>{w}</li>)}</ul>
        </section>
        <p className={styles.note}>단어 목록은 같은 말을 한 번씩만 세고, 기본형으로 보여드려요. 아이의 능력이나 또래 순위를 평가한 결과는 아니에요.</p>
      </> : <section className={styles.pending} role="status"><BookOpen size={36} aria-hidden="true"/><h3>{error ? "분석 결과를 불러오지 못했어요" : "동화 속 단어를 살펴보고 있어요"}</h3><p>{error ? "연결을 확인한 뒤 다시 눌러 주세요. 책은 계속 읽을 수 있어요." : waiting ? "분석 준비에 조금 더 시간이 필요해요. 나중에 이 책에서 다시 확인할 수 있어요." : "이야기는 완성되었고, 단어 분석을 준비하고 있어요. 잠시 후 자동으로 확인할게요."}</p>{(error || waiting) && <button className={styles.retry} type="button" onClick={() => setRetry(v => v + 1)}>다시 확인</button>}</section>}
    </div>
  </dialog>
}
