"use client"

import { BookOpen, Sparkles } from "lucide-react"
import { useGeneration } from "@/lib/generation-context"
import { useProfile } from "@/lib/profile-context"
import { generationMessage } from "@/lib/generation-messages"

/** 대시보드의 '동화 만들기' 카드 자리만 바꾼다. 주변 메뉴와 다른 화면 이동은 그대로 둔다. */
export function StoryGenerationCard() {
  const { job, error, connectionLost, dismiss, openStory } = useGeneration()
  const { profiles } = useProfile()
  const name = profiles.find(p => p.id === job?.profile_id)?.name ?? "우리 아이"
  const done = job?.status === "completed" && Boolean(job.result)
  const failed = job?.status === "failed" || (!job && Boolean(error))
  return <div className="mt-10 overflow-hidden rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-md" aria-busy={!done && !failed}>
    <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
      {done ? <BookOpen className="h-9 w-9 text-primary" /> : <Sparkles className={`h-9 w-9 text-primary ${failed ? "" : "motion-safe:animate-pulse"}`} />}
    </span>
    <h2 className="mt-5 font-heading text-2xl text-foreground">{done ? "따끈한 동화가 완성되었어요!" : failed ? "이야기를 잠시 쉬어 가고 있어요" : `${name}님의 동화를 짓고 있어요`}</h2>
    <p role="status" aria-live="polite" className="mt-4 font-heading text-lg text-primary">
      {done ? "책장에 새 이야기가 도착했어요. 함께 펼쳐 볼까요?" : failed ? (error ?? "이번 동화를 완성하지 못했어요. 다시 시작해 주세요.") : generationMessage(job?.stage ?? "queued")}
    </p>
    {!done && !failed && <p className="mt-3 text-sm text-muted-foreground">
      {job?.mode === "legacy" ? "다른 메뉴를 둘러봐도 괜찮아요. 이 페이지를 새로고침하지는 말아 주세요." : "다른 곳을 둘러봐도 동화는 계속 만들어져요. 완성되면 알려 드릴게요."}
    </p>}
    {connectionLost && <p className="mt-3 text-sm text-muted-foreground">책방 소식을 다시 확인하고 있어요. 새 동화를 중복으로 요청하지 않고 기다릴게요.</p>}
    {done && job && <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={() => openStory(job)} className="rounded-full bg-primary px-7 py-3 font-medium text-primary-foreground">동화 읽기</button>
      <button type="button" onClick={dismiss} className="rounded-full border border-border px-6 py-3 text-muted-foreground">나중에 읽기</button>
    </div>}
    {failed && <button type="button" onClick={dismiss} className="mt-6 rounded-full bg-primary px-7 py-3 text-primary-foreground">다시 만들기</button>}
  </div>
}
