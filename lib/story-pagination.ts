/** 서버의 장면과 화면에 표시하는 쪽을 구분한다. 저장 데이터와 삽화 URL은 변경하지 않는다. */
import type { StoryPage } from "@/lib/workpad-data"

export type ReadingPage = StoryPage & {
  sceneIndex: number
  startOffset: number
  endOffset: number
  part: number
  partCount: number
  readingNumber?: number
}

/** 화면에 들어가는 가장 긴 접두사를 찾고 문장/어절 경계에서 나눈다.
 * 원문의 공백과 개행까지 유지하므로 결과를 합치면 원문과 정확히 같아야 한다.
 * 아주 긴 한 문장/한 단어도 유니코드 글자 단위로 전진하여 무한 반복을 막는다.
 */
export function splitReadingText(text: string, fits: (text: string) => boolean): string[] {
  if (!text) return [text]
  const graphemes = Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text))
  const offsets = [...graphemes.map((item) => item.index), text.length]
  const output: string[] = []
  let start = 0
  while (start < graphemes.length) {
    let low = start + 1
    let high = graphemes.length
    let end = start + 1
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (fits(text.slice(offsets[start], offsets[mid]))) {
        end = mid
        low = mid + 1
      } else high = mid - 1
    }
    if (end < graphemes.length) {
      const prefix = text.slice(offsets[start], offsets[end])
      // 문장이 있으면 쪽이 조금 짧아져도 문장 끝을 우선한다. 긴 문장만 어절로 나눈다.
      const sentenceEnds = [...prefix.matchAll(/(?:[.!?。！？]["'”’」』)]*\s+|\n+)/gu)]
      const wordEnds = [...prefix.matchAll(/\s+/gu)]
      const choose = (matches: RegExpMatchArray[], minimum: number) => matches.map((m) => (m.index ?? 0) + m[0].length)
        .filter((n) => n >= minimum).pop()
      const boundary = choose(sentenceEnds, prefix.length / 3) ?? choose(wordEnds, prefix.length / 2)
      if (boundary) {
        const preferred = offsets[start] + boundary
        while (end > start + 1 && offsets[end] > preferred) end--
      }
    }
    output.push(text.slice(offsets[start], offsets[end]))
    start = end
  }
  return output
}

/** 음성 시간표가 있는 책은 이미 분석한 경계만 묶는다. 화면 회전에도 추가 분석하지 않는다. */
export function splitIndexedText(scene: StoryPage, fits: (text: string) => boolean): string[] | null {
  const cues = scene.audio_cues
  if (scene.audio_index_status !== "ready" || !cues?.length || cues.length > 200) return null
  let previous = 0, seconds = 0
  for (const cue of cues) {
    const end = cue.end_offset
    const left = scene.text.charCodeAt(end - 1), right = scene.text.charCodeAt(end)
    if (!Number.isInteger(end) || end <= previous || end > scene.text.length
      || (left >= 0xD800 && left <= 0xDBFF && right >= 0xDC00 && right <= 0xDFFF)
      || !scene.text.slice(previous, end).trim()
      || !Number.isFinite(cue.end_seconds) || cue.end_seconds <= seconds) return null
    previous = end; seconds = cue.end_seconds
  }
  if (previous !== scene.text.length || !scene.audio_duration || Math.abs(seconds - scene.audio_duration) > .1) return null
  const parts: string[] = []
  let start = 0, end = 0
  for (const cue of cues) {
    if (end > start && !fits(scene.text.slice(start, cue.end_offset))) {
      parts.push(scene.text.slice(start, end)); start = end
    }
    // 구간 하나가 매우 길어도 임의 시각으로 쪼개지 않는다. 본문 원문을 보존한다.
    end = cue.end_offset
  }
  if (end > start) parts.push(scene.text.slice(start, end))
  return parts
}

export function paginateStory(
  scenes: StoryPage[],
  fits: (text: string, scene: StoryPage) => boolean,
): ReadingPage[] {
  return scenes.flatMap((scene, sceneIndex) => {
    const parts = splitIndexedText(scene, text => fits(text, scene)) ?? splitReadingText(scene.text, text => fits(text, scene))
    let offset = 0
    return parts.map((text, part) => {
      const startOffset = offset
      offset += text.length
      // 이어지는 쪽도 같은 장면의 이미지/상태를 사용한다. 추가 이미지 생성은 없다.
      return { ...scene, text, sceneIndex, startOffset, endOffset: offset, part: part + 1, partCount: parts.length }
    })
  }).map((page, index) => ({ ...page, readingNumber: index + 1 }))
}

/** 화면 회전/너비 변경 시 현재 읽던 원문 위치를 포함하는 쪽으로 이동한다. */
export function findReadingPosition(pages: ReadingPage[], anchor?: ReadingPage): number {
  if (!anchor) return 0
  const index = pages.findIndex((p) => p.sceneIndex === anchor.sceneIndex && p.startOffset <= anchor.startOffset
    && (p.endOffset > anchor.startOffset || p.text.length === 0))
  return Math.max(0, index)
}
