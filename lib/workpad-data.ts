export type Question = {
  id: string
  passage?: string
  prompt: string
  options: { value: string; label: string }[]
  answer: string
  skill: "어휘" | "이해" | "추론"
}

// Pre-test literacy questions
export const preQuestions: Question[] = [
  {
    id: "q1",
    skill: "어휘",
    prompt: "‘마음씨가 곱다’에서 ‘곱다’와 뜻이 가장 비슷한 말은 무엇일까요?",
    options: [
      { value: "a", label: "착하다" },
      { value: "b", label: "빠르다" },
      { value: "c", label: "차갑다" },
      { value: "d", label: "무겁다" },
    ],
    answer: "a",
  },
  {
    id: "q2",
    skill: "이해",
    passage:
      "옛날 옛적에 마음씨 착한 흥부는 다리를 다친 제비를 정성껏 치료해 주었어요. 봄이 되자 제비는 박씨 하나를 물어다 주었지요.",
    prompt: "흥부는 제비에게 무엇을 해 주었나요?",
    options: [
      { value: "a", label: "박씨를 주었다" },
      { value: "b", label: "다친 다리를 치료해 주었다" },
      { value: "c", label: "집을 지어 주었다" },
      { value: "d", label: "멀리 쫓아냈다" },
    ],
    answer: "b",
  },
  {
    id: "q3",
    skill: "추론",
    passage:
      "호랑이는 ‘곶감’이 자기보다 훨씬 무서운 것이라고 생각했어요. 그래서 부리나케 도망쳐 버렸답니다.",
    prompt: "호랑이가 도망친 까닭은 무엇일까요?",
    options: [
      { value: "a", label: "배가 고파서" },
      { value: "b", label: "곶감이 무섭다고 오해해서" },
      { value: "c", label: "집에 가고 싶어서" },
      { value: "d", label: "친구를 만나러" },
    ],
    answer: "b",
  },
  {
    id: "q4",
    skill: "어휘",
    prompt: "‘부리나케’는 어떤 모습을 나타내는 말일까요?",
    options: [
      { value: "a", label: "아주 천천히" },
      { value: "b", label: "매우 급하게" },
      { value: "c", label: "조용하게" },
      { value: "d", label: "슬프게" },
    ],
    answer: "b",
  },
  {
    id: "q5",
    skill: "이해",
    passage:
      "콩쥐는 힘든 일을 시켜도 늘 웃으며 도왔어요. 그 모습을 본 하늘은 콩쥐에게 큰 복을 내려 주었답니다.",
    prompt: "이 이야기가 주는 교훈으로 알맞은 것은?",
    options: [
      { value: "a", label: "착하게 살면 복을 받는다" },
      { value: "b", label: "일을 하면 안 된다" },
      { value: "c", label: "친구가 많아야 한다" },
      { value: "d", label: "빨리 달려야 한다" },
    ],
    answer: "a",
  },
]

// Post-test questions (about the generated story)
export const postQuestions: Question[] = [
  {
    id: "p1",
    skill: "이해",
    prompt: "방금 읽은 동화에서 주인공이 가장 먼저 한 일은 무엇이었나요?",
    options: [
      { value: "a", label: "숲으로 모험을 떠났다" },
      { value: "b", label: "잠을 잤다" },
      { value: "c", label: "밥을 먹었다" },
      { value: "d", label: "학교에 갔다" },
    ],
    answer: "a",
  },
  {
    id: "p2",
    skill: "추론",
    prompt: "주인공이 친구를 도와준 까닭은 무엇일까요?",
    options: [
      { value: "a", label: "상을 받기 위해서" },
      { value: "b", label: "마음이 따뜻해서" },
      { value: "c", label: "심심해서" },
      { value: "d", label: "어쩔 수 없어서" },
    ],
    answer: "b",
  },
  {
    id: "p3",
    skill: "어휘",
    prompt: "동화에 나온 ‘용기’와 어울리는 말은 무엇일까요?",
    options: [
      { value: "a", label: "겁이 많다" },
      { value: "b", label: "씩씩하다" },
      { value: "c", label: "졸리다" },
      { value: "d", label: "배고프다" },
    ],
    answer: "b",
  },
  {
    id: "p4",
    skill: "이해",
    prompt: "이 동화의 교훈으로 가장 알맞은 것은 무엇인가요?",
    options: [
      { value: "a", label: "용기를 내어 서로 도우면 좋은 일이 생긴다" },
      { value: "b", label: "혼자 노는 것이 가장 좋다" },
      { value: "c", label: "거짓말을 해도 괜찮다" },
      { value: "d", label: "잠을 많이 자야 한다" },
    ],
    answer: "a",
  },
]

export type StoryPage = {
  image: string
  heading: string
  text: string
}

/**
 * 동화 생성 입력값.
 * 추후 서버 엔드포인트로 그대로 전송할 페이로드 형태로 설계했다.
 * - protagonistName: 주인공 이름 (기본값: 현재 프로필 이름, 편집 가능)
 * - favorite: 아이가 좋아하는 것 (예: 공룡/별/공주)
 * - todayEvent: 오늘 있었던 일 (자유 서술)
 */
export type StoryInput = {
  protagonistName: string
  favorite: string
  todayEvent: string
}

// Sample generated pop-up story
export function buildStory(childName: string, favorite: string): StoryPage[] {
  const name = childName.trim() || "아이"
  const fav = favorite.trim() || "별빛"
  return [
    {
      image: "/popup/page-village.png",
      heading: "1. 도란 마을의 아침",
      text: `옛날 옛적, 감나무가 가득한 도란 마을에 ${name}(이)가 살았어요. ${name}(은)는 ${fav}을(를) 무척 좋아하는 마음씨 고운 아이였지요. 어느 봄날 아침, 처마 밑에서 다친 제비 한 마리를 발견했어요.`,
    },
    {
      image: "/popup/page-forest.png",
      heading: "2. 숲으로 떠난 모험",
      text: `${name}(은)는 제비를 돕기 위해 깊은 솔숲으로 들어갔어요. 그곳에서 곶감을 무서워하는 커다란 호랑이를 만났지만, ${name}(은)는 용기를 내어 차근차근 이야기를 나누었답니다.`,
    },
    {
      image: "/popup/page-palace.png",
      heading: "3. 지혜로운 약속",
      text: `호랑이는 ${name}의 따뜻한 마음에 감동했어요. "네 ${fav} 같은 마음이 참 곱구나!" 둘은 서로 돕기로 약속하고, 제비를 무사히 하늘로 돌려보냈어요.`,
    },
    {
      image: "/popup/page-village.png",
      heading: "4. 복이 찾아온 마을",
      text: `봄이 다시 오자, 제비는 ${name}에게 반짝이는 박씨를 물어다 주었어요. 박에서 쏟아진 복으로 도란 마을은 웃음꽃이 활짝 피었답니다. 용기를 내어 서로 도운 ${name}(은)는 마을의 작은 영웅이 되었어요.`,
    },
  ]
}
