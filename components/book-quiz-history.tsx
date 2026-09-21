"use client"
import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, ClipboardList, X } from "lucide-react"
import { fetchBookQuizHistory, type BookSummary, type QuizHistoryEntry, type BookOrigin } from "@/lib/bookshelf"
import styles from "./book-quiz-history.module.css"

/** 버튼을 누른 책만 조회한다. 회차 생성/채점 없이 저장된 결과로 이동한다. */
export function BookQuizHistory({ book, profileId, onClose, from="library" }: { from?: BookOrigin; book: BookSummary; profileId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useId()
  const [state, setState] = useState<{ rows?: QuizHistoryEntry[]; error?: string }>({})
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const node = dialog.current
    const opener = document.activeElement as HTMLElement | null
    node?.showModal()
    return () => { node?.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setState({})
    fetchBookQuizHistory(profileId, book.story_id, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ rows: data.quiz_results }) })
      .catch(() => { if (!controller.signal.aborted) setState({ error: "문제 기록을 불러오지 못했어요." }) })
    // 다른 책/프로필로 전환한 뒤 이전 응답이 화면에 섞이지 않도록 취소한다.
    return () => controller.abort()
  }, [profileId, book.story_id, retry])
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={heading} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.content}>
      <button autoFocus type="button" onClick={onClose} className={styles.close} aria-label="문제 기록 닫기"><X size={22}/></button>
      <ClipboardList size={28} className="text-primary" aria-hidden="true"/>
      <h2 id={heading} className="mt-3 font-heading text-2xl">문제 기록</h2>
      <p className="mt-2 pr-8 text-sm text-muted-foreground">{book.title}</p>
      {state.error ? <div role="alert" className="mt-6"><p>{state.error}</p><button onClick={() => setRetry(v => v + 1)} className="mt-3 min-h-11 underline">다시 불러오기</button></div>
        : !state.rows ? <p role="status" className="py-8 text-sm">기록을 펼치고 있어요…</p>
        : state.rows.length === 0 ? <p className="py-8 text-sm text-muted-foreground">아직 이 동화의 문제 풀이 기록이 없어요.</p>
        : <ul className={styles.records}>{state.rows.map(row => <li key={row.id}><Link href={`/results/${encodeURIComponent(row.id)}?from=${from}`}>
          <span><span className="block text-xs text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" }) : "저장된 기록"}</span><strong className="mt-1 block font-heading text-lg">{row.reading_mode === "relaxed" ? "편하게 읽기 · " : row.is_practice ? "복습 · " : ""}{row.total_questions}문제 중 {row.correct_answers}문제 정답</strong></span>
          <span className="flex shrink-0 items-center gap-1 text-xs">답안 보기<ArrowRight size={16}/></span>
        </Link></li>)}</ul>}
    </div>
  </dialog>
}
