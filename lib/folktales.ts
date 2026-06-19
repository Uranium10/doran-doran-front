export type Folktale = {
  id: string
  title: string
  subtitle: string
  cover: string
  ageRange: string
  minutes: number
  tags: string[]
  blurb: string
}

export const folktales: Folktale[] = [
  {
    id: "heungbu",
    title: "흥부와 놀부",
    subtitle: "제비가 물어다 준 박씨",
    cover: "/covers/heungbu.png",
    ageRange: "5-8세",
    minutes: 7,
    tags: ["나눔", "형제", "권선징악"],
    blurb: "마음씨 착한 흥부가 다친 제비를 돌봐주고 복을 받는 따뜻한 이야기.",
  },
  {
    id: "sun-moon",
    title: "해님 달님",
    subtitle: "하늘로 올라간 오누이",
    cover: "/covers/sun-moon.png",
    ageRange: "5-9세",
    minutes: 8,
    tags: ["용기", "지혜", "가족"],
    blurb: "호랑이를 피해 하늘로 올라가 해와 달이 된 남매의 이야기.",
  },
  {
    id: "tiger",
    title: "호랑이와 곶감",
    subtitle: "곶감을 무서워한 호랑이",
    cover: "/covers/tiger.png",
    ageRange: "4-7세",
    minutes: 5,
    tags: ["유머", "지혜", "동물"],
    blurb: "곶감이 자기보다 무서운 줄 알고 도망친 호랑이의 우스운 이야기.",
  },
  {
    id: "kongjwi",
    title: "콩쥐 팥쥐",
    subtitle: "착한 콩쥐의 행복",
    cover: "/covers/kongjwi.png",
    ageRange: "6-9세",
    minutes: 9,
    tags: ["착함", "도움", "권선징악"],
    blurb: "어려움 속에서도 마음씨 고운 콩쥐가 복을 받는 우리식 신데렐라.",
  },
  {
    id: "rabbit",
    title: "토끼의 간",
    subtitle: "꾀 많은 토끼",
    cover: "/covers/rabbit.png",
    ageRange: "6-10세",
    minutes: 8,
    tags: ["지혜", "재치", "바다"],
    blurb: "용궁에 끌려간 토끼가 꾀를 내어 위기를 벗어나는 통쾌한 이야기.",
  },
  {
    id: "dokkaebi",
    title: "도깨비 방망이",
    subtitle: "금 나와라 뚝딱",
    cover: "/covers/dokkaebi.png",
    ageRange: "5-8세",
    minutes: 6,
    tags: ["정직", "요술", "권선징악"],
    blurb: "정직한 나무꾼이 도깨비방망이로 복을 받는 신나는 이야기.",
  },
  {
    id: "cheonyeo",
    title: "선녀와 나무꾼",
    subtitle: "날개옷의 비밀",
    cover: "/covers/cheonyeo.png",
    ageRange: "7-10세",
    minutes: 9,
    tags: ["사랑", "약속", "하늘"],
    blurb: "산속 연못에서 만난 선녀와 나무꾼의 애틋한 이야기.",
  },
  {
    id: "simcheong",
    title: "심청전",
    subtitle: "효녀 심청이",
    cover: "/covers/simcheong.png",
    ageRange: "7-11세",
    minutes: 10,
    tags: ["효도", "희생", "감동"],
    blurb: "아버지의 눈을 뜨게 하려고 바다에 몸을 던진 효녀 심청의 이야기.",
  },
]

export const rows: { title: string; ids: string[] }[] = [
  {
    title: "지금 인기 있는 전래동화",
    ids: ["heungbu", "sun-moon", "tiger", "rabbit", "dokkaebi"],
  },
  {
    title: "마음이 따뜻해지는 이야기",
    ids: ["kongjwi", "simcheong", "cheonyeo", "heungbu", "sun-moon"],
  },
  {
    title: "처음 만나는 전래동화 (4-6세)",
    ids: ["tiger", "dokkaebi", "heungbu", "sun-moon", "kongjwi"],
  },
]
