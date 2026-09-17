import { readingStatus, readingLabel } from "@/lib/book-status"
import type { BookSummary } from "@/lib/bookshelf"
import styles from "./bookshelf.module.css"

export function statusBadge(book: BookSummary) {
  const state = readingStatus(book)
  if (state === "completed") return null
  const color = { new:styles.statusNew, reading:styles.statusReading, quiz_pending:styles.statusQuiz }[state]
  return <span className={`${styles.statusBadge} ${color}`}>{readingLabel(book)}</span>
}
