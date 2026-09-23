"use client"

import { useEffect, useState } from "react"
import { BookOpen, Check, RefreshCw, Sparkles, Wand2, Sun, Heart, UsersRound, Flag, Handshake, House, Leaf, ShieldCheck, ChevronDown, PencilLine } from "lucide-react"
import { useSessionView, objectValue } from "@/lib/use-session-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { fetchStoryThemes, fetchGenerationPreferences, saveGenerationPreferences,
  type StoryTheme, type StoryMode, type GenerationPreferences, type StoryInput } from "@/lib/workpad-data"
import { drawThemeCards } from "@/lib/story-theme-cards"
import { themePresentation, type ThemeSymbol } from "@/lib/story-theme-presentation"
import { ReadingModePicker } from "./reading-mode-picker"
import styles from "./story-setup.module.css"

// 같은 의미의 주제는 카드 순서가 바뀌어도 같은 그림·색으로 알아볼 수 있게 한다.
const THEME_SYMBOLS = {
  daily: Sun, heart: Heart, friend: UsersRound, courage: Flag,
  promise: Handshake, family: House, nature: Leaf, safety: ShieldCheck,
} satisfies Record<ThemeSymbol, typeof Sun>

const FAVORITES = ["공룡", "별", "공주", "강아지", "로봇", "딸기"]
const MODES = [{ id: "original", label: "옛이야기", icon: BookOpen }, { id: "personalized", label: "나만의 이야기", icon: Sparkles }] as const
type Draft = { imageProvider?: "openai" | "gemini"; readingMode?: "level_aligned" | "relaxed"; tts?: boolean; mode: StoryMode; themeId: string; favorite: string; protagonistName: string; eventText: string; customTopic?: string; previousThemeIds?: string[] }
function isDraft(value: unknown): value is Draft {
  return objectValue(value)
    && (value.imageProvider === undefined || value.imageProvider === "openai" || value.imageProvider === "gemini")
    && (value.readingMode === undefined || value.readingMode === "level_aligned" || value.readingMode === "relaxed")
    && (value.tts === undefined || typeof value.tts === "boolean")
    && (value.customTopic === undefined || typeof value.customTopic === "string")
    && (value.previousThemeIds === undefined || (Array.isArray(value.previousThemeIds) && value.previousThemeIds.every(id => typeof id === "string"))) && (value.mode === "original" || value.mode === "personalized")
    && ["themeId", "favorite", "protagonistName", "eventText"].every(key => typeof value[key] === "string")
}

export function StorySetup({ profileId, defaultName, persistenceKey, onSubmit, onAccepted, fixedMode }: {
  profileId: string; defaultName: string; persistenceKey?: string | null; onSubmit: (input: StoryInput) => Promise<boolean>; onAccepted?: () => void; fixedMode?: StoryMode
}) {
  // 예전 moodId 폼을 새 주제 선택으로 오인하지 않도록 보관 키도 버전을 나눈다.
  const draft = useSessionView<Draft>(persistenceKey ? `${persistenceKey}:topics-v1` : null,
    { mode: fixedMode ?? "original", themeId: "", favorite: "", protagonistName: defaultName, eventText: "" }, isDraft)
  // 접수 성공 후 저장소에는 다음 입력을 준비하되, 이동 중 화면은 마지막 선택으로 고정한다.
  const [acceptedDraft, setAcceptedDraft] = useState<Draft | null>(null)
  const { mode, themeId, favorite, protagonistName, eventText, customTopic = "", tts = false, imageProvider = "openai", readingMode = "level_aligned" } = acceptedDraft ?? draft.value
  const update = (value: Partial<Draft>) => draft.setValue(old => ({ ...old, ...value }))
  // 입력란을 선택하면 빈 값이어도 직접 입력 모드다. 카드는 흐리게 보이지만 다시 선택할 수 있다.
  const [customSelected, setCustomSelected] = useState(false)
  const customActive = mode === "personalized" && (customSelected || Boolean(customTopic.trim()))
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
    if (next !== mode) { setCustomSelected(false); setLoadedMode(null); update({ mode: next, themeId: "", customTopic: "", previousThemeIds: [] }) }
  }
  const reroll = () => { setCustomSelected(false); setCards(drawThemeCards(catalog, cards)); update({ themeId: "", customTopic: "" }) }
  const toggleImages = async (checked: boolean) => {
    setSaving(true); setSettingsError("")
    try { setPreferences(await saveGenerationPreferences(checked)) }
    catch { setSettingsError("설정을 저장하지 못했어요. 기존 설정을 유지합니다.") }
    finally { setSaving(false) }
  }
  const selectedTopic = cards.find(topic => topic.theme_id === themeId)
  const hasTopic = mode === "personalized" && Boolean(customTopic.trim()) || cards.some(t => t.theme_id === themeId)
  const canSubmit = draft.ready && loadedMode === mode && Boolean(preferences) && !saving && !submitting && !acceptedDraft
    && hasTopic && (mode === "original" || protagonistName.trim().length > 0)
  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true); setSubmitError("")
    try {
      const accepted = await onSubmit({ readingMode: mode === "personalized" ? readingMode : "level_aligned", mode, themeId: themeId || undefined,
        customTopic: mode === "personalized" ? customTopic.trim() : undefined,
        protagonistName: mode === "original" ? "" : protagonistName.trim(),
        favorite: mode === "original" ? "" : favorite.trim(), todayEvent: mode === "original" ? "" : eventText.trim(),
        tts, imageProvider: preferences?.page_images ? imageProvider : undefined, pageImages: preferences?.page_images ?? false, useJobs: preferences?.jobs_enabled ?? false })
      // 실패 시 입력을 보존한다. 새 카드 추첨은 다음 마운트의 조회에서만 실행한다.
      if (accepted && draft.isCurrent()) {
        setAcceptedDraft({ ...draft.value })
        update({ themeId: "", customTopic: "", previousThemeIds: cards.map(t => t.theme_id) })
        onAccepted?.()
      }
    } catch (error) {
      if (draft.isCurrent()) setSubmitError(error instanceof Error ? error.message : "동화를 시작하지 못했어요.")
    } finally { if (draft.isCurrent()) setSubmitting(false) }
  }

  if (!draft.ready) return <p role="status">작성하던 내용을 준비하고 있어요…</p>
  return <fieldset disabled={submitting || Boolean(acceptedDraft)} aria-busy={submitting || Boolean(acceptedDraft)} className={cn(styles.form, "mx-auto w-full min-w-0 max-w-2xl")}>
    <div className="mb-6 text-center">
      <h2 className="font-heading text-3xl text-foreground">{fixedMode === 'original' ? '옛이야기' : fixedMode === 'personalized' ? '나만의 이야기' : '오늘은 어떤 이야기?'}</h2>
    </div>
    <div className="rounded-3xl border border-border bg-card shadow-md">
      {!fixedMode && <div role="tablist" aria-label="동화 만들기 방식" className="grid grid-cols-2 gap-2 rounded-t-3xl bg-secondary/50 p-2">
        {MODES.map(({ id, label, icon: Icon }, index) => <button key={id} type="button" role="tab"
          id={`story-tab-${id}`} aria-controls="story-mode-panel" aria-selected={mode === id} tabIndex={mode === id ? 0 : -1}
          onClick={() => changeMode(id)} onKeyDown={event => {
            const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : ["ArrowLeft", "ArrowRight"].includes(event.key) ? 1 - index : null
            if (next !== null) { event.preventDefault(); changeMode(MODES[next].id); document.getElementById(`story-tab-${MODES[next].id}`)?.focus() }
          }} className={cn("flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 py-3 font-heading text-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            mode === id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Icon className="h-5 w-5" aria-hidden="true" />{label}
        </button>)}
      </div>}
      <section role={fixedMode ? undefined : 'tabpanel'} id="story-mode-panel" aria-label={fixedMode ? '이야기 만들기' : undefined} aria-labelledby={fixedMode ? undefined : `story-tab-${mode}`} className="space-y-7 p-5 sm:p-8">
        <p className={styles.modeHint}>
          {mode === "original" ? "마음에 드는 주제를 고르면 옛이야기가 찾아와요." : "내가 주인공인 동화를 함께 만들어요."}
        </p>
        {mode === "personalized" && <ReadingModePicker value={readingMode} onChange={value => update({ readingMode: value })} />}
        {mode === "personalized" && <section aria-labelledby="story-hero-heading" className={styles.heroSection}>
          <h3 id="story-hero-heading" className={styles.sectionTitle}><span className={styles.step}>1</span>누가 나올까요?</h3>
          <div className={styles.heroFields}>
            <div className="space-y-2"><Label htmlFor="protagonist-name">주인공 이름</Label>
              <Input id="protagonist-name" value={protagonistName} maxLength={30} onChange={e => update({ protagonistName: e.target.value })} placeholder="주인공 이름" className={styles.textInput} /></div>
            <div className="space-y-2"><Label htmlFor="favorite">좋아하는 것 <span className={styles.optional}>선택</span></Label>
              <Input id="favorite" maxLength={200} value={favorite} onChange={e => update({ favorite: e.target.value })} placeholder="공룡, 강아지, 좋아하는 캐릭터…" className={styles.textInput} />
            </div>
          </div>
          <div className={styles.favorites} aria-label="좋아하는 것 빠르게 고르기">{FAVORITES.map(value => <button type="button" key={value} aria-pressed={favorite === value} onClick={() => update({ favorite: favorite === value ? "" : value })}
            className={cn(styles.favorite, favorite === value && styles.favoriteSelected)}>{value}</button>)}</div>
        </section>}
        <fieldset className="min-w-0 space-y-4">
          <legend className={cn(styles.sectionTitle, "w-full")}><span className={styles.step}>{mode === "original" ? "1" : "2"}</span>{mode === "original" ? "어떤 이야기가 끌리나요?" : "어떤 이야기를 만들까요?"}</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{mode === "original" ? "오늘 준비한 세 가지예요. 하나 골라요!" : "하나 고르거나, 아래에 직접 써도 좋아요."}</p>
            <button type="button" onClick={reroll} disabled={loadedMode !== mode || catalog.length <= 3}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-40"
              title={catalog.length <= 3 ? "지금 만날 수 있는 주제를 모두 보여드리고 있어요" : undefined}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />다시 뽑기
            </button>
          </div>
          {themeError ? <div role="alert" className="rounded-2xl bg-secondary/50 p-5 text-sm">{themeError}
            <button type="button" onClick={() => setReload(n => n + 1)} className="ml-2 text-primary underline">다시 불러오기</button></div>
            : loadedMode !== mode ? <div role="status" className="grid min-h-44 place-items-center rounded-2xl bg-secondary/40 text-sm text-muted-foreground">이야기 카드를 준비하고 있어요…</div>
            : cards.length === 0 ? <p role="status">아직 준비된 주제가 없어요. 나만의 이야기 탭에서 만나보세요.</p>
            : <div data-testid="topic-cards" className={cn(styles.cards, customActive && styles.cardsInactive)}>{cards.map(topic => {
                const presentation = themePresentation(topic)
                const Icon = THEME_SYMBOLS[presentation.icon]
                return <label key={topic.theme_id} className={styles.cardLabel}>
                  <input type="radio" name="story-theme" value={topic.theme_id} checked={themeId === topic.theme_id}
                    onChange={() => { setCustomSelected(false); update({ themeId: topic.theme_id, customTopic: "" }) }} className="peer sr-only" />
                  <span className={cn(styles.card, styles[presentation.icon], themeId === topic.theme_id && styles.cardSelected)}>
                    <span className={styles.selectionMark} aria-hidden="true">{themeId === topic.theme_id && <Check size={14} />}</span>
                    <span className={styles.symbol}><Icon aria-hidden="true" strokeWidth={1.8} /></span>
                    <span className={styles.cardTitle}>{presentation.label}</span>
                  </span>
                </label>
              })}</div>}
          {/* 설명은 선택 후 한 곳에만 표시한다. 카드마다 긴 문장이 반복되지 않는다. */}
          {selectedTopic && !customActive && <p className={styles.topicDetail} role="status"><Check size={16} aria-hidden="true" />{themePresentation(selectedTopic).description}</p>}
          {mode === "personalized" && <div className="space-y-2 pt-1">
            <Label htmlFor="custom-topic" className={styles.customLabel}><PencilLine size={15} aria-hidden="true" />또는 내 생각을 써 볼까요?</Label>
            <Input id="custom-topic" maxLength={200} value={customTopic} placeholder="예: 웃긴 일이 가득한 모험을 하고 싶어요" aria-describedby="custom-topic-help"
              className={cn(styles.textInput, "transition-colors", customActive && "border-primary bg-primary/5 ring-1 ring-primary/30")}
              onFocus={() => { setCustomSelected(true); update({ themeId: "" }) }}
              onChange={e => { setCustomSelected(true); update({ customTopic: e.target.value, themeId: "" }) }} />
            <p id="custom-topic-help" className="sr-only" aria-live="polite">{customActive ? "직접 입력한 주제로 만들어요. 추천 카드를 선택하면 카드 주제로 바뀌어요." : "추천 카드와 직접 입력 중 하나를 선택해 주세요."}</p>
          </div>}
        </fieldset>
        {mode === "personalized" && <details className={styles.eventDetails} open={eventText.trim() ? true : undefined}>
          <summary><span>오늘 있었던 일도 넣을까요? <span className={styles.optional}>선택</span></span><ChevronDown size={18} aria-hidden="true" /></summary>
          <div className="pt-3"><Label htmlFor="today-event" className="sr-only">오늘 있었던 일</Label>
            <textarea id="today-event" value={eventText} rows={2} maxLength={800} onChange={e => update({ eventText: e.target.value })}
              className={styles.eventInput} placeholder="예: 친구와 놀이터에서 놀았어요" /></div>
        </details>}
        <div className={styles.imageOption}>
          <label><input type="checkbox" checked={preferences?.page_images ?? false}
            disabled={!preferences?.available || saving} onChange={e => void toggleImages(e.target.checked)} />
            <span><span className={styles.imageLabel}>장면마다 그림도 넣을래요</span><span className={styles.imageHelp}>그림을 그리는 시간이 조금 더 걸려요.</span></span></label>
          {preferences && !preferences.available && <p className="text-sm text-muted-foreground">삽화 옵션을 준비하고 있어요.</p>}
          {!preferences && !settingsError && <p role="status" className="text-sm">설정을 불러오는 중이에요.</p>}
          {saving && <p role="status" className="text-sm">설정을 저장하는 중이에요.</p>}
          {settingsError && <div role="alert" className="text-sm text-destructive">{settingsError}
            {!preferences && <button type="button" className="ml-2 underline" onClick={() => void loadPreferences()}>다시 불러오기</button>}</div>}
        </div>
        {preferences?.page_images && <fieldset className={styles.illustrators} aria-describedby="illustrator-description">
          <legend>누가 그릴까요?</legend>
          <div className={styles.illustratorChoices}>
            {([
              { id: "openai", label: "파랑 도깨비", face: styles.blueFace },
              { id: "gemini", label: "분홍 도깨비", face: styles.pinkFace },
            ] as const).map(option => <label key={option.id} className={styles.illustratorChoice}>
              <input type="radio" name="illustrator" value={option.id} checked={imageProvider === option.id}
                onChange={() => update({ imageProvider: option.id })} className="sr-only" />
              <span className={styles.faceFrame}><span className={cn(styles.mascotFace, option.face)} aria-hidden="true" />
                {imageProvider === option.id && <span className={styles.faceCheck}><Check size={13} aria-hidden="true" /></span>}
              </span>
              <span className={styles.illustratorName}>{option.label}</span>
            </label>)}
          </div>
          <p id="illustrator-description" className={styles.illustratorDescription} aria-live="polite">
            {imageProvider === "openai" ? "차근차근, 작은 부분까지 정성껏 그려요." : "쓱싹쓱싹, 조금 더 빠르게 그려요."}
          </p>
        </fieldset>}
        <div className={styles.imageOption}><label><input type="checkbox" checked={tts} disabled={submitting || !preferences?.jobs_enabled} onChange={e => update({ tts: e.target.checked })} /><span><span className={styles.imageLabel}>목소리로도 읽어 줄래요</span><span className={styles.imageHelp}>동화 속 목소리를 준비하는 시간이 조금 더 걸려요.</span></span></label></div>
        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
      </section>
      {/* 같은 버튼을 아래에 고정하다가 폼의 끝에 닿으면 원래 자리에 머문다. */}
      <div className={styles.submitDock}>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} size="lg" className="h-13 w-full rounded-full text-base">
          <Wand2 className="mr-1 h-5 w-5" aria-hidden="true" />{acceptedDraft ? "책장으로 이동하고 있어요…" : submitting ? "이야기를 준비하고 있어요…" : mode === "original" ? "옛이야기 만나기" : "나만의 이야기 만들기"}
        </Button>
      </div>
    </div>
  </fieldset>
}
