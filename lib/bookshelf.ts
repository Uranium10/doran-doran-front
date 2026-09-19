import { request } from "./api"
import type { ReadingStatus } from "./book-status"
import type { BookBookmark } from "./book-layout"
import type { AssessmentQuestion } from "./workpad-data"
import type { LiteracyResult } from "./levels"

export type ReadingProgress = { bookmark: BookBookmark; completed_at: string | null; quiz_completed?: boolean; updated_at: string }
export type BookSummary = {
  reading_status?: ReadingStatus
  story_id: string; title: string; theme?: string; created_at?: string
  cover_color?: string | null; cover_image?: string | null; reading_progress?: ReadingProgress | null
}
export type Bookshelf = {
  latest_unread?: BookSummary | null
  stories: BookSummary[]; total: number; next_offset: number | null; resume: BookSummary | null
  latest_result: { id: string; kind: string; correct: number; total: number; created_at: string } | null
  measured_today: boolean
}
export const fetchBookshelf = (profileId: string, offset = 0, limit = 12) => request<Bookshelf>(
  `/stories/bookshelf?profile_id=${encodeURIComponent(profileId)}&offset=${offset}&limit=${limit}`)
export const fetchReading = (profileId: string, storyId: string) => request<{ progress: ReadingProgress | null }>(
  `/stories/${encodeURIComponent(storyId)}/reading-progress?profile_id=${encodeURIComponent(profileId)}`)
export const saveReading = (profileId: string, storyId: string, bookmark: BookBookmark) => request<{ progress: ReadingProgress }>(
  `/stories/${encodeURIComponent(storyId)}/reading-progress`, { method: "PUT", keepalive: true, body: JSON.stringify({ profile_id: profileId, bookmark }) }).then(result => {
    // 돌아간 책장 첫 조회보다 저장이 늦게 끝나도 완료 이벤트로 상태를 다시 읽는다.
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("doran-reading-saved", { detail: { profileId } }))
    return result
  })
export const openStoryAssessment = (profileId: string, storyId: string) => request<{
  attempt_id: string; quizzes: AssessmentQuestion[]; result: LiteracyResult | null
}>(`/assessments/story/${encodeURIComponent(storyId)}?profile_id=${encodeURIComponent(profileId)}`, { method: "POST" })
export const fetchQuizResult = (profileId: string, resultId: string) => request<LiteracyResult>(
  `/quiz-results/${encodeURIComponent(resultId)}?profile_id=${encodeURIComponent(profileId)}`)

export { bookOrigin, bookPath, returnPath, returnLabel, type BookOrigin } from "./book-navigation"

/** 기존 읽기 전용 API. 목록을 펼친 책만 조회하며 답안 상세는 결과 화면에서 연다. */
export type QuizHistoryEntry = { is_practice?: boolean; id: string; created_at?: string; total_questions: number; correct_answers: number }
export const fetchBookQuizHistory = (profileId: string, storyId: string, signal?: AbortSignal) => request<{ quiz_results: QuizHistoryEntry[] }>(
  `/quiz-results?profile_id=${encodeURIComponent(profileId)}&story_id=${encodeURIComponent(storyId)}`, { signal })

export type StoryAttempt = { attempt_id: string; quizzes: AssessmentQuestion[]; result: LiteracyResult | null; is_practice: boolean }
export const startStoryPractice = (profileId: string, storyId: string) => request<StoryAttempt>(
  `/assessments/story/${encodeURIComponent(storyId)}/practice?profile_id=${encodeURIComponent(profileId)}`, { method: "POST" })
export const fetchStoryAttempt = (profileId: string, storyId: string, attemptId: string) => request<StoryAttempt>(
  `/assessments/attempts/${encodeURIComponent(attemptId)}?profile_id=${encodeURIComponent(profileId)}&story_id=${encodeURIComponent(storyId)}`)
