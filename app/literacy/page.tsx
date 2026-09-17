"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { HomeLink } from "@/components/home-link"
import { Quiz, type QuizResult } from "@/components/workpad/quiz"
import { ToddlerChecklist } from "@/components/literacy/toddler-checklist"
import { LiteracyResultView } from "@/components/workpad/literacy-result"
import { ProfileRecovery } from "@/components/profile-recovery"
import { useProfile } from "@/lib/profile-context"
import { needsMeasurement } from "@/lib/levels"
import {
  generatePretest,
  buildSubmission,
  submitAssessment,
  type AssessmentPayload,
} from "@/lib/workpad-data"

import { useSessionView } from "@/lib/use-session-view"
import { literacyInitial, validLiteracy } from "@/lib/view-state"

export default function LiteracyPage() {
  const router = useRouter()
  const { currentProfile, updateProfile, loading: profileLoading, error: profileError, sessionScope } = useProfile()
  const screen = useSessionView(sessionScope ? `${sessionScope}:literacy` : null, literacyInitial, validLiteracy)
  const { result, assessment, attempt } = screen.value
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const leaving = useRef(false)
  useEffect(() => { setSubmitting(false); leaving.current = false }, [sessionScope])
  // StrictMode 효과 재설치 때 같은 출제 Promise를 이어받아 중복 출제를 피한다.
  const pending = useRef<{ key: string; task: Promise<AssessmentPayload> } | null>(null)

  // 프로필이 없으면 선택 화면으로
  useEffect(() => {
    if (!profileLoading && !profileError && !currentProfile) router.replace("/profiles")
  }, [currentProfile, profileLoading, profileError, router])

  const profileId = currentProfile?.id ?? null
  useEffect(() => {
    if (leaving.current || !profileId || !sessionScope || !screen.ready) return
    if (assessment || result) { setLoading(false); return }
    const key = `${sessionScope}:${attempt}:${retry}`
    if (pending.current?.key !== key) pending.current = { key, task: generatePretest(profileId) }
    let active = true
    setLoading(true); setLoadError(null)
    pending.current.task.then(payload => {
      if (active) screen.setValue(previous => ({ ...previous, assessment: payload }))
    }).catch((e) => {
      if (active) { setLoadError(e instanceof Error ? e.message : "문제를 불러오지 못했어요.") }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [profileId, sessionScope, screen.ready, screen.setValue, assessment, result, attempt, retry])

  if (!currentProfile || !screen.ready) return <ProfileRecovery />

  const leaveForDashboard = () => {
    // 결과를 정리한 직후 라우터 이동 전 효과가 다시 출제하지 않도록 막는다.
    leaving.current = true
    if (result) screen.setValue({ ...literacyInitial, attempt: attempt + 1 })
    router.push("/dashboard")
  }

  // 영유아 체크리스트 여부는 서버 응답(assessment_type)으로 판단한다.
  const isChecklist = assessment?.assessment_type === "checklist"

  // 측정 완료 → 제출(front→back) → 결과(back→front, 서버가 레벨/추세 계산)
  const finishMeasurement = async (answers: Record<string, string>) => {
    if (!assessment || submitting) return
    setSubmitting(true)
    // 제출(레벨 갱신) 전에 "측정 데이터가 없던 상태"였는지 캡처해 둔다.
    const wasFirstMeasurement = needsMeasurement(currentProfile.level)
    try {
      const submission = buildSubmission(currentProfile.id, assessment, answers)
      const res = await submitAssessment(submission)
      if (!screen.isCurrent()) return
      updateProfile(currentProfile.id, { level: res.level })
      if (res.result_id) {
        leaving.current = true
        screen.setValue({ ...literacyInitial, attempt: attempt + 1 })
        router.replace(`/results/${res.result_id}?from=dashboard`)
        return
      }
      // 기존 문해력 데이터가 없었다면 '재시험'이 아니라 '첫 측정'으로 표시한다.
      screen.setValue(previous => ({ ...previous, result: wasFirstMeasurement && res.kind === "retest" ? { ...res, kind: "initial", delta: null } : res }))
    } catch (e) {
      if (!screen.isCurrent()) return
      console.error("[v0] 채점 제출 실패:", e)
      toast.error(e instanceof Error ? e.message : "결과를 저장하지 못했어요. 다시 제출해 주세요.")
    } finally { if (screen.isCurrent()) setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <BackLink className="mb-6" onClick={leaveForDashboard} />
        {/* 측정 결과 화면 */}
        {result !== null ? (
          <LiteracyResultView
            result={result}
            childName={currentProfile.name}
            primaryLabel="이 단계로 동화 만들기"
            onPrimary={leaveForDashboard}
            showScore={!isChecklist}
          />
        ) : (
          <>
            <div className="mb-8 text-center">
              <p className="font-mono text-xs tracking-widest text-primary">
                문해력 측정
              </p>
              <h1 className="mt-2 text-balance font-heading text-3xl text-foreground sm:text-4xl">
                {currentProfile.name}님의 문해력을 살펴봐요
              </h1>
            </div>

            {/* 서버 응답 대기 */}
            {loadError ? (<div role="alert" className="text-center"><p>{loadError}</p><button type="button" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>) : loading || !assessment ? (
              <PretestLoading />
            ) : isChecklist ? (
              <fieldset disabled={submitting}><ToddlerChecklist
                persistenceKey={`${sessionScope}:checklist:${attempt}`}
                childName={currentProfile.name}
                questions={assessment.quizzes}
                onComplete={finishMeasurement}
              /></fieldset>
            ) : (
              <fieldset disabled={submitting}><ChildQuiz
                persistenceKey={`${sessionScope}:pretest:${attempt}`}
                childName={currentProfile.name}
                questions={assessment.quizzes}
                onComplete={(quiz: QuizResult) =>
                  finishMeasurement(quiz.answers)
                }
              /></fieldset>
            )}
          </>
        )}

        <HomeLink />
      </main>
    </div>
  )
}

// 배치고사 문제를 받아오는 동안 보여주는 로딩 UI
function PretestLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </span>
      <h2 className="mt-6 font-heading text-2xl text-foreground">
        문제를 준비 중이에요...
      </h2>
      <p className="mt-2 text-muted-foreground">
        아이 수준에 꼭 맞는 배치고사를 출제하고 있어요.
      </p>
    </div>
  )
}

// 아동 모드: 한 문제씩 넘어가는 슬라이더형 퀴즈 (기존 Quiz 재사용)
function ChildQuiz({
  persistenceKey,
  childName,
  questions,
  onComplete,
}: {
  persistenceKey: string
  childName: string
  questions: AssessmentPayload["quizzes"]
  onComplete: (quiz: QuizResult) => void
}) {
  return (
    <div>
      <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
        <p className="font-heading text-lg text-accent">
          {childName}님이 직접 풀게 해 주세요
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          한 문제씩 천천히, 마음에 드는 답을 골라 보세요.
        </p>
      </div>
      <Quiz
        persistenceKey={persistenceKey}
        questions={questions}
        title="이야기 문제를 풀어 볼까요?"
        intro="문제를 풀면 우리 아이에게 꼭 맞는 동화 단계를 찾을 수 있어요."
        onComplete={onComplete}
      />
    </div>
  )
}
