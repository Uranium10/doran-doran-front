"use client"

import { useState } from "react"
import { LayoutGrid, List, Calendar, Sprout } from "lucide-react"
import { cn } from "@/lib/utils"
import { dummyLibrary, formatKoreanDate } from "@/lib/library-data"

type ViewMode = "grid" | "list"

export function LibraryGallery() {
  const [view, setView] = useState<ViewMode>("grid")

  return (
    <div>
      {/* 헤더 + 뷰 토글 */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-primary">
            이야기 책장
          </p>
          <h1 className="mt-2 font-heading text-3xl text-foreground sm:text-4xl">
            지금까지 만든 동화
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            모두 {dummyLibrary.length}권의 이야기가 책장에 담겨 있어요.
          </p>
        </div>

        <div
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm"
          role="group"
          aria-label="보기 방식 전환"
        >
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label="그리드 뷰"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              view === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label="리스트 뷰"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 그리드 뷰 */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {dummyLibrary.map((book) => (
            <article
              key={book.id}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.cover || "/placeholder.svg"}
                  alt={`${book.title} 표지`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-sm">
                  {book.stageLabel}
                </span>
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 font-heading text-base leading-snug text-foreground">
                  {book.title}
                </h2>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatKoreanDate(book.createdAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* 리스트 뷰 */
        <div className="flex flex-col gap-3">
          {dummyLibrary.map((book) => (
            <article
              key={book.id}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40"
            >
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.cover || "/placeholder.svg"}
                  alt={`${book.title} 표지`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-heading text-lg text-foreground">
                  {book.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatKoreanDate(book.createdAt)}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Sprout className="h-3 w-3" />
                    {book.stageLabel}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
