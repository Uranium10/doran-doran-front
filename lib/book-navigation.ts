/** URL에 출발점을 보존해 새로고침·독서·복습 후에도 같은 위계로 돌아간다. 외부 주소는 허용하지 않는다. */
export type BookOrigin = "dashboard" | "library" | "stickers" | "parent" | "parent-library" | "parent-stickers"
export function bookOrigin(from?: string): BookOrigin {
  return from === "library" || from === "stickers" || from === "parent" || from === "parent-library" || from === "parent-stickers" ? from : "dashboard"
}
export const returnPath = (from?: string) => ({
  dashboard: "/dashboard", library: "/library", stickers: "/stickers",
  parent: "/parent", "parent-library": "/library?from=parent", "parent-stickers": "/stickers?from=parent",
})[bookOrigin(from)]
export const returnLabel = (from?: string) => ({
  dashboard: "내 책장으로 돌아가기", library: "전체 책장으로 돌아가기", stickers: "스티커북으로 돌아가기",
  parent: "부모님 책방으로 돌아가기", "parent-library": "자녀 책장으로 돌아가기", "parent-stickers": "자녀 스티커북으로 돌아가기",
})[bookOrigin(from)]
export const bookPath = (id: string, from: BookOrigin) => `/books/${encodeURIComponent(id)}?from=${bookOrigin(from)}`

export const isParentOrigin = (from?: string) => ["parent", "parent-library", "parent-stickers"].includes(bookOrigin(from))
