"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Award, ArrowRight, BookHeart } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { Quiz } from "@/components/workpad/quiz"
import { ToddlerChecklist } from "@/components/literacy/toddler-checklist"
import { Button } from "@/components/ui/button"
import { useProfile } from "@/lib/profile-context"
import { literacyMode, scoreToLevel, getStageInfo } from "@/lib/levels"
import { preQuestions } from "@/lib/workpad-data"

export default function LiteracyPage() {
  const router = useRouter()
  const { currentProfile, updateProfile } = useProfile()
  const [resultLevel, setResultLevel] = useState<number | null>(null)

  // 프로필이 없으면 선택 화면으로
  useEffect(() => {
    if (!currentProfile) router.replace("/profiles")
  }, [currentProfile, router])

  if (!currentProfile) return null

  const mode = literacyMode(currentProfile.birth_date)

  const finishWithPercent = (percent: number) => {
    const level = scoreToLevel(percent)
    updateProfile(currentProfile.id, { level })
    setResultLevel(level)
  }

  const stage = getStageInfo(resultLevel)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <BackLink className="mb-6" />
        {/* 측정 결과 화면 */}
        {resultLevel !== null ? (
          <div className="mx-auto w-full max-w-md text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Award className="h-9 w-9 text-primary" />
            </span>
            <h2 className="mt-5 font-heading text-3xl text-foreground">
              측정이 끝났어요!
            </h2>
            <p className="mt-2 text-muted-foreground">
              {currentProfile.name}님의 현재 문해력 단계는
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/15 px-5 py-2 font-heading text-2xl text-accent">
              {stage?.label ?? "새싹 1단계"}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button
                size="lg"
                className="h-13 w-full rounded-full text-base"
                onClick={() => router.push("/dashboard")}
              >
                <BookHeart className="mr-1 h-5 w-5" />이 단계로 동화 만들기
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </div>
          </div>
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
                onComplete={finishWithPercent}
              />
            ) : (
              <ChildQuiz
                childName={currentProfile.name}
                onComplete={finishWithPercent}
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
  onComplete: (percent: number) => void
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
        onComplete={(r) => onComplete(Math.round((r.correct / r.total) * 100))}
      />
    </div>
  )
}
