"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { Quiz } from "@/components/workpad/quiz"
import { ToddlerChecklist } from "@/components/literacy/toddler-checklist"
import { LiteracyResultView } from "@/components/workpad/literacy-result"
import { useProfile } from "@/lib/profile-context"
import {
  literacyMode,
  scoreToLevel,
  levelToPercent,
  buildLiteracyResult,
  needsMeasurement,
  type LiteracyResult,
} from "@/lib/levels"
import { preQuestions } from "@/lib/workpad-data"

export default function LiteracyPage() {
  const router = useRouter()
  const { currentProfile, updateProfile } = useProfile()
  const [result, setResult] = useState<LiteracyResult | null>(null)

  // 프로필이 없으면 선택 화면으로
  useEffect(() => {
    if (!currentProfile) router.replace("/profiles")
  }, [currentProfile, router])

  if (!currentProfile) return null

  const mode = literacyMode(currentProfile.birth_date)
  // 이미 레벨이 있으면 재시험, 없으면 최초 측정
  const isFirstMeasure = needsMeasurement(currentProfile.level)

  const finishWithCount = (correct: number, total: number) => {
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0
    const prevPercent = isFirstMeasure ? null : levelToPercent(currentProfile.level)
    const res = buildLiteracyResult(
      isFirstMeasure ? "initial" : "retest",
      correct,
      total,
      prevPercent,
    )
    updateProfile(currentProfile.id, { level: scoreToLevel(percent) })
    setResult(res)
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

            {/* 나이 기반 분기: 영유아 모드 vs 아동 모드 */}
            {mode === "toddler" ? (
              <ToddlerChecklist
                childName={currentProfile.name}
                onComplete={finishWithCount}
              />
            ) : (
              <ChildQuiz
                childName={currentProfile.name}
                onComplete={finishWithCount}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// 아동 모드: 한 문제씩 넘어가는 슬라이더형 퀴즈 (기존 Quiz 재사용)
function ChildQuiz({
  childName,
  onComplete,
}: {
  childName: string
  onComplete: (correct: number, total: number) => void
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
        questions={preQuestions}
        title="이야기 문제를 풀어 볼까요?"
        intro="다섯 문제만 풀면 우리 아이에게 꼭 맞는 동화 단계를 찾을 수 있어요."
        onComplete={(r) => onComplete(r.correct, r.total)}
      />
    </div>
  )
}
