"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Wand2, Sparkles, BookOpen, BarChart3, Library } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { ConfirmModal } from "@/components/confirm-modal"
import { PopupBook } from "@/components/workpad/popup-book"
import { StorySetup } from "@/components/workpad/story-setup"
import { useProfile } from "@/lib/profile-context"
import { getStageInfo, needsMeasurement } from "@/lib/levels"
import { buildStory, type StoryPage, type StoryInput } from "@/lib/workpad-data"

type View = "home" | "form" | "generating" | "book"

/**
 * 더미 동화 생성기. 추후 서버 엔드포인트로 교체할 지점.
 * StoryInput 을 그대로 받아 페이지 배열을 반환하도록 설계해,
 * 통신 연동 시 이 함수 본문만 fetch 호출로 바꾸면 된다.
 */
async function generateStory(input: StoryInput): Promise<StoryPage[]> {
  // TODO: 실제 엔드포인트 연동 시 아래를 fetch 로 교체
  //   const res = await fetch("/api/story", { method: "POST", body: JSON.stringify(input) })
  //   return (await res.json()).pages
  await new Promise((resolve) => setTimeout(resolve, 3000))
  return buildStory(input.protagonistName, input.favorite)
}

export default function DashboardPage() {
  const router = useRouter()
  const { currentProfile } = useProfile()
  const [view, setView] = useState<View>("home")
  const [pages, setPages] = useState<StoryPage[]>([])
  const [measureModalOpen, setMeasureModalOpen] = useState(false)

  // 선택된 프로필이 없으면 프로필 선택 화면으로 보낸다.
  useEffect(() => {
    if (!currentProfile) router.replace("/profiles")
  }, [currentProfile, router])

  if (!currentProfile) return null

  const stage = getStageInfo(currentProfile.level)
  const mustMeasure = needsMeasurement(currentProfile.level)

  const handleCreateStory = () => {
    // 상황 A: 측정이 필요하면 안내 모달을 띄운다.
    if (mustMeasure) {
      setMeasureModalOpen(true)
      return
    }
    // 상황 B: 동화 입력 폼으로 이동한다.
    setView("form")
  }

  // 폼 입력 완료 → 생성(더미) → 팝업북
  const handleStorySubmit = async (input: StoryInput) => {
    setView("generating")
    const result = await generateStory(input)
    setPages(result)
    setView("book")
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
          <div className="mx-auto flex w-full max-w-xl flex-col items-center py-16 text-center">
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-9 w-9 animate-pulse text-primary" />
            </span>
            <h2 className="mt-6 font-heading text-2xl text-foreground">
              전래동화를 짓는 중이에요...
            </h2>
            <p className="mt-2 text-muted-foreground">
              {currentProfile.name}님을 위한 팝업북을 한 장 한 장 만들고 있어요.
            </p>
            <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-1/2 animate-[loadbar_3s_ease-in-out] rounded-full bg-primary" />
            </div>
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
        )}

        {view === "book" && (
          <div>
            <PopupBook
              pages={pages}
              childName={currentProfile.name}
              onFinish={() => router.push("/library")}
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
