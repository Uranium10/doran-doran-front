"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Play, Loader2 } from "lucide-react"
import { BackLink } from "@/components/back-link"
import { PopupBook } from "@/components/workpad/popup-book"
import {
  fetchFolktales,
  fetchDefaultStory,
  type Folktale,
  type FolktaleRow,
  type AssessmentPayload,
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

export function LibraryRows() {
  const [folktales, setFolktales] = useState<Folktale[]>([])
  const [rows, setRows] = useState<FolktaleRow[]>([])
  const [loading, setLoading] = useState(true)
  // 카드 클릭으로 불러온 동화 (있으면 목록 대신 팝업북을 보여준다)
  const [reading, setReading] = useState<AssessmentPayload | null>(null)
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

  // 카드 클릭 → 기성 동화 데이터를 받아와 팝업북으로 전환 (라우팅 없음)
  const handleOpen = async (storyId: string) => {
    if (openingId) return
    setOpeningId(storyId)
    try {
      const payload = await fetchDefaultStory(storyId)
      setReading(payload)
    } catch (e) {
      console.error("[v0] 기성 동화 조회 실패:", e)
      toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
    } finally {
      setOpeningId(null)
    }
  }

  // 팝업북 열람 모드: 대시보드 하위 컨텐츠처럼 좌측 상단 '이전으로' 링크가 있는 별도 화면.
  if (reading) {
    return (
      <section className="min-h-screen bg-background py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BackLink
            label="라이브러리로 돌아가기"
            onClick={() => setReading(null)}
            className="mb-6"
          />
          <PopupBook
            pages={reading.pages}
            childName={reading.title ?? "친구"}
            onFinish={() => setReading(null)}
          />
        </div>
      </section>
    )
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
              <div key={row.row_id}>
                <h3 className="mb-4 font-heading text-xl text-foreground sm:text-2xl">
                  {row.title}
                </h3>
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                  {row.items.map((id, i) => {
                    const tale = byId(id)
                    if (!tale) return null
                    return (
                      <Card
                        key={`${row.row_id}-${id}-${i}`}
                        tale={tale}
                        loading={openingId === id}
                        onOpen={handleOpen}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
