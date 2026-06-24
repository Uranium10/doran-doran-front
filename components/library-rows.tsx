"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Play, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import {
  fetchFolktales,
  type Folktale,
  type FolktaleRow,
} from "@/lib/workpad-data"

// 기성 전래동화 카드. 클릭 시 라우팅 대신 onOpen 콜백을 호출한다.
function Card({
  tale,
  loading,
  onOpen,
}: {
  tale: Folktale
  loading: boolean
  onOpen: (storyId: string) => void
}) {
  return (
    <button
      type="button"
      data-card
      onClick={() => onOpen(tale.story_id)}
      disabled={loading}
      className="group relative w-44 shrink-0 text-left sm:w-52"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted shadow-md transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tale.thumbnail || "/placeholder.svg"}
          alt={`${tale.title} 표지`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-heading text-lg text-white">{tale.title}</h3>
          <p className="line-clamp-2 text-xs text-white/80">
            {tale.description}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/80">
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {tale.theme}
            </span>
          </div>
        </div>
        <div className="absolute right-3 top-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </div>
      </div>
    </button>
  )
}

// 로딩 중 보여줄 스켈레톤 카드
function SkeletonCard() {
  return (
    <div className="w-44 shrink-0 sm:w-52">
      <div className="aspect-[3/4] animate-pulse rounded-2xl border border-border bg-muted" />
    </div>
  )
}

// 양쪽에 세로로 길쭉한 화살표 버튼이 달린 가로 캐러셀 행.
function Row({
  title,
  ids,
  byId,
  openingId,
  onOpen,
}: {
  title: string
  ids: string[]
  byId: (id: string) => Folktale | undefined
  openingId: string | null
  onOpen: (storyId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  // 현재 스크롤 위치로 좌/우 버튼 활성 여부를 갱신한다.
  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateArrows, { passive: true })
    window.addEventListener("resize", updateArrows)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      window.removeEventListener("resize", updateArrows)
    }
  }, [ids])

  // 한 권(카드 너비 + gap) 만큼 좌/우로 부드럽게 이동한다.
  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const firstCard = el.querySelector<HTMLElement>("[data-card]")
    const gap = 16 // gap-4
    const step = (firstCard?.offsetWidth ?? 208) + gap
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }

  return (
    <div>
      <h3 className="mb-4 font-heading text-xl text-foreground sm:text-2xl">
        {title}
      </h3>
      <div className="flex items-stretch gap-2">
        {/* 왼쪽: 세로로 길쭉하고 얇은 버튼 */}
        <button
          type="button"
          aria-label="이전 동화 보기"
          onClick={() => scrollByCard(-1)}
          disabled={!canLeft}
          className="flex w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-opacity hover:bg-secondary disabled:opacity-30 sm:w-9"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-4 overflow-x-auto pb-4 scrollbar-hide"
        >
          {ids.map((id, i) => {
            const tale = byId(id)
            if (!tale) return null
            return (
              <Card
                key={`${title}-${id}-${i}`}
                tale={tale}
                loading={openingId === id}
                onOpen={onOpen}
              />
            )
          })}
        </div>

        {/* 오른쪽: 세로로 길쭉하고 얇은 버튼 */}
        <button
          type="button"
          aria-label="다음 동화 보기"
          onClick={() => scrollByCard(1)}
          disabled={!canRight}
          className="flex w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-opacity hover:bg-secondary disabled:opacity-30 sm:w-9"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export function LibraryRows() {
  const router = useRouter()
  const [folktales, setFolktales] = useState<Folktale[]>([])
  const [rows, setRows] = useState<FolktaleRow[]>([])
  const [loading, setLoading] = useState(true)
  // 카드 클릭 시 별도 라우트로 이동하기 전 스피너를 보여줄 대상 id
  const [openingId, setOpeningId] = useState<string | null>(null)

  // 마운트 시 기성 전래동화 목록 + 행 데이터를 받아온다.
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchFolktales()
      .then(({ folktales, rows }) => {
        if (!active) return
        setFolktales(folktales)
        setRows(rows)
      })
      .catch((e) => {
        console.error("[v0] 전래동화 목록 조회 실패:", e)
        toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const byId = (id: string) => folktales.find((t) => t.story_id === id)

  // 카드 클릭 → 기성 동화 전용 라우트로 창을 통째로 이동시킨다.
  const handleOpen = (storyId: string) => {
    if (openingId) return
    setOpeningId(storyId)
    router.push(`/folktale/${encodeURIComponent(storyId)}`)
  }

  return (
    <section id="library" className="scroll-mt-20 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-heading text-3xl text-foreground sm:text-4xl">
            전래동화 라이브러리
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            대대로 전해 내려온 우리 이야기를 골라 보세요. 어떤 이야기든 아이의
            이름과 수준에 맞춰 새롭게 다시 태어납니다.
          </p>
        </div>

        {loading ? (
          // 로딩 스켈레톤
          <div className="flex flex-col gap-12">
            {[0, 1].map((r) => (
              <div key={r}>
                <div className="mb-4 h-7 w-56 animate-pulse rounded-lg bg-muted" />
                <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {rows.map((row) => (
              <Row
                key={row.row_id}
                title={row.title}
                ids={row.items}
                byId={byId}
                openingId={openingId}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
