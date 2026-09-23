"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, BookOpen, Search, X } from "lucide-react"
import { request } from "@/lib/api"
import { useProfile } from "@/lib/profile-context"
import { useSessionView, objectValue } from "@/lib/use-session-view"
import { dictionaryPath, dictionaryLastOffset, WORD_POS, wordKey, type DictionaryWord, type DictionaryPage } from "@/lib/word-dictionary"
import { AppHeader } from "./app-header"
import { PdfDownloadButton } from "./pdf-download-button"
import { ProfileRecovery } from "./profile-recovery"
import styles from "./parent-vocabulary.module.css"

function useDictionary(profileId: string, pos = "", query = "", offset = 0, limit = 24) {
  const [state, setState] = useState<{key: string; data?: DictionaryPage; error?: string}>({key: ""})
  const [retry, setRetry] = useState(0)
  const key = JSON.stringify([profileId, pos, query, offset, limit, retry])
  useEffect(() => {
    const controller = new AbortController()
    // 입력 중에는 검색 요청을 합치고, 아이/필터가 바뀐 이전 응답은 폐기한다.
    const timer = setTimeout(() => {
      const params = new URLSearchParams({pos, q: query.trim(), offset: String(offset), limit: String(limit)})
      request<DictionaryPage>(`/parent/profiles/${encodeURIComponent(profileId)}/vocabulary?${params}`, {signal: controller.signal})
        .then(data => { if (!controller.signal.aborted) setState({key, data}) })
        .catch(() => { if (!controller.signal.aborted) setState({key, error: "낱말 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."}) })
    }, query ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [key, profileId, pos, query, offset, limit])
  return {data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined,
    summary: state.data?.profile_id === profileId ? state.data.summary : undefined,
    reload: () => setRetry(n => n + 1)}
}

export function VocabularyPanel({profileId}: {profileId: string}) {
  const {data, error, reload} = useDictionary(profileId, "", "", 0, 6)
  const [word, setWord] = useState<DictionaryWord | null>(null)
  return <section className={styles.preview} aria-labelledby="word-preview-title">
    <div className={styles.previewHeading}><span className={styles.bookIcon}><BookOpen size={23}/></span><div>
      <h2 id="word-preview-title">책에서 만난 낱말</h2><p>읽은 이야기들이 작은 도감으로 모여요.</p>
    </div><Link href={dictionaryPath(profileId)}>낱말 도감 보기 <ArrowRight size={15}/></Link></div>
    {error ? <p role="alert">{error} <button onClick={reload}>다시 불러오기</button></p> : !data ? <p role="status">낱말을 모으고 있어요…</p> : <>
      <p className={styles.counts}>지금까지 <strong>{data.summary.total_words.toLocaleString()}</strong>종류 <span>이번 주 새로 만난 말 <b>{data.summary.new_this_week}</b>종류</span></p>
      {data.items.length ? <div className={styles.chips}>{data.items.map(w => <button key={wordKey(w)} onClick={() => setWord(w)}>{w.word}<span>{w.pos}</span></button>)}</div>
        : <p className={styles.note}>{data.summary.pending_books ? "읽은 책의 낱말을 정리하고 있어요. 분석이 끝나면 여기에 모여요." : data.summary.completed_books ? "읽은 책에서 등급 자료에 해당하는 낱말을 아직 찾지 못했어요." : "동화를 끝까지 읽으면 만난 낱말이 여기에 모여요."}</p>}
      {!!data.summary.pending_books && <p className={styles.note}>{data.summary.pending_books}권 분석 대기 중 · <button onClick={reload}>다시 확인</button></p>}
    </>}
    {word && <WordDetail word={word} onClose={() => setWord(null)}/>}
  </section>
}

function WordDetail({word, onClose}: {word: DictionaryWord; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const d=ref.current; d?.showModal(); return () => d?.close() }, [])
  const date = (s: string) => new Intl.DateTimeFormat("ko-KR", {timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric"}).format(new Date(s))
  return <dialog ref={ref} className={styles.dialog} onCancel={onClose} aria-labelledby="word-detail-title" onClick={e => {
    if (e.target === e.currentTarget) { const r=e.currentTarget.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) onClose() }
  }}>
    <button className={styles.close} aria-label="낱말 상세 닫기" onClick={onClose}><X/></button>
    <span className={styles.eyebrow}>{word.pos} · 어휘 자료 {word.grade}등급</span><h2 id="word-detail-title">{word.word}</h2>
    <p className={styles.detailCount}>읽은 동화 <b>{word.story_count}편</b>에 총 <b>{word.occurrence_count}번</b> 등장했어요.</p>
    <section className={styles.quote}><h3>이야기에서는 이렇게 쓰였어요</h3><p>{word.example}</p><small>《{word.story_title}》 · {word.scene_index + 1}장</small></section>
    {!!word.definitions.length && <section className={styles.meaning}><h3>사전에서 살펴본 뜻</h3>{word.definitions.map((d,i) => <p key={i}>{d}</p>)}<small>국립국어원 어휘 등급 자료에 수록된 뜻이에요. 여러 뜻이 함께 있을 수 있으니 이야기 문장과 함께 살펴보세요.</small></section>}
    <p className={styles.note}>처음 만난 날 · {date(word.first_seen_at)}<br/>마지막으로 만난 날 · {date(word.last_seen_at)}</p>
  </dialog>
}

export function ParentVocabularyPage({profileId}: {profileId: string}) {
  const {accountId, profiles, loading, error} = useProfile()
  const router = useRouter()
  useEffect(() => {if (!loading && !error && !accountId) router.replace("/")}, [loading,error,accountId,router])
  if (!accountId || loading) return <ProfileRecovery/>
  const child = profiles.find(p => p.id === profileId)
  return <div className={styles.page}><AppHeader/>{child ? <DictionaryWorkspace key={`${accountId}:${child.id}`} accountId={accountId} profileId={child.id} name={child.name}/>
    : <main className={styles.main}><Link href="/parent">부모님 책방으로</Link><p>이 아이의 기록을 열 수 없어요. 부모님 책방에서 프로필을 다시 선택해 주세요.</p></main>}</div>
}

export function DictionaryWorkspace({accountId, profileId, name}: {accountId: string; profileId: string; name: string}) {
  const {profiles} = useProfile(), router=useRouter()
  const parentView = useSessionView<{childId:string}>(`doran-view:${accountId}:parent`, {childId:""}, (v):v is {childId:string} => objectValue(v) && typeof v.childId === "string")
  const [pos,setPos]=useState(""),[query,setQuery]=useState(""),[offset,setOffset]=useState(0),[word,setWord]=useState<DictionaryWord|null>(null)
  const {data,error,reload,summary}=useDictionary(profileId,pos,query,offset)
  useEffect(() => { if (parentView.ready && parentView.value.childId !== profileId) parentView.setValue({childId:profileId}) }, [parentView.ready,parentView.value.childId,parentView.setValue,profileId])
  useEffect(() => { if(data && offset>dictionaryLastOffset(data.total)) setOffset(dictionaryLastOffset(data.total)) },[data,offset])
  return <main className={styles.main}>
    <div className={styles.topline}><Link href="/parent"><ArrowLeft size={16}/> 성장 기록으로</Link><div className={styles.topActions}><label>기록을 살펴볼 아이 <select value={profileId} onChange={e=>router.replace(dictionaryPath(e.target.value))}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><PdfDownloadButton path={`/exports/vocabulary.pdf?profile_id=${encodeURIComponent(profileId)}&pos=${encodeURIComponent(pos)}&q=${encodeURIComponent(query.trim())}`} filename={`${name}-낱말 도감.pdf`} label={pos||query.trim()?"이 낱말 PDF":"낱말 도감 PDF"} className={styles.pdf}/></div></div>
    <header className={styles.hero}><span className={styles.eyebrow}>이야기 한 권, 낱말 한 줌</span><h1>{name}의 낱말 도감</h1><p>읽은 동화에서 만난 말을, 그때의 문장과 함께 꺼내 보세요.</p>
      <div className={styles.heroStats}><span>모인 낱말 <strong>{summary?.total_words.toLocaleString() ?? "—"}</strong>종류</span><span>이번 주 처음 만난 말 <strong>{summary?.new_this_week ?? "—"}</strong>종류</span></div>
    </header>
    <div className={styles.toolbar}><nav aria-label="낱말 품사 선택">{["",...WORD_POS].map(p=><button key={p} aria-pressed={pos===p} onClick={()=>{setPos(p);setOffset(0)}}>{p||"전체"}<small>{summary ? p ? summary.by_pos[p as typeof WORD_POS[number]] ?? 0 : summary.total_words : "—"}</small></button>)}</nav>
      <label className={styles.search}><Search size={17}/><input aria-label="낱말 검색" placeholder="찾고 싶은 낱말" maxLength={80} value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></label></div>
    {error ? <div className={styles.empty} role="alert"><p>{error}</p><button onClick={reload}>다시 불러오기</button></div>
      : !data ? <p className={styles.empty} role="status">도감을 펼치고 있어요…</p> : <>
        {!!data.summary.pending_books && <p className={styles.pending}>{data.summary.pending_books}권의 낱말을 분석하고 있어요. 준비된 책부터 보여드려요. <button onClick={reload}>다시 확인</button></p>}
        {data.items.length ? <div className={styles.words}>{data.items.map(w=><button className={styles.word} key={wordKey(w)} onClick={()=>setWord(w)}><span>{w.pos}</span><h2>{w.word}</h2><p>{w.example}</p><small>동화 {w.story_count}편에서 만났어요 <ArrowRight size={15}/></small></button>)}</div>
          : <div className={styles.empty}><BookOpen size={32}/><h2>{query || pos ? "이 조건에 맞는 낱말이 없어요" : "첫 낱말을 기다리고 있어요"}</h2><p>{query || pos ? "다른 낱말이나 품사로 찾아보세요." : data.summary.pending_books ? "읽은 책의 분석이 끝나면 도감이 채워져요." : data.summary.completed_books ? "등급 자료에 해당하는 낱말이 모이면 보여드릴게요." : "동화를 끝까지 읽으면, 그 안에서 만난 낱말이 여기에 모여요."}</p></div>}
        {data.total>24 && <nav className={styles.pagination} aria-label="낱말 도감 페이지"><button disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-24))}>이전</button><span>{Math.floor(offset/24)+1} / {Math.ceil(data.total/24)}</span><button disabled={offset+24>=data.total} onClick={()=>setOffset(n=>n+24)}>다음</button></nav>}
      </>}
    <p className={styles.footnote}>완독 기록이 있는 동화의 본문을 기준으로, 기본형·품사가 같은 말은 한 종류로 모아요.<br/>등급 자료와 일치한 낱말을 보여드리며, 아이가 뜻을 이해하거나 익혔는지를 평가한 수치는 아니에요.</p>
    {word && <WordDetail word={word} onClose={()=>setWord(null)}/>}
  </main>
}
