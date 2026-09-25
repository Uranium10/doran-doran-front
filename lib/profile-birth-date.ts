// 서버와 동일하게 한국 날짜를 사용한다. UTC 자정 전후에도 허용 범위를 맞춘다.
export function koreaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function birthDateError(value: string, today = koreaToday()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return '올바른 생년월일을 입력해 주세요.'
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return '올바른 생년월일을 입력해 주세요.'
  return value > today ? '생년월일은 오늘 또는 이전 날짜로 입력해 주세요.' : null
}
