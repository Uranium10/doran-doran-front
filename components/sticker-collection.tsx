"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Star, ArrowRight } from "lucide-react"
import { fetchStickers, type Sticker, type StickerBook } from "@/lib/stickers"
import { bookPath, isParentOrigin, type BookOrigin } from "@/lib/book-navigation"
import styles from "./sticker-book.module.css"

function StickerCard({ sticker, from }: { sticker: Sticker; from: BookOrigin }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const visible = sticker.image_url && sticker.image_url !== failedUrl
  return <article className={`${styles.sticker} ${sticker.reward_kind === "mastery" ? styles.mastery : ""}`}>
    <p className={styles.kind}>{sticker.reward_kind === "mastery" ? <><Star size={14}/>완벽한 한 권</> : <><Sparkles size={14}/>이야기 친구</>}</p>
    <div className={styles.art}>{visible ? <img src={sticker.image_url!} alt={`${sticker.speaker} 스티커`} loading="lazy" onError={() => setFailedUrl(sticker.image_url)}/> : <div className={styles.placeholder}><Sparkles size={46} strokeWidth={1}/><span>{sticker.asset_status === "failed" ? "그림 준비가 늦어지고 있어요" : sticker.asset_status === "ready" ? "그림을 다시 불러와 주세요" : "스티커를 만들고 있어요"}</span><small>획득 기록은 소중히 보관했어요</small></div>}</div>
    <blockquote className={styles.bubble}>{sticker.message}<cite>— {sticker.speaker}</cite></blockquote>
    <div className={styles.caption}><time dateTime={sticker.earned_at}>{new Date(sticker.earned_at).toLocaleDateString("ko-KR")} 획득</time>
      {sticker.story_available ? <Link href={bookPath(sticker.story_id,from)}>{sticker.title}</Link> : <span>{sticker.title}</span>}
    </div>
  </article>
}

/** 결과지와 스티커북이 같은 보상 데이터를 읽는다. 숨은 탭은 중지하고 자동 재조회는 최대 12회다. */
export function StickerCollection({ profileId, storyId, from="stickers" }: { profileId: string; storyId?: string; from?: BookOrigin }) {
  const [state, setState] = useState<{ data?: StickerBook; error?: string }>({})
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true, attempts = 0, inFlight = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    setState({})
    const refresh = async () => {
      if (!alive || inFlight || document.hidden) return
      inFlight = true
      clearTimeout(timer)
      try {
        const data = await fetchStickers(profileId, 0, storyId, controller.signal)
        if (!alive) return
        // 추가로 펼친 페이지는 유지한다. 첫 페이지의 준비된 이미지만 최신 값으로 교체한다.
        setState(old => ({ data: old.data && old.data.stickers.length > 24 ? { ...data, next_offset: old.data.next_offset, stickers: [...data.stickers, ...old.data.stickers.slice(24)] } : data }))
        attempts++
        if (attempts < 12 && data.stickers.some(s => s.asset_status === "queued" || s.asset_status === "running" || (s.asset_status === "ready" && !s.image_url))) timer = setTimeout(refresh, 10000)
      } catch { if (alive) setState(old => ({ ...old, error: "스티커 소식을 가져오지 못했어요." })) }
      finally { inFlight = false }
    }
    const visible = () => { if (!document.hidden) void refresh(); else clearTimeout(timer) }
    void refresh();document.addEventListener("visibilitychange", visible);window.addEventListener("focus", visible)
    return () => { alive = false;controller.abort();clearTimeout(timer);document.removeEventListener("visibilitychange", visible);window.removeEventListener("focus", visible) }
  }, [profileId, storyId, retry])
  const more = async () => {
    if (busy || state.data?.next_offset == null) return
    setBusy(true)
    try { const next = await fetchStickers(profileId, state.data.next_offset, storyId);setState(old => old.data ? { data: { ...next, stickers: [...old.data.stickers, ...next.stickers].filter((item,index,all)=>all.findIndex(s=>s.id===item.id)===index) } } : old) }
    catch { setState(old => ({ ...old, error: "다음 스티커를 가져오지 못했어요." })) }
    finally { setBusy(false) }
  }
  return <section className={storyId ? styles.rewards : ""} aria-label="획득한 스티커">
    {storyId && <div className={styles.rewardHeading}><h2>이야기 속 친구의 선물</h2><Link href={isParentOrigin(from)?"/stickers?from=parent":"/stickers"}>스티커북 보기 →</Link></div>}
    {state.error && <p role="alert">{state.error} <button onClick={() => setRetry(v => v + 1)} className="min-h-11 underline">다시 불러오기</button></p>}
    {!state.data && !state.error && <p role="status" className="py-8 text-center">스티커북을 펼치고 있어요…</p>}
    {state.data?.total === 0 && <div className={styles.empty}><img className={styles.emptyPicture} src="/images/stickers/reading-friends.webp" alt="이야기책을 함께 읽는 호랑이, 토끼, 도깨비" width="190" height="190"/><h3>첫 번째 이야기 친구를 기다려요</h3><p>동화 문제를 전부 맞히면<br/>이 동화의 스티커를 한 장 받아요.</p><small>다시 도전할 수 있어요. 같은 동화에서는 한 장만 받아요.</small><Link className={styles.emptyLink} href={isParentOrigin(from)?"/library?from=parent":"/library"}>이야기 만나러 가기 <ArrowRight size={17}/></Link></div>}
    {!!state.data?.total && <><p className={styles.count}><Star size={17} fill="currentColor" aria-hidden="true"/>소중히 모은 선물 {state.data.total}장</p><div className={styles.grid}>{state.data.stickers.map(sticker => <StickerCard from={from} key={sticker.id} sticker={sticker}/>)}</div><button className={styles.refresh} onClick={() => setRetry(v => v + 1)}>스티커 소식 새로고침</button></>}
    {state.data?.next_offset != null && <button className={styles.more} disabled={busy} onClick={more}>{busy ? "펼치는 중…" : "스티커 더 보기"}</button>}
  </section>
}
