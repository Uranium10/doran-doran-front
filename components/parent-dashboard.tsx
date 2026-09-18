"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Leaf, PencilLine, ClipboardList } from "lucide-react"
import { request, ApiError } from "@/lib/api"
import { useProfile } from "@/lib/profile-context"
import { getTierProgress } from "@/lib/levels"
import { useSessionView, objectValue } from "@/lib/use-session-view"
import { ProfileRecovery } from "./profile-recovery"
import styles from "./parent-dashboard.module.css"

type Child = {
  id: string; name: string; avatar_url: string | null; level: number | null; guidance: string
  books_total: number; books_read: number; quizzes_completed: number
  skills: { name: string; total: number; correct: number }[]
  recent_results: { id: string; kind: string; created_at: string; correct_answers: number; total_questions: number; level_after: number }[]
}
const TABS = [
  { id: "growth", label: "읽기 성장", icon: Leaf },
  { id: "results", label: "문제 풀이", icon: ClipboardList },
  { id: "guidance", label: "동화 설정", icon: PencilLine },
] as const
type Tab = typeof TABS[number]["id"]
type View = { childId: string; tab: Tab }
type Editor = { draft: string; saved: string; saving: boolean; message: string; failed: boolean }
const editorFor = (child: Child): Editor => ({ draft: child.guidance, saved: child.guidance, saving: false, message: "", failed: false })
const percent = (correct: number, total: number) => total > 0 ? Math.max(0, Math.min(100, Math.round(correct / total * 100))) : 0

/** 계정 전환 시 다른 계정의 기록/작성 중 입력을 남기지 않는다. */
export function ParentDashboard() {
  const { accountId, selectProfile, loading, error } = useProfile()
  const router = useRouter()
  useEffect(() => { if (!loading && !error && !accountId) router.replace("/") }, [loading, error, accountId, router])
  if (!accountId) return <ProfileRecovery/>
  return <ParentWorkspace key={accountId ?? "pending"} accountId={accountId} selectProfile={selectProfile}/>
}

function ParentWorkspace({ accountId, selectProfile }: { accountId: string | null; selectProfile: (id: string) => void }) {
  const router = useRouter()
  const [state, setState] = useState<{ children?: Child[]; error?: string }>({})
  const [retry, setRetry] = useState(0)
  const [editors, setEditors] = useState<Record<string, Editor>>({})
  const mounted = useRef(false)
  const prefix = useId()
  // 선택 위치만 세션에 보관한다. 부모님의 참고 사항은 브라우저 저장소에 넣지 않는다.
  const view = useSessionView<View>(accountId ? "doran-view:" + accountId + ":parent" : null, { childId: "", tab: "growth" },
    (v): v is View => objectValue(v) && typeof v.childId === "string" && TABS.some(t => t.id === v.tab))
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!accountId) return
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

  const child = state.children?.find(c => c.id === view.value.childId) ?? state.children?.[0]
  const tab = view.value.tab
  const progress = child ? getTierProgress(child.level) : null
  const editor = child ? editors[child.id] ?? editorFor(child) : null
  const edit = (target: Child, update: Partial<Editor>) => {
    if (mounted.current) setEditors(previous => ({ ...previous, [target.id]: { ...(previous[target.id] ?? editorFor(target)), ...update } }))
  }
  const save = async () => {
    if (!child || !editor || editor.saving || editor.draft === editor.saved) return
    // 저장 중 프로필을 바꿔도 응답은 처음 저장한 아이에게만 반영한다.
    const target = child, draft = editor.draft
    edit(target, { saving: true, message: "", failed: false })
    try {
      const data = await request<{ guidance: string }>("/parent/profiles/" + encodeURIComponent(target.id) + "/guidance", {
        method: "PUT", body: JSON.stringify({ guidance: draft }),
      })
      edit(target, { saved: data.guidance, draft: data.guidance, message: "저장했어요. 다음에 만드는 동화부터 참고해요." })
    } catch {
      edit(target, { message: "저장하지 못했어요. 작성한 내용은 남아 있으니 다시 시도해 주세요.", failed: true })
    } finally { edit(target, { saving: false }) }
  }
  const books = () => { if (child) { selectProfile(child.id); router.push("/dashboard") } }
  const result = (id: string) => { if (child) { selectProfile(child.id); router.push("/results/" + encodeURIComponent(id) + "?from=parent") } }
  const chooseTab = (next: Tab) => view.setValue({ childId: child?.id ?? "", tab: next })
  const keyboardTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = TABS.length - 1
    else return
    event.preventDefault(); chooseTab(TABS[next].id)
    document.getElementById(prefix + "-tab-" + TABS[next].id)?.focus()
  }

  return <div className={styles.page}>
    <header className={styles.nav}><Link href="/profiles"><ArrowLeft size={17}/> 프로필 선택</Link><Link href="/" className={styles.brand}>도란도란<span>부모님 책방</span></Link></header>
    <main className={styles.main}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}>함께 읽고, 함께 자라는</p><h1>아이의 속도로,<br/>함께 읽는 시간.</h1><p className={styles.heroText}>오늘 펼친 한 권이 내일의 생각으로.<br/>아이의 작은 변화를 이곳에 모아두었어요.</p><span className={styles.heroSign}><BookOpen size={16}/> 우리 가족의 읽기 기록</span></div>
        <div className={styles.heroArt}><Image src="/images/parent/reading-together.webp" alt="나란히 앉아 그림책을 읽는 부모와 아이" width={960} height={640} priority sizes="(max-width: 640px) 88vw, 480px"/></div>
      </header>
      {!state.children && !state.error && <div className={styles.loading} role="status"><BookOpen size={24}/><span>아이의 읽기 기록을 펼치고 있어요…</span></div>}
      {state.error && <section className={styles.emptyState} role="alert"><h2>책방 소식을 가져오지 못했어요</h2><p>{state.error}</p><button className={styles.primary} onClick={() => setRetry(v => v + 1)}>다시 불러오기</button></section>}
      {state.children?.length === 0 && <section className={styles.emptyState}><Leaf size={32}/><h2>첫 읽기 여정을 준비해요</h2><p>아이 프로필을 추가하면 이곳에 성장 기록이 모여요.</p><Link href="/profiles" className={styles.primary}>아이 프로필 추가하기 <ArrowRight size={17}/></Link></section>}
      {child && editor && view.ready && <section className={styles.journal} aria-label="아이별 읽기 기록">
        <div className={styles.profileRow}>
          <div className={styles.profilePicker}>
            <span className={styles.avatar} aria-hidden="true">{child.name.slice(0, 1)}</span>
            <div className={styles.selectGroup}><label htmlFor={prefix + "-child"}>기록을 살펴볼 아이</label><div className={styles.selectWrap}><select id={prefix + "-child"} value={child.id} onChange={e => view.setValue({ ...view.value, childId: e.target.value })}>
              {state.children!.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select><ChevronDown size={18} aria-hidden="true"/></div></div>
          </div>
          <button onClick={books} className={styles.bookLink}>아이 책장으로 <ArrowRight size={17}/></button>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="성장 기록 분류">
          {TABS.map((item, index) => <button key={item.id} role="tab" id={prefix + "-tab-" + item.id} aria-selected={tab === item.id}
            aria-controls={prefix + "-panel-" + item.id} tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={event => keyboardTabs(event, index)} onClick={() => chooseTab(item.id)}>
            <item.icon size={17} aria-hidden="true"/>{item.label}
          </button>)}
        </div>
        {/* 선택한 아이·분류만 펼치고, 입력 초안은 상위의 아이별 상태로 유지한다. */}
        {TABS.map(item => <div key={item.id} id={prefix + "-panel-" + item.id} role="tabpanel"
          aria-labelledby={prefix + "-tab-" + item.id} tabIndex={0} hidden={tab !== item.id} className={styles.panel}>
          {tab === item.id && item.id === "growth" && <>
            <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>한 권씩 쌓이는 오늘</p><h2>{child.name}의 읽기 여정</h2></div><span className={styles.smallNote}>지금까지의 기록</span></header>
            <div className={styles.growthGrid}>
              <section className={styles.levelCard} aria-label="읽기 단계">
                <span className={styles.bookmark} aria-hidden="true"><Leaf size={24}/></span>
                <p>현재 읽기 단계</p><h3>{progress?.currentLabel ?? "첫걸음을 준비해요"}</h3>
                <p className={styles.levelHint}>{progress?.nextLabel ? <>다음은 <strong>{progress.nextLabel}</strong>예요</> : progress ? "가장 울창한 숲에 도착했어요" : "읽기 단계를 알아보면 알맞은 동화를 만나요"}</p>
                <div className={styles.progressLabel}><span>{progress?.nextLabel ? "다음 단계로 가는 중" : progress ? "최고 단계" : "아직 측정 전이에요"}</span><strong>{progress ? <>{progress.achievement}<small>%</small></> : "—"}</strong></div>
                <div className={styles.track} role="progressbar" aria-label={child.name + " 단계 진척도"} aria-valuenow={progress?.achievement ?? 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: (progress?.achievement ?? 0) + "%" }}/></div>
              </section>
              <dl className={styles.stats}>
                <div><dt>함께 만든 동화</dt><dd>{child.books_total}<small>권</small></dd><BookOpen size={20} aria-hidden="true"/></div>
                <div><dt>끝까지 읽은 동화</dt><dd>{child.books_read}<small>권</small></dd><Check size={20} aria-hidden="true"/></div>
                <div><dt>문제까지 푼 동화</dt><dd>{child.quizzes_completed}<small>권</small></dd><PencilLine size={20} aria-hidden="true"/></div>
              </dl>
            </div>
            <div className={styles.bottomNote}><p>어떤 이야기를 읽고, 어떤 생각을 키웠을까요?<br/><span>풀이 기록에서 아이가 만난 문제들을 살펴보세요.</span></p><button onClick={() => chooseTab("results")}>풀이 기록 보기 <ArrowRight size={16}/></button></div>
          </>}
          {tab === item.id && item.id === "results" && <>
            <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>읽고 생각한 흔적</p><h2>문제 속에 담긴 작은 성장</h2></div></header>
            <div className={styles.resultsGrid}>
              <section><h3 className={styles.subheading}>영역별 풀이 기록</h3><p className={styles.hint}>최근 30회 · 맞힌 문제 / 풀어본 문제</p>
                {child.skills.length ? child.skills.map(skill => <div className={styles.skill} key={skill.name}><div><span>{skill.name}</span><strong>{skill.correct}<span> / {skill.total}문제</span></strong></div><div className={styles.skillTrack} role="meter" aria-label={skill.name + " 정답률"} aria-valuenow={percent(skill.correct, skill.total)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: percent(skill.correct, skill.total) + "%" }}/></div></div>) : <p className={styles.empty}>첫 문제를 풀면 이곳에 기록이 쌓여요.<br/>부모님 체크리스트는 정답률에 포함하지 않아요.</p>}
              </section>
              <section className={styles.resultHistory}><h3 className={styles.subheading}>최근 결과지</h3><p className={styles.hint}>최근 5개의 기록을 다시 펼쳐보세요.</p>
                {child.recent_results.length ? <ul className={styles.results}>{child.recent_results.map(r => <li key={r.id}><button onClick={() => result(r.id)}><span><small>{new Date(r.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" })}</small><strong>{r.kind === "post-story" ? "동화 퀴즈" : "읽기 단계 측정"}</strong></span><ArrowRight size={18}/></button></li>)}</ul> : <p className={styles.empty}>아직 펼쳐볼 결과지가 없어요.<br/>첫 기록을 기다릴게요.</p>}
              </section>
            </div>
            <p className={styles.footnote}>영역별 현황은 문제 풀이 기록이에요. 발달 진단이나 또래 비교 결과는 아니에요.</p>
          </>}
          {tab === item.id && item.id === "guidance" && <>
            <header className={styles.sectionHeader}><div><p className={styles.eyebrow}>다음 이야기에 남기는 메모</p><h2>동화에 담고 싶은 마음</h2></div></header>
            <div className={styles.guidanceGrid}>
              <aside className={styles.marginNote}><PencilLine size={24} strokeWidth={1.4}/><h3>부모님의 한마디가<br/>이야기의 힌트가 돼요.</h3><p>좋아하는 소재나 격려하고 싶은 경험,<br/>피하고 싶은 분위기를 알려주세요.</p><p>아이의 어휘 단계와 안전 기준 안에서<br/>다음 동화를 만들 때 참고해요.</p></aside>
              <form className={styles.form} onSubmit={e => { e.preventDefault(); void save() }}>
                <label htmlFor={prefix + "-guidance"}>{child.name}의 동화에 참고할 내용</label>
                <textarea id={prefix + "-guidance"} value={editor.draft} onChange={e => edit(child, { draft: e.target.value, message: "", failed: false })} maxLength={1000} rows={7} disabled={editor.saving}
                  placeholder="예: 새로운 친구에게 먼저 인사하는 용기를 자연스럽게 담아 주세요. 무서운 장면은 피하고 싶어요."/>
                <div className={styles.formFooter}><span>{editor.draft.length.toLocaleString()} / 1,000</span><button className={styles.primary} disabled={editor.saving || editor.draft === editor.saved} type="submit">{editor.saving ? "저장 중…" : "참고 사항 저장"}<Check size={16}/></button></div>
                <p role={editor.failed ? "alert" : "status"} className={styles.saveStatus}>{editor.message || "주소나 연락처처럼 민감한 정보는 적지 않아도 돼요."}</p>
              </form>
            </div>
          </>}
        </div>)}
      </section>}
      <footer className={styles.footer}><BookOpen size={15}/><span>한 장씩, 우리 아이만의 속도로.</span></footer>
    </main>
  </div>
}
