"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutGrid, List, Calendar, Sprout, BookOpen, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/lib/profile-context"
import { isGuestProfile } from "@/lib/api"
import { fetchSavedStories, deleteStory, type SavedStory } from "@/lib/workpad-data"
import { formatKoreanDate } from "@/lib/library-data"
import { PopupBook } from "@/components/workpad/popup-book"
import { ConfirmModal } from "@/components/confirm-modal"

type ViewMode = "grid" | "list"

/**
 * 저장된 동화의 표지 이미지를 구한다.
 * content.cover_image 가 있으면 우선 사용하고, 없으면 첫 페이지 이미지로 폴백한다.
 */
function coverOf(story: SavedStory): string {
  return (
    story.content?.cover_image ||
    story.content?.pages?.[0]?.image ||
    "/placeholder.svg"
  )
}

export function LibraryGallery() {
  const router = useRouter()
  const { currentProfile } = useProfile()
  const [view, setView] = useState<ViewMode>("grid")
  const [stories, setStories] = useState<SavedStory[]>([])
  const [loading, setLoading] = useState(true)
  // 선택된 동화 (있으면 목록 대신 팝업북을 보여준다)
  const [reading, setReading] = useState<SavedStory | null>(null)
  // 삭제 확인 모달 대상 동화 (있으면 모달이 열린다)
  const [pendingDelete, setPendingDelete] = useState<SavedStory | null>(null)

  // 선택된 프로필이 없으면 프로필 선택 화면으로
  useEffect(() => {
    if (!currentProfile) router.replace("/profiles")
  }, [currentProfile, router])

  // 마운트/프로필 변경 시 보관함 동화 목록을 받아온다.
  useEffect(() => {
    if (!currentProfile || isGuestProfile(currentProfile.id)) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    fetchSavedStories(currentProfile.id)
      .then((list) => {
        if (active) setStories(list)
      })
      .catch((e) => {
        console.error("[v0] 보관함 동화 조회 실패:", e)
        toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [currentProfile])

  // 동화 삭제: 서버 DELETE 후 목록에서 제거
  const handleDelete = async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    try {
      await deleteStory(target.story_id)
      setStories((prev) => prev.filter((s) => s.story_id !== target.story_id))
      toast.success("동화를 삭제했어요.")
    } catch (e) {
      console.error("[v0] 동화 삭제 실패:", e)
      toast.error("삭제하지 못했어요. 잠시 후 다시 시도해 주세요.")
      throw e
    } finally {
      setPendingDelete(null)
    }
  }

  if (!currentProfile) return null

  // 동화 읽기 모드: 퀴즈 없이(library 취급) 목록으로 복귀
  if (reading) {
    return (
      <div>
        <PopupBook
          pages={reading.content?.pages ?? []}
          childName={currentProfile.name}
          onFinish={() => setReading(null)}
        />
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setReading(null)}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            이야기 책장으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

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
            {loading
              ? "책장을 불러오는 중이에요..."
              : `모두 ${stories.length}권의 이야기가 책장에 담겨 있어요.`}
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

      {/* 로딩 스켈레톤 */}
      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-3xl border border-border bg-card"
            >
              <div className="aspect-[3/4] animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : stories.length === 0 ? (
        // 빈 상태
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </span>
          <h2 className="mt-5 font-heading text-xl text-foreground">
            아직 만든 동화가 없어요
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            첫 번째 전래동화를 만들어 책장을 채워 보세요.
          </p>
        </div>
      ) : view === "grid" ? (
        /* 그리드 뷰 */
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {stories.map((book) => (
            <div
              key={book.story_id}
              role="button"
              tabIndex={0}
              onClick={() => setReading(book)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setReading(book)
                }
              }}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverOf(book) || "/placeholder.svg"}
                  alt={`${book.title} 표지`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-sm">
                  {book.theme}
                </span>
                {/* 우측 하단 삭제 버튼 */}
                <button
                  type="button"
                  aria-label={`${book.title} 삭제`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPendingDelete(book)
                  }}
                  className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 font-heading text-base leading-snug text-foreground">
                  {book.title}
                </h2>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatKoreanDate(book.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 리스트 뷰 */
        <div className="flex flex-col gap-3">
          {stories.map((book) => (
            <div
              key={book.story_id}
              role="button"
              tabIndex={0}
              onClick={() => setReading(book)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setReading(book)
                }
              }}
              className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/40"
            >
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverOf(book) || "/placeholder.svg"}
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
                    {formatKoreanDate(book.created_at)}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Sprout className="h-3 w-3" />
                    {book.theme}
                  </span>
                </div>
              </div>
              {/* 우측 삭제 버튼 */}
              <button
                type="button"
                aria-label={`${book.title} 삭제`}
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDelete(book)
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={pendingDelete !== null}
        title="동화를 삭제할까요?"
        description={
          pendingDelete
            ? `'${pendingDelete.title}'을(를) 책장에서 삭제해요. 삭제한 동화는 되돌릴 수 없어요.`
            : undefined
        }
        confirmLabel="삭제하기"
        cancelLabel="취소"
        destructive
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
