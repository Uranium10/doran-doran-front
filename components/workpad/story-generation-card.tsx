"use client"

import Link from "next/link"
import { bookPath, type BookSummary } from "@/lib/bookshelf"
import { PaperTheatre } from "./paper-theatre"
import { useGeneration } from "@/lib/generation-context"
import { useProfile } from "@/lib/profile-context"
import { generationMessage } from "@/lib/generation-messages"
import styles from "./story-generation-card.module.css"

/** 시작/단계 변경/완료가 같은 DOM과 극장을 공유해 인형·높이·일시정지 상태를 보존한다. */
export function StoryGenerationCard({ bookshelfMode = false, latestUnread, finishing = false }: { bookshelfMode?: boolean; latestUnread?: BookSummary | null; finishing?: boolean } = {}) {
  const { job, error, connectionLost, dismiss, openStory } = useGeneration()
  const { profiles } = useProfile()
  const name = profiles.find(p => p.id === job?.profile_id)?.name ?? "우리 아이"
  const active = job?.status === "queued" || job?.status === "running"
  const failed = job?.status === "failed" || (!job && Boolean(error))
  const done = !failed && (bookshelfMode ? !active && !finishing && Boolean(latestUnread) : job?.status === "completed" && Boolean(job.result))
  if (bookshelfMode && !active && !finishing && !failed && !latestUnread) return null
  const safetyBlocked = failed && job?.error_code === "safety_blocked"
  const title = done ? "따끈한 동화가 완성되었어요!" : failed ? safetyBlocked ? "다른 소재로 이야기를 만들어 볼까요?" : "이야기를 잠시 쉬어 가고 있어요" : finishing ? "따끈한 동화를 책장에 놓고 있어요" : `${name}님의 동화를 짓고 있어요`
  const message = done ? latestUnread?.title ?? "책장에 새 이야기가 도착했어요. 함께 펼쳐 볼까요?" : finishing ? "완성된 책을 펼칠 준비를 하고 있어요." : failed ? error ?? "이번 동화를 완성하지 못했어요. 다시 시작해 주세요." : generationMessage(job?.stage ?? "queued")
  const helper = connectionLost ? "책방 소식을 다시 확인하고 있어요. 잠시만 기다려 주세요." : done ? "아직 펼치지 않은 새 이야기가 기다려요." : finishing ? "책장 정보가 도착하면 바로 펼칠 수 있어요." : failed ? "" : job?.mode === "legacy" ? "다른 메뉴를 둘러봐도 괜찮아요. 이 페이지를 새로고침하지는 말아 주세요." : "다른 곳을 둘러봐도 동화는 계속 만들어져요. 완성되면 알려 드릴게요."
  return <div className={styles.card} aria-busy={active || finishing} data-generation-card data-testid={done && bookshelfMode ? "unread-story-card" : "generation-card"}>
    <PaperTheatre stopped={done || failed || finishing}/>
    <h2 className={styles.title}>{title}</h2>
    <p role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"} className={styles.message}>{message}</p>
    <p className={styles.helper}>{helper}</p>
    <div className={styles.actions}>
      {done && (bookshelfMode && latestUnread ? <Link href={bookPath(latestUnread.story_id,"dashboard")} className={styles.primary}>동화 읽기</Link> : job && <><button type="button" onClick={() => openStory(job)} className={styles.primary}>동화 읽기</button><button type="button" onClick={dismiss} className={styles.secondary}>나중에 읽기</button></>)}
      {failed && <button type="button" onClick={dismiss} className={styles.primary}>확인</button>}
    </div>
  </div>
}
