import { request } from "@/lib/api"
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
  assessment_type: AssessmentType
  /** 동화 퀴즈(posttest)면 story_id, 아니면 null */
  story_id: string | null
  title: string | null
  theme: string | null
  pages: StoryPage[]
  quizzes: AssessmentQuestion[]
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
export type StoryInput = {
  protagonistName: string
  favorite: string
  todayEvent: string
}

/** 보관함에 저장된 동화 (back -> front) */
export type SavedStory = {
  story_id: string
  profile_id?: string
  title: string
  theme: string
  created_at: string
  content: { pages: StoryPage[] }
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
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>("/stories/generate", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      assessment_type: assessmentType,
      protagonist_name: input.protagonistName,
      favorite: input.favorite,
      today_event: input.todayEvent,
    }),
  })
}

/**
 * 분기 2: 배치고사(문해력 측정) 문제 생성 (동화 제외).
 * POST /api/v1/assessments/generate
 */
export async function generatePretest(
  profileId: string,
): Promise<AssessmentPayload> {
  return request<AssessmentPayload>("/assessments/generate", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      assessment_type: "pretest",
    }),
  })
}

/**
 * 분기 3: 보관함에 저장된 특정 동화 다시 읽기 (퀴즈 제외).
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
