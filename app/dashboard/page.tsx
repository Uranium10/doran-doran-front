"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Quiz, type QuizResult } from "@/components/workpad/quiz"
import { StorySetup } from "@/components/workpad/story-setup"
import { PopupBook } from "@/components/workpad/popup-book"
import { Report } from "@/components/workpad/report"
import {
  preQuestions,
  postQuestions,
  buildStory,
  type StoryPage,
} from "@/lib/workpad-data"

type Step = "pretest" | "setup" | "book" | "posttest" | "report"

const stepMeta: { key: Step; label: string }[] = [
  { key: "pretest", label: "문해력 테스트" },
  { key: "setup", label: "동화 생성" },
  { key: "book", label: "팝업북 읽기" },
  { key: "posttest", label: "문해력 재측정" },
  { key: "report", label: "성장 리포트" },
]

function levelFromScore(r: QuizResult) {
  const p = (r.correct / r.total) * 100
  if (p >= 85) return "숲"
  if (p >= 65) return "나무"
  if (p >= 40) return "새싹"
  return "씨앗"
}

export default function DashboardPage() {
  const [step, setStep] = useState<Step>("pretest")
  const [pre, setPre] = useState<QuizResult | null>(null)
  const [post, setPost] = useState<QuizResult | null>(null)
  const [childName, setChildName] = useState("")
  const [favorite, setFavorite] = useState("")
  const [pages, setPages] = useState<StoryPage[]>([])

  const currentIndex = stepMeta.findIndex((s) => s.key === step)
  const level = pre ? levelFromScore(pre) : "새싹"

  const reset = () => {
    setStep("pretest")
    setPre(null)
    setPost(null)
    setPages([])
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-heading text-xl text-primary">도란도란</span>
            <span className="ml-1 hidden text-sm text-muted-foreground sm:inline">
              작업 대시보드
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            나가기
          </Link>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-border bg-secondary/30">
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-4 scrollbar-hide sm:px-6">
          {stepMeta.map((s, i) => {
            const done = i < currentIndex
            const active = i === currentIndex
            return (
              <div key={s.key} className="flex shrink-0 items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    done && "bg-accent text-accent-foreground",
                    active && "bg-primary text-primary-foreground",
                    !done && !active && "bg-secondary text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < stepMeta.length - 1 && (
                  <span className="mx-1 h-px w-6 bg-border sm:w-10" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Workpad stage */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {step === "pretest" && (
          <Quiz
            questions={preQuestions}
            title="먼저 문해력을 살펴봐요"
            intro="다섯 문제만 풀면 우리 아이에게 꼭 맞는 동화 난이도를 정할 수 있어요."
            onComplete={(r) => {
              setPre(r)
              setStep("setup")
            }}
          />
        )}

        {step === "setup" && (
          <StorySetup
            level={level}
            onGenerate={(name, fav) => {
              setChildName(name)
              setFavorite(fav)
              setPages(buildStory(name, fav))
              setStep("book")
            }}
          />
        )}

        {step === "book" && (
          <PopupBook
            pages={pages}
            childName={childName}
            onFinish={() => setStep("posttest")}
          />
        )}

        {step === "posttest" && (
          <Quiz
            questions={postQuestions}
            title="동화를 읽고 다시 측정해요"
            intro="방금 읽은 이야기를 떠올리며 문제를 풀어 보세요. 얼마나 자랐을까요?"
            onComplete={(r) => {
              setPost(r)
              setStep("report")
            }}
          />
        )}

        {step === "report" && pre && post && (
          <Report
            pre={pre}
            post={post}
            childName={childName}
            onRestart={() => {
              setPost(null)
              setPages(buildStory(childName, favorite))
              setStep("setup")
            }}
          />
        )}
      </main>
    </div>
  )
}
