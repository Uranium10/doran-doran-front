/** 화면용 생활 문구다. 주제 ID와 서버의 원본 집필 지침은 그대로 유지한다. */
export type ThemeSymbol = "daily" | "heart" | "friend" | "courage" | "promise" | "family" | "nature" | "safety"
const TOPIC_COPY: Record<string, { icon: ThemeSymbol; label: string; description: string }> = {
  "S01": {
    "icon": "daily",
    "label": "새 음식과 친해져요",
    "description": "냄새를 맡고 살펴보며 천천히 만나 봐요."
  },
  "S02": {
    "icon": "daily",
    "label": "장난감 정리를 배워요",
    "description": "어른과 함께 장난감이 쉴 자리를 찾아요."
  },
  "S03": {
    "icon": "daily",
    "label": "손 씻는 법을 배워요",
    "description": "보글보글 거품으로 어른과 함께 손을 씻어요."
  },
  "S04": {
    "icon": "daily",
    "label": "양치하는 법을 배워요",
    "description": "어른과 함께 칫솔을 만나고 이를 돌봐요."
  },
  "S05": {
    "icon": "daily",
    "label": "잠잘 준비를 해 봐요",
    "description": "장난감에 인사하고 포근한 이불을 만나요."
  },
  "S06": {
    "icon": "heart",
    "label": "속상할 땐 도움받아요",
    "description": "울어도 괜찮아요. 곁에 있는 어른과 잠깐 쉬어요."
  },
  "S07": {
    "icon": "friend",
    "label": "기다리는 법을 배워요",
    "description": "어른과 함께 짧은 차례를 기다려 봐요."
  },
  "S08": {
    "icon": "daily",
    "label": "물건 다루는 법을 배워요",
    "description": "작은 손으로 살살, 어른과 함께 해 봐요."
  },
  "S09": {
    "icon": "friend",
    "label": "도움을 주고받아요",
    "description": "손짓과 말로 도움을 청하고 고마움을 나눠요."
  },
  "S10": {
    "icon": "nature",
    "label": "생명을 아끼는 법을 배워요",
    "description": "꽃과 작은 동물을 어른과 함께 바라봐요."
  },
  "S11": {
    "icon": "safety",
    "label": "안전하게 멈춰요",
    "description": "공이 멀리 굴러가면 어른과 함께 멈춰요."
  },
  "S12": {
    "icon": "family",
    "label": "반갑게 인사해요",
    "description": "손 흔들기, 웃기, 안기기 중 편한 인사를 해요."
  },
  "P01": {
    "icon": "daily",
    "label": "새 음식과 친해져요",
    "description": "억지로 먹기보다 색과 냄새부터 알아봐요."
  },
  "P02": {
    "icon": "daily",
    "label": "함께 정리하는 법을 배워요",
    "description": "다음에 찾기 쉽도록 장난감 자리를 정해요."
  },
  "P03": {
    "icon": "daily",
    "label": "잠잘 준비를 배워요",
    "description": "놀이를 마치고 잠옷과 읽을 책을 골라요."
  },
  "P04": {
    "icon": "friend",
    "label": "빌리는 법을 배워요",
    "description": "친구 물건을 쓰고 싶으면 먼저 물어봐요."
  },
  "P05": {
    "icon": "friend",
    "label": "차례 기다리는 법을 배워요",
    "description": "빨리 하고 싶을 때 안전하게 기다릴 방법을 찾아요."
  },
  "P06": {
    "icon": "friend",
    "label": "화해하는 법을 배워요",
    "description": "미안하다고 말하고, 고칠 수 있는 일을 찾아요."
  },
  "P07": {
    "icon": "friend",
    "label": "나누는 법을 배워요",
    "description": "내 마음도 말하며 함께 쓸 방법을 정해요."
  },
  "P08": {
    "icon": "heart",
    "label": "화난 마음을 말로 전해요",
    "description": "때리는 대신 무엇 때문에 화났는지 말해 봐요."
  },
  "P09": {
    "icon": "courage",
    "label": "무서울 때 용기를 내요",
    "description": "도움을 받아 작은 일부터 시작해 봐요."
  },
  "P10": {
    "icon": "promise",
    "label": "실수를 솔직하게 말해요",
    "description": "숨기고 싶을 때 사실을 말하고 함께 해결해요."
  },
  "P11": {
    "icon": "family",
    "label": "서운한 마음을 말해요",
    "description": "동생만 챙기는 것 같을 때 내 마음도 알려요."
  },
  "P12": {
    "icon": "safety",
    "label": "따라가기 전에 물어봐요",
    "description": "아는 사람이어도 먼저 보호자에게 확인해요."
  },
  "P13": {
    "icon": "safety",
    "label": "도움 청하는 법을 배워요",
    "description": "길을 잃으면 안전한 곳에서 직원에게 도움을 청해요."
  },
  "P14": {
    "icon": "nature",
    "label": "생명 돌보는 법을 배워요",
    "description": "작은 생명을 아끼고 돌봐준 사람에게 고마움을 전해요."
  },
  "T01": {
    "icon": "friend",
    "label": "다른 취향을 존중해요",
    "description": "좋아하는 음식이 달라도 놀리지 않아요."
  },
  "T02": {
    "icon": "daily",
    "label": "준비물 챙기는 법을 배워요",
    "description": "내일 필요한 물건을 적고 하나씩 확인해요."
  },
  "T03": {
    "icon": "promise",
    "label": "약속 지키는 법을 배워요",
    "description": "더 놀고 싶어도 마칠 시간을 미리 준비해요."
  },
  "T04": {
    "icon": "daily",
    "label": "물건 챙기는 법을 배워요",
    "description": "자꾸 잃어버리는 물건의 자리를 정해요."
  },
  "T05": {
    "icon": "friend",
    "label": "상처 주는 장난을 멈춰요",
    "description": "친구가 싫다고 하면 이유를 듣고 멈춰요."
  },
  "T06": {
    "icon": "friend",
    "label": "화해하는 법을 배워요",
    "description": "다퉜을 때 서로의 말을 듣고 다시 시작할 방법을 찾아요."
  },
  "T07": {
    "icon": "friend",
    "label": "사과하는 법을 배워요",
    "description": "미안하다는 말 다음에 잘못을 고칠 행동을 찾아요."
  },
  "T08": {
    "icon": "friend",
    "label": "함께 놀자고 말해요",
    "description": "혼자 있는 친구의 마음을 묻고 기다려 줘요."
  },
  "T09": {
    "icon": "courage",
    "label": "실수해도 다시 해 봐요",
    "description": "틀린 부분 하나를 살피고 다른 방법을 시도해요."
  },
  "T10": {
    "icon": "courage",
    "label": "떨릴 때 용기를 내요",
    "description": "혼자 어렵다면 도움을 받아 한 걸음 내디뎌요."
  },
  "T11": {
    "icon": "promise",
    "label": "잘못을 솔직하게 말해요",
    "description": "혼날까 봐 무서워도 믿을 만한 어른에게 말해요."
  },
  "T12": {
    "icon": "heart",
    "label": "갖고 싶은 마음을 다뤄요",
    "description": "친구 물건이 탐날 때 내게 필요한 것을 살펴봐요."
  },
  "T13": {
    "icon": "family",
    "label": "가족과 일을 나눠요",
    "description": "누군가 혼자 애쓰지 않도록 할 수 있는 일을 찾아요."
  },
  "T14": {
    "icon": "safety",
    "label": "위험한 놀이를 거절해요",
    "description": "친구가 하자고 해도 위험하면 멈추자고 말해요."
  },
  "F01": {
    "icon": "friend",
    "label": "공평하게 나누는 법을 배워요",
    "description": "똑같이 나누기 전에 서로 필요한 것을 들어 봐요."
  },
  "F02": {
    "icon": "friend",
    "label": "생각이 달라도 존중해요",
    "description": "친구와 선택이 달라도 내 생각을 편하게 말해요."
  },
  "F03": {
    "icon": "promise",
    "label": "소문을 먼저 확인해요",
    "description": "전해 들은 말을 보내기 전에 사실인지 살펴봐요."
  },
  "F04": {
    "icon": "heart",
    "label": "화난 마음을 잘 전해요",
    "description": "상처 주는 말 대신 무엇이 속상했는지 설명해요."
  },
  "F05": {
    "icon": "heart",
    "label": "부러운 마음을 알아봐요",
    "description": "친구와 비교될 때 내가 바라는 것을 찾아요."
  },
  "F06": {
    "icon": "courage",
    "label": "막힐 때 방법을 바꿔요",
    "description": "잘 안되면 도움을 구하고 다른 방법으로 도전해요."
  },
  "F07": {
    "icon": "friend",
    "label": "겉모습보다 마음을 봐요",
    "description": "겉모습으로 정하기 전에 그 친구를 알아가요."
  },
  "F08": {
    "icon": "promise",
    "label": "친구에게도 솔직히 말해요",
    "description": "친구를 아끼면서 잘못된 일은 바로잡을 방법을 찾아요."
  },
  "F09": {
    "icon": "promise",
    "label": "약속이 겹치면 이야기해요",
    "description": "늦기 전에 사정을 말하고 시간을 함께 조정해요."
  },
  "F10": {
    "icon": "family",
    "label": "가족과 공평하게 나눠요",
    "description": "늘 양보하기보다 내 물건과 쉴 시간도 이야기해요."
  },
  "F11": {
    "icon": "daily",
    "label": "필요한 물건을 골라요",
    "description": "새로 사기 전에 가진 물건과 필요한 것을 살펴봐요."
  },
  "F12": {
    "icon": "nature",
    "label": "동물 돕는 법을 배워요",
    "description": "바로 데려오기보다 어른과 필요한 도움을 알아봐요."
  }
}

export function themePresentation(topic: { theme_id: string; label: string; category: string; description?: string }) {
  // 낯선 신규 ID도 서버 문구로 표시한다. 생활 안내는 새 생성 요구사항으로 전송하지 않는다.
  return TOPIC_COPY[topic.theme_id] ?? { icon: "heart" as ThemeSymbol, label: topic.label, description: topic.description ?? topic.label }
}
