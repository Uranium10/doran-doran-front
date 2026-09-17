"use client"

import { useSessionView, objectValue } from "@/lib/use-session-view"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { fetchGenerationPreferences, saveGenerationPreferences, type GenerationPreferences, type StoryInput } from "@/lib/workpad-data"

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
  persistenceKey,
  onSubmit,
}: {
  /** 기본값은 프로필 이름이며 이번 동화에서 쓸 이름을 직접 바꿀 수 있다. */
  persistenceKey?: string | null
  defaultName: string
  /** 폼 입력이 완료되면 구조화된 StoryInput 을 넘긴다. 추후 서버 호출 지점. */
  onSubmit: (input: StoryInput) => void
}) {
  const draft = useSessionView<{ favorite:string; protagonistName:string; eventText:string; moodId:string|null }>(persistenceKey ?? null, { favorite:"", protagonistName:defaultName, eventText:"", moodId:null },
    (value): value is { favorite:string; protagonistName:string; eventText:string; moodId:string|null } => objectValue(value) && ["favorite","protagonistName","eventText"].every(key => typeof value[key] === "string") && (value.moodId === null || typeof value.moodId === "string"))
  const { favorite, protagonistName, eventText, moodId } = draft.value
  const setFavorite = (favorite:string) => draft.setValue(old => ({...old,favorite}))
  const setProtagonistName = (protagonistName:string) => draft.setValue(old => ({...old,protagonistName}))
  const setEventText = (eventText:string) => draft.setValue(old => ({...old,eventText}))
  const setMoodId = (moodId:string|null) => draft.setValue(old => ({...old,moodId}))
  const [preferences, setPreferences] = useState<GenerationPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const loadPreferences = async () => {
    setSettingsError("")
    try { setPreferences(await fetchGenerationPreferences()) }
    catch { setSettingsError("설정을 불러오지 못했어요. 다시 시도해 주세요.") }
  }
  useEffect(() => { void loadPreferences() }, [])

  const toggleImages = async (checked: boolean) => {
    setSaving(true)
    setSettingsError("")
    try { setPreferences(await saveGenerationPreferences(checked)) }
    catch { setSettingsError("설정을 저장하지 못했어요. 기존 설정을 유지합니다.") }
    finally { setSaving(false) }
  }
  // 선택된 기분 id (없으면 null)

  const selectedMood = MOODS.find((m) => m.id === moodId)
  const todayEvent = [eventText.trim(), selectedMood?.event].filter(Boolean).join(" ")

  // favorite 와 today_event 중 하나라도 채워지면 제출 가능
  const canSubmit = draft.ready && Boolean(preferences) && !saving && protagonistName.trim().length > 0
    && (favorite.trim().length > 0 || todayEvent.length > 0)

  const handleSubmit = () => {
    if (!canSubmit) return
    const fav = favorite.trim()
    // 관심사와 오늘의 경험은 별개다. 빈 항목을 복사하면 모델이 잘못 해석할 수 있다.
    onSubmit({
      protagonistName: protagonistName.trim(),
      favorite: fav,
      todayEvent,
      pageImages: preferences?.page_images ?? false,
      useJobs: preferences?.jobs_enabled ?? false,
    })
  }

  if (!draft.ready) return <p role="status">작성하던 내용을 준비하고 있어요…</p>

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
        <div className="space-y-2">
          <Label htmlFor="protagonist-name">이야기의 주인공 이름</Label>
          <Input id="protagonist-name" value={protagonistName} maxLength={30}
            onChange={(e) => setProtagonistName(e.target.value)} placeholder="주인공 이름을 입력해 주세요" />
        </div>
        {/* 1. 좋아하는 것 (+ 예시 칩) */}
        <div className="space-y-2">
          <Label htmlFor="favorite" className="text-base">
            무엇을 좋아하나요?
          </Label>
          <Input
            id="favorite"
            maxLength={200}
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

        <div className="space-y-2">
          <Label htmlFor="today-event">오늘 있었던 일 (선택)</Label>
          <Input id="today-event" value={eventText} maxLength={800}
            onChange={(e) => setEventText(e.target.value)} placeholder="예: 친구와 장난감을 나누기 어려웠어요" />
        </div>
        <div className="space-y-2 rounded-2xl bg-secondary/50 p-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={preferences?.page_images ?? false}
              disabled={!preferences?.available || saving} onChange={(e) => void toggleImages(e.target.checked)} />
            <span>매 장면에 삽화 넣기</span>
          </label>
          <p className="text-sm text-muted-foreground">
            그림이 있으면 만드는 시간이 더 걸려요. 선택한 설정은 이 계정에 저장돼요.
          </p>
          {preferences && !preferences.available && <p className="text-sm text-muted-foreground">삽화 옵션을 준비하고 있어요.</p>}
          {!preferences && !settingsError && <p role="status">설정을 불러오는 중이에요.</p>}
          {saving && <p role="status">설정을 저장하는 중이에요.</p>}
          {settingsError && <div role="alert" className="text-sm text-destructive">{settingsError}
            {!preferences && <button type="button" className="ml-2 underline" onClick={() => void loadPreferences()}>다시 불러오기</button>}
          </div>}
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
