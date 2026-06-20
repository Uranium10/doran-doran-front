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

const STAGE_NAMES = ["씨앗", "새싹", "나무", "숲"] as const
const STEPS_PER_STAGE = 3
const MAX_LEVEL = STAGE_NAMES.length * STEPS_PER_STAGE // 12

/**
 * level(number) -> 단계 정보.
 * level 이 null 이거나 0 이하이면 "측정 전" 상태로 본다.
 */
export function getStageInfo(level: number | null): StageInfo | null {
  if (level == null || level <= 0) return null
  const clamped = Math.min(level, MAX_LEVEL)
  const stageIndex = Math.floor((clamped - 1) / STEPS_PER_STAGE)
  const step = ((clamped - 1) % STEPS_PER_STAGE) + 1
  const name = STAGE_NAMES[stageIndex] ?? STAGE_NAMES[STAGE_NAMES.length - 1]
  return {
    name,
    step,
    label: `${name} ${step}단계`,
    ratio: clamped / MAX_LEVEL,
  }
}

/** 측정이 필요한 상태인지 (상황 A) */
export function needsMeasurement(level: number | null): boolean {
  return level == null || level <= 0
}

/** 정답률(0~100) -> level(number). 측정 결과를 레벨로 환산한다. */
export function scoreToLevel(percent: number): number {
  // 0~100% 를 1~12 레벨로 매핑 (최소 1단계는 보장)
  const lvl = Math.round((percent / 100) * MAX_LEVEL)
  return Math.max(1, Math.min(MAX_LEVEL, lvl))
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

export function literacyMode(birthDate: string): LiteracyMode {
  return ageInMonths(birthDate) >= CHILD_MODE_MIN_MONTHS ? "child" : "toddler"
}
