"use client"

import { useState } from "react"
import Image from "next/image"
import { Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { StoryInput } from "@/lib/workpad-data"

// 좋아하는 것 예시 (탭하면 입력칸에 채워짐)
const FAVORITE_EXAMPLES = ["공룡", "별", "공주", "강아지", "로봇", "딸기"]

// 기분 선택지: 각 캐릭터 얼굴 버튼을 누르면 today_event 에 해당 문장이 채워진다.
const MOODS = [
  {
    id: "happy",
    label: "행복해요",
    image: "/emotions/happy.png",
    event: "밝고 따뜻한 일상, 신나는 모험 이야기가 필요해요.",
  },
  {
    id: "sad",
    label: "슬퍼요",
    image: "/emotions/sad.png",
    event: "위로, 공감, 우정의 소중함이 깃든 이야기가 필요해요.",
  },
  {
    id: "angry",
    label: "화가 나요",
    image: "/emotions/angry.png",
    event: "감정 조절, 양보, 인간 관계에 관한 이야기가 필요해요.",
  },
  {
    id: "scared",
    label: "두려워요",
    image: "/emotions/scared.png",
    event: "용기, 극복, 두려움을 물리치는 지혜에 관한 이야기가 필요해요.",
  },
  {
    id: "worried",
    label: "걱정돼요",
    image: "/emotions/worried.png",
    event: "자신감, 문제 해결, 든든한 조력자에 관한 이야기가 필요해요.",
  },
  {
    id: "bored",
    label: "심심해요",
    image: "/emotions/bored.png",
    event: "상상력, 기발하고 신나는 모험에 관한 이야기가 필요해요.",
  },
] as const

export function StorySetup({
  defaultName,
  onSubmit,
}: {
  /** 주인공 이름 (현재 프로필 이름). UI 로는 노출하지 않고 전송 값으로만 사용. */
  defaultName: string
  /** 폼 입력이 완료되면 구조화된 StoryInput 을 넘긴다. 추후 서버 호출 지점. */
  onSubmit: (input: StoryInput) => void
}) {
  const [favorite, setFavorite] = useState("")
  // 선택된 기분 id (없으면 null)
  const [moodId, setMoodId] = useState<string | null>(null)

  const selectedMood = MOODS.find((m) => m.id === moodId)
  const todayEvent = selectedMood?.event ?? ""

  // favorite 와 today_event 중 하나라도 채워지면 제출 가능
  const canSubmit = favorite.trim().length > 0 || todayEvent.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    const fav = favorite.trim()
    // 한쪽만 입력된 경우 빈 쪽에 채워진 쪽의 값을 복사해 둘 다 채워 전송한다.
    const finalFavorite = fav || todayEvent
    const finalEvent = todayEvent || fav
    onSubmit({
      protagonistName: defaultName.trim(),
      favorite: finalFavorite,
      todayEvent: finalEvent,
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="font-heading text-3xl text-foreground">
          어떤 이야기를 만들까요?
        </h2>
        <p className="mt-2 text-muted-foreground">
          {defaultName}님이 좋아하는 것이나 오늘의 기분을 알려 주면 딱 맞는 전래동화를 지어 드려요.
        </p>
      </div>

      <div className="space-y-8 rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8">
        {/* 1. 좋아하는 것 (+ 예시 칩) */}
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

        {/* 구분선 + 또는 */}
        <div className="flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-sm font-medium text-muted-foreground">또는,</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* 2. 오늘의 기분 (캐릭터 버튼) */}
        <div className="space-y-3">
          <Label className="text-base">어떤 기분인가요?</Label>
          <div className="grid grid-cols-3 gap-3">
            {MOODS.map((mood) => {
              const active = moodId === mood.id
              return (
                <button
                  key={mood.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMoodId(active ? null : mood.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-background hover:border-primary/40 hover:bg-secondary/50",
                  )}
                >
                  <span
                    className={cn(
                      "overflow-hidden rounded-full ring-2 transition-all",
                      active ? "ring-primary" : "ring-transparent",
                    )}
                  >
                    <Image
                      src={mood.image || "/placeholder.svg"}
                      alt={mood.label}
                      width={72}
                      height={72}
                      className="h-16 w-16 object-cover sm:h-[72px] sm:w-[72px]"
                    />
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {mood.label}
                  </span>
                </button>
              )
            })}
          </div>
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
