export type ReadingStatus = "new" | "reading" | "quiz_pending" | "completed"
type StatusBook = { reading_status?: ReadingStatus; reading_progress?: { completed_at?: string | null; quiz_completed?: boolean } | null }

/** 서버의 판정이 우선이다. 구형 응답에서는 없는 퀴즈 상태를 추측해서 만들지 않는다. */
export function readingStatus(book: StatusBook): ReadingStatus {
  if (book.reading_status) return book.reading_status
  if (book.reading_progress?.completed_at || book.reading_progress?.quiz_completed) return "completed"
  return book.reading_progress ? "reading" : "new"
}
export const readingLabel = (book: StatusBook) => ({ new:"새 동화", reading:"읽는 중", quiz_pending:"퀴즈 푸는 중", completed:"다 읽은 동화" })[readingStatus(book)]
