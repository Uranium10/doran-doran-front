/** 저장된 표지색의 표시 규칙. 기존 갈색은 원래의 그라데이션을 정확히 유지한다. */
export const DEFAULT_COVER_COLOR = "#B97A55"
export function normalizeCoverColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : DEFAULT_COVER_COLOR
}
export function bookCoverStyle(value: unknown): Record<string, string> {
  const color = normalizeCoverColor(value)
  if (color === DEFAULT_COVER_COLOR) return {}
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
  const shade = (factor: number) => `#${rgb.map(v => Math.round(v * factor).toString(16).padStart(2, "0")).join("")}`
  // 밝은 표지는 짙은 글씨, 어두운 표지는 밝은 글씨로 제목의 대비를 확보한다.
  const linear = rgb.map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 })
  const light = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .4
  return {
    "--cover-background": `linear-gradient(100deg,${shade(.76)},${shade(.94)} 8%,${color} 95%,${shade(.76)})`,
    "--back-cover-background": `linear-gradient(90deg,${shade(.87)},${color} 90%,${shade(.76)})`,
    "--cover-border": shade(.83),
    "--cover-ink": light ? "#30271F" : "#FFF2D3",
    "--cover-outline": light ? "#30271F55" : "#FFF2D366",
  }
}
