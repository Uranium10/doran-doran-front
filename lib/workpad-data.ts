import {
  buildLiteracyResult,
  type LiteracyResult,
  type LiteracyTestKind,
} from "@/lib/levels"

// ===========================================================================
// 통신 규격 (back <-> front)
// 아직 엔드포인트가 없으므로 더미 데이터를 동일한 형태로 만들어 보여준다.
// 서버 연동 시 generateAssessment / submitAssessment 본문만 fetch 로 바꾸면 된다.
// ===========================================================================

/** 평가 유형: 아동 배치고사/재시험 / 동화 퀴즈 / 영유아 부모용 */
export type AssessmentType = "pretest" | "posttest" | "checklist"

/** 동화 페이지 (posttest 의 동화 파트). pretest/checklist 면 pages: [] */
export type StoryPage = {
  page_number: number
  image: string
  heading: string
  text: string
}

/** 공통 문항 타입 (체크리스트·퀴즈 모두 이 타입을 따른다) */
export type AssessmentQuestion = {
  question_id: string
  /** 문제 유형 (어휘, 이해, 추론 등) */
  skill?: string
  /** 예문 (없으면 null) */
  passage?: string | null
  /** 실제 질문 내용 */
  prompt: string
  options: {
    label: string
    value: string
    /** 그림 퀴즈일 경우 썸네일 URL (없으면 null) */
    image_url?: string | null
  }[]
  /** 난이도 가중치 (서버 채점 시 프론트에 안 줄 수도 있음) */
  level?: number
  /** 정답 (서버 채점 시 프론트에 안 줄 수도 있음) */
  answer?: string
}

/** 출제 페이로드 (back -> front): 동화 + 퀴즈가 한 묶음 */
export type AssessmentPayload = {
  assessment_type: AssessmentType
  /** 동화 퀴즈(posttest)면 story_id, 아니면 null */
  story_id: string | null
  title: string | null
  theme: string | null
  pages: StoryPage[]
  quizzes: AssessmentQuestion[]
}

/** 채점 제출 상세 (front -> back) */
export type SubmissionDetail = {
  question_id: string
  /** 해당 문제의 난이도 */
  level: number
  /** 사용자가 최종 선택한 보기의 value */
  selected_value: string
  /** 프론트엔드 자체 채점 정오답 여부 */
  is_correct: boolean
}

/** 채점 제출 페이로드 (front -> back) */
export type AssessmentSubmission = {
  profile_id: string
  /** 출제 시 받았던 평가 유형 그대로 반환 */
  assessment_type: AssessmentType
  /** 동화 퀴즈였다면 해당 story_id 반환 */
  story_id: string | null
  results: {
    total_questions: number
    correct_answers: number
    details: SubmissionDetail[]
  }
}

/**
 * 동화 생성 입력값.
 * 추후 서버 엔드포인트로 그대로 전송할 페이로드 형태로 설계했다.
 */
export type StoryInput = {
  protagonistName: string
  favorite: string
  todayEvent: string
}

// ===========================================================================
// 더미 문항 (AssessmentQuestion 규격)
// ===========================================================================

// 아동 배치고사(pretest)용 더미 문항
export const preQuestions: AssessmentQuestion[] = [
  {
    question_id: "q1",
    skill: "어휘",
    passage: null,
    prompt: "‘마음씨가 곱다’에서 ‘곱다’와 뜻이 가장 비슷한 말은 무엇일까요?",
    options: [
      { label: "착하다", value: "a", image_url: null },
      { label: "빠르다", value: "b", image_url: null },
      { label: "차갑다", value: "c", image_url: null },
      { label: "무겁다", value: "d", image_url: null },
    ],
    level: 8,
    answer: "a",
  },
  {
    question_id: "q2",
    skill: "이해",
    passage:
      "옛날 옛적에 마음씨 착한 흥부는 다리를 다친 제비를 정성껏 치료해 주었어요. 봄이 되자 제비는 박씨 하나를 물어다 주었지요.",
    prompt: "흥부는 제비에게 무엇을 해 주었나요?",
    options: [
      { label: "박씨를 주었다", value: "a", image_url: null },
      { label: "다친 다리를 치료해 주었다", value: "b", image_url: null },
      { label: "집을 지어 주었다", value: "c", image_url: null },
      { label: "멀리 쫓아냈다", value: "d", image_url: null },
    ],
    level: 10,
    answer: "b",
  },
  {
    question_id: "q3",
    skill: "추론",
    passage:
      "호랑이는 ‘곶감’이 자기보다 훨씬 무서운 것이라고 생각했어요. 그래서 부리나케 도망쳐 버렸답니다.",
    prompt: "호랑이가 도망친 까닭은 무엇일까요?",
    options: [
      { label: "배가 고파서", value: "a", image_url: null },
      { label: "곶감이 무섭다고 오해해서", value: "b", image_url: null },
      { label: "집에 가고 싶어서", value: "c", image_url: null },
      { label: "친구를 만나러", value: "d", image_url: null },
    ],
    level: 12,
    answer: "b",
  },
  {
    question_id: "q4",
    skill: "어휘",
    passage: null,
    prompt: "‘부리나케’는 어떤 모습을 나타내는 말일까요?",
    options: [
      { label: "아주 천천히", value: "a", image_url: null },
      { label: "매우 급하게", value: "b", image_url: null },
      { label: "조용하게", value: "c", image_url: null },
      { label: "슬프게", value: "d", image_url: null },
    ],
    level: 11,
    answer: "b",
  },
  {
    question_id: "q5",
    skill: "이해",
    passage:
      "콩쥐는 힘든 일을 시켜도 늘 웃으며 도왔어요. 그 모습을 본 하늘은 콩쥐에게 큰 복을 내려 주었답니다.",
    prompt: "이 이야기가 주는 교훈으로 알맞은 것은?",
    options: [
      { label: "착하게 살면 복을 받는다", value: "a", image_url: null },
      { label: "일을 하면 안 된다", value: "b", image_url: null },
      { label: "친구가 많아야 한다", value: "c", image_url: null },
      { label: "빨리 달려야 한다", value: "d", image_url: null },
    ],
    level: 12,
    answer: "a",
  },
]

// 동화 퀴즈(posttest)용 더미 문항 (생성된 동화 내용 기반)
export const postQuestions: AssessmentQuestion[] = [
  {
    question_id: "p1",
    skill: "이해",
    passage: null,
    prompt: "방금 읽은 동화에서 주인공이 가장 먼저 한 일은 무엇이었나요?",
    options: [
      { label: "숲으로 모험을 떠났다", value: "a", image_url: null },
      { label: "잠을 잤다", value: "b", image_url: null },
      { label: "밥을 먹었다", value: "c", image_url: null },
      { label: "학교에 갔다", value: "d", image_url: null },
    ],
    level: 10,
    answer: "a",
  },
  {
    question_id: "p2",
    skill: "추론",
    passage: null,
    prompt: "주인공이 친구를 도와준 까닭은 무엇일까요?",
    options: [
      { label: "상을 받기 위해서", value: "a", image_url: null },
      { label: "마음이 따뜻해서", value: "b", image_url: null },
      { label: "심심해서", value: "c", image_url: null },
      { label: "어쩔 수 없어서", value: "d", image_url: null },
    ],
    level: 12,
    answer: "b",
  },
  {
    question_id: "p3",
    skill: "어휘",
    passage: null,
    prompt: "동화에 나온 ‘용기’와 어울리는 말은 무엇일까요?",
    options: [
      { label: "겁이 많다", value: "a", image_url: null },
      { label: "씩씩하다", value: "b", image_url: null },
      { label: "졸리다", value: "c", image_url: null },
      { label: "배고프다", value: "d", image_url: null },
    ],
    level: 11,
    answer: "b",
  },
  {
    question_id: "p4",
    skill: "이해",
    passage: null,
    prompt: "이 동화의 교훈으로 가장 알맞은 것은 무엇인가요?",
    options: [
      { label: "용기를 내어 서로 도우면 좋은 일이 생긴다", value: "a", image_url: null },
      { label: "혼자 노는 것이 가장 좋다", value: "b", image_url: null },
      { label: "거짓말을 해도 괜찮다", value: "c", image_url: null },
      { label: "잠을 많이 자야 한다", value: "d", image_url: null },
    ],
    level: 13,
    answer: "a",
  },
]

// ===========================================================================
// 더미 동화 (StoryPage 규격)
// ===========================================================================

export function buildStoryPages(childName: string, favorite: string): StoryPage[] {
  const name = childName.trim() || "아이"
  const fav = favorite.trim() || "별빛"
  return [
    {
      page_number: 1,
      image: "/popup/page-village.png",
      heading: "1. 도란 마을의 아침",
      text: `옛날 옛적, 감나무가 가득한 도란 마을에 ${name}(이)가 살았어요. ${name}(은)는 ${fav}을(를) 무척 좋아하는 마음씨 고운 아이였지요. 어느 봄날 아침, 처마 밑에서 다친 제비 한 마리를 발견했어요.`,
    },
    {
      page_number: 2,
      image: "/popup/page-forest.png",
      heading: "2. 숲으로 떠난 모험",
      text: `${name}(은)는 제비를 돕기 위해 깊은 솔숲으로 들어갔어요. 그곳에서 곶감을 무서워하는 커다란 호랑이를 만났지만, ${name}(은)는 용기를 내어 차근차근 이야기를 나누었답니다.`,
    },
    {
      page_number: 3,
      image: "/popup/page-palace.png",
      heading: "3. 지혜로운 약속",
      text: `호랑이는 ${name}의 따뜻한 마음에 감동했어요. "네 ${fav} 같은 마음이 참 곱구나!" 둘은 서로 돕기로 약속하고, 제비를 무사히 하늘로 돌려보냈어요.`,
    },
    {
      page_number: 4,
      image: "/popup/page-village.png",
      heading: "4. 복이 찾아온 마을",
      text: `봄이 다시 오자, 제비는 ${name}에게 반짝이는 박씨를 물어다 주었어요. 박에서 쏟아진 복으로 도란 마을은 웃음꽃이 활짝 피었답니다. 용기를 내어 서로 도운 ${name}(은)는 마을의 작은 영웅이 되었어요.`,
    },
  ]
}

// ===========================================================================
// 출제 (back -> front) — 더미
// ===========================================================================

/** 아동 배치고사(pretest) 출제. 동화 없이 퀴즈만. */
export function buildPretestAssessment(): AssessmentPayload {
  return {
    assessment_type: "pretest",
    story_id: null,
    title: null,
    theme: null,
    pages: [],
    quizzes: preQuestions,
  }
}

/** 동화 퀴즈(posttest) 출제. 동화와 퀴즈를 한 묶음으로 내려준다. */
export function buildStoryAssessment(input: StoryInput): AssessmentPayload {
  const name = input.protagonistName.trim() || "아이"
  return {
    assessment_type: "posttest",
    story_id: `story_${Date.now()}`,
    title: `${name}의 도란도란 이야기`,
    theme: "용기",
    pages: buildStoryPages(input.protagonistName, input.favorite),
    quizzes: postQuestions,
  }
}

/**
 * 동화 + 퀴즈 출제기. 추후 서버 엔드포인트로 교체할 지점.
 * TODO: 실제 연동 시 아래를 fetch 로 교체
 *   const res = await fetch("/api/assessment", { method: "POST", body: JSON.stringify(input) })
 *   return (await res.json()) as AssessmentPayload
 */
export async function generateAssessment(
  input: StoryInput,
): Promise<AssessmentPayload> {
  await new Promise((resolve) => setTimeout(resolve, 3000))
  return buildStoryAssessment(input)
}

// ===========================================================================
// 제출 (front -> back) -> 결과 (back -> front) — 더미
// ===========================================================================

/**
 * 사용자의 답안(answers: question_id -> 선택 value)으로 제출 페이로드를 만든다.
 * 프론트에서 1차 채점한 정오답/개수를 함께 담는다.
 */
export function buildSubmission(
  profileId: string,
  payload: AssessmentPayload,
  answers: Record<string, string>,
): AssessmentSubmission {
  const details: SubmissionDetail[] = payload.quizzes.map((q) => {
    const selected = answers[q.question_id] ?? ""
    return {
      question_id: q.question_id,
      level: q.level ?? 0,
      selected_value: selected,
      is_correct: q.answer != null && selected === q.answer,
    }
  })
  const correct = details.filter((d) => d.is_correct).length
  return {
    profile_id: profileId,
    assessment_type: payload.assessment_type,
    story_id: payload.story_id,
    results: {
      total_questions: payload.quizzes.length,
      correct_answers: correct,
      details,
    },
  }
}

/**
 * 채점 결과 제출 -> 진척도 결과 수신. 추후 서버 엔드포인트로 교체할 지점.
 * 현재는 제출 페이로드의 개수만으로 더미 결과지를 즉시 만들어 돌려준다.
 * TODO: 실제 연동 시 아래를 fetch 로 교체
 *   const res = await fetch("/api/assessment/submit", { method: "POST", body: JSON.stringify(submission) })
 *   return (await res.json()) as LiteracyResult
 */
export async function submitAssessment(
  submission: AssessmentSubmission,
  opts: { kind: LiteracyTestKind; prevPercent: number | null },
): Promise<LiteracyResult> {
  const { total_questions, correct_answers } = submission.results
  return buildLiteracyResult(
    opts.kind,
    correct_answers,
    total_questions,
    opts.prevPercent,
  )
}
