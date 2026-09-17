"use client"
import { useState } from "react"
import { Sparkles } from "lucide-react"
import type { BookSummary } from "@/lib/bookshelf"
import { normalizeCoverColor } from "@/lib/book-appearance"
import styles from "./library-gallery.module.css"

/** 목록에서는 책 모형을 축소하지 않고 이미지 한 장만 고정 크기로 보여준다. */
export function LibraryThumbnail({ book }: { book: BookSummary }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return <div className={styles.thumbnail} style={{ backgroundColor: `${normalizeCoverColor(book.cover_color)}18` }}>
    {book.cover_image && book.cover_image !== failedUrl
      ? <img src={book.cover_image} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(book.cover_image ?? null)}/>
      : <Sparkles size={26} strokeWidth={1.3} aria-hidden="true"/>}
  </div>
}
