/** 서버가 허용한 카드 안에서만 셔플한다. 새 카드를 먼저 채우되 풀이 작으면 일부 재사용한다. */
export function drawThemeCards<T extends { theme_id: string }>(pool: T[], previous: T[] = []): T[] {
  const shuffle = (items: T[]) => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  const ids = new Set(previous.map(t => t.theme_id))
  const unique = [...new Map(pool.map(t => [t.theme_id, t])).values()]
  return [...shuffle(unique.filter(t => !ids.has(t.theme_id))), ...shuffle(unique.filter(t => ids.has(t.theme_id)))].slice(0, 3)
}
