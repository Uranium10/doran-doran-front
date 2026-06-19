"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { StoryPage } from "@/lib/workpad-data"

export function PopupBook({
  pages,
  childName,
  onFinish,
}: {
  pages: StoryPage[]
  childName: string
  onFinish: () => void
}) {
  const [page, setPage] = useState(0)
  const total = pages.length
  const current = pages[page]
  const isLast = page === total - 1

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 text-center">
        <p className="font-mono text-xs tracking-widest text-primary">
          나만의 전래동화
        </p>
        <h2 className="mt-1 font-heading text-3xl text-foreground">
          {childName.trim() || "아이"}(이)의 도란도란 이야기
        </h2>
      </div>

      {/* 3D pop-up book stage */}
      <div className="perspective-book">
        <div
          key={page}
          className="preserve-3d relative overflow-hidden rounded-[2rem] border-4 border-card bg-card shadow-2xl"
          style={{ animation: "popOpen 0.6s ease-out" }}
        >
          {/* Illustration with layered pop-up feel */}
          <div className="relative aspect-[16/10] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.image || "/placeholder.svg"}
              alt={current.heading}
              className="h-full w-full object-cover"
              style={{ animation: "layerRise 0.7s ease-out" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* center book spine */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/10" />
            <h3 className="absolute bottom-4 left-5 right-5 font-heading text-2xl text-white text-shadow-storybook">
              {current.heading}
            </h3>
          </div>

          {/* Story text */}
          <div className="bg-card p-6 sm:p-8">
            <p
              className="text-lg leading-relaxed text-card-foreground"
              style={{ animation: "layerRise 0.9s ease-out" }}
            >
              {current.text}
            </p>
          </div>
        </div>
      </div>

      {/* Page dots */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {pages.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}쪽으로 이동`}
            onClick={() => setPage(i)}
            className={cn(
              "h-2.5 rounded-full transition-all",
              i === page ? "w-7 bg-primary" : "w-2.5 bg-border hover:bg-primary/40",
            )}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="h-12 rounded-full"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft className="h-5 w-5" />
          이전 장
        </Button>

        {isLast ? (
          <Button
            size="lg"
            className="h-12 flex-1 rounded-full text-base sm:flex-none sm:px-8"
            onClick={onFinish}
          >
            다 읽었어요! 문해력 다시 측정
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-12 rounded-full"
            onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
          >
            다음 장
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPage(0)}
        className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <RotateCcw className="h-4 w-4" />
        처음부터 다시 보기
      </button>

      <style jsx>{`
        @keyframes popOpen {
          0% {
            opacity: 0;
            transform: rotateX(-22deg) translateY(24px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: rotateX(0deg) translateY(0) scale(1);
          }
        }
        @keyframes layerRise {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
