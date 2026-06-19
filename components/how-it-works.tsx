import { ClipboardCheck, BookOpen, LineChart } from "lucide-react"

const steps = [
  {
    icon: ClipboardCheck,
    step: "STEP 1",
    title: "문해력 테스트",
    desc: "짧은 읽기 문제로 아이의 어휘력과 이해력을 확인해요. 결과에 맞춰 동화의 난이도가 정해집니다.",
  },
  {
    icon: BookOpen,
    step: "STEP 2",
    title: "전래동화 생성",
    desc: "아이 이름과 좋아하는 것을 넣으면, 진짜 그림책 같은 3D 팝업북 전래동화가 만들어져요.",
  },
  {
    icon: LineChart,
    step: "STEP 3",
    title: "문해력 재측정",
    desc: "동화를 읽은 뒤 다시 한 번 측정해, 얼마나 자랐는지 한눈에 보는 리포트를 드려요.",
  },
]

export function HowItWorks() {
  return (
    <section className="bg-secondary/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl text-foreground sm:text-4xl">
            읽고, 만들고, 자라요
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            도란도란은 단순한 동화 생성기가 아니에요. 아이의 문해력을 측정하고,
            맞춤 동화로 키우고, 다시 확인하는 성장의 한 바퀴를 함께합니다.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.step}
              className="relative rounded-3xl border border-border bg-card p-7 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </span>
              <p className="mt-5 font-mono text-xs font-semibold tracking-widest text-primary">
                {s.step}
              </p>
              <h3 className="mt-1 font-heading text-2xl text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
