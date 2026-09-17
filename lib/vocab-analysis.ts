/** 저장 JSON과 분석 조회 API가 공유하는 공개 필드. 비율/적중률은 화면에 사용하지 않는다. */
export type VocabAnalysis = {
  총_내용형태소_수: number
  상위등급_어휘_목록: string[]
  상위등급_어휘_개수: number
  표현_어휘_목록: string[]
  표현_어휘_개수: number
}

export function vocabAnalysis(value: unknown): VocabAnalysis | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
  if (!count(raw.총_내용형태소_수)) return null
  for (const [list, number] of [["상위등급_어휘_목록", "상위등급_어휘_개수"], ["표현_어휘_목록", "표현_어휘_개수"]]) {
    const words = raw[list]
    if (!Array.isArray(words) || !count(raw[number]) || words.some(w => typeof w !== "string" || !w.trim())
      || new Set(words).size !== words.length || raw[number] !== words.length) return null
  }
  return {
    총_내용형태소_수: raw.총_내용형태소_수,
    상위등급_어휘_목록: raw.상위등급_어휘_목록 as string[], 상위등급_어휘_개수: raw.상위등급_어휘_개수 as number,
    표현_어휘_목록: raw.표현_어휘_목록 as string[], 표현_어휘_개수: raw.표현_어휘_개수 as number,
  }
}
