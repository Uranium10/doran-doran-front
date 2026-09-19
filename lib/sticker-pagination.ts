export const STICKERS_PER_PAGE = 4;
export const stickerLastPage = (total: number) =>
  Math.max(0, Math.ceil(total / STICKERS_PER_PAGE) - 1);
/** 처음/끝과 현재 쪽 주변만 표시한다. 수백 장이어도 번호가 화면 밖으로 밀려나지 않는다. */
export function stickerPages(page: number, total: number): (number | null)[] {
  const last = stickerLastPage(total);
  const current = Math.max(0, Math.min(page, last));
  const keep =
    last < 6
      ? Array.from({ length: last + 1 }, (_, i) => i)
      : [
          ...new Set(
            [0, last, current - 1, current, current + 1].filter(
              (p) => p >= 0 && p <= last,
            ),
          ),
        ].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  keep.forEach((p, i) => {
    if (i && p - keep[i - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
}
