"use client"

import { useEffect, useState } from "react"
import { BookOpen, Check, RefreshCw, Sparkles, Wand2 } from "lucide-react"
import { useSessionView, objectValue } from "@/lib/use-session-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { fetchStoryThemes, fetchGenerationPreferences, saveGenerationPreferences,
  type StoryTheme, type StoryMode, type GenerationPreferences, type StoryInput } from "@/lib/workpad-data"
import { drawThemeCards } from "@/lib/story-theme-cards"

const FAVORITES = ["공룡", "별", "공주", "강아지", "로봇", "딸기"]
const MODES = [{ id: "original", label: "옛이야기", icon: BookOpen }, { id: "personalized", label: "나만의 이야기", icon: Sparkles }] as const
type Draft = { mode: StoryMode; themeId: string; favorite: string; protagonistName: string; eventText: string; customTopic?: string; previousThemeIds?: string[] }
function isDraft(value: unknown): value is Draft {
  return objectValue(value)
    && (value.customTopic === undefined || typeof value.customTopic === "string")
    && (value.previousThemeIds === undefined || (Array.isArray(value.previousThemeIds) && value.previousThemeIds.every(id => typeof id === "string"))) && (value.mode === "original" || value.mode === "personalized")
    && ["themeId", "favorite", "protagonistName", "eventText"].every(key => typeof value[key] === "string")
}

export function StorySetup({ profileId, defaultName, persistenceKey, onSubmit, onAccepted }: {
  profileId: string; defaultName: string; persistenceKey?: string | null; onSubmit: (input: StoryInput) => Promise<boolean>; onAccepted?: () => void
}) {
  // 예전 moodId 폼을 새 주제 선택으로 오인하지 않도록 보관 키도 버전을 나눈다.
  const draft = useSessionView<Draft>(persistenceKey ? `${persistenceKey}:topics-v1` : null,
    { mode: "original", themeId: "", favorite: "", protagonistName: defaultName, eventText: "" }, isDraft)
  const { mode, themeId, favorite, protagonistName, eventText, customTopic = "" } = draft.value
  const update = (value: Partial<Draft>) => draft.setValue(old => ({ ...old, ...value }))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [catalog, setCatalog] = useState<StoryTheme[]>([])
  const [cards, setCards] = useState<StoryTheme[]>([])
  const [loadedMode, setLoadedMode] = useState<StoryMode | null>(null)
  const [themeError, setThemeError] = useState("")
  const [reload, setReload] = useState(0)
  const [preferences, setPreferences] = useState<GenerationPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const loadPreferences = async () => {
    setSettingsError("")
    try { setPreferences(await fetchGenerationPreferences()) }
    catch { setSettingsError("설정을 불러오지 못했어요. 다시 시도해 주세요.") }
  }
  useEffect(() => { void loadPreferences() }, [])
  useEffect(() => {
    if (!draft.ready) return
    const controller = new AbortController()
    setLoadedMode(null); setThemeError("")
    // 서버가 소유권·생년월일·원전 제한을 확인한 목록만 내려준다. 나이를 요청에 실어 보내지 않는다.
    void fetchStoryThemes(profileId, mode, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setCatalog(result.topics)
      const selected = result.topics.find(t => t.theme_id === draft.value.themeId)
      const next = drawThemeCards(result.topics, result.topics.filter(t => draft.value.previousThemeIds?.includes(t.theme_id)))
      if (selected && !next.some(t => t.theme_id === selected.theme_id)) next[0] = selected
      setCards(next); setLoadedMode(mode)
      if (!selected) draft.setValue(old => ({ ...old, themeId: "" }))
    }).catch(error => {
      if (!controller.signal.aborted) setThemeError(error instanceof Error ? error.message : "주제를 불러오지 못했어요.")
    })
    return () => controller.abort()
    // themeId 변경 때마다 카드를 다시 뽑으면 선택이 사라지므로 조회 조건에 넣지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, mode, draft.ready, reload])

  const changeMode = (next: StoryMode) => {
    if (next !== mode) { setLoadedMode(null); update({ mode: next, themeId: "", customTopic: "", previousThemeIds: [] }) }
  }
  const reroll = () => { setCards(drawThemeCards(catalog, cards)); update({ themeId: "", customTopic: "" }) }
  const toggleImages = async (checked: boolean) => {
    setSaving(true); setSettingsError("")
    try { setPreferences(await saveGenerationPreferences(checked)) }
    catch { setSettingsError("설정을 저장하지 못했어요. 기존 설정을 유지합니다.") }
    finally { setSaving(false) }
  }
  const hasTopic = mode === "personalized" && Boolean(customTopic.trim()) || cards.some(t => t.theme_id === themeId)
  const canSubmit = draft.ready && loadedMode === mode && Boolean(preferences) && !saving && !submitting
    && hasTopic && (mode === "original" || protagonistName.trim().length > 0)
  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setSubmitError("")
    try {
      const accepted = await onSubmit({ mode, themeId: themeId || undefined,
        customTopic: mode === "personalized" ? customTopic.trim() : undefined,
        protagonistName: mode === "original" ? "" : protagonistName.trim(),
        favorite: mode === "original" ? "" : favorite.trim(), todayEvent: mode === "original" ? "" : eventText.trim(),
        pageImages: preferences?.page_images ?? false, useJobs: preferences?.jobs_enabled ?? false })
      // 접수 실패/응답 유실은 입력을 보존한다. 성공 시에만 새 카드와 빈 선택을 저장한다.
      if (accepted && draft.isCurrent()) {
        setCards(drawThemeCards(catalog, cards))
        update({ themeId: "", customTopic: "", previousThemeIds: cards.map(t => t.theme_id) })
        onAccepted?.()
      }
    } catch (error) {
      if (draft.isCurrent()) setSubmitError(error instanceof Error ? error.message : "동화를 시작하지 못했어요.")
    } finally { if (draft.isCurrent()) setSubmitting(false) }
  }

  if (!draft.ready) return <p role="status">작성하던 내용을 준비하고 있어요…</p>
  return <fieldset disabled={submitting} aria-busy={submitting} className="mx-auto w-full min-w-0 max-w-2xl">
    <div className="mb-6 text-center">
      <p className="mb-2 text-sm tracking-widest text-primary">이야기 한 권, 마음 한 뼘</p>
      <h2 className="font-heading text-3xl text-foreground">어떤 이야기를 만날까요?</h2>
    </div>
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-md">
      <div role="tablist" aria-label="동화 만들기 방식" className="grid grid-cols-2 gap-2 bg-secondary/50 p-2">
        {MODES.map(({ id, label, icon: Icon }, index) => <button key={id} type="button" role="tab"
          id={`story-tab-${id}`} aria-controls="story-mode-panel" aria-selected={mode === id} tabIndex={mode === id ? 0 : -1}
          onClick={() => changeMode(id)} onKeyDown={event => {
            const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : ["ArrowLeft", "ArrowRight"].includes(event.key) ? 1 - index : null
            if (next !== null) { event.preventDefault(); changeMode(MODES[next].id); document.getElementById(`story-tab-${MODES[next].id}`)?.focus() }
          }} className={cn("flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 py-3 font-heading text-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            mode === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Icon className="h-5 w-5" aria-hidden="true" />{label}
        </button>)}
      </div>
      <section role="tabpanel" id="story-mode-panel" aria-labelledby={`story-tab-${mode}`} className="space-y-7 p-5 sm:p-8">
        <p className="rounded-2xl bg-secondary/35 px-4 py-3 text-center text-sm leading-relaxed text-muted-foreground">
          {mode === "original" ? <>오래 사랑받은 옛이야기를 읽기 단계에 맞춰 풀어드려요.<br />원전의 줄거리를 따라, 쉬운 말로 만나요.</>
            : <>{defaultName}님이 이야기의 주인공이 되어볼까요?<br />좋아하는 것과 오늘의 경험을 담아 새롭게 지어요.</>}
        </p>
        {mode === "personalized" && <div className="space-y-5">
          <div className="space-y-2"><Label htmlFor="protagonist-name">이야기의 주인공 이름</Label>
            <Input id="protagonist-name" value={protagonistName} maxLength={30} onChange={e => update({ protagonistName: e.target.value })} placeholder="주인공 이름" /></div>
          <div className="space-y-2"><Label htmlFor="favorite">무엇을 좋아하나요? <span className="text-muted-foreground">(선택)</span></Label>
            <Input id="favorite" maxLength={200} value={favorite} onChange={e => update({ favorite: e.target.value })} placeholder="예: 공룡, 별, 강아지" />
            <div className="flex flex-wrap gap-2">{FAVORITES.map(value => <button type="button" key={value} onClick={() => update({ favorite: value })}
              className={cn("rounded-full border px-3 py-1.5 text-sm", favorite === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{value}</button>)}</div>
          </div>
        </div>}
        <fieldset className="min-w-0 space-y-4">
          <legend className="w-full font-heading text-xl text-foreground">{mode === "original" ? "오늘은 이런 동화를 준비했어요" : "어떤 주제로 만들까요?"}</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{mode === "original" ? "마음에 드는 이야기를 골라 주세요" : "마음에 드는 주제를 고르거나 직접 적어 주세요"}</p>
            <button type="button" onClick={reroll} disabled={loadedMode !== mode || catalog.length <= 3}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-40"
              title={catalog.length <= 3 ? "지금 만날 수 있는 주제를 모두 보여드리고 있어요" : undefined}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />다른 주제 보기
            </button>
          </div>
          {themeError ? <div role="alert" className="rounded-2xl bg-secondary/50 p-5 text-sm">{themeError}
            <button type="button" onClick={() => setReload(n => n + 1)} className="ml-2 text-primary underline">다시 불러오기</button></div>
            : loadedMode !== mode ? <div role="status" className="grid min-h-44 place-items-center rounded-2xl bg-secondary/40 text-sm text-muted-foreground">이야기 카드를 준비하고 있어요…</div>
            : cards.length === 0 ? <p role="status">아직 준비된 주제가 없어요. 나만의 이야기 탭에서 만나보세요.</p>
            : <div className="grid gap-3 sm:grid-cols-3">{cards.map((topic, index) => <label key={topic.theme_id}
                className="relative cursor-pointer">
                <input type="radio" name="story-theme" value={topic.theme_id} checked={themeId === topic.theme_id}
                  onChange={() => update({ themeId: topic.theme_id, customTopic: "" })} className="peer sr-only" />
                <span className={cn("flex h-full min-h-28 flex-col rounded-2xl border-2 p-4 transition-colors sm:min-h-48 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
                  themeId === topic.theme_id ? "border-primary bg-primary/5" : "border-transparent",
                  themeId !== topic.theme_id && ["bg-[#f4edda]", "bg-[#e7eeea]", "bg-[#f5e8df]"][index])}>
                  <span className="mb-3 flex items-center justify-between gap-2 text-xs text-foreground/65">
                    <span>{topic.category}</span><span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", themeId === topic.theme_id ? "border-primary bg-primary text-white" : "border-foreground/20")}>
                      {themeId === topic.theme_id && <Check className="h-3 w-3" aria-hidden="true" />}</span>
                  </span>
                  <span className="break-keep font-heading text-lg leading-snug text-foreground">{topic.label}</span>
                  <span className="mt-3 break-keep text-xs leading-relaxed text-foreground/70">{topic.description}</span>
                </span>
              </label>)}</div>}
          {mode === "personalized" && <div className="space-y-2 pt-1">
            <Label htmlFor="custom-topic">주제 직접 입력</Label>
            <Input id="custom-topic" maxLength={200} value={customTopic} placeholder="예: 서로 다른 친구를 이해하는 이야기"
              onChange={e => update({ customTopic: e.target.value, themeId: "" })} />
          </div>}
        </fieldset>
        {mode === "personalized" && <div className="space-y-2"><Label htmlFor="today-event">오늘 일어난 일 <span className="text-muted-foreground">(선택)</span></Label>
            <Input id="today-event" value={eventText} maxLength={800} onChange={e => update({ eventText: e.target.value })} placeholder="예: 친구와 함께 놀이터에서 놀았어요" /></div>}
        <div className="space-y-2 rounded-2xl bg-secondary/50 p-4">
          <label className="flex items-center gap-3"><input type="checkbox" checked={preferences?.page_images ?? false}
            disabled={!preferences?.available || saving} onChange={e => void toggleImages(e.target.checked)} /><span>매 장면에 삽화 넣기</span></label>
          <p className="text-xs leading-relaxed text-muted-foreground">그림이 있으면 만드는 시간이 더 걸려요. 이 계정에 설정을 저장해요.</p>
          {preferences && !preferences.available && <p className="text-sm text-muted-foreground">삽화 옵션을 준비하고 있어요.</p>}
          {!preferences && !settingsError && <p role="status" className="text-sm">설정을 불러오는 중이에요.</p>}
          {saving && <p role="status" className="text-sm">설정을 저장하는 중이에요.</p>}
          {settingsError && <div role="alert" className="text-sm text-destructive">{settingsError}
            {!preferences && <button type="button" className="ml-2 underline" onClick={() => void loadPreferences()}>다시 불러오기</button>}</div>}
        </div>
        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
        <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="h-13 w-full rounded-full text-base">
          <Wand2 className="mr-1 h-5 w-5" aria-hidden="true" />{submitting ? "이야기를 준비하고 있어요…" : mode === "original" ? "옛이야기 만나기" : "나만의 이야기 만들기"}
        </Button>
      </section>
    </div>
  </fieldset>
}
