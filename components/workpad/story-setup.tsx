"use client"

import { useState } from "react"
import { Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { StoryInput } from "@/lib/workpad-data"

// 좋아하는 것 예시 (탭하면 입력칸에 채워짐)
const FAVORITE_EXAMPLES = ["공룡", "별", "공주", "강아지", "로봇", "딸기"]

const MAX_EVENT_LEN = 200

export function StorySetup({
  defaultName,
  onSubmit,
}: {
  /** 주인공 이름 기본값 (현재 프로필 이름) */
  defaultName: string
  /** 폼 입력이 완료되면 구조화된 StoryInput 을 넘긴다. 추후 서버 호출 지점. */
  onSubmit: (input: StoryInput) => void
}) {
  const [protagonistName, setProtagonistName] = useState(defaultName)
  const [favorite, setFavorite] = useState("")
  const [todayEvent, setTodayEvent] = useState("")

  const canSubmit =
    protagonistName.trim().length > 0 && favorite.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      protagonistName: protagonistName.trim(),
      favorite: favorite.trim(),
      todayEvent: todayEvent.trim(),
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="font-heading text-3xl text-foreground">
          어떤 이야기를 만들까요?
        </h2>
        <p className="mt-2 text-muted-foreground">
          몇 가지만 알려 주면 우리 아이만의 전래동화가 만들어져요.
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8">
        {/* 1. 주인공 이름 */}
        <div className="space-y-2">
          <Label htmlFor="protagonistName" className="text-base">
            주인공의 이름을 정해주세요
          </Label>
          <Input
            id="protagonistName"
            value={protagonistName}
            onChange={(e) => setProtagonistName(e.target.value)}
            placeholder="예: 도란이"
            className="h-12 rounded-xl text-base"
          />
        </div>

        {/* 2. 좋아하는 것 (+ 예시 칩) */}
        <div className="space-y-2">
          <Label htmlFor="favorite" className="text-base">
            무엇을 좋아하나요?
          </Label>
          <Input
            id="favorite"
            value={favorite}
            onChange={(e) => setFavorite(e.target.value)}
            placeholder="예: 공룡, 별, 공주"
            className="h-12 rounded-xl text-base"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {FAVORITE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setFavorite(ex)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  favorite === ex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* 3. 오늘 있었던 일 */}
        <div className="space-y-2">
          <Label htmlFor="todayEvent" className="text-base">
            오늘 무슨 일이 있었나요?
          </Label>
          <Textarea
            id="todayEvent"
            value={todayEvent}
            onChange={(e) =>
              setTodayEvent(e.target.value.slice(0, MAX_EVENT_LEN))
            }
            placeholder="예: 오늘 유치원에서 친구랑 블록으로 큰 성을 만들었어요."
            rows={4}
            className="resize-none rounded-xl text-base"
          />
          <p className="text-right text-xs text-muted-foreground">
            {todayEvent.length}/{MAX_EVENT_LEN}
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
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
