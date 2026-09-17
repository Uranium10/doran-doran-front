import { request } from "./api"
import type { BookBookmark } from "./book-layout"
import type { AssessmentQuestion } from "./workpad-data"
import type { LiteracyResult } from "./levels"

export type ReadingProgress = { bookmark: BookBookmark; completed_at: string | null; quiz_completed?: boolean; updated_at: string }
export type BookSummary = {
  story_id: string; title: string; theme?: string; created_at?: string
  cover_color?: string | null; cover_image?: string | null; reading_progress?: ReadingProgress | null
}
export type Bookshelf = {
  stories: BookSummary[]; total: number; next_offset: number | null; resume: BookSummary | null
  latest_result: { id: string; kind: string; correct: number; total: number; created_at: string } | null
  measured_today: boolean
}
export const fetchBookshelf = (profileId: string, offset = 0, limit = 12) => request<Bookshelf>(
  `/stories/bookshelf?profile_id=${encodeURIComponent(profileId)}&offset=${offset}&limit=${limit}`)
export const fetchReading = (profileId: string, storyId: string) => request<{ progress: ReadingProgress | null }>(
  `/stories/${encodeURIComponent(storyId)}/reading-progress?profile_id=${encodeURIComponent(profileId)}`)
export const saveReading = (profileId: string, storyId: string, bookmark: BookBookmark) => request<{ progress: ReadingProgress }>(
  `/stories/${encodeURIComponent(storyId)}/reading-progress`, { method: "PUT", keepalive: true, body: JSON.stringify({ profile_id: profileId, bookmark }) })
export const openStoryAssessment = (profileId: string, storyId: string) => request<{
  attempt_id: string; quizzes: AssessmentQuestion[]; result: LiteracyResult | null
}>(`/assessments/story/${encodeURIComponent(storyId)}?profile_id=${encodeURIComponent(profileId)}`, { method: "POST" })
export const fetchQuizResult = (profileId: string, resultId: string) => request<LiteracyResult>(
  `/quiz-results/${encodeURIComponent(resultId)}?profile_id=${encodeURIComponent(profileId)}`)

/** 외부 URL을 복귀 주소로 사용하지 않는다. 직접 링크 진입은 내 책장으로 돌아간다. */
export const returnPath = (from?: string) => from === "parent" ? "/parent" : from === "library" ? "/library" : "/dashboard"
export const bookPath = (id: string, from: "library" | "dashboard") => `/books/${encodeURIComponent(id)}?from=${from}`
