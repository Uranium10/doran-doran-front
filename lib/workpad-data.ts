import { ApiError, request, LONG_TIMEOUT_MS } from "@/lib/api"
import type { LiteracyResult } from "@/lib/levels"

// ===========================================================================
// 통신 규격 (back <-> front)
// 모든 fetch 는 lib/api.ts 의 request() 래퍼를 사용한다.
// (Base URL + Content-Type + Supabase Authorization 헤더 자동 처리 → CORS 안전)
// ===========================================================================

/**
 * 평가 유형
 * - pretest: 아동 배치고사/재시험
 * - posttest: 동화 퀴즈
 * - checklist: 영유아 부모용
 * - library: 보관함에 저장된 동화 다시 읽기 (퀴즈 없음, 서버가 내려줌)
 * - readonly: 자체 제공 기성 전래동화 (퀴즈 없음, 서버가 내려줌)
 */
export type AssessmentType =
  | "pretest"
  | "posttest"
  | "checklist"
  | "library"
  | "readonly"

/** 동화 페이지 (posttest 의 동화 파트). pretest/checklist 면 pages: [] */
export type StoryPage = {
  page_number: number
  image: string
  heading: string
  text: string
  image_status?: "ready" | "failed" | "not_requested"
  audio_cues?: { end_offset: number; end_seconds: number }[] | null
  audio_index_status?: "ready" | "failed" | null
  audio_duration?: number | null
  audio_path?: string | null
  audio_url?: string | null
  audio_status?: "not_requested" | "not_implemented" | "ready" | "failed"
}

/** 공통 문항 타입 (체크리스트·퀴즈 모두 이 타입을 따른다) */
export type AssessmentQuestion = {
  question_id: string
  /** 문제 유형 (어휘, 이해, 추론 등) */
  skill?: string
  /** 예문 (없으면 null) */
  passage?: string | null
  /** 실제 질문 내용 */
  prompt: string
  options: {
    label: string
    value: string
    /** 그림 퀴즈일 경우 썸네일 URL (없으면 null) */
    image_url?: string | null
  }[]
  /** 난이도 가중치 (서버 채점 시 프론트에 안 줄 수도 있음) */
  level?: number
  /** 정답 (서버 채점 시 프론트에 안 줄 수도 있음) */
  answer?: string
}

/** 출제 페이로드 (back -> front): 동화 + 퀴즈가 한 묶음 */
export type AssessmentPayload = {
  attempt_id?: string
  assessment_type: AssessmentType
  /** 동화 퀴즈(posttest)면 story_id, 아니면 null */
  story_id: string | null
  title: string | null
  theme: string | null
  pages: StoryPage[]
  quizzes: AssessmentQuestion[]
  cover_image?: string | null
  /** 불투명 #RRGGBB. 누락/잘못된 값은 기존 갈색 표지를 쓴다. */
  cover_color?: string | null
  generation?: {
    /** 생성 당시 서버에서 적용한 정수 단계. 과거 동화에는 없을 수 있다. */
    level?: number | null
    mode?: StoryMode
    reading_mode?: ReadingMode
    reading_guidance_version?: string | null
    theme_id?: string | null
    theme_label?: string | null
    topic_version?: string | null
    source_title?: string | null
    /** 공통 장면 설계 버전과 성공/기존 집필 전환 상태. 오래된 동화에는 없다. */
    planning_version?: string | null
    planning_status?: "ready" | "fallback" | null
    /** 외부分석 완료 전 null. 오래된 분석은 필드 누락이 있어 런타임 검증한다. */
    vocab_analysis?: unknown
    /** 예전 저장 동화는 없음. 선택은 상대 비교이며 품질 보증을 뜻하지 않는다. */
    selection?: {
      /** 두 후보 모두 낮게 평가된 경우의 제한된 보수 결과. 이전 결과는 없음/null. */
      repair?: {
        status: "not_needed" | "skipped_no_evidence" | "skipped_scope" | "accepted" | "retained_original" | "repair_failed" | "invalid_patch" | "recheck_failed"
        attempts: number
        changed_pages: number[]
        prompt_version: string
      } | null
      strategy: "parallel_two_v1"
      status: "selected" | "selected_with_concerns" | "single_candidate" | "review_failed"
      candidate_count: number
      valid_candidate_count: number
      selected_candidate: "A" | "B"
      review_version: string
      review_model: string | null
      /** 답 전용 판별기는 점수를 생성하지 않으므로 null. 이전 점수는 그대로 읽는다. */
      coherence_score: number | null
      level_fit_score: number | null
    } | null
    model: string
    prompt_version: string
    source_id: string
    retrieval_mode: string
    page_images: boolean
    quiz_status: "ready" | "failed" | "not_required"
    cover_status: "ready" | "failed"
    tts_status: "not_requested" | "not_implemented" | "ready" | "failed" | "partial"
  } | null
}

/** 채점 제출 상세 (front -> back) */
export type SubmissionDetail = {
  question_id: string
  /** 해당 문제의 난이도 */
  level: number
  /** 사용자가 최종 선택한 보기의 value */
  selected_value: string
  /** 프론트엔드 자체 채점 정오답 여부 */
  is_correct: boolean
}

/** 채점 제출 페이로드 (front -> back) */
export type AssessmentSubmission = {
  attempt_id?: string
  profile_id: string
  /** 출제 시 받았던 평가 유형 그대로 반환 */
  assessment_type: AssessmentType
  /** 동화 퀴즈였다면 해당 story_id 반환 */
  story_id: string | null
  results: {
    total_questions: number
    correct_answers: number
    details: SubmissionDetail[]
  }
}

/** 동화 생성 입력값 (폼). 서버로 보낼 때 snake_case 로 변환한다. */
export type ReadingMode = "level_aligned" | "relaxed"
export type StoryMode = "original" | "personalized"
export type StoryTheme = { theme_id: string; label: string; category: string; description: string }
export const fetchStoryThemes = (profileId: string, mode: StoryMode, signal?: AbortSignal) =>
  request<{ version: string; mode: StoryMode; topics: StoryTheme[] }>(
    `/stories/themes?profile_id=${encodeURIComponent(profileId)}&mode=${mode}`, { signal })

export type StoryInput = {
  imageProvider?: "openai" | "gemini"
  readingMode?: ReadingMode
  mode?: StoryMode
  themeId?: string
  customTopic?: string
  protagonistName: string
  favorite: string
  todayEvent: string
  tts?: boolean
  pageImages?: boolean
  useJobs?: boolean
}

export type GenerationPreferences = { page_images: boolean; available: boolean; jobs_enabled: boolean }
export const fetchGenerationPreferences = () => request<GenerationPreferences>("/users/me/generation-preferences")
export const saveGenerationPreferences = (pageImages: boolean) => request<GenerationPreferences>(
  "/users/me/generation-preferences", { method: "PATCH", body: JSON.stringify({ page_images: pageImages }) },
)

export type GenerationJob = {
  job_id: string
  profile_id: string | null
  story_id: string | null
  created_at: string | null
  finished_at: string | null
  status: "queued" | "running" | "completed" | "failed"
  stage: string
  result: AssessmentPayload | null
  error_code: string | null
  poll_after_ms: number
}

// 새로고침 뒤에도 같은 작업을 조회한다. 입력/토큰을 저장하지 않고 작업 ID만 보관한다.
const pendingKey = (profileId: string) => `doran-generation:${profileId}`
export function pendingGeneration(profileId: string): string | null {
  return typeof window === "undefined" ? null : sessionStorage.getItem(pendingKey(profileId))
}

export async function waitForGeneration(profileId: string, jobId: string,
  onProgress?: (stage: string) => void, signal?: AbortSignal): Promise<AssessmentPayload> {
  const deadline = Date.now() + 25 * 60_000
  while (Date.now() < deadline) {
    signal?.throwIfAborted()
    let job: GenerationJob
    try {
      job = await request<GenerationJob>(`/stories/generation-jobs/${encodeURIComponent(jobId)}`, { signal })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) sessionStorage.removeItem(pendingKey(profileId))
      throw error
    }
    onProgress?.(job.stage)
    if (job.status === "completed" && job.result) {
      sessionStorage.removeItem(pendingKey(profileId))
      return job.result
    }
    if (job.status === "failed") {
      sessionStorage.removeItem(pendingKey(profileId))
      throw new Error("동화를 완성하지 못했어요. 다시 만들어 주세요.")
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")) }
      const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve() },
        Math.max(1000, Math.min(job.poll_after_ms, 5000)))
      signal?.addEventListener("abort", onAbort, { once: true })
    })
  }
  throw new Error("생성이 오래 걸리고 있어요. 잠시 후 대시보드에서 다시 확인해 주세요.")
}

/** 보관함에 저장된 동화 (back -> front) */
export type SavedStory = {
  story_id: string
  profile_id?: string
  title: string
  theme: string
  created_at: string
  content: {
    pages: StoryPage[]
    /** 서버가 동화 표지 이미지를 생성해 넣어줄 경우의 표지 URL (없을 수 있음) */
    cover_image?: string | null
  /** 불투명 #RRGGBB. 누락/잘못된 값은 기존 갈색 표지를 쓴다. */
  cover_color?: string | null
  }
}

/** 기성(자체 제공) 전래동화 카드 (back -> front) */
export type Folktale = {
  story_id: string
  title: string
  theme: string
  description: string
  thumbnail: string
}

/** 라이브러리 화면 배치용 행 (back -> front) */
export type FolktaleRow = {
  row_id: string
  title: string
  items: string[]
}

// ===========================================================================
// 출제 (back -> front)
// ===========================================================================

/**
 * 분기 1: 폼 입력 기반 맞춤형 동화 + 퀴즈 생성.
 * POST /api/v1/stories/generate
 */
export async function generateAssessment(
  profileId: string,
  assessmentType: AssessmentType,
  input: StoryInput,
  onProgress?: (stage: string) => void,
  signal?: AbortSignal,
): Promise<AssessmentPayload> {
  const body = JSON.stringify({
    profile_id: profileId, assessment_type: assessmentType,
    protagonist_name: input.protagonistName, favorite: input.favorite, today_event: input.todayEvent,
    reading_mode: input.mode === "original" ? "level_aligned" : input.readingMode ?? "level_aligned",
    mode: input.mode ?? "personalized", theme_id: input.themeId, custom_topic: input.customTopic,
    page_images: input.pageImages ?? false, tts: input.tts ?? false, image_provider: input.imageProvider,
  })
  if (input.useJobs) {
    const existing = pendingGeneration(profileId)
    if (existing) return waitForGeneration(profileId, existing, onProgress, signal)
    // 네트워크 오류 뒤 동일 요청을 복구할 수 있도록 서버 제출 전에 UUID를 만든다.
    const idempotencyKey = crypto.randomUUID()
    // job_id는 이 UUID와 같다. 접수 응답을 잃어도 GET으로 완료 여부를 확인할 수 있다.
    sessionStorage.setItem(pendingKey(profileId), idempotencyKey)
    let job: GenerationJob
    try {
      job = await request<GenerationJob>("/stories/generation-jobs", {
        method: "POST", body, signal, headers: { "Idempotency-Key": idempotencyKey },
      })
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) sessionStorage.removeItem(pendingKey(profileId))
      throw error
    }
    sessionStorage.setItem(pendingKey(profileId), job.job_id)
    return waitForGeneration(profileId, job.job_id, onProgress, signal)
  }
  return request<AssessmentPayload>(
    "/stories/generate",
    {
      method: "POST",
      body,
      signal,
    },
    // 동화 생성은 LLM 작업이라 오래 걸릴 수 있으므로 넉넉한 타임아웃을 준다.
    { timeoutMs: LONG_TIMEOUT_MS },
  )
}

/**
 * 분기 2: 배치고사(문해력 측정) 문제 생성 (동화 제외).
 * POST /api/v1/assessments/generate
 */
export async function generatePretest(
  profileId: string,
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>(
    "/assessments/generate",
    {
      method: "POST",
      body: JSON.stringify({
        profile_id: profileId,
        assessment_type: "pretest",
      }),
    },
    // 문제 생성도 LLM 작업이라 오래 걸릴 수 있으므로 넉넉한 타임아웃을 준다.
    { timeoutMs: LONG_TIMEOUT_MS },
  )
}

/**
 * 분기 3: 저장된 동화 상세와 퀴즈 복원. 목록에서는 이 본문을 내려받지 않는다.
 * GET /api/v1/stories/saved/{story_id}?profile_id={profile_id}
 */
export async function fetchSavedStory(
  storyId: string,
  profileId: string,
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>(
    `/stories/saved/${encodeURIComponent(storyId)}?profile_id=${encodeURIComponent(profileId)}`,
  )
}

/**
 * 분기 4: 자체 제공(기본) 전래동화 읽기 (퀴즈 제외, 비로그인 가능).
 * GET /api/v1/stories/default/{story_id}?profile_id=guest
 */
export async function fetchDefaultStory(
  storyId: string,
  profileId = "guest",
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>(
    `/stories/default/${encodeURIComponent(storyId)}?profile_id=${encodeURIComponent(profileId)}`,
  )
}

// ===========================================================================
// 제출 (front -> back) -> 결과 (back -> front)
// ===========================================================================

/**
 * 사용자의 답안(answers: question_id -> 선택 value)으로 제출 페이로드를 만든다.
 * 프론트에서 1차 채점한 정오답/개수를 함께 담는다.
 */
export function buildSubmission(
  profileId: string,
  payload: AssessmentPayload,
  answers: Record<string, string>,
): AssessmentSubmission {
  const details: SubmissionDetail[] = payload.quizzes.map((q) => {
    const selected = answers[q.question_id] ?? ""
    return {
      question_id: q.question_id,
      level: q.level ?? 0,
      selected_value: selected,
      is_correct: q.answer != null && selected === q.answer,
    }
  })
  const correct = details.filter((d) => d.is_correct).length
  return {
    profile_id: profileId,
    attempt_id: payload.attempt_id,
    assessment_type: payload.assessment_type,
    story_id: payload.story_id,
    results: {
      total_questions: payload.quizzes.length,
      correct_answers: correct,
      details,
    },
  }
}

/**
 * 채점 결과 제출 -> 진척도 결과 수신.
 * POST /api/v1/assessments/submit
 * 서버가 kind/level/delta/lowerLabel/upperLabel/achievement 를 직접 계산해 내려준다.
 */
export async function submitAssessment(
  submission: AssessmentSubmission,
): Promise<LiteracyResult> {
  return request<LiteracyResult>("/assessments/submit", {
    method: "POST",
    body: JSON.stringify(submission),
  })
}

// ===========================================================================
// 보관함 / 라이브러리
// ===========================================================================

/** 보관함: 저장된 동화 목록. GET /api/v1/stories?profile_id={profile_id} */
export async function fetchSavedStories(
  profileId: string,
): Promise<SavedStory[]> {
  const data = await request<{ stories: SavedStory[] }>(
    `/stories?profile_id=${encodeURIComponent(profileId)}`,
  )
  return data?.stories ?? []
}

/** 보관함: 동화 삭제. DELETE /api/v1/stories/{story_id} */
export async function deleteStory(storyId: string): Promise<void> {
  await request(`/stories/${encodeURIComponent(storyId)}`, {
    method: "DELETE",
  })
}

/** 비로그인 라이브러리: 기성 전래동화 목록 + 행 데이터. GET /api/v1/library/folktales */
export async function fetchFolktales(): Promise<{
  folktales: Folktale[]
  rows: FolktaleRow[]
}> {
  const data = await request<{
    folktales: Folktale[]
    rows: FolktaleRow[]
  }>("/library/folktales")
  return { folktales: data?.folktales ?? [], rows: data?.rows ?? [] }
}
