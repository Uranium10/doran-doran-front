// 레벨 / 나이 관련 더미 로직 모음.
// 백엔드 없이 프로필의 birth_date 와 level(number | null) 만으로 화면 분기를 처리한다.

export type StageInfo = {
  /** 단계 이름 (씨앗 / 새싹 / 나무 / 숲) */
  name: string
  /** 단계 안에서의 세부 단계 (1~3) */
  step: number
  /** "새싹 2단계" 처럼 화면에 바로 쓰는 라벨 */
  label: string
  /** 진행 정도를 0~1 로 나타낸 값 (게이지 등에 사용) */
  ratio: number
}

// 백엔드 LEVEL_LABELS와 1:1 일치: 씨앗6·새싹5·나무5·숲4 = 20단계
const STAGE_TABLE = [
  { name: "씨앗", steps: 6 },
  { name: "새싹", steps: 5 },
  { name: "나무", steps: 5 },
  { name: "숲",   steps: 4 },
] as const
const MAX_LEVEL = 20 // 6 + 5 + 5 + 4

/**
 * level(number) -> 단계 정보.
 * level 이 null 이거나 0 이하이면 "측정 전" 상태로 본다.
 * 서버가 17.5 같은 소수 레벨을 줄 수 있으므로 내림(floor) 처리한다.
 */
export function getStageInfo(level: number | null): StageInfo | null {
  if (level == null || level <= 0) return null
  const lv = Math.min(Math.floor(level), MAX_LEVEL)

  let remaining = lv
  for (const stage of STAGE_TABLE) {
    if (remaining <= stage.steps) {
      return {
        name: stage.name,
        step: remaining,
        label: `${stage.name} ${remaining}단계`,
        ratio: lv / MAX_LEVEL,
      }
    }
    remaining -= stage.steps
  }

  // 안전망 (이론상 도달 안 함)
  const last = STAGE_TABLE[STAGE_TABLE.length - 1]
  return { name: last.name, step: last.steps, label: `${last.name} ${last.steps}단계`, ratio: 1 }
}

/** 측정이 필요한 상태인지 (상황 A) */
export function needsMeasurement(level: number | null): boolean {
  return level == null || level <= 0
}

/** 헤더 등에서 쓰는 "현재 단계 → 다음 단계" 진척도 정보 */
export type TierProgress = {
  /** 현재 도달 단계 라벨 (예: "새싹 2단계") */
  currentLabel: string
  /** 다음 목표 단계 라벨 (예: "새싹 3단계"). 최고 단계면 null */
  nextLabel: string | null
  /** 현재 단계 → 다음 단계 사이의 달성도 (0~100) */
  achievement: number
}

/**
 * level(number) -> 현재 단계에서 다음 단계까지의 진척도.
 * 서버가 17.5 같은 소수 레벨을 주면 소수부가 곧 다음 단계로의 달성도가 된다.
 * 측정 전(level=null/0 이하)이면 null.
 */
export function getTierProgress(level: number | null): TierProgress | null {
  if (level == null || level <= 0) return null
  const clamped = Math.min(level, MAX_LEVEL)
  const lowerLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(clamped)))
  const within = clamped - Math.floor(clamped) // 0~1 소수부
  const isMax = lowerLevel >= MAX_LEVEL
  return {
    currentLabel: getStageInfo(lowerLevel)?.label ?? "씨앗 1단계",
    nextLabel: isMax ? null : getStageInfo(lowerLevel + 1)?.label ?? null,
    achievement: isMax ? 100 : Math.round(within * 1000) / 10,
  }
}

/** 정답률(0~100) -> level(number). 측정 결과를 레벨로 환산한다. */
export function scoreToLevel(percent: number): number {
  // 0~100% 를 1~12 레벨로 매핑 (최소 1단계는 보장)
  const lvl = Math.round((percent / 100) * MAX_LEVEL)
  return Math.max(1, Math.min(MAX_LEVEL, lvl))
}

/** level(1~12) -> 대략적인 정답률(0~100). 이전 측정 추정 등에 사용. */
export function levelToPercent(level: number | null): number {
  if (level == null || level <= 0) return 0
  return Math.round((Math.min(level, MAX_LEVEL) / MAX_LEVEL) * 100)
}

// ---------------------------------------------------------------------------
// 측정 결과 / 진척도
// ---------------------------------------------------------------------------

/** 측정 종류: 최초 / 동화를 읽은 뒤 / 재시험 */
export type LiteracyTestKind = "initial" | "post-story" | "retest"

/** 진행 막대에 필요한 진척도 정보 */
export type LiteracyProgress = {
  /** 환산된 레벨 (1~12) */
  level: number
  /** 막대 왼쪽 라벨 (현재 도달 단계) */
  lowerLabel: string
  /** 막대 오른쪽 라벨 (다음 목표 단계) */
  upperLabel: string
  /** 두 단계 사이에서의 달성도 (0~100) */
  achievement: number
}

/**
 * 측정 결과 페이로드.
 * 추후 서버가 내려줄 "결과지" 형태를 가정해 설계했다.
 * 현재는 더미 계산으로 채우지만, 서버 연동 시 이 객체를 그대로 받아오면 된다.
 */
export type LiteracyResult = LiteracyProgress & {
  kind: LiteracyTestKind
  /** 맞춘 문항 수 */
  correct: number
  /** 전체 문항 수 */
  total: number
  /** 직전 측정 대비 레벨 변화량(레벨 단위, 예: +0.35). 최초 측정이면 null */
  delta: number | null
}

/** 정답률(0~100) -> 진척도 정보 (현재 단계 ~ 다음 단계 사이 위치) */
export function getLiteracyProgress(percent: number): LiteracyProgress {
  const clamped = Math.max(0, Math.min(100, percent))
  const cont = (clamped / 100) * MAX_LEVEL // 0~12 연속값
  const floorLevel = Math.floor(cont)
  const lowerStep = Math.max(1, Math.min(MAX_LEVEL - 1, floorLevel))
  const upperStep = Math.min(MAX_LEVEL, lowerStep + 1)
  const within = Math.max(0, Math.min(1, cont - lowerStep))
  return {
    level: scoreToLevel(clamped),
    lowerLabel: getStageInfo(lowerStep)?.label ?? "씨앗 1단계",
    upperLabel: getStageInfo(upperStep)?.label ?? "씨앗 2단계",
    achievement: Math.round(within * 1000) / 10, // 소수 1자리
  }
}

/**
 * 더미 결과지 생성기.
 * correct/total 과 직전 정답률(prevPercent)로 결과 페이로드를 만든다.
 * 서버 연동 시에는 이 함수 대신 응답 JSON 을 그대로 사용하면 된다.
 */
export function buildLiteracyResult(
  kind: LiteracyTestKind,
  correct: number,
  total: number,
  prevPercent: number | null = null,
): LiteracyResult {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0
  const progress = getLiteracyProgress(percent)
  // delta 는 레벨 단위 변화량. 최초 측정이면 null.
  const delta =
    kind === "initial" || prevPercent == null
      ? null
      : Math.round((progress.level - scoreToLevel(prevPercent)) * 100) / 100
  return { ...progress, kind, correct, total, delta }
}

/** 생년월일(YYYY-MM-DD) -> 개월 수 */
export function ageInMonths(birthDate: string, now: Date = new Date()): number {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return 0
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  return Math.max(0, months)
}

/** 생년월일 -> "만 N세" 표기 */
export function ageLabel(birthDate: string): string {
  const months = ageInMonths(birthDate)
  return `만 ${Math.floor(months / 12)}세`
}

// 만 6세(72개월) 미만은 부모가 작성하는 영유아 모드,
// 만 6세(초등 1학년) 이상은 아이가 직접 푸는 아동 모드로 분기한다.
export const CHILD_MODE_MIN_MONTHS = 72

export type LiteracyMode = "toddler" | "child"

/**
 * 측정 모드 분기.
 * 레벨 9 미만(측정 전 level=null 포함)은 부모가 작성하는 영유아 체크리스트(toddler),
 * 레벨 9 이상이면 아이가 직접 푸는 아동 퀴즈(child).
 */
export function literacyMode(level: number | null): LiteracyMode {
  return level == null || level < 9 ? "toddler" : "child"
}
