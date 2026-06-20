"use client"

import { useState } from "react"
import { Heart, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  toddlerChecklist,
  toddlerMaxScore,
} from "@/lib/literacy-data"

export function ToddlerChecklist({
  childName,
  onComplete,
}: {
  childName: string
  onComplete: (percent: number) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const allAnswered = toddlerChecklist.every((q) => answers[q.id])

  const submit = () => {
    if (!allAnswered) return
    let score = 0
    for (const q of toddlerChecklist) {
      const picked = q.options.find((o) => o.value === answers[q.id])
      score += picked?.score ?? 0
    }
    onComplete(Math.round((score / toddlerMaxScore) * 100))
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
        <p className="flex items-center justify-center gap-2 font-heading text-lg text-accent">
          <Heart className="h-5 w-5" />
          부모님이 작성해 주세요
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {childName}님의 평소 모습을 떠올리며 가장 가까운 답을 골라 주세요.
        </p>
      </div>

      <div className="space-y-4">
        {toddlerChecklist.map((q, i) => (
          <div
            key={q.id}
            className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <h3 className="font-heading text-lg leading-snug text-foreground">
                {q.prompt}
              </h3>
            </div>

            <RadioGroup
              value={answers[q.id] ?? ""}
              onValueChange={(v) =>
                setAnswers((prev) => ({ ...prev, [q.id]: v }))
              }
              className="mt-4 gap-2.5"
            >
              {q.options.map((opt) => (
                <Label
                  key={opt.value}
                  htmlFor={`${q.id}-${opt.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 text-base transition-colors",
                    answers[q.id] === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-secondary/50",
                  )}
                >
                  <RadioGroupItem
                    id={`${q.id}-${opt.value}`}
                    value={opt.value}
                    className="shrink-0"
                  />
                  <span className="text-foreground">{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={!allAnswered}
        size="lg"
        className="mt-7 h-13 w-full rounded-full text-base"
      >
        측정 마치기
        <CheckCircle2 className="ml-1 h-5 w-5" />
      </Button>
    </div>
  )
}
