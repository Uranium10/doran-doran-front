"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Plus, Sprout } from "lucide-react"
import { useProfile } from "@/lib/profile-context"
import { useGeneration } from "@/lib/generation-context"
import { isGuestProfile } from "@/lib/api"
import { getTierProgress } from "@/lib/levels"
import { fetchBookshelf, bookPath, type Bookshelf } from "@/lib/bookshelf"
import { readingLabel } from "@/lib/book-status"
import { BookCover } from "./book-cover"
import { StoryGenerationCard } from "./workpad/story-generation-card"
import styles from "./bookshelf.module.css"

export function MyBookshelf({ onCreate }: { onCreate: () => void }) {
  const { currentProfile: profile } = useProfile()
  const generation = useGeneration()
  const [state,setState] = useState<{ profileId?: string; data?: Bookshelf; error?: string }>({})
  const [retry,setRetry] = useState(0)
  const progress = getTierProgress(profile?.level ?? null)
  const profileId = profile?.id
  useEffect(() => {
    if (!profileId || isGuestProfile(profileId)) return
    let active = true
    setState({ profileId })
    let version=0
    const refresh=() => {
      const requestVersion=++version
      fetchBookshelf(profileId,0,7).then(data => { if(active && version===requestVersion) setState({ profileId,data }) })
        .catch(() => { if(active && version===requestVersion) setState({ profileId,error:"책장 소식을 가져오지 못했어요." }) })
    }
    const saved=(event: Event) => { if((event as CustomEvent).detail?.profileId===profileId) refresh() }
    const visible=() => { if(!document.hidden) refresh() }
    refresh()
    window.addEventListener("doran-reading-saved",saved);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",visible)
    return () => { active=false;window.removeEventListener("doran-reading-saved",saved);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",visible) }
  },[profileId,generation.job?.job_id,generation.job?.status,retry])
  if (!profile) return null
  const data = state.profileId === profile.id ? state.data : undefined
  const generating = generation.job?.status === "queued" || generation.job?.status === "running"
  return <div>
    <section className="mb-8 flex flex-wrap items-center gap-5 rounded-3xl border border-border bg-card px-6 py-5 shadow-sm" aria-label="현재 읽기 단계">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Sprout size={30}/></span>
      <div className="min-w-44 flex-1">
        <p className="text-xs text-muted-foreground">{profile.name}님의 읽기 여정</p>
        <div className="mt-1 flex items-baseline justify-between gap-3"><h1 className="font-heading text-xl">{progress?.currentLabel ?? "첫 이야기를 준비해요"}</h1><span className="text-xs text-muted-foreground">{progress?.nextLabel ?? (progress ? "최고 단계" : "측정 전")}</span></div>
        <p className="mt-2 text-right text-sm text-muted-foreground">단계 진척도 <strong className="ml-2 text-2xl font-semibold tabular-nums text-accent">{progress ? `${progress.achievement}%` : "—"}</strong></p><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="다음 읽기 단계까지 진척도" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress?.achievement ?? 0}><div className="h-full rounded-full bg-accent" style={{width:`${progress?.achievement ?? 0}%`}}/></div>
      </div>
      {/* 안내는 절대 위치로 겹쳐 그려 마우스를 올려도 버튼/카드 크기가 변하지 않는다. */}
      <div className={styles.measureWrap}>
        {data?.measured_today ? <><button type="button" aria-disabled="true" aria-describedby="daily-measure-tip" className={styles.measureButton}>다시 측정</button><span role="tooltip" id="daily-measure-tip" className={styles.measureTip}>문해력 재측정은<br/>하루 한 번 할 수 있어요</span></> : <Link href="/literacy" className={styles.measureButton}>{progress ? "다시 측정" : "단계 알아보기"}</Link>}
      </div>
    </section>
    {data?.resume && <Link href={bookPath(data.resume.story_id,"dashboard")} className="mb-8 flex items-center gap-5 rounded-3xl bg-[#e8efea] px-5 py-4 text-[#315447] transition-colors hover:bg-[#dce8df]">
      <BookOpen size={30} strokeWidth={1.5}/><span className="min-w-0 flex-1"><span className="text-xs">아직 끝나지 않은 모험</span><strong className="mt-1 block truncate font-heading text-xl">{data.resume.title}</strong></span><span className="flex items-center gap-1 text-sm">이어 읽기 <ArrowRight size={18}/></span>
    </Link>}
    {(generating || data?.latest_unread) && <div className="mb-8"><StoryGenerationCard bookshelfMode latestUnread={data?.latest_unread}/></div>}
    <div className="mb-5 flex items-end justify-between"><div><p className="text-xs tracking-widest text-primary">나만의 작은 책방</p><h2 className="mt-2 font-heading text-3xl">내 책장</h2></div><Link href="/library" className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-primary">전체 보기{data ? ` · ${data.total}권` : ""}<ArrowRight size={16}/></Link></div>
    {state.error && <p role="alert" className="mb-4 text-sm">{state.error} <button className="underline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</button></p>}
    <div className={styles.shelf}>
      <div className={styles.slot}><button onClick={onCreate} className={styles.create}><Plus size={32} strokeWidth={1.3}/><span>새 이야기</span><span className="text-xs font-sans opacity-75">상상을 한 권에 담아요</span></button></div>
      {data?.stories.map(book=><div className={styles.slot} key={book.story_id}><Link href={bookPath(book.story_id,"dashboard")} aria-label={`${book.title} 읽기`}><BookCover book={book}/></Link><p className={styles.bookLabel}>{readingLabel(book)}</p></div>)}
      {!data && !state.error && !isGuestProfile(profile.id) && [0,1,2].map(i=><div key={i} className={styles.slot}><div className="aspect-[3/4] animate-pulse rounded-xl bg-[#dbc9b3]" aria-label="책장 불러오는 중"/></div>)}
    </div>
    {data?.total===0 && <p className="mt-5 text-center text-sm text-muted-foreground">첫 이야기를 만들어 이 책장을 채워 보세요.</p>}
    {data?.latest_result && <Link href={`/results/${data.latest_result.id}?from=dashboard`} className="mt-7 flex min-h-12 items-center justify-between rounded-2xl border border-border bg-card p-4 text-sm"><span>최근에 풀었던 문제와 답안</span><ArrowRight size={18}/></Link>}
  </div>
}
