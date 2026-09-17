"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, BookOpen, HeartHandshake, Check } from "lucide-react"
import { request, ApiError } from "@/lib/api"
import { useProfile } from "@/lib/profile-context"
import { getTierProgress } from "@/lib/levels"
import styles from "./parent-dashboard.module.css"

type Child = {
  id: string; name: string; avatar_url: string | null; level: number | null; guidance: string
  books_total: number; books_read: number; quizzes_completed: number
  skills: { name: string; total: number; correct: number }[]
  recent_results: { id: string; kind: string; created_at: string; correct_answers: number; total_questions: number; level_after: number }[]
}

/** 부모님 역할은 계정에 하나뿐이다. 아이가 없어도 진입할 수 있고 삭제 대상이 아니다. */
export function ParentDashboard() {
  const router = useRouter()
  const { selectProfile, accountId } = useProfile()
  const [state, setState] = useState<{ children?: Child[]; error?: string }>({})
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({})
    request<{ children: Child[] }>("/parent/overview", { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState(data)
    }).catch(e => {
      if (controller.signal.aborted) return
      if (e instanceof ApiError && e.status === 401) router.replace("/")
      else setState({ error: "성장 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." })
    })
    return () => controller.abort()
  }, [retry, router, accountId])
  return <div className={styles.page}>
    <header className={styles.nav}><Link href="/profiles"><ArrowLeft size={18}/> 프로필 선택</Link><Link href="/">도란도란</Link></header>
    <main className={styles.main}>
      <header className={styles.intro}><span className={styles.icon}><HeartHandshake size={34} strokeWidth={1.4}/></span><p>함께 자라는 이야기</p><h1>부모님 책방</h1><p>작은 읽기 경험이 쌓이는 모습을 함께 살펴보세요.</p></header>
      <p className={styles.note}>현재 로그인한 계정의 아이 기록이에요. 영역별 현황은 최근 문제 풀이 기록이며, 발달 진단이나 또래 비교는 아니에요.</p>
      {!state.children && !state.error && <p role="status">성장 기록을 가져오고 있어요…</p>}
      {state.error && <p role="alert">{state.error} <button className="underline" onClick={() => setRetry(v => v + 1)}>다시 불러오기</button></p>}
      {state.children?.length === 0 && <section className={styles.child}><h2>첫 읽기 여정을 준비해요</h2><p>아이 프로필을 추가하면 이곳에 성장 기록이 모여요.</p><Link href="/profiles" className={styles.link}>아이 프로필 추가하기 <ArrowRight size={18}/></Link></section>}
      {state.children?.map(child => <ChildPanel key={child.id} child={child} onBooks={() => {selectProfile(child.id);router.push("/dashboard")}} onResult={id => {selectProfile(child.id);router.push(`/results/${id}?from=parent`)}}/>)}
    </main>
  </div>
}

function ChildPanel({ child, onBooks, onResult }: { child: Child; onBooks: () => void; onResult: (id: string) => void }) {
  const progress = getTierProgress(child.level)
  const [draft, setDraft] = useState(child.guidance)
  const [saved, setSaved] = useState(child.guidance)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const save = async () => {
    if (saving) return
    setSaving(true);setMessage("")
    try {
      const data = await request<{ guidance: string }>(`/parent/profiles/${encodeURIComponent(child.id)}/guidance`, { method: "PUT", body: JSON.stringify({ guidance: draft }) })
      setSaved(data.guidance);setDraft(data.guidance);setMessage("저장했어요. 다음에 만드는 동화부터 참고해요.")
    } catch { setMessage("저장하지 못했어요. 입력은 그대로 남아 있으니 다시 시도해 주세요.") }
    finally { setSaving(false) }
  }
  return <section className={styles.child} aria-label={`${child.name} 성장 기록`}>
    <header className={styles.childHeader}><span className={styles.avatar}>{child.name.slice(0, 1)}</span><div><h2>{child.name}</h2><p>{progress?.currentLabel ?? "아직 측정 전이에요"}</p></div><button className={styles.link} onClick={onBooks}>책장으로 <ArrowRight size={17}/></button></header>
    <div className={styles.progressLabel}><span>다음 읽기 단계까지</span><strong>{progress ? `${progress.achievement}%` : "측정 전"}</strong></div>
    <div className={styles.track} role="progressbar" aria-label={`${child.name} 단계 진척도`} aria-valuenow={progress?.achievement ?? 0} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${progress?.achievement ?? 0}%`}}/></div>
    <div className={styles.stats}><div><BookOpen size={19}/><strong>{child.books_total}</strong><span>만든 동화</span></div><div><Check size={19}/><strong>{child.books_read}</strong><span>다 읽은 동화</span></div><div><strong>{child.quizzes_completed}</strong><span>문제까지 푼 동화</span></div></div>
    <div className={styles.columns}>
      <section><h3>영역별 풀이 기록</h3><p className={styles.hint}>최근 30회 · 정답 수 / 푼 문제 수</p>
        {child.skills.length ? child.skills.map(skill => <div className={styles.skill} key={skill.name}><div><span>{skill.name}</span><strong>{skill.correct} / {skill.total}</strong></div><div className={styles.track}><span style={{width:`${skill.total ? skill.correct / skill.total * 100 : 0}%`}}/></div></div>) : <p className={styles.empty}>문제를 풀면 영역별 기록이 차곡차곡 쌓여요. 부모님 체크리스트는 정답률에 포함하지 않아요.</p>}
        {child.recent_results.length > 0 && <><h3 className="mt-6">최근 결과지</h3><ul className={styles.results}>{child.recent_results.map(result => <li key={result.id}><button onClick={() => onResult(result.id)}><span>{new Date(result.created_at).toLocaleDateString("ko-KR",{ timeZone:"Asia/Seoul" })} · {result.kind === "post-story" ? "동화 퀴즈" : "읽기 단계 측정"}</span><ArrowRight size={16}/></button></li>)}</ul></>}
      </section>
      <form onSubmit={e => {e.preventDefault();void save()}}><label htmlFor={`guidance-${child.id}`} className={styles.formLabel}>동화에 담고 싶은 마음</label><p className={styles.hint}>좋아하는 소재, 격려하고 싶은 경험, 피하고 싶은 분위기를 적어 주세요. 아이의 어휘 단계와 안전 기준 안에서 참고해요.</p>
        <textarea id={`guidance-${child.id}`} value={draft} onChange={e => {setDraft(e.target.value);setMessage("")}} maxLength={1000} rows={5} disabled={saving} placeholder="예: 새로운 친구에게 먼저 인사하는 용기를 자연스럽게 담아 주세요. 무서운 장면은 피하고 싶어요."/>
        <div className={styles.formFooter}><span>{draft.length} / 1,000</span><button disabled={saving || draft === saved} type="submit">{saving ? "저장 중…" : "참고 사항 저장"}</button></div>
        <p role="status" className={styles.saveStatus}>{message || "주소나 연락처처럼 민감한 정보는 적지 않아도 돼요."}</p>
      </form>
    </div>
  </section>
}
