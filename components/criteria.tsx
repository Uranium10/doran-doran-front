const levels = [
  {
    level: "씨앗",
    band: "4-6세",
    color: "bg-chart-3",
    desc: "그림과 짧은 문장을 보고 이야기의 흐름을 따라갈 수 있어요.",
    skills: ["낱말 인지", "소리 내어 읽기", "그림 이해"],
  },
  {
    level: "새싹",
    band: "6-8세",
    color: "bg-accent",
    desc: "문장을 스스로 읽고 인물의 마음과 사건을 이해해요.",
    skills: ["문장 이해", "어휘 확장", "원인과 결과"],
  },
  {
    level: "나무",
    band: "8-10세",
    color: "bg-primary",
    desc: "긴 글을 읽고 주제와 교훈을 자기 말로 정리할 수 있어요.",
    skills: ["요약하기", "추론", "주제 파악"],
  },
  {
    level: "숲",
    band: "10세+",
    color: "bg-chart-4",
    desc: "글 속 의미를 비판적으로 읽고 자신의 생각을 표현해요.",
    skills: ["비판적 읽기", "표현력", "관점 비교"],
  },
]

export function Criteria() {
  return (
    <section id="criteria" className="scroll-mt-20 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl text-foreground sm:text-4xl">
            문해력 평가 기준
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            도란도란은 아이의 읽기 발달을 네 단계로 나누어 살펴봐요. 테스트
            결과에 따라 알맞은 단계의 전래동화를 만들어 드립니다.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((lv, i) => (
            <div
              key={lv.level}
              className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${lv.color} font-heading text-lg text-white`}
                >
                  {i + 1}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {lv.band}
                </span>
              </div>
              <h3 className="mt-4 font-heading text-2xl text-foreground">
                {lv.level}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {lv.desc}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {lv.skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
