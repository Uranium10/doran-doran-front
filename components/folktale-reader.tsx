"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { BackLink } from "@/components/back-link"
import { PopupBook } from "@/components/workpad/popup-book"
import { fetchDefaultStory, type AssessmentPayload } from "@/lib/workpad-data"

/**
 * 기성(자체 제공) 전래동화 전용 열람 화면.
 * 랜딩 라이브러리에서 카드를 누르면 이 라우트로 통째로 이동한다.
 */
export function FolktaleReader({ storyId }: { storyId: string }) {
  const router = useRouter()
  const [payload, setPayload] = useState<AssessmentPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchDefaultStory(storyId)
      .then((data) => {
        if (active) setPayload(data)
      })
      .catch((e) => {
        console.error("[v0] 기성 동화 조회 실패:", e)
        toast.error("서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [storyId])

  const goBack = () => router.push("/#library")

  return (
    <section className="min-h-screen bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BackLink label="라이브러리로 돌아가기" onClick={goBack} className="mb-6" />

        {loading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">동화를 펼치는 중이에요…</p>
          </div>
        ) : payload ? (
          <PopupBook
            pages={payload.pages}
            childName={payload.title ?? "친구"}
            onFinish={goBack}
          />
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">
              동화를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
