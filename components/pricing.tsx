import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "맛보기",
    price: "0",
    period: "원",
    desc: "처음 만나는 도란도란",
    features: ["문해력 테스트 1회", "전래동화 2편 생성", "팝업북 뷰어", "전후 비교 리포트 미리보기"],
    cta: "무료 시작하기",
    highlight: false,
  },
  {
    name: "도란 가족",
    price: "12,900",
    period: "원 / 월",
    desc: "꾸준히 자라는 우리 아이",
    features: [
      "무제한 문해력 측정",
      "전래동화 무제한 생성",
      "아이 2명까지 프로필",
      "성장 리포트 전체 제공",
      "음성 읽어주기",
    ],
    cta: "도란 가족 시작하기",
    highlight: true,
  },
  {
    name: "도란 교실",
    price: "맞춤",
    period: "견적",
    desc: "어린이집·학교·도서관용",
    features: ["반/학급 단위 관리", "선생님 대시보드", "단체 리포트", "전용 상담 지원"],
    cta: "도입 문의하기",
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-secondary/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl text-foreground sm:text-4xl">
            가격 안내
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            무료로 시작하고, 우리 아이에게 꼭 맞는 요금제를 골라보세요. 언제든
            해지할 수 있어요.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-3xl border bg-card p-7 shadow-sm",
                plan.highlight
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  가장 인기
                </span>
              )}
              <h3 className="font-heading text-2xl text-foreground">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-heading text-4xl text-foreground">
                  {plan.price}
                </span>
                <span className="mb-1 text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.highlight ? "default" : "secondary"}
                className="mt-7 h-12 rounded-full text-base"
              >
                <Link href="/dashboard">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
