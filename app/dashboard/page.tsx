"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Wand2, Sparkles, BarChart3, Library } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { HomeLink } from "@/components/home-link"
import { ConfirmModal } from "@/components/confirm-modal"
import { PopupBook } from "@/components/workpad/popup-book"
import { StorySetup } from "@/components/workpad/story-setup"
import { Quiz, type QuizResult } from "@/components/workpad/quiz"
import { LiteracyResultView } from "@/components/workpad/literacy-result"
import { useProfile } from "@/lib/profile-context"
import { isGuestProfile } from "@/lib/api"
import { useGeneration } from "@/lib/generation-context"
import { StoryGenerationCard } from "@/components/workpad/story-generation-card"
import {
  getStageInfo,
  needsMeasurement,
  type LiteracyResult,
} from "@/lib/levels"
import {
  buildSubmission,
  submitAssessment,
  type AssessmentPayload,
  type StoryInput,
} from "@/lib/workpad-data"

type View = "home" | "form" | "book" | "post-quiz" | "result"

export default function DashboardPage() {
  const router = useRouter()
  const generation = useGeneration()
  const { currentProfile, updateProfile } = useProfile()
  const [view, setView] = useState<View>("home")
  const [assessment, setAssessment] = useState<AssessmentPayload | null>(null)
  const [measureModalOpen, setMeasureModalOpen] = useState(false)
  const [result, setResult] = useState<LiteracyResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const previousProfile = useRef<string | null>(null)
  // 다른 아이의 프로필로 바뀌면 이전 읽기/채점 화면을 남기지 않는다.
  useEffect(() => {
    if (previousProfile.current !== currentProfile?.id) {
      previousProfile.current = currentProfile?.id ?? null
      setAssessment(null); setResult(null); setView("home")
    }
  }, [currentProfile?.id])
  // 완료 알림의 '동화 읽기'를 눌렀을 때만 이동한다. 다른 활동을 강제로 중단하지 않는다.
  useEffect(() => {
    if (generation.requestedStory?.profileId === currentProfile?.id && generation.requestedStory) {
      setAssessment(generation.requestedStory.payload)
      setView("book")
      generation.consumeStory()
    }
  }, [currentProfile?.id, generation.requestedStory, generation.consumeStory])

  // 선택된 프로필이 없으면 프로필 선택 화면으로 보낸다.
  useEffect(() => {
    if (!currentProfile) router.replace("/profiles")
  }, [currentProfile, router])

  if (!currentProfile) return null

  const stage = getStageInfo(currentProfile.level)
  const mustMeasure = needsMeasurement(currentProfile.level)
  const isGuest = isGuestProfile(currentProfile.id)

  const handleCreateStory = () => {
    // 목표 5: 게스트는 동화 생성 폼에 접근할 수 없다.
    if (isGuest) {
      toast.error("동화 만들기는 로그인 후 이용할 수 있어요.")
      return
    }
    // 상황 A: 측정이 필요하면 안내 모달을 띄운다.
    if (mustMeasure) {
      setMeasureModalOpen(true)
      return
    }
    // 상황 B: 동화 입력 폼으로 이동한다.
    setView("form")
  }

  // 입력 후 홈 카드로 돌아간다. 요청과 상태 조회는 전역 Provider가 이어받는다.
  const handleStorySubmit = (input: StoryInput) => {
    setView("home")
    void generation.start(currentProfile.id, input).catch((error) => {
      toast.error(error instanceof Error ? error.message : "동화를 시작하지 못했어요.")
    })
  }

  // 생성으로 진입한 읽기/퀴즈 흐름의 상위 화면은 대시보드다.
  // 브라우저 history.back()을 쓰면 완료한 퀴즈나 로그인 화면으로 돌아갈 수 있다.
  const returnToDashboard = () => {
    setAssessment(null)
    setResult(null)
    setView("home")
  }
  const handleBookFinish = () => {
    const canTakeQuiz = assessment?.assessment_type === "posttest" && (assessment?.quizzes.length ?? 0) > 0
    if (canTakeQuiz) setView("post-quiz")
    else returnToDashboard()
  }

  // 동화 후 테스트 완료 → 제출(front→back) → 결과(back→front, 서버가 계산)
  const handlePostQuizComplete = async (quiz: QuizResult) => {
    if (!assessment || submitting) return
    setSubmitting(true)
    try {
      const submission = buildSubmission(
        currentProfile.id,
        assessment,
        quiz.answers,
      )
      const res = await submitAssessment(submission)
      updateProfile(currentProfile.id, { level: res.level })
      setResult(res)
      setView("result")
    } catch (e) {
      console.error("[v0] 채점 제출 실패:", e)
      toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
      setView("home")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className={view === "book" ? "w-full" : "mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"}>
        {view === "home" && (
          <div className="mx-auto max-w-2xl">
            {/* 인사 + 현재 단계 */}
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
                {stage ? `현재 ${stage.label}` : "문해력 측정 전이에요"}
              </span>
              <h1 className="mt-4 text-balance font-heading text-4xl text-foreground">
                {currentProfile.name}님, 오늘은 어떤 이야기를 만들까요?
              </h1>
              <p className="mt-3 text-pretty text-muted-foreground">
                버튼을 누르면 {currentProfile.name}님만을 위한 전래동화가
                펼쳐져요.
              </p>
            </div>

            {/* 작업 중에는 같은 카드 자리에 상태를 표시하고 아래 메뉴를 유지한다. */}
            {generation.job || generation.error ? <StoryGenerationCard /> : <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-md">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-9 w-9 text-primary" />
              </span>
              <h2 className="mt-5 font-heading text-2xl text-foreground">
                나만의 전래동화 만들기
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mustMeasure
                  ? "동화를 만들기 전에 간단한 문해력 측정이 필요해요."
                  : `${stage?.label ?? ""} 수준에 꼭 맞춘 이야기를 만들어 드려요.`}
              </p>
              <button
                type="button"
                onClick={handleCreateStory}
                className="mt-6 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-100"
              >
                <Wand2 className="h-5 w-5" />
                동화 만들기
              </button>
            </div>}

            {/* 보조 메뉴 */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/literacy"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                  <BarChart3 className="h-6 w-6" />
                </span>
                <span className="flex flex-col">
                  <span className="font-heading text-lg text-foreground">
                    문해력 측정
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stage ? "다시 측정해 단계 올리기" : "지금 바로 측정하기"}
                  </span>
                </span>
              </Link>
              <Link
                href="/library"
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Library className="h-6 w-6" />
                </span>
                <span className="flex flex-col">
                  <span className="font-heading text-lg text-foreground">
                    이야기 책장
                  </span>
                  <span className="text-sm text-muted-foreground">
                    지금까지 만든 동화 모아보기
                  </span>
                </span>
              </Link>
            </div>
          </div>
        )}

        {view === "form" && (
          <div>
            <div className="mb-6">
              <BackLink label="이전으로" onClick={() => setView("home")} />
            </div>
            <StorySetup
              key={currentProfile.id}
              defaultName={currentProfile.name}
              onSubmit={handleStorySubmit}
            />
          </div>
        )}

        {view === "book" && (
          <div>
            {assessment?.generation?.quiz_status === "failed" && (
              <p role="status" className="mb-4 text-center text-sm text-muted-foreground">이번 이야기의 퀴즈를 준비하지 못했어요. 동화는 읽을 수 있어요.</p>
            )}
            <PopupBook
              pages={assessment?.pages ?? []}
              title={assessment?.title}
              coverImage={assessment?.cover_image}
              hasQuiz={assessment?.assessment_type === "posttest" && (assessment?.quizzes.length ?? 0) > 0}
              onExit={returnToDashboard}
              exitLabel="대시보드로 돌아가기"
              childName={currentProfile.name}
              onFinish={handleBookFinish}
            />
          </div>
        )}

        {view === "post-quiz" && (
          <div>
            <div className="mb-6">
              <BackLink label="동화 다시 보기" onClick={() => setView("book")} />
            </div>
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="font-heading text-lg text-accent">
                방금 읽은 이야기를 떠올려 볼까요?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                동화 내용을 바탕으로 한 문제씩 풀어 보면 문해력이 얼마나
                자랐는지 알 수 있어요.
              </p>
            </div>
            <Quiz
              questions={assessment?.quizzes ?? []}
              title="이야기 속 문제를 풀어 볼까요?"
              intro="방금 읽은 전래동화 내용을 바탕으로 한 문제씩 풀어 보세요."
              onComplete={handlePostQuizComplete}
            />
          </div>
        )}

        {view === "result" && result && (
          <div>
            <BackLink label="이전으로" onClick={returnToDashboard} className="mb-6" />
            <LiteracyResultView
              result={result}
              childName={currentProfile.name}
              primaryLabel="대시보드로 돌아가기"
              onPrimary={returnToDashboard}
              secondaryLabel="이야기 책장 보러 가기"
              onSecondary={() => router.push("/library")}
            />
          </div>
        )}

        {view !== "book" && <HomeLink />}
      </main>

      {/* 상황 A: 문해력 측정 안내 모달 */}
      <ConfirmModal
        open={measureModalOpen}
        title="문해력 측정이 필요해요"
        description="동화 제공을 위해 문해력 측정이 필요해요. 지금 하러 갈까요?"
        confirmLabel="지금 할게요"
        cancelLabel="나중에 할게요"
        onConfirm={() => {
          setMeasureModalOpen(false)
          router.push("/literacy")
        }}
        onClose={() => setMeasureModalOpen(false)}
      />
    </div>
  )
}
