"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { useProfile } from "@/lib/profile-context"
import { useGeneration } from "@/lib/generation-context"
import { isGuestProfile } from "@/lib/api"
import { DashboardSummary } from "./dashboard-summary"
import { fetchBookshelf, bookPath, type Bookshelf } from "@/lib/bookshelf"
import { readingLabel } from "@/lib/book-status"
import { BookCover } from "./book-cover"
import { StoryGenerationCard } from "./workpad/story-generation-card"
import styles from "./bookshelf.module.css"

export function MyBookshelf({ onCreate }: { onCreate: () => void }) {
  const { currentProfile: profile } = useProfile()
  const generation = useGeneration()
  const [state,setState] = useState<{ profileId?: string; data?: Bookshelf; error?: string; jobKey?: string }>({})
  const [retry,setRetry] = useState(0)
  const profileId = profile?.id
  const jobKey = `${generation.job?.job_id ?? ""}:${generation.job?.status ?? ""}`
  const generating = generation.job?.status === "queued" || generation.job?.status === "running"
  const lastActiveJob = useRef<string | null>(null)
  useEffect(() => {
    if (generating) lastActiveJob.current = generation.job?.job_id ?? null
  }, [generating, generation.job?.job_id])
  useEffect(() => {
    if (!profileId || isGuestProfile(profileId)) return
    let active = true
    // 같은 아이의 책장은 새 응답이 올 때까지 유지한다. 폴링마다 비우면 극장과 책들이 재생성된다.
    setState(previous => previous.profileId === profileId ? previous : { profileId })
    let version=0
    const refresh=() => {
      const requestVersion=++version
      fetchBookshelf(profileId,0,7).then(data => { if(active && version===requestVersion) setState({ profileId,data,jobKey }) })
        .catch(() => { if(active && version===requestVersion) setState(previous => ({ ...(previous.profileId === profileId ? previous : {}), profileId,error:"책장 소식을 가져오지 못했어요." })) })
    }
    const saved=(event: Event) => { if((event as CustomEvent).detail?.profileId===profileId) refresh() }
    const visible=() => { if(!document.hidden) refresh() }
    refresh()
    window.addEventListener("doran-reading-saved",saved);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",visible)
    return () => { active=false;window.removeEventListener("doran-reading-saved",saved);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",visible) }
  },[profileId,jobKey,retry])
  if (!profile) return null
  const data = state.profileId === profile.id ? state.data : undefined
  // 이 화면에서 진행을 지켜본 작업만 완료→책장 갱신 사이를 연결한다.
  // 첫 방문 때 남아 있는 오래된 완료 job으로 카드를 다시 띄우지는 않는다.
  const finishing = generation.job?.status === "completed" && lastActiveJob.current === generation.job.job_id && state.jobKey !== jobKey
  return <div>
    <DashboardSummary profile={profile} data={data}/>
    {(generating || finishing || data?.latest_unread) && <div className="mb-8"><StoryGenerationCard bookshelfMode finishing={finishing} latestUnread={data?.latest_unread}/></div>}
    <div className="mb-5 flex items-end justify-between"><div><p className="text-xs tracking-widest text-primary">나만의 작은 책방</p><h2 className="mt-2 font-heading text-3xl">내 책장</h2></div><Link href="/library" className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-primary">전체 보기{data ? ` · ${data.total}권` : ""}<ArrowRight size={16}/></Link></div>
    {state.error && <p role="alert" className="mb-4 text-sm">{state.error} <button className="underline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</button></p>}
    <div className={styles.shelf}>
      <div className={styles.slot}><button onClick={onCreate} className={styles.create}><Plus size={32} strokeWidth={1.3}/><span>새 이야기</span><span className="text-xs font-sans opacity-75">상상을 한 권에 담아요</span></button></div>
      {data?.stories.map(book=><div className={styles.slot} key={book.story_id}><Link href={bookPath(book.story_id,"dashboard")} aria-label={`${book.title} 읽기`}><BookCover book={book}/></Link><p className={styles.bookLabel}>{readingLabel(book)}</p></div>)}
      {!data && !state.error && !isGuestProfile(profile.id) && [0,1,2].map(i=><div key={i} className={styles.slot}><div className="aspect-[3/4] animate-pulse rounded-xl bg-[#dbc9b3]" aria-label="책장 불러오는 중"/></div>)}
    </div>
    {data?.total===0 && <p className="mt-5 text-center text-sm text-muted-foreground">첫 이야기를 만들어 이 책장을 채워 보세요.</p>}

  </div>
}
