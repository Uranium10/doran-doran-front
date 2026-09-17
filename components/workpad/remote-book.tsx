"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useProfile } from "@/lib/profile-context"
import { fetchReading, saveReading } from "@/lib/bookshelf"
import { validBookmark, type BookBookmark } from "@/lib/book-layout"
import { PopupBook } from "./popup-book"
import type { ComponentProps } from "react"

type LocalPosition = { bookmark: BookBookmark; pending: boolean }
// 책을 닫은 직후 다시 열어도 같은 책의 마지막 쓰기 다음에 이어서 저장한다.
const writes = new Map<string, Promise<unknown>>()
export function RemoteBook(props: ComponentProps<typeof PopupBook> & { storyId: string; profileId: string }) {
  const { sessionScope } = useProfile()
  const key = `${sessionScope}:server-reading:${props.storyId}`
  const [loaded,setLoaded] = useState<{ key: string; bookmark?: BookBookmark } | null>(null)
  const pending = useRef<BookBookmark | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warned = useRef(false)
  const active = useRef(true)
  const persist = useCallback((bookmark: BookBookmark) => {
    const task = (writes.get(key) ?? Promise.resolve()).catch(()=>{}).then(()=>saveReading(props.profileId,props.storyId,bookmark))
    writes.set(key,task)
    void task.then(()=>{
      // 뒤늦게 끝난 저장이 더 최신의 로컬 책갈피를 덮어쓰지 않게 한다.
      try { const raw=JSON.parse(sessionStorage.getItem(key)??"null") as LocalPosition|null
        if(raw && JSON.stringify(raw.bookmark)===JSON.stringify(bookmark)) sessionStorage.setItem(key,JSON.stringify({bookmark,pending:false}))
      } catch {}
      warned.current=false
    }).catch(()=>{
      if(active.current && !warned.current) { warned.current=true; toast.error("읽던 위치는 이 기기에 남겼어요. 서버 저장은 다시 시도할게요.") }
    }).finally(()=>{ if(writes.get(key)===task) writes.delete(key) })
    return task
  },[key,props.profileId,props.storyId])
  useEffect(()=>{
    active.current=true
    let alive=true
    const local = (): LocalPosition | null => {
      try { const value=JSON.parse(sessionStorage.getItem(key)??"null"); return validBookmark(value?.bookmark) ? value : null } catch {return null}
    }
    // 이전 화면의 마지막 저장을 기다려 서버의 오래된 위치를 복구하지 않는다.
    void (writes.get(key)??Promise.resolve()).catch(()=>{}).then(()=>fetchReading(props.profileId,props.storyId)).then(({progress})=>{
      if(!alive)return
      const saved=local()
      let bookmark=saved?.pending ? saved.bookmark : progress?.bookmark ?? saved?.bookmark
      // 마지막 장에 머문 완독+풀이 완료 책만 새로 펼친다. 다시 읽던 중간 위치는 보존한다.
      if (bookmark?.kind === "ending" && progress?.completed_at && (progress.quiz_completed || !props.hasQuiz)) bookmark={kind:"cover"}
      setLoaded({key,bookmark})
      if(saved?.pending) void persist(saved.bookmark).catch(()=>{})
    }).catch(()=>{
      if(alive) {setLoaded({key,bookmark:local()?.bookmark});toast.error("서버 책갈피를 불러오지 못해 이 기기의 위치에서 열었어요.")}
    })
    const flush=()=>{if(timer.current)clearTimeout(timer.current);if(pending.current){const b=pending.current;pending.current=null;void persist(b).catch(()=>{})}}
    const visibility=()=>{if(document.visibilityState==='hidden')flush()}
    const retry=()=>{const saved=local();if(saved?.pending)void persist(saved.bookmark).catch(()=>{})}
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',visibility);window.addEventListener('online',retry)
    return ()=>{alive=false;active.current=false;flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',retry)}
  },[key,props.profileId,props.storyId,props.hasQuiz,persist])
  const change = (bookmark: BookBookmark) => {
    try {sessionStorage.setItem(key,JSON.stringify({bookmark,pending:true}))} catch {}
    pending.current=bookmark
    if(timer.current)clearTimeout(timer.current)
    // 빠른 장 넘김을 묶되 책을 닫을 때에는 마지막 위치를 즉시 저장한다.
    timer.current=setTimeout(()=>{pending.current=null;void persist(bookmark).catch(()=>{})},650)
  }
  if(loaded?.key!==key)return <div className="py-20 text-center" role="status">읽던 책갈피를 찾고 있어요…</div>
  return <PopupBook {...props} initialBookmark={loaded.bookmark} onBookmarkChange={change}/>
}
