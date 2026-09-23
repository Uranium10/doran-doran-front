"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { request } from "./api"
import { getSupabaseBrowserClient } from "./supabase/client"
import { useProfile } from "./profile-context"
import { generateAssessment, type AssessmentPayload, type GenerationJob, type StoryInput } from "./workpad-data"
import { GenerationController, type GenerationState, type TrackedJob } from "./generation-controller"

type ReadyStory = { profileId: string; payload: AssessmentPayload }
type GenerationScrollRequest = { id: string; profileId: string }

type Value = GenerationState & {
  scrollRequest: GenerationScrollRequest | null
  consumeGenerationScroll: (id: string) => void
  start: (profileId: string, input: StoryInput) => Promise<boolean>
  canRetry: boolean
  retry: () => Promise<void>
  dismiss: () => void
  openStory: (job: TrackedJob) => void
  requestedStory: ReadyStory | null
  consumeStory: () => void
}
const Context = createContext<Value | null>(null)
const EMPTY: GenerationState = { job: null, starting: false, connectionLost: false, error: null }

/** RootLayout 아래에 있어 라우트가 바뀌어도 생성 조회와 완료 알림이 유지된다. */
export function GenerationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { selectProfile } = useProfile()
  const [state, setState] = useState<GenerationState>(EMPTY)
  const [requestedStory, setRequestedStory] = useState<ReadyStory | null>(null)
  const [scrollRequest, setScrollRequest] = useState<GenerationScrollRequest | null>(null)
  const controller = useRef<GenerationController | null>(null)
  const openRef = useRef<(job: TrackedJob) => void>(() => {})
  const openStory = useCallback((job: TrackedJob) => {
    if (!job.result || !job.profile_id) return
    selectProfile(job.profile_id)
    setRequestedStory({ profileId: job.profile_id, payload: job.result })
    controller.current?.dismiss()
    toast.dismiss(`story-ready-${job.job_id}`)
    router.push(job.result?.story_id ? `/books/${encodeURIComponent(job.result.story_id)}?from=dashboard` : "/dashboard")
  }, [router, selectProfile])
  openRef.current = openStory

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    let alive = true
    let owner: string | null | undefined
    let unsubscribe: (() => void) | undefined
    const notices = new Set<string>()
    const attach = (userId: string | null) => {
      if (!alive || owner === userId) return
      owner = userId
      unsubscribe?.(); controller.current?.dispose(); controller.current = null
      notices.forEach(id => toast.dismiss(id)); notices.clear()
      setState(EMPTY); setRequestedStory(null); setScrollRequest(null)
      if (!userId) return
      const instance = new GenerationController(userId, {
        current: () => request<{ available: boolean; job: GenerationJob | null }>("/stories/generation-jobs/current"),
        get: id => request<GenerationJob>(`/stories/generation-jobs/${encodeURIComponent(id)}`),
        enqueue: (profileId, input, key) => request<GenerationJob>("/stories/generation-jobs", {
          method: "POST", headers: { "Idempotency-Key": key },
          body: JSON.stringify({ profile_id: profileId, assessment_type: "posttest", protagonist_name: input.protagonistName,
            reading_mode: input.mode === "original" ? "level_aligned" : input.readingMode ?? "level_aligned",
            mode: input.mode ?? "personalized", theme_id: input.themeId, custom_topic: input.customTopic,
            favorite: input.favorite, today_event: input.todayEvent, page_images: input.pageImages ?? false, tts: input.tts ?? false, image_provider: input.imageProvider }),
        }, { timeoutMs: 60_000 }),
        legacy: (profileId, input) => generateAssessment(profileId, "posttest", { ...input, useJobs: false }),
      }, {
        getItem: key => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: key => window.localStorage.removeItem(key),
      }, job => {
        const id = `story-ready-${job.job_id}`; notices.add(id)
        toast.success("따끈한 동화가 완성되었어요!", { id, duration: 12000,
          description: "우리 아이의 책장에 새 이야기가 도착했어요.",
          action: { label: "동화 읽기", onClick: () => openRef.current(job) } })
      })
      controller.current = instance
      unsubscribe = instance.subscribe(() => {
        const next = instance.snapshot()
        setState(next)
        // 다른 화면을 보고 있어도 실패를 알린다. 같은 작업의 폴링은 알림을 반복하지 않는다.
        if (next.job?.status === "failed") {
          const id = `story-failed-${next.job.job_id}`
          if (!notices.has(id)) {
            notices.add(id)
            toast.error("동화를 완성하지 못했어요", { id, duration: 12000,
              description: next.error ?? "생성 중 문제가 생겼어요. 대시보드에서 확인해 주세요." })
          }
        }
      })
      // Auth 콜백 내부에서 getSession을 다시 기다리지 않도록 다음 이벤트 루프로 넘긴다.
      setTimeout(() => { void instance.refresh() }, 0)
    }
    // 초기 세션 조회가 늦게 끝나도 이후 로그인/로그아웃 이벤트를 덮지 않는다.
    let authEventReceived = false
    void supabase.auth.getSession().then(({ data }) => { if (!authEventReceived) attach(data.session?.user.id ?? null) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true; attach(session?.user.id ?? null)
    })
    const refresh = () => { void controller.current?.refresh() }
    window.addEventListener("online", refresh)
    window.addEventListener("focus", refresh)
    const storageChanged = (event: StorageEvent) => { if (owner && event.key?.startsWith(`doran-generation:${owner}:`)) refresh() }
    window.addEventListener("storage", storageChanged)
    return () => {
      alive = false; unsubscribe?.(); controller.current?.dispose(); controller.current = null
      subscription.unsubscribe(); notices.forEach(id => toast.dismiss(id))
      window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh)
      window.removeEventListener("storage", storageChanged)
    }
  }, [])

  const start = useCallback(async (profileId: string, input: StoryInput) => {
    if (!controller.current) throw new Error("로그인 상태를 확인하고 있어요. 잠시 후 다시 시도해 주세요.")
    // 라우트 전환보다 먼저 이동 의도를 남긴다. 실제 스크롤은 카드가 마운트된 화면에서 한다.
    const id = crypto.randomUUID()
    setScrollRequest({ id, profileId })
    try {
      const instance = controller.current
      await instance.start(profileId, input)
      const result = instance.snapshot()
      // 네트워크 불명/거부/로그아웃을 접수 성공으로 오인해 작성 폼을 비우지 않는다.
      return controller.current === instance && Boolean(result.job) && !result.connectionLost && !result.error
    }
    catch (error) {
      setScrollRequest(previous => previous?.id === id ? null : previous)
      throw error
    }
  }, [])
  const retry = useCallback(async () => { await controller.current?.retry() }, [])
  const dismiss = useCallback(() => controller.current?.dismiss(), [])
  const consumeStory = useCallback(() => setRequestedStory(null), [])
  const consumeGenerationScroll = useCallback((id: string) => setScrollRequest(previous => previous?.id === id ? null : previous), [])
  return <Context.Provider value={{ ...state, start, canRetry: controller.current?.canRetry() ?? false, retry, dismiss, openStory, requestedStory, consumeStory, scrollRequest, consumeGenerationScroll }}>{children}</Context.Provider>
}
export function useGeneration() {
  const context = useContext(Context)
  if (!context) throw new Error("GenerationProvider is required")
  return context
}
