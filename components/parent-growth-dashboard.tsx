"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  ChartNoAxesCombined,
  ClipboardList,
  Leaf,
  Lightbulb,
  PencilLine,
  Settings2,
  Sprout,
  X,
} from "lucide-react";
import { request } from "@/lib/api";
import { useProfile } from "@/lib/profile-context";
import { useSessionView, objectValue } from "@/lib/use-session-view";
import { getTierProgress } from "@/lib/levels";
import {
  answerRate,
  practiceAreas,
  shortDate,
  weeklyNote,
  type ParentChild,
  type ParentReport,
} from "@/lib/parent-report";
import { AppHeader } from "./app-header";
import { ProfileRecovery } from "./profile-recovery";
import { ParentGrowthChart } from "./parent-growth-chart";
import styles from "./parent-growth.module.css";

export function ParentGrowthDashboard() {
  const { accountId, loading, error, selectProfile } = useProfile(),
    router = useRouter();
  useEffect(() => {
    if (!loading && !error && !accountId) router.replace("/");
  }, [loading, error, accountId, router]);
  if (!accountId) return <ProfileRecovery />;
  return (
    <ParentGrowthWorkspace
      key={accountId}
      accountId={accountId}
      selectProfile={selectProfile}
    />
  );
}
function ParentGrowthWorkspace({
  accountId,
  selectProfile,
}: {
  accountId: string;
  selectProfile: (id: string) => void;
}) {
  const router = useRouter(),
    [children, setChildren] = useState<ParentChild[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ParentReport | null>(null),
    [reportError, setReportError] = useState(""),
    [busy, setBusy] = useState(false);
  const [days, setDays] = useState(42),
    [offset, setOffset] = useState(0),
    [retry, setRetry] = useState(0);
  const view = useSessionView<{ childId: string }>(
    `doran-view:${accountId}:parent`,
    { childId: "" },
    (v): v is { childId: string } =>
      objectValue(v) && typeof v.childId === "string",
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<{ children: ParentChild[] }>("/parent/overview", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setChildren(data.children);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("성장 기록을 불러오지 못했어요. 다시 시도해 주세요.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  const child =
    children.find((c) => c.id === view.value.childId) ?? children[0];
  useEffect(() => {
    if (!child || !view.ready) return;
    const controller = new AbortController();
    setBusy(true);
    setReportError("");
    request<ParentReport>(
      `/parent/profiles/${encodeURIComponent(child.id)}/growth?days=${days}&offset=${offset}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setReport(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setReportError(
            "상세 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort(); // 늦게 도착한 다른 아이/기간의 수치가 섞이지 않게 한다.
  }, [child?.id, days, offset, retry, view.ready]);
  const save = async (id: string, guidance: string) => {
    const data = await request<{ guidance: string }>(
      `/parent/profiles/${encodeURIComponent(id)}/guidance`,
      { method: "PUT", body: JSON.stringify({ guidance }) },
    );
    setChildren((old) =>
      old.map((c) => (c.id === id ? { ...c, guidance: data.guidance } : c)),
    );
    return data.guidance;
  };
  const navigate = (path: string) => {
    if (child) {
      selectProfile(child.id);
      router.push(path);
    }
  };
  return (
    <div className={styles.page}>
      <AppHeader />
      {loading || !view.ready ? (
        <main className={styles.main}>
          <p className={styles.empty} role="status">
            성장 기록을 펼치고 있어요…
          </p>
        </main>
      ) : error ? (
        <main className={styles.main}>
          <p role="alert">{error}</p>
          <button
            className={styles.outlineButton}
            onClick={() => setRetry((n) => n + 1)}
          >
            다시 불러오기
          </button>
        </main>
      ) : !child ? (
        <main className={styles.main}>
          <h1>첫 읽기 여정을 준비해요</h1>
          <p>아이 프로필을 추가하면 성장 기록이 모여요.</p>
          <Link href="/profiles">프로필 추가하기</Link>
        </main>
      ) : (
        <ParentGrowthView
          key={child.id}
          children={children}
          child={child}
          report={report?.profile_id === child.id ? report : null}
          busy={busy}
          error={reportError}
          days={days}
          offset={offset}
          onChild={(id) => {
            setOffset(0);
            view.setValue({ childId: id });
          }}
          onDays={(n) => {
            setDays(n);
            setOffset(0);
          }}
          onOffset={setOffset}
          onRetry={() => setRetry((n) => n + 1)}
          onBooks={() => navigate("/library?from=parent")}
          onResult={(id) =>
            navigate(`/results/${encodeURIComponent(id)}?from=parent`)
          }
          onSave={save}
        />
      )}
    </div>
  );
}

/** 실제 화면과 합성 데이터 검증에서 같은 표시 컴포넌트를 사용한다. 수치는 서버 집계만 받는다. */
export function ParentGrowthView({
  children,
  child,
  report,
  busy,
  error,
  days,
  offset,
  onChild,
  onDays,
  onOffset,
  onRetry,
  onBooks,
  onResult,
  onSave,
}: {
  children: ParentChild[];
  child: ParentChild;
  report: ParentReport | null;
  busy: boolean;
  error: string;
  days: number;
  offset: number;
  onChild: (id: string) => void;
  onDays: (n: number) => void;
  onOffset: (n: number) => void;
  onRetry: () => void;
  onBooks: () => void;
  onResult: (id: string) => void;
  onSave: (id: string, guidance: string) => Promise<string>;
}) {
  const [settings, setSettings] = useState(false),
    [allResults, setAllResults] = useState(false);
  const progress = getTierProgress(report?.level ?? child.level),
    summary = report?.summary;
  const rate = summary
    ? answerRate(summary.questions_correct, summary.questions_total)
    : null;
  const areas = practiceAreas(report?.skills ?? []);
  const results = report?.recent_results.slice(0, allResults ? 20 : 3) ?? [];
  const goResults = () => {
    setAllResults(true);
    document
      .getElementById("parent-recent")
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  };
  return (
    <main className={styles.main}>
      <div className={styles.topline}>
        <Link href="/profiles">
          <ArrowLeft size={14} /> 프로필 선택
        </Link>
        <div className={styles.controls}>
          <label>
            기록을 살펴볼 아이{" "}
            <select
              aria-label="기록을 살펴볼 아이"
              value={child.id}
              onChange={(e) => onChild(e.target.value)}
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.settings} onClick={() => setSettings(true)}>
            <Settings2 size={16} /> 동화 설정
          </button>
        </div>
      </div>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>함께 읽고, 함께 자라는</p>
          <h1>
            {child.name}의 성장 기록 <Sprout aria-hidden="true" />
          </h1>
          <p>읽고, 풀고, 한 걸음씩 자라고 있어요.</p>
        </div>
        <Image
          src="/images/parent/reading-together-thumb.webp"
          width={240}
          height={160}
          alt=""
          priority
          className={styles.heroArt}
        />
      </header>
      <section className={styles.stats} aria-label="읽기 활동 요약">
        <a className={`${styles.stat} ${styles.green}`} href="#parent-growth">
          <span className={styles.statIcon}>
            <Sprout />
          </span>
          <div>
            <p>현재 읽기 단계</p>
            <strong className={styles.level}>
              {progress?.currentLabel ?? "측정 전"}
            </strong>
            <small>
              {progress?.nextLabel
                ? `다음 단계까지 ${Math.round((100 - progress.achievement) * 10) / 10}%`
                : progress
                  ? "최고 단계에 도착했어요"
                  : "첫 측정을 기다리고 있어요"}
            </small>
          </div>
          <ArrowRight size={15} />
        </a>
        <button className={`${styles.stat} ${styles.gold}`} onClick={onBooks}>
          <span className={styles.statIcon}>
            <BookOpen />
          </span>
          <div>
            <p>함께 만든 동화</p>
            <strong>
              {summary?.books_total ?? "—"}
              <em>권</em>
            </strong>
            <small>책장에 쌓인 이야기</small>
          </div>
          <ArrowRight size={15} />
        </button>
        <button className={`${styles.stat} ${styles.blue}`} onClick={onBooks}>
          <span className={styles.statIcon}>
            <BookOpenCheck />
          </span>
          <div>
            <p>끝까지 읽은 동화</p>
            <strong>
              {summary?.books_read ?? "—"}
              <em>권</em>
            </strong>
            <small>한 권의 모험을 끝까지</small>
          </div>
          <ArrowRight size={15} />
        </button>
        <button
          className={`${styles.stat} ${styles.peach}`}
          onClick={goResults}
        >
          <span className={styles.statIcon}>
            <ClipboardList />
          </span>
          <div>
            <p>풀어본 문제</p>
            <strong>
              {summary?.questions_total ?? "—"}
              <em>개</em>
              <b>{rate == null ? "—" : `${rate}%`}</b>
            </strong>
            <small>정답률 · 첫 풀이·측정 기준</small>
          </div>
          <ArrowRight size={15} />
        </button>
      </section>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button onClick={onRetry}>다시 불러오기</button>
        </div>
      )}
      <div className={styles.grid} aria-busy={busy}>
        <section className={styles.panel} id="parent-growth">
          <header className={styles.sectionHead}>
            <span className={styles.headingIcon}>
              <ChartNoAxesCombined size={20} />
            </span>
            <div>
              <h2>문해력 성장 추이</h2>
              <p>작은 변화도 놓치지 않도록</p>
            </div>
            <select
              aria-label="성장 추이 기간"
              value={days}
              onChange={(e) => onDays(Number(e.target.value))}
            >
              <option value={7}>최근 7일</option>
              <option value={42}>최근 6주</option>
              <option value={90}>최근 3개월</option>
              <option value={365}>최근 1년</option>
            </select>
          </header>
          {report ? (
            <ParentGrowthChart report={report} />
          ) : (
            <div className={styles.chartEmpty} role="status">
              {busy ? "기록을 불러오고 있어요…" : "표시할 기록이 없어요."}
            </div>
          )}
        </section>
        <section className={styles.panel}>
          <header className={styles.sectionHead}>
            <span className={styles.headingIcon}>
              <Leaf size={20} />
            </span>
            <div>
              <h2>문제 유형별 정답률</h2>
              <p>
                {report?.tier
                  ? `현재 ${report.tier.name} 티어에서 쌓은 풀이 기록`
                  : "단계를 측정하면 기록을 모아드려요"}
              </p>
            </div>
          </header>
          <div className={styles.skills}>
            {report?.skills.length ? (
              report.skills.map((s) => (
                <div className={styles.skill} key={s.name}>
                  <div className={styles.skillName}>
                    <span>{s.name}</span>
                    <small>
                      {s.correct} / {s.total}문항
                    </small>
                  </div>
                  <div
                    className={styles.skillTrack}
                    role="meter"
                    aria-label={s.name + " 정답률"}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={answerRate(s.correct, s.total) ?? 0}
                  >
                    <span
                      style={{
                        width: `${answerRate(s.correct, s.total) ?? 0}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {answerRate(s.correct, s.total)}
                    <small>%</small>
                  </strong>
                </div>
              ))
            ) : (
              <p className={styles.empty}>
                {busy
                  ? "유형별 기록을 모으고 있어요…"
                  : "현재 티어의 문제 풀이가 아직 없어요."}
              </p>
            )}
          </div>
          <p className={styles.finePrint}>
            풀이 직전 티어 기준 · 재풀이·부모 체크리스트 제외 · 그래프 기간과
            별도 집계
          </p>
        </section>
        <section className={styles.panel} id="parent-recent">
          <header className={styles.sectionHead}>
            <span className={`${styles.headingIcon} ${styles.warm}`}>
              <ClipboardList size={20} />
            </span>
            <div>
              <h2>최근 문제 풀이 기록</h2>
              <p>문제와 선택한 답을 다시 펼쳐보세요</p>
            </div>
            <button
              className={styles.textButton}
              onClick={() => {
                setAllResults((v) => !v);
                if (allResults) onOffset(0);
              }}
            >
              {allResults ? "접기" : "전체 보기"} <ArrowRight size={14} />
            </button>
          </header>
          {results.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>동화·측정</th>
                    <th>학습일</th>
                    <th>점수</th>
                    <th>
                      <span className={styles.desktopOnly}>결과</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button onClick={() => onResult(r.id)}>
                          <span
                            className={styles.miniBook}
                            style={{
                              background: /^#[0-9a-f]{6}$/i.test(
                                r.cover_color ?? "",
                              )
                                ? r.cover_color!
                                : "#668574",
                            }}
                          >
                            <BookOpen size={16} />
                          </span>
                          <span>
                            {r.kind === "post-story"
                              ? `${r.story_title?.trim() || "동화"} 퀴즈`
                              : "읽기 단계 측정"}
                            {r.is_practice && <small>다시 풀기</small>}
                          </span>
                        </button>
                      </td>
                      <td>{shortDate(r.created_at)}</td>
                      <td>
                        {r.assessment_type === "checklist"
                          ? "체크리스트"
                          : `${r.correct_answers} / ${r.total_questions}`}
                      </td>
                      <td>
                        <button
                          className={styles.resultLink}
                          aria-label={`${r.kind === "post-story" ? r.story_title || "동화" : "읽기 단계 측정"} 결과 보기`}
                          onClick={() => onResult(r.id)}
                        >
                          <span className={styles.desktopOnly}>보기</span>
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>
              {busy
                ? "기록을 불러오고 있어요…"
                : "첫 풀이 결과가 이곳에 남아요."}
            </p>
          )}
          {allResults && report && report.results_total > 20 && (
            <div className={styles.pagination}>
              <button
                disabled={offset === 0 || busy}
                onClick={() => onOffset(Math.max(0, offset - 20))}
              >
                이전
              </button>
              <span>
                {offset + 1}–{Math.min(offset + 20, report.results_total)} /{" "}
                {report.results_total}
              </span>
              <button
                disabled={offset + 20 >= report.results_total || busy}
                onClick={() => onOffset(offset + 20)}
              >
                다음
              </button>
            </div>
          )}
        </section>
        <section className={styles.panel}>
          <header className={styles.sectionHead}>
            <span className={`${styles.headingIcon} ${styles.warm}`}>
              <Lightbulb size={20} />
            </span>
            <div>
              <h2>함께 연습해볼 부분</h2>
              <p>점수보다, 다음 대화를 위한 힌트</p>
            </div>
          </header>
          {areas.length ? (
            <>
              <div className={styles.practice}>
                {areas.map((s) => (
                  <article key={s.name}>
                    <Leaf size={20} />
                    <h3>{s.name}</h3>
                    <p>
                      {s.total}문항 중 {s.correct}문항을 맞혔어요.
                      <br />
                      틀린 문제의 근거를 본문에서 함께 찾아보세요.
                    </p>
                  </article>
                ))}
              </div>
              <button className={styles.tip} onClick={goResults}>
                <Lightbulb size={23} />
                <span>
                  <strong>“어느 문장을 보고 그렇게 생각했어?”</strong>
                  <small>풀이 기록을 열고 아이의 생각을 들어보세요.</small>
                </span>
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <div className={styles.gentleNote}>
              <Sprout size={28} />
              <h3>
                {(report?.skills ?? []).some((s) => s.total >= 5)
                  ? "차곡차곡 잘 쌓이고 있어요"
                  : "아이를 알아가는 중이에요"}
              </h3>
              <p>
                {(report?.skills ?? []).some((s) => s.total >= 5)
                  ? "읽은 이야기에서 기억에 남는 장면을 함께 이야기해 보세요."
                  : "유형별 풀이가 더 쌓이면 함께 살펴볼 부분을 알려드릴게요."}
              </p>
            </div>
          )}
          <p className={styles.finePrint}>
            유형별 5문항 이상·정답률 75% 미만인 항목을 최대 2개 표시해요. 발달
            진단은 아니에요.
          </p>
        </section>
      </div>
      <footer className={styles.reportStrip}>
        <span>
          <PencilLine size={21} />
          최근 7일의 기록
        </span>
        <p>
          {report
            ? weeklyNote(child.name, report)
            : "읽기 기록을 준비하고 있어요."}
        </p>
        <button onClick={goResults}>
          풀이 기록 보기 <ArrowRight size={16} />
        </button>
      </footer>
      {settings && (
        <GuidanceDialog
          child={child}
          onClose={() => setSettings(false)}
          onSave={onSave}
        />
      )}
    </main>
  );
}

function GuidanceDialog({
  child,
  onClose,
  onSave,
}: {
  child: ParentChild;
  onClose: () => void;
  onSave: (id: string, value: string) => Promise<string>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [draft, setDraft] = useState(child.guidance),
    [saved, setSaved] = useState(child.guidance),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const text = await onSave(child.id, draft);
      setSaved(text);
      setDraft(text);
      setMessage("저장했어요. 다음 나만의 이야기부터 참고해요.");
    } catch {
      setMessage("저장하지 못했어요. 입력은 남아 있으니 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      className={styles.dialog}
      aria-labelledby="parent-guidance-title"
    >
      <header>
        <h2 id="parent-guidance-title">{child.name}의 동화 설정</h2>
        <button aria-label="동화 설정 닫기" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      <p>
        좋아하는 소재나 격려하고 싶은 경험을 남겨 주세요.
        <br />
        읽기 단계와 안전 기준 안에서 <strong>나만의 이야기</strong>에 참고해요.
      </p>
      <label htmlFor="parent-guidance">부모님의 참고 사항</label>
      <textarea
        id="parent-guidance"
        rows={7}
        maxLength={1000}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="예: 새로운 친구에게 인사하는 용기를 담아 주세요."
      />
      <div className={styles.dialogFooter}>
        <small>{draft.length} / 1,000</small>
        <button
          className={styles.primary}
          disabled={saving || saved === draft}
          onClick={() => void save()}
        >
          {saving ? "저장 중…" : "참고 사항 저장"}
        </button>
      </div>
      <p role="status" className={styles.finePrint}>
        {message || "주소나 연락처처럼 민감한 정보는 적지 않아도 돼요."}
      </p>
    </dialog>
  );
}
