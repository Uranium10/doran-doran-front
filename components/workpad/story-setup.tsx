"use client"

import { useState } from "react"
import { Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const themes = [
  { id: "courage", label: "용기와 모험" },
  { id: "kindness", label: "나눔과 친절" },
  { id: "wisdom", label: "지혜와 재치" },
  { id: "family", label: "가족과 사랑" },
]

export function StorySetup({
  level,
  onGenerate,
}: {
  level: string
  onGenerate: (childName: string, favorite: string) => void
}) {
  const [childName, setChildName] = useState("")
  const [favorite, setFavorite] = useState("")
  const [theme, setTheme] = useState("courage")
  const [loading, setLoading] = useState(false)

  const generate = () => {
    setLoading(true)
    // Simulate AI generation with sample content.
    setTimeout(() => onGenerate(childName, favorite), 2200)
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center py-16 text-center">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-9 w-9 animate-pulse text-primary" />
        </span>
        <h2 className="mt-6 font-heading text-2xl text-foreground">
          전래동화를 짓는 중이에요...
        </h2>
        <p className="mt-2 text-muted-foreground">
          {childName.trim() || "아이"}(이)를 위한 팝업북을 한 장 한 장 만들고
          있어요.
        </p>
        <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-[loadbar_2.2s_ease-in-out] rounded-full bg-primary" />
        </div>
        <style jsx>{`
          @keyframes loadbar {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(220%);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
          측정 결과: {level} 단계
        </span>
        <h2 className="mt-3 font-heading text-3xl text-foreground">
          이제 전래동화를 만들어요
        </h2>
        <p className="mt-2 text-muted-foreground">
          아이 정보를 넣으면 {level} 단계에 꼭 맞는 나만의 동화가 만들어져요.
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8">
        <div className="space-y-2">
          <Label htmlFor="childName" className="text-base">
            아이 이름 (주인공)
          </Label>
          <Input
            id="childName"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="예: 도란이"
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="favorite" className="text-base">
            아이가 좋아하는 것
          </Label>
          <Input
            id="favorite"
            value={favorite}
            onChange={(e) => setFavorite(e.target.value)}
            placeholder="예: 별, 강아지, 딸기"
            className="h-12 rounded-xl text-base"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base">이야기 주제</Label>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  "rounded-2xl border-2 p-4 text-base font-medium transition-colors",
                  theme === t.id
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={generate}
          size="lg"
          className="h-13 w-full rounded-full text-base"
        >
          <Wand2 className="mr-1 h-5 w-5" />
          전래동화 만들기
        </Button>
      </div>
    </div>
  )
}
