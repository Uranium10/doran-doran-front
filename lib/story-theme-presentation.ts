/** 아이가 보는 이름과 집필용 주제를 분리한다. ID를 그대로 보내므로 생성 내용은 바뀌지 않는다. */
export type ThemeSymbol = "daily" | "heart" | "friend" | "courage" | "promise" | "family" | "nature" | "safety"
const TOPIC_COPY: Record<string, { icon: ThemeSymbol; label: string }> = {
  "S01": {
    "icon": "daily",
    "label": "한 입 먹어 볼까?"
  },
  "S02": {
    "icon": "daily",
    "label": "장난감 정리해요"
  },
  "S03": {
    "icon": "daily",
    "label": "뽀득뽀득 손 씻기"
  },
  "S04": {
    "icon": "daily",
    "label": "치카치카 양치해요"
  },
  "S05": {
    "icon": "daily",
    "label": "이제 잘 시간"
  },
  "S06": {
    "icon": "heart",
    "label": "속상할 땐 안아 줘"
  },
  "S07": {
    "icon": "friend",
    "label": "내 차례를 기다려요"
  },
  "S08": {
    "icon": "daily",
    "label": "물건을 아껴요"
  },
  "S09": {
    "icon": "friend",
    "label": "서로 도와요"
  },
  "S10": {
    "icon": "nature",
    "label": "작은 생명과 친구"
  },
  "S11": {
    "icon": "safety",
    "label": "함께 안전하게"
  },
  "S12": {
    "icon": "family",
    "label": "가족이 좋아요"
  },
  "P01": {
    "icon": "daily",
    "label": "새로운 맛을 만나요"
  },
  "P02": {
    "icon": "daily",
    "label": "함께 정리해요"
  },
  "P03": {
    "icon": "daily",
    "label": "잠잘 준비 해요"
  },
  "P04": {
    "icon": "friend",
    "label": "빌려도 될까?"
  },
  "P05": {
    "icon": "friend",
    "label": "차례차례 기다려요"
  },
  "P06": {
    "icon": "friend",
    "label": "친구와 화해해요"
  },
  "P07": {
    "icon": "friend",
    "label": "함께 나눠요"
  },
  "P08": {
    "icon": "heart",
    "label": "화가 날 땐 말해요"
  },
  "P09": {
    "icon": "courage",
    "label": "함께라면 용기 나요"
  },
  "P10": {
    "icon": "promise",
    "label": "솔직하게 말해요"
  },
  "P11": {
    "icon": "family",
    "label": "동생이 생겼어요"
  },
  "P12": {
    "icon": "safety",
    "label": "먼저 물어볼게요"
  },
  "P13": {
    "icon": "safety",
    "label": "길을 잃었어요"
  },
  "P14": {
    "icon": "nature",
    "label": "작은 생명을 돌봐요"
  },
  "T01": {
    "icon": "friend",
    "label": "좋아하는 건 달라도"
  },
  "T02": {
    "icon": "daily",
    "label": "내 준비물 챙기기"
  },
  "T03": {
    "icon": "promise",
    "label": "약속 시간을 지켜요"
  },
  "T04": {
    "icon": "daily",
    "label": "내 물건은 제자리에"
  },
  "T05": {
    "icon": "friend",
    "label": "장난도 조심조심"
  },
  "T06": {
    "icon": "friend",
    "label": "네 이야기도 들을게"
  },
  "T07": {
    "icon": "friend",
    "label": "미안해, 친구야"
  },
  "T08": {
    "icon": "friend",
    "label": "우리 같이 놀래?"
  },
  "T09": {
    "icon": "courage",
    "label": "실수해도 괜찮아"
  },
  "T10": {
    "icon": "courage",
    "label": "함께 용기를 내요"
  },
  "T11": {
    "icon": "promise",
    "label": "사실대로 말할게요"
  },
  "T12": {
    "icon": "heart",
    "label": "더 갖고 싶어요"
  },
  "T13": {
    "icon": "family",
    "label": "가족과 힘을 모아요"
  },
  "T14": {
    "icon": "safety",
    "label": "위험해! 멈추자"
  },
  "F01": {
    "icon": "friend",
    "label": "어떻게 나눌까?"
  },
  "F02": {
    "icon": "friend",
    "label": "생각이 달라도 친구"
  },
  "F03": {
    "icon": "promise",
    "label": "정말 그런 걸까?"
  },
  "F04": {
    "icon": "heart",
    "label": "화난 마음 전하기"
  },
  "F05": {
    "icon": "heart",
    "label": "친구가 부러울 때"
  },
  "F06": {
    "icon": "courage",
    "label": "다른 방법으로 도전"
  },
  "F07": {
    "icon": "friend",
    "label": "겉모습이 전부일까?"
  },
  "F08": {
    "icon": "promise",
    "label": "친구에게도 솔직하게"
  },
  "F09": {
    "icon": "promise",
    "label": "약속이 겹쳤어요"
  },
  "F10": {
    "icon": "family",
    "label": "가족과 일 나누기"
  },
  "F11": {
    "icon": "daily",
    "label": "꼭 필요한 걸 골라요"
  },
  "F12": {
    "icon": "nature",
    "label": "동물 친구 돌보기"
  }
}

export function themePresentation(topic: { theme_id: string; label: string; category: string }) {
  // 서버에 새 주제가 추가되어도 기존 이름을 보여주고 선택·생성을 막지 않는다.
  return TOPIC_COPY[topic.theme_id] ?? { icon: "heart" as ThemeSymbol, label: topic.label }
}
