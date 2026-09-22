import type { ReadingPage } from "./story-pagination"

export type BookLeaf = { kind: "outside" | "blank" | "cover" | "back" | "ending" }
  | { kind: "image" | "text"; page: ReadingPage }
  | { kind: "picturebook"; pages: ReadingPage[]; number: number }
export type BookSpread = { left: BookLeaf; right: BookLeaf }
const blank: BookLeaf = { kind: "blank" }

/** 서버 장면 → 실제 종이 배치. 삽화는 장면 시작에 한 번, 이어지는 종이는 본문만 담는다. */
export type PicturebookLayout = { enabled: boolean; width: number; height: number; fontSize: number }

/** 1~2단계는 생성 지침 자체가 소리/리듬 중심이다. 현재 계정 단계로 과거 책을 바꾸지 않는다.
 * 오래된 단계 미상 책과 예상 밖 긴 문장은 기존 뷰어로 보존한다. 형태소/모델 호출은 없다. */
export function isSoundPicturebook(level: number | null | undefined, scenes: {text: string}[]): boolean {
  return level != null && Number.isFinite(level) && level >= 1 && level < 3 && scenes.length > 0
    && scenes.every(s => s.text.trim().length > 0 && Array.from(s.text).length <= 140 && s.text.split(/\r?\n/).length <= 8)
}

/** 한 쪽에 최대 두 장면. 원문·삽화·장면 offset은 합치거나 새로 저장하지 않는다.
 * 반복 DOM 측정 대신 종이 크기와 보수적인 글줄 추정으로 묶고 실제 넘침은 스크롤로 보존한다. */
function soundLeaves(pages: ReadingPage[], layout: PicturebookLayout): BookLeaf[] {
  const leaves: BookLeaf[] = []
  const font = layout.fontSize + 4
  const height = Math.max(120, layout.height - 72)
  const cost = (p: ReadingPage) => {
    const width = Math.max(40, (layout.width - 56) * (p.image ? .51 : 1))
    const columns = Math.max(1, Math.floor(width / font))
    const lines = p.text.split(/\r?\n/).reduce((n,line) => n + Math.max(1,Math.ceil(Array.from(line).length / columns)),0)
    return Math.max(p.image ? 124 : 0, lines * font * 1.65 + 28)
  }
  let group: ReadingPage[] = []
  let used = 0
  const flush = () => { if(group.length) leaves.push({kind:"picturebook",pages:group,number:leaves.length+1});group=[];used=0 }
  for(const page of pages) {
    const next=cost(page)
    if(group.length && (group.length===2 || used+next+28 > height)) flush()
    group.push(page);used+=next
  }
  flush()
  return leaves
}

/** 본문 위치를 가진 종이를 공통 처리한다. 여러 장을 묶어도 음성/책갈피의 원문 위치를 잃지 않는다. */
export function leafReadingPages(leaf: BookLeaf): ReadingPage[] {
  return leaf.kind === "picturebook" ? leaf.pages : leaf.kind === "text" ? [leaf.page] : []
}

export function buildBookSpreads(pages: ReadingPage[], singlePage: boolean, picturebook?: PicturebookLayout): BookSpread[] {
  const spreads: BookSpread[] = [{ left: { kind: "outside" }, right: { kind: "cover" } }]
  // 장 경계에서 빈 종이를 넣지 않는다. 삽화와 본문을 순서대로 이어 붙인 뒤
  // 마지막에만 양면으로 묶어 새 장이 오른쪽에서 시작하는 경우도 자연스럽게 이어진다.
  const leaves: BookLeaf[] = picturebook?.enabled ? soundLeaves(pages, picturebook) : []
  const scenes = [...new Set(pages.map(page => page.sceneIndex))]
  for (const scene of picturebook?.enabled ? [] : scenes) {
    const parts = pages.filter(page => page.sceneIndex === scene)
    if (parts[0].image) leaves.push({ kind: "image", page: parts[0] })
    leaves.push(...parts.map(page => ({ kind: "text" as const, page })))
  }
  if (singlePage) {
    for (const leaf of leaves) spreads.push({ left: blank, right: leaf })
  } else {
    for (let i = 0; i < leaves.length; i += 2) spreads.push({ left: leaves[i], right: leaves[i + 1] ?? blank })
  }
  spreads.push({ left: { kind: "back" }, right: { kind: "ending" } })
  return spreads
}

/** 글자 크기·화면 회전 뒤에도 읽던 본문 위치 또는 앞/뒤표지를 유지한다. */
export function findBookPosition(spreads: BookSpread[], old?: BookSpread): number {
  if (!old || old.right.kind === "cover") return 0
  if (old.right.kind === "ending") return spreads.length - 1
  return bookmarkPosition(spreads, bookBookmark(old))
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
  const page = [spread.left,spread.right].flatMap(leafReadingPages)[0]
  if(page) return {kind:"text",sceneIndex:page.sceneIndex,offset:page.startOffset}
  const image=[spread.left,spread.right].find(leaf=>leaf.kind==="image")
  return image?.kind==="image" ? {kind:"image",sceneIndex:image.page.sceneIndex,offset:image.page.startOffset} : {kind:"cover"}
}
export function bookmarkPosition(spreads: BookSpread[], bookmark: BookBookmark): number {
  if (bookmark.kind === "cover") return 0
  if (bookmark.kind === "ending") return spreads.length - 1
  if (!("sceneIndex" in bookmark)) return 0
  const index = spreads.findIndex(spread => [spread.left,spread.right].some(leaf => {
    if(bookmark.kind === "image" && leaf.kind === "image") return leaf.page.sceneIndex === bookmark.sceneIndex
    // 이전 삽화 전용 책갈피도 새 그림+본문 묶음의 같은 장면으로 복구한다.
    if(bookmark.kind === "image" && leaf.kind !== "picturebook") return false
    return leafReadingPages(leaf).some(p=>p.sceneIndex===bookmark.sceneIndex &&
      (bookmark.kind==="image" || p.startOffset<=bookmark.offset && (p.endOffset>bookmark.offset || !p.text)))
  }))
  return Math.max(0,index)
}
export function validBookmark(value: unknown): value is BookBookmark {
  if (!value || typeof value !== "object" || !("kind" in value)) return false
  return value.kind === "cover" || value.kind === "ending" || ((value.kind === "text" || value.kind === "image") && "sceneIndex" in value && Number.isInteger(value.sceneIndex) && Number(value.sceneIndex) >= 0 && "offset" in value && Number.isInteger(value.offset) && Number(value.offset) >= 0)
}
