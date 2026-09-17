"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { StoryPage } from "@/lib/workpad-data"
import { findReadingPosition, paginateStory } from "@/lib/story-pagination"

/** 실제 오른쪽 페이지의 남은 공간을 측정한다. 원문·장면별 이미지 URL은 바꾸지 않는다. */
export function useReadingPages(scenes: StoryPage[], fontSize: number) {
  const textAreaRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLParagraphElement>(null)
  const initialPages = useMemo(() => paginateStory(scenes, text => text.length <= 180), [scenes])
  const [reading, setReading] = useState(() => ({
    source: scenes, pages: initialPages, index: 0,
  }))

  useLayoutEffect(() => {
    let active = true
    let frame = 0
    const measure = () => {
      const area = textAreaRef.current
      const paragraph = measureRef.current
      if (!active || !area || !paragraph) return
      // 숨은 문단에도 본문과 같은 폰트/CSS를 적용한다. 글꼴 로딩·확대·회전 후 다시 나눈다.
      paragraph.style.width = `${area.clientWidth}px`
      const limit = Math.max(40, area.clientHeight - 2)
      const pages = paginateStory(scenes, text => {
        paragraph.textContent = text.trim()
        return paragraph.getBoundingClientRect().height <= limit
      })
      setReading(old => ({ source: scenes, pages,
        index: old.source === scenes ? findReadingPosition(pages, old.pages[old.index]) : 0 }))
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    measure()
    const observer = new ResizeObserver(schedule)
    if (textAreaRef.current) observer.observe(textAreaRef.current)
    document.fonts?.ready.then(schedule)
    document.fonts?.addEventListener("loadingdone", schedule)
    window.addEventListener("resize", schedule)
    return () => {
      active = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.fonts?.removeEventListener("loadingdone", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [scenes, fontSize])

  const setPage = (next: number) => setReading(old => ({
    ...old, index: Math.max(0, Math.min(old.pages.length - 1, next)),
  }))
  // 빈 목록으로 마운트된 뒤 동화가 도착해도 우선 종이를 렌더해야 실제 높이를 잴 수 있다.
  const visible = reading.source === scenes ? reading : { pages: initialPages, index: 0 }
  return { textAreaRef, measureRef, pages: visible.pages, page: visible.index, setPage }
}
