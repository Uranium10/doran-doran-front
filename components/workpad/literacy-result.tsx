"use client"

import type { ReactNode } from "react"
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { resultEncouragement } from "@/lib/result-encouragement"
import encouragementStyles from "./result-encouragement.module.css"
import { ResultProgress } from "./result-progress"
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
    title: (name) => `${name}님, 이야기 속 생각을 함께 살펴봐요`,
    sub: "읽은 이야기의 문제와 고른 답을 함께 확인해요.",
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
  rewards,
}: {
  result: LiteracyResult
  childName: string
  primaryLabel?: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  /** 맞춘 개수 표시 여부. 유아용 설문에서는 false 로 숨긴다. */
  rewards?: ReactNode
  showScore?: boolean
}) {
  const name = childName.trim() || "아이"
  const copy = KIND_COPY[result.kind]
  const { correct, total } = result
  // 관찰형 설문에는 정답이 없으므로 점수용 격려 태그를 붙이지 않는다.
  const encouragement = showScore && result.assessment_type !== "checklist" ? resultEncouragement(correct,total) : null

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

      <div className={encouragement ? encouragementStyles.wrap : ""}>
        {encouragement && <div className={encouragementStyles.tag} data-testid="result-encouragement"><Sparkles size={20} aria-hidden="true"/>{encouragement}</div>}
      <div className={`rounded-3xl border border-border bg-card p-6 shadow-md sm:p-8 ${encouragement ? encouragementStyles.card : ""}`}>
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

        {/* 서버가 저장한 변화량으로 이전 진척도부터 승급 과정을 재생한다. */}
        <div className={showScore ? "mt-8" : ""}><ResultProgress result={result}/></div>
      </div>

      </div>

      {rewards}
      {result.is_practice && <p className="mt-4 text-center text-sm text-muted-foreground">다시 풀기는 레벨을 바꾸지 않아요. 이야기와 친구들을 더 깊이 기억해요.</p>}

      {/* 저장 당시의 문항과 서버 채점 결과를 그대로 보여준다. 결과 열람에는 모델 호출이 없다. */}
      <section className="mt-8 space-y-4" aria-label="문항별 답안">
        <h2 className="font-heading text-2xl">{result.assessment_type === "checklist" ? "남겨 주신 관찰 기록" : "함께 펼쳐 보는 답안지"}</h2>
        {!result.details?.length && <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">이전 기록에는 문항별 답안이 저장되지 않았어요.</p>}
        {result.details?.map((detail,index)=>{
          const checklist=result.assessment_type==='checklist'
          const label=(value:string|null|undefined)=>detail.options?.find(option=>option.value===value)?.label ?? value ?? "기록 없음"
          return <article key={`${detail.question_id}:${index}`} className="relative rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            {!checklist && detail.answer && <svg viewBox="0 0 60 60" width="48" height="48" aria-hidden="true" className={`absolute right-4 top-4 -rotate-12 ${detail.is_correct?'text-[#477963]':'text-[#b65d40]'}`}>
              {detail.is_correct?<><path d="M46 17C26 1 8 20 13 39S55 51 49 24C44 4 20 9 13 27" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity=".85"/><path d="M47 14C20 4 6 29 16 43" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".5"/></>:<><path d="M45 10L17 48M41 10L14 44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".8"/></>}
            </svg>}
            <p className="mb-2 pr-12 text-xs text-muted-foreground">{index+1}번{detail.skill?` · ${detail.skill}`:''}{!checklist&&detail.answer?` · ${detail.is_correct?'정답이에요':'함께 다시 볼까요?'}`:''}</p>
            <h3 className="pr-12 font-heading text-xl leading-relaxed">{detail.prompt ?? '문항 상세가 저장되지 않은 기록이에요.'}</h3>
            {detail.passage&&<blockquote className="mt-4 whitespace-pre-line rounded-2xl bg-secondary/60 p-4 text-sm leading-7">{detail.passage}</blockquote>}
            <div className="mt-4 space-y-2 text-sm leading-6"><p className="rounded-xl bg-secondary/50 px-4 py-3"><span className="mr-3 font-semibold">{checklist?'선택한 응답':'내가 고른 답'}</span>{label(detail.selected_value)}</p>
              {!checklist&&<p className="rounded-xl bg-[#e8efea] px-4 py-3 text-[#315447]"><span className="mr-3 font-semibold">정답</span>{label(detail.answer)}</p>}</div>
          </article>
        })}
      </section>
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
