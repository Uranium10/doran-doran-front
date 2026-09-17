import type { ReadingPage } from "./story-pagination"

export type BookLeaf = { kind: "outside" | "blank" | "cover" | "back" | "ending" }
  | { kind: "image" | "text"; page: ReadingPage }
export type BookSpread = { left: BookLeaf; right: BookLeaf }
const blank: BookLeaf = { kind: "blank" }

/** 서버 장면 → 실제 종이 배치. 삽화는 장면 시작에 한 번, 이어지는 종이는 본문만 담는다. */
export function buildBookSpreads(pages: ReadingPage[], singlePage: boolean): BookSpread[] {
  const spreads: BookSpread[] = [{ left: { kind: "outside" }, right: { kind: "cover" } }]
  // 삽화가 없는 책은 장면마다 펼침을 끊지 않아 짧은 본문도 양쪽으로 이어진다.
  if (!singlePage && !pages.some(page => page.image)) {
    for (let i = 0; i < pages.length; i += 2) spreads.push({ left: { kind: "text", page: pages[i] }, right: pages[i + 1] ? { kind: "text", page: pages[i + 1] } : blank })
    spreads.push({ left: { kind: "back" }, right: { kind: "ending" } })
    return spreads
  }
  const scenes = [...new Set(pages.map(page => page.sceneIndex))]
  for (const scene of scenes) {
    const parts = pages.filter(page => page.sceneIndex === scene)
    const leaves: BookLeaf[] = []
    if (parts[0].image) leaves.push({ kind: "image", page: parts[0] })
    leaves.push(...parts.map(page => ({ kind: "text" as const, page })))
    if (singlePage) {
      for (const leaf of leaves) spreads.push({ left: blank, right: leaf })
    } else {
      // 새 장면은 새 펼침에서 시작한다. 마지막 홀수 쪽은 빈 종이로 남겨 다른 장면과 섞지 않는다.
      for (let i = 0; i < leaves.length; i += 2) spreads.push({ left: leaves[i], right: leaves[i + 1] ?? blank })
    }
  }
  spreads.push({ left: { kind: "back" }, right: { kind: "ending" } })
  return spreads
}

/** 글자 크기·화면 회전 뒤에도 읽던 본문 위치 또는 앞/뒤표지를 유지한다. */
export function findBookPosition(spreads: BookSpread[], old?: BookSpread): number {
  if (!old || old.right.kind === "cover") return 0
  if (old.right.kind === "ending") return spreads.length - 1
  const anchor = [old.left, old.right].find(leaf => leaf.kind === "text")
    ?? [old.left, old.right].find(leaf => leaf.kind === "image")
  if (!anchor || !("page" in anchor)) return 0
  const wanted = anchor.page
  const index = spreads.findIndex(spread => [spread.left, spread.right].some(leaf => {
    if (!("page" in leaf) || leaf.page.sceneIndex !== wanted.sceneIndex) return false
    if (anchor.kind === "image") return leaf.kind === "image"
    return leaf.kind === "text" && leaf.page.startOffset <= wanted.startOffset
      && (leaf.page.endOffset > wanted.startOffset || !leaf.page.text)
  }))
  return Math.max(0, index)
}

/** 표지 바깥은 빈 종이와 다르다. 넘김 중에도 투명한 바깥 공간이라는 정보를 보존한다. */
export function restingBookSpread(from: BookSpread, to: BookSpread, forward: boolean): BookSpread {
  return { left: forward ? from.left : to.left, right: forward ? to.right : from.right }
}

/** 리모컨 번호는 본문 펼침 기준이다. 소수는 버리고 범위를 벗어난 숫자는 양 끝으로 제한한다. */
export function resolveBookPage(input: string, count: number): number | null {
  if (count < 1 || !/^[+-]?\d+(?:\.\d+)?$/.test(input.trim())) return null
  return Math.max(1, Math.min(count, Math.trunc(Number(input))))
}

export type BookBookmark = { kind: "cover" | "ending" } | { kind: "text" | "image"; sceneIndex: number; offset: number }
export function bookBookmark(spread: BookSpread): BookBookmark {
  if (spread.right.kind === "cover" || spread.right.kind === "ending") return { kind: spread.right.kind }
  const leaf = [spread.left, spread.right].find(leaf => leaf.kind === "text") ?? [spread.left, spread.right].find(leaf => leaf.kind === "image")
  return leaf && "page" in leaf ? { kind: leaf.kind, sceneIndex: leaf.page.sceneIndex, offset: leaf.page.startOffset } : { kind: "cover" }
}
export function bookmarkPosition(spreads: BookSpread[], bookmark: BookBookmark): number {
  if (bookmark.kind === "cover") return 0
  if (bookmark.kind === "ending") return spreads.length - 1
  if (!("sceneIndex" in bookmark)) return 0
  const index = spreads.findIndex(spread => [spread.left, spread.right].some(leaf => "page" in leaf && leaf.page.sceneIndex === bookmark.sceneIndex &&
    (bookmark.kind === "image" ? leaf.kind === "image" : leaf.kind === "text" && leaf.page.startOffset <= bookmark.offset && (leaf.page.endOffset > bookmark.offset || !leaf.page.text))))
  return Math.max(0,index)
}
export function validBookmark(value: unknown): value is BookBookmark {
  if (!value || typeof value !== "object" || !("kind" in value)) return false
  return value.kind === "cover" || value.kind === "ending" || ((value.kind === "text" || value.kind === "image") && "sceneIndex" in value && Number.isInteger(value.sceneIndex) && Number(value.sceneIndex) >= 0 && "offset" in value && Number.isInteger(value.offset) && Number(value.offset) >= 0)
}
