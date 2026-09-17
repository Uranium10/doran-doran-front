"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { statusBadge } from "./book-status-badge"
import { bookCoverStyle } from "@/lib/book-appearance"
import type { BookSummary } from "@/lib/bookshelf"
import styles from "./bookshelf.module.css"

/** 책장과 이어 읽기에서 같은 표지색·비율을 사용한다. 클릭 대상은 부모의 Link/button이다. */
export function BookCover({ book, compact = false }: { book: BookSummary; compact?: boolean }) {
  const [broken, setBroken] = useState(false)
  return <div className={`${styles.cover} ${compact ? styles.compactCover : ""}`} style={bookCoverStyle(book.cover_color)}>
    {statusBadge(book)}
    <span className={styles.series}>도란도란 작은 책방</span>
    <span className={styles.coverTitle}>{book.title}</span>
    <div className={styles.coverArt}>
      {book.cover_image && !broken
        ? <img src={book.cover_image} alt="" loading="lazy" onError={() => setBroken(true)} />
        : <Sparkles size={36} strokeWidth={1} aria-hidden="true" />}
    </div>
    <span className={styles.coverFoot}>나를 위한 이야기</span>
  </div>
}
