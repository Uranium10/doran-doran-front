// 영유아 모드(부모 체크리스트)용 더미 문항.
// 각 보기는 0~2점으로 환산해 총점 -> 백분율 -> level 로 매핑한다.

export type ChecklistOption = {
  value: string
  label: string
  score: number // 0(아직) ~ 2(아주 잘해요)
}

export type ChecklistQuestion = {
  id: string
  prompt: string
  options: ChecklistOption[]
}

export const toddlerChecklist: ChecklistQuestion[] = [
  {
    id: "c1",
    prompt: "그림책을 볼 때 아이가 그림을 손으로 짚으며 관심을 보이나요?",
    options: [
      { value: "a", label: "아직 관심이 적어요", score: 0 },
      { value: "b", label: "가끔 짚어요", score: 1 },
      { value: "c", label: "자주 짚으며 좋아해요", score: 2 },
    ],
  },
  {
    id: "c2",
    prompt: "들려준 이야기 속 인물이나 사물의 이름을 따라 말하나요?",
    options: [
      { value: "a", label: "아직 어려워해요", score: 0 },
      { value: "b", label: "몇 개는 따라 말해요", score: 1 },
      { value: "c", label: "여러 단어를 잘 따라 말해요", score: 2 },
    ],
  },
  {
    id: "c3",
    prompt: "‘앉아요’, ‘주세요’ 같은 간단한 말을 듣고 행동으로 옮기나요?",
    options: [
      { value: "a", label: "아직 잘 못해요", score: 0 },
      { value: "b", label: "가끔 이해해요", score: 1 },
      { value: "c", label: "대부분 잘 따라요", score: 2 },
    ],
  },
  {
    id: "c4",
    prompt: "그림을 보고 ‘이건 뭐야?’라고 물으면 대답하려 하나요?",
    options: [
      { value: "a", label: "아직 대답이 없어요", score: 0 },
      { value: "b", label: "단어로 짧게 대답해요", score: 1 },
      { value: "c", label: "문장으로 설명하려 해요", score: 2 },
    ],
  },
  {
    id: "c5",
    prompt: "좋아하는 이야기를 반복해서 들려달라고 하나요?",
    options: [
      { value: "a", label: "특별히 찾지 않아요", score: 0 },
      { value: "b", label: "가끔 찾아요", score: 1 },
      { value: "c", label: "자주 같은 이야기를 찾아요", score: 2 },
    ],
  },
]

export const toddlerMaxScore = toddlerChecklist.length * 2 // 10
