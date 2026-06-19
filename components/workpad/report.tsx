"use client"

import Link from "next/link"
import { TrendingUp, RefreshCw, Home, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuizResult } from "@/components/workpad/quiz"

function pct(r: QuizResult) {
  return Math.round((r.correct / r.total) * 100)
}

export function Report({
  pre,
  post,
  childName,
  onRestart,
}: {
  pre: QuizResult
  post: QuizResult
  childName: string
  onRestart: () => void
}) {
  const prePct = pct(pre)
  const postPct = pct(post)
  const diff = postPct - prePct
  const name = childName.trim() || "아이"

  const skills = Array.from(
    new Set([...Object.keys(pre.bySkill), ...Object.keys(post.bySkill)]),
  )

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Award className="h-8 w-8 text-primary" />
        </span>
        <h2 className="mt-4 font-heading text-3xl text-foreground">
          {name}(이)의 성장 리포트
        </h2>
        <p className="mt-2 text-muted-foreground">
          전래동화를 읽기 전과 후, 문해력이 이렇게 달라졌어요.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8">
        {/* Before / After */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-secondary/60 p-5 text-center">
            <p className="text-sm text-muted-foreground">읽기 전</p>
            <p className="mt-1 font-heading text-4xl text-foreground">
              {prePct}점
            </p>
            <p className="text-xs text-muted-foreground">
              {pre.correct}/{pre.total} 정답
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-5 text-center">
            <p className="text-sm text-primary">읽은 후</p>
            <p className="mt-1 font-heading text-4xl text-primary">
              {postPct}점
            </p>
            <p className="text-xs text-muted-foreground">
              {post.correct}/{post.total} 정답
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-accent/10 p-4 text-accent">
          <TrendingUp className="h-5 w-5" />
          <span className="font-heading text-lg">
            {diff >= 0 ? `+${diff}점 향상!` : `${diff}점`}
          </span>
          <span className="text-sm text-muted-foreground">
            {diff > 0
              ? "이야기를 읽으며 한 뼘 더 자랐어요"
              : "꾸준히 읽으면 더 자랄 거예요"}
          </span>
        </div>

        {/* Skill breakdown */}
        <div className="mt-6 space-y-4">
          <h3 className="font-heading text-lg text-foreground">영역별 변화</h3>
          {skills.map((skill) => {
            const pr = pre.bySkill[skill]
            const po = post.bySkill[skill]
            const prP = pr ? Math.round((pr.correct / pr.total) * 100) : 0
            const poP = po ? Math.round((po.correct / po.total) * 100) : 0
            return (
              <div key={skill}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{skill}</span>
                  <span className="text-muted-foreground">
                    {prP}% → <span className="text-primary">{poP}%</span>
                  </span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-border"
                    style={{ width: `${prP}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                    style={{ width: `${poP}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-12 flex-1 rounded-full text-base"
          onClick={onRestart}
        >
          <RefreshCw className="mr-1 h-5 w-5" />
          새 동화 만들기
        </Button>
        <Button
          render={<Link href="/" />}
          size="lg"
          variant="secondary"
          className="h-12 flex-1 rounded-full text-base"
        >
          <Home className="mr-1 h-5 w-5" />
          홈으로
        </Button>
      </div>
    </div>
  )
}
