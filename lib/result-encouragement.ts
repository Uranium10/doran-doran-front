/** 정답률로 문구만 고른다. 점수·레벨·보상 판정에는 사용하지 않는다. */
export function resultEncouragement(correct: number, total: number): string | null {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return null
  const ratio = Math.max(0, correct) / total
  if (ratio >= 1) return "전부 맞았어요!"
  if (ratio >= .7) return "훌륭해요!"
  if (ratio >= .4) return "더 잘할 수 있어요!"
  return "괜찮아요, 함께 배워 가요!"
}
