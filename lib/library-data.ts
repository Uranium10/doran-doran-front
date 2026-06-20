// 라이브러리(책장)용 더미 동화 데이터.
export type StoryBook = {
  id: string
  title: string
  cover: string
  createdAt: string // YYYY-MM-DD
  stageLabel: string // 생성 당시 문해력 단계
}

export const dummyLibrary: StoryBook[] = [
  {
    id: "s1",
    title: "도란이와 곶감 호랑이",
    cover: "/covers/tiger.png",
    createdAt: "2026-06-18",
    stageLabel: "새싹 2단계",
  },
  {
    id: "s2",
    title: "흥부와 제비의 박씨",
    cover: "/covers/heungbu.png",
    createdAt: "2026-06-12",
    stageLabel: "새싹 1단계",
  },
  {
    id: "s3",
    title: "콩쥐의 따뜻한 하루",
    cover: "/covers/kongjwi.png",
    createdAt: "2026-06-05",
    stageLabel: "씨앗 3단계",
  },
  {
    id: "s4",
    title: "토끼의 지혜로운 꾀",
    cover: "/covers/rabbit.png",
    createdAt: "2026-05-28",
    stageLabel: "나무 1단계",
  },
  {
    id: "s5",
    title: "심청이의 깊은 바다",
    cover: "/covers/simcheong.png",
    createdAt: "2026-05-20",
    stageLabel: "새싹 3단계",
  },
  {
    id: "s6",
    title: "해와 달이 된 남매",
    cover: "/covers/sun-moon.png",
    createdAt: "2026-05-11",
    stageLabel: "씨앗 2단계",
  },
  {
    id: "s7",
    title: "도깨비 방망이 이야기",
    cover: "/covers/dokkaebi.png",
    createdAt: "2026-05-03",
    stageLabel: "새싹 1단계",
  },
  {
    id: "s8",
    title: "선녀와 나무꾼",
    cover: "/covers/cheonyeo.png",
    createdAt: "2026-04-25",
    stageLabel: "씨앗 1단계",
  },
]

export function formatKoreanDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}
