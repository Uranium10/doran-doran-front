"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Wand2, Sparkles, BookOpen, BarChart3, Library } from "lucide-react"
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
import {
  getStageInfo,
  needsMeasurement,
  type LiteracyResult,
} from "@/lib/levels"
import {
  generateAssessment,
  buildSubmission,
  submitAssessment,
  type AssessmentPayload,
  type StoryInput,
} from "@/lib/workpad-data"

type View = "home" | "form" | "generating" | "book" | "post-quiz" | "result"

export default function DashboardPage() {
  const router = useRouter()
  const { currentProfile, updateProfile } = useProfile()
  const [view, setView] = useState<View>("home")
  const [assessment, setAssessment] = useState<AssessmentPayload | null>(null)
  const [measureModalOpen, setMeasureModalOpen] = useState(false)
  // 동화를 다 읽었지만 퀴즈가 없을 때(posttest·퀴즈 0개) 띄우는 부모용 안내 모달
  const [readDoneModalOpen, setReadDoneModalOpen] = useState(false)
  const [result, setResult] = useState<LiteracyResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

  // 폼 입력 완료 → 출제(동화+퀴즈 묶음) → 팝업북
  const handleStorySubmit = async (input: StoryInput) => {
    setView("generating")
    try {
      const payload = await generateAssessment(
        currentProfile.id,
        "posttest",
        input,
      )
      setAssessment(payload)
      setView("book")
    } catch (e) {
      console.error("[v0] 동화 생성 실패:", e)
      toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
      setView("form")
    }
  }

  // 동화를 다 읽음 → assessment_type / 퀴즈 유무로 분기 (목표 1)
  const handleBookFinish = () => {
    const type = assessment?.assessment_type
    const hasQuiz = (assessment?.quizzes?.length ?? 0) > 0

    // 케이스 3: 라이브러리/기성 동화는 퀴즈 없이 대시보드로 복귀
    if (type === "library" || type === "readonly") {
      setAssessment(null)
      setView("home")
      return
    }

    // 케이스 2: 맞춤 동화(posttest) + 퀴즈 있음 → 퀴즈 화면
    if (hasQuiz) {
      setView("post-quiz")
      return
    }

    // 케이스 1: 맞춤 동화(posttest) + 퀴즈 없음 → 대시보드 + 부모 안내 모달
    setView("home")
    setReadDoneModalOpen(true)
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

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
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

            {/* 메인 동화 만들기 카드 */}
            <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-md">
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
            </div>

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
              defaultName={currentProfile.name}
              onSubmit={handleStorySubmit}
            />
          </div>
        )}

        {view === "generating" && (
          <GeneratingView childName={currentProfile.name} />
        )}

        {view === "book" && (
          <div>
            <PopupBook
              pages={assessment?.pages ?? []}
              childName={currentProfile.name}
              onFinish={handleBookFinish}
            />
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setView("home")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                대시보드로 돌아가기
              </button>
            </div>
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
          <LiteracyResultView
            result={result}
            childName={currentProfile.name}
            primaryLabel="이야기 책장 보러 가기"
            onPrimary={() => router.push("/library")}
            secondaryLabel="새 동화 만들기"
            onSecondary={() => {
              setResult(null)
              setView("home")
            }}
          />
        )}

        <HomeLink />
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

      {/* 케이스 1: 동화만 읽고 퀴즈가 없을 때 부모용 안내 모달 */}
      <ConfirmModal
        open={readDoneModalOpen}
        title="동화를 다 읽었어요!"
        description="난이도 변경을 원하시면 문해력 재측정을 진행해 주세요."
        confirmLabel="확인"
        hideCancel
        onConfirm={() => setReadDoneModalOpen(false)}
        onClose={() => setReadDoneModalOpen(false)}
      />
    </div>
  )
}

// 동화 생성 중 화면: 로딩바는 계속 움직이고, 하단 메시지가 순환한다.
const GENERATING_MESSAGES = [
  "도깨비들이 동화를 만드는 중...",
  "제비가 박씨를 물어다 주는 중...",
  "호랑이가 떡 하나 달라고 조르는 중...",
  "선녀가 날개옷을 찾는 중...",
  "토끼가 용궁으로 헤엄치는 중...",
  "혹부리 영감이 노래를 부르는 중...",
  "해님 달님이 동아줄을 내리는 중...",
]

function GeneratingView({ childName }: { childName: string }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % GENERATING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center py-16 text-center">
      <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-9 w-9 animate-pulse text-primary" />
      </span>
      <h2 className="mt-6 font-heading text-2xl text-foreground">
        전래동화를 짓는 중이에요...
      </h2>
      <p className="mt-2 text-muted-foreground">
        {childName}님을 위한 팝업북을 한 장 한 장 만들고 있어요.
      </p>
      <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 animate-[loadbar_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      {/* 순환하는 안내 메시지 */}
      <p
        key={msgIndex}
        className="mt-5 animate-in fade-in duration-500 font-heading text-base text-primary"
        aria-live="polite"
      >
        {GENERATING_MESSAGES[msgIndex]}
      </p>
      <style jsx>{`
        @keyframes loadbar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(240%);
          }
        }
      `}</style>
    </div>
  )
}
