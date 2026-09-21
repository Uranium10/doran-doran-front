import type { ReadingPage } from './story-pagination'
import type { BookSpread } from './book-layout'

export type AudioLayout = { audio_url: string; duration: number; ends: number[]; expires_in: number }
export type AudioSegment = { chapter: number; start: number; end: number; offset: number; spread: number; label: string; url: string }

/** 장 내부 초를 전체 동화 시간으로 바꾼다. 텍스트 길이로 음성 시간을 추정하지 않는다. */
export function audioTimeline(pages: ReadingPage[], spreads: BookSpread[], layouts: AudioLayout[]): AudioSegment[] {
  let offset = 0
  return layouts.flatMap((layout, chapter) => {
    const chapterPages = pages.filter(p => p.sceneIndex === chapter)
    if (chapterPages.length !== layout.ends.length || !Number.isFinite(layout.duration) || layout.duration <= 0) throw new Error('음성 페이지 수가 맞지 않아요.')
    let start = 0
    const segments = chapterPages.map((page, index) => {
      const end = layout.ends[index]
      if (!Number.isFinite(end) || end <= start || end > layout.duration + .01) throw new Error('음성 시간표를 확인해 주세요.')
      const spread = spreads.findIndex(s => [s.left, s.right].some(leaf => leaf.kind === 'text' && leaf.page.sceneIndex === chapter && leaf.page.startOffset === page.startOffset))
      if (spread < 0) throw new Error('읽을 페이지를 찾지 못했어요.')
      const segment = { chapter, start, end, offset, spread, label: `${chapter + 1}장 · ${index + 1}쪽`, url: layout.audio_url }
      start = end
      return segment
    })
    if (Math.abs(start - layout.duration) > .1) throw new Error('마지막 음성이 빠져 있어요.')
    offset += layout.duration
    return segments
  })
}

export function segmentAt(segments: AudioSegment[], seconds: number): number {
  const index = segments.findIndex(s => seconds < s.offset + s.end)
  return index < 0 ? Math.max(0, segments.length - 1) : index
}

export function narrationKey(pages: ReadingPage[]): string {
  return pages.map(p => `${p.sceneIndex}:${p.startOffset}:${p.endOffset}`).join('|')
}
