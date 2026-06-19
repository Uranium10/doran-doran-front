import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "AI가 만든 동화인데 아이에게 보여줘도 괜찮을까요?",
    a: "도란도란은 우리나라 전래동화의 뼈대와 교훈을 바탕으로 이야기를 만들어요. 폭력적이거나 부적절한 표현은 걸러지고, 연령대에 맞는 어휘로만 구성됩니다.",
  },
  {
    q: "문해력 테스트는 어떻게 진행되나요?",
    a: "짧은 글을 읽고 푸는 5문항 내외의 문제로 진행돼요. 5분이면 충분하고, 결과에 따라 씨앗·새싹·나무·숲 단계가 정해집니다.",
  },
  {
    q: "동화 한 편을 만드는 데 얼마나 걸리나요?",
    a: "아이 이름과 좋아하는 것을 입력하면 보통 1~2분 안에 팝업북 형태의 동화가 완성됩니다.",
  },
  {
    q: "전후 문해력은 정말 비교가 되나요?",
    a: "동화를 읽기 전과 후에 같은 기준으로 측정해, 어휘·이해·추론 영역이 얼마나 변했는지 리포트로 보여드려요.",
  },
  {
    q: "무료로 어디까지 쓸 수 있나요?",
    a: "맛보기 요금제로 문해력 테스트 1회와 전래동화 2편을 신용카드 없이 무료로 이용할 수 있어요.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-heading text-3xl text-foreground sm:text-4xl">
            자주 묻는 질문
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            궁금한 점이 있으신가요? 부모님들이 가장 많이 물어보시는 질문을
            모았어요.
          </p>
        </div>

        <Accordion className="mt-10 w-full">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-heading text-lg text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
