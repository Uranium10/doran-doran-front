"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { Quiz, type QuizResult } from "@/components/workpad/quiz"
import { ToddlerChecklist } from "@/components/literacy/toddler-checklist"
import { LiteracyResultView } from "@/components/workpad/literacy-result"
import { useProfile } from "@/lib/profile-context"
import type { LiteracyResult } from "@/lib/levels"
import {
  generatePretest,
  buildSubmission,
  submitAssessment,
  type AssessmentPayload,
} from "@/lib/workpad-data"

export default function LiteracyPage() {
  const router = useRouter()
  const { currentProfile, updateProfile } = useProfile()
  const [result, setResult] = useState<LiteracyResult | null>(null)
  // 서버 배치고사 문제 (첫 측정이면 나이 기반, 이후엔 현재 레벨 기반으로 서버가 산출)
  const [assessment, setAssessment] = useState<AssessmentPayload | null>(null)
  const [loading, setLoading] = useState(true)
  // 프로필별로 한 번만 출제 요청하기 위한 가드
  const fetchedFor = useRef<string | null>(null)

  // 프로필이 없으면 선택 화면으로
  useEffect(() => {
    if (!currentProfile) router.replace("/profiles")
  }, [currentProfile, router])

  // 마운트 시 항상 배치고사 문제를 서버에서 받아온다.
  // (첫 측정: 서버가 profile.age 로 첫 레벨/문제 산출 / 이후: 현재 레벨 기반)
  const profileId = currentProfile?.id ?? null
  useEffect(() => {
    if (!profileId) return
    // 프로필당 한 번만 출제 요청 (StrictMode 이중 실행 가드).
    if (fetchedFor.current === profileId) return
    fetchedFor.current = profileId

    setLoading(true)
    generatePretest(profileId)
      .then((payload) => {
        setAssessment(payload)
      })
      .catch((e) => {
        console.error("[v0] 배치고사 생성 실패:", e)
        toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
        // 실패 시 가드를 풀어 재진입할 때 다시 시도할 수 있게 한다.
        fetchedFor.current = null
        router.back()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [profileId, router])

  if (!currentProfile) return null

  // 영유아 체크리스트 여부는 서버 응답(assessment_type)으로 판단한다.
  const isChecklist = assessment?.assessment_type === "checklist"

  // 측정 완료 → 제출(front→back) → 결과(back→front, 서버가 레벨/추세 계산)
  const finishMeasurement = async (answers: Record<string, string>) => {
    if (!assessment) return
    try {
      const submission = buildSubmission(currentProfile.id, assessment, answers)
      const res = await submitAssessment(submission)
      updateProfile(currentProfile.id, { level: res.level })
      setResult(res)
    } catch (e) {
      console.error("[v0] 채점 제출 실패:", e)
      toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
      router.back()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <BackLink className="mb-6" />
        {/* 측정 결과 화면 */}
        {result !== null ? (
          <LiteracyResultView
            result={result}
            childName={currentProfile.name}
            primaryLabel="이 단계로 동화 만들기"
            onPrimary={() => router.push("/dashboard")}
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
            {loading || !assessment ? (
              <PretestLoading />
            ) : isChecklist ? (
              <ToddlerChecklist
                childName={currentProfile.name}
                questions={assessment.quizzes}
                onComplete={finishMeasurement}
              />
            ) : (
              <ChildQuiz
                childName={currentProfile.name}
                questions={assessment.quizzes}
                onComplete={(quiz: QuizResult) =>
                  finishMeasurement(quiz.answers)
                }
              />
            )}
          </>
        )}
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
  childName,
  questions,
  onComplete,
}: {
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
        questions={questions}
        title="이야기 문제를 풀어 볼까요?"
        intro="문제를 풀면 우리 아이에게 꼭 맞는 동화 단계를 찾을 수 있어요."
        onComplete={onComplete}
      />
    </div>
  )
}
