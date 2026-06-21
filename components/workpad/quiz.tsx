"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { AssessmentQuestion, SubmissionDetail } from "@/lib/workpad-data"

export type QuizResult = {
  correct: number
  total: number
  bySkill: Record<string, { correct: number; total: number }>
  /** question_id -> 선택한 보기 value */
  answers: Record<string, string>
  /** 서버 제출용 채점 상세 */
  details: SubmissionDetail[]
}

export function Quiz({
  questions,
  title,
  intro,
  onComplete,
}: {
  questions: AssessmentQuestion[]
  title: string
  intro: string
  onComplete: (result: QuizResult) => void
}) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const q = questions[index]
  const isLast = index === questions.length - 1
  const progress = ((index + (selected ? 1 : 0)) / questions.length) * 100

  const next = () => {
    if (!selected) return
    const nextAnswers = { ...answers, [q.question_id]: selected }
    setAnswers(nextAnswers)

    if (isLast) {
      const bySkill: QuizResult["bySkill"] = {}
      const details: SubmissionDetail[] = []
      let correct = 0
      for (const question of questions) {
        const picked = nextAnswers[question.question_id] ?? ""
        const ok = question.answer != null && picked === question.answer
        if (ok) correct++
        const skill = question.skill ?? "기타"
        bySkill[skill] ??= { correct: 0, total: 0 }
        bySkill[skill].total++
        if (ok) bySkill[skill].correct++
        details.push({
          question_id: question.question_id,
          level: question.level ?? 0,
          selected_value: picked,
          is_correct: ok,
        })
      }
      onComplete({
        correct,
        total: questions.length,
        bySkill,
        answers: nextAnswers,
        details,
      })
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="font-heading text-3xl text-foreground">{title}</h2>
        <p className="mt-2 text-muted-foreground">{intro}</p>
      </div>
      {/* 현재 문제 단계 */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Progress value={progress} className="h-2.5" />
          <span className="shrink-0 font-mono text-sm text-muted-foreground">
            {index + 1} / {questions.length}
          </span>
        </div>
        {/* 추론/어휘 등의 문제 분류 */}
        {q.skill && (
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              {q.skill}
            </span>
          </div>
        )}
        {/* 제시 문구 */}
        {q.passage && (
          <p className="mb-5 rounded-2xl bg-secondary/70 p-4 text-[15px] leading-relaxed text-secondary-foreground">
            {q.passage}
          </p>
        )}
        {/* 문제 */}
        <h3 className="font-heading text-xl leading-snug text-foreground">
          {q.prompt}
        </h3>
        {/* 객관식 항들 */}
        <RadioGroup
          value={selected ?? ""}
          onValueChange={setSelected}
          className="mt-5 gap-3"
        >
          {q.options.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`${q.question_id}-${opt.value}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-base transition-colors",
                selected === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-secondary/50",
              )}
            >
              <RadioGroupItem
                id={`${q.question_id}-${opt.value}`}
                value={opt.value}
                className="shrink-0"
              />
              {/* 그림 퀴즈: image_url 이 있으면 썸네일 표시 */}
              {opt.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={opt.image_url || "/placeholder.svg"}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              )}
              <span className="text-foreground">{opt.label}</span>
            </Label>
          ))}
        </RadioGroup>

        <Button
          onClick={next}
          disabled={!selected}
          size="lg"
          className="mt-7 h-13 w-full rounded-full text-base"
        >
          {isLast ? (
            <>
              결과 확인하기
              <CheckCircle2 className="ml-1 h-5 w-5" />
            </>
          ) : (
            <>
              다음 문제
              <ArrowRight className="ml-1 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
