"use client"

import { TrendingUp, TrendingDown, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LiteracyResult } from "@/lib/levels"

const KIND_COPY: Record<
  LiteracyResult["kind"],
  { badge: string; title: (name: string) => string; sub: string }
> = {
  initial: {
    badge: "최초 측정",
    title: (name) => `${name}님의 첫 문해력 측정 결과예요`,
    sub: "지금 단계에서 시작해 한 걸음씩 자라나요.",
  },
  "post-story": {
    badge: "동화를 읽은 뒤",
    title: (name) => `${name}님, 이야기를 읽고 이만큼 자랐어요`,
    sub: "방금 읽은 전래동화 내용을 바탕으로 측정했어요.",
  },
  retest: {
    badge: "재시험",
    title: (name) => `${name}님의 문해력을 다시 측정했어요`,
    sub: "이전 결과와 비교해 변화를 살펴봐요.",
  },
}

export function LiteracyResultView({
  result,
  childName,
  primaryLabel = "이 단계로 동화 만들기",
  onPrimary,
  secondaryLabel,
  onSecondary,
  showScore = true,
}: {
  result: LiteracyResult
  childName: string
  primaryLabel?: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  /** 맞춘 개수 표시 여부. 유아용 설문에서는 false 로 숨긴다. */
  showScore?: boolean
}) {
  const name = childName.trim() || "아이"
  const copy = KIND_COPY[result.kind]
  const { correct, total, lowerLabel, upperLabel, achievement, delta } = result
  // 마커/라벨이 막대 양 끝에서 잘리지 않도록 표시 위치만 살짝 안쪽으로 보정한다.
  const markerPos = Math.min(95, Math.max(5, achievement))

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
          {copy.badge}
        </span>
        <h2 className="mt-4 text-balance font-heading text-3xl text-foreground">
          {copy.title(name)}
        </h2>
        <p className="mt-2 text-pretty text-muted-foreground">{copy.sub}</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8">
        {/* 맞춘 개수 (유아용 설문에서는 숨김) */}
        {showScore && (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-secondary/60 p-5 text-center">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <p className="font-heading text-2xl text-foreground">
              {total}문제 중 <span className="text-primary">{correct}문제</span>{" "}
              정답
            </p>
          </div>
        )}

        {/* 진행 막대: 현재 단계 → 다음 단계 */}
        <div className={showScore ? "mt-8" : ""}>
          <div className="flex items-end justify-between text-sm">
            <span className="font-heading text-foreground">{lowerLabel}</span>
            <span className="font-medium text-muted-foreground">현재 달성도</span>
            <span className="font-heading text-foreground">{upperLabel}</span>
          </div>

          <div className="relative mt-3">
            {/* 막대 트랙 */}
            <div className="relative h-4 overflow-hidden rounded-full bg-secondary ring-1 ring-border">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700"
                style={{ width: `${achievement}%` }}
              />
            </div>

            {/* 달성도 마커 + 수치 */}
            <div
              className="absolute -top-1 -translate-x-1/2"
              style={{ left: `${markerPos}%` }}
            >
              <span className="block h-6 w-1 rounded-full bg-primary shadow" />
            </div>
            <div
              className="mt-2 flex -translate-x-1/2 flex-col items-center"
              style={{ marginLeft: `${markerPos}%`, width: "max-content" }}
            >
              <span className="font-heading text-lg text-primary">
                {achievement}%
              </span>
              {/* 성장 배지: delta 는 레벨 단위 변화량. 최초 측정(null)이면 숨긴다. */}
              {delta !== null && (
                <span
                  className={
                    delta >= 0
                      ? "inline-flex items-center gap-0.5 text-xs font-medium text-accent"
                      : "inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {delta >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {delta >= 0 ? `레벨 +${delta}` : `레벨 ${delta}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-13 flex-1 rounded-full text-base"
          onClick={onPrimary}
        >
          {primaryLabel}
          <ArrowRight className="ml-1 h-5 w-5" />
        </Button>
        {secondaryLabel && onSecondary && (
          <Button
            size="lg"
            variant="secondary"
            className="h-13 flex-1 rounded-full text-base"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
