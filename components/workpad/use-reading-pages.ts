"use client"

import { useLayoutEffect, useRef, useState } from "react"
import type { StoryPage } from "@/lib/workpad-data"
import { findReadingPosition, paginateStory } from "@/lib/story-pagination"

export function useReadingPages(scenes: StoryPage[]) {
  const bookRef = useRef<HTMLDivElement>(null)
  const imageTextRef = useRef<HTMLParagraphElement>(null)
  const plainTextRef = useRef<HTMLParagraphElement>(null)
  const [layout, setLayout] = useState({ width: 0, height: 0, fonts: 0 })
  const [reading, setReading] = useState(() => ({
    source: scenes, pages: paginateStory(scenes, (text) => text.length <= 180), index: 0,
  }))

  useLayoutEffect(() => {
    let active = true
    const measure = () => {
      if (!active || !bookRef.current) return
      const width = Math.floor(bookRef.current.getBoundingClientRect().width)
      const height = window.innerHeight
      setLayout((old) => old.width === width && old.height === height ? old : { ...old, width, height })
    }
    const fontsChanged = () => {
      if (active) setLayout((old) => ({ ...old, fonts: old.fonts + 1 }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (bookRef.current) observer.observe(bookRef.current)
    window.addEventListener("resize", measure)
    document.fonts?.ready.then(fontsChanged)
    document.fonts?.addEventListener("loadingdone", fontsChanged)
    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener("resize", measure)
      document.fonts?.removeEventListener("loadingdone", fontsChanged)
    }
  }, [])

  useLayoutEffect(() => {
    // 실제 본문과 같은 폭·폰트의 보이지 않는 문단으로 줄바꿈 높이를 측정한다.
    // 글자 수를 고정해 자르는 방식과 달리 모바일/큰 글꼴에서도 같은 기준을 적용한다.
    const pages = paginateStory(scenes, (text, scene) => {
      const target = scene.image ? imageTextRef.current : plainTextRef.current
      if (!layout.width || !target) return text.length <= 180
      target.textContent = text.trim()
      const imageHeight = Math.min((layout.width - 8) * 10 / 16, layout.height * .32)
      const available = scene.image ? layout.height - imageHeight - 320 : layout.height - 330
      const heightLimit = Math.max(120, Math.min(scene.image ? 300 : 420, available))
      const measured = target.getBoundingClientRect().height
      return measured > 0 ? measured <= heightLimit : text.length <= 180
    })
    setReading((old) => ({ source: scenes, pages,
      index: old.source === scenes ? findReadingPosition(pages, old.pages[old.index]) : 0 }))
  }, [scenes, layout])

  const setPage = (next: number | ((index: number) => number)) => setReading((old) => ({
    ...old, index: Math.max(0, Math.min(old.pages.length - 1, typeof next === "function" ? next(old.index) : next)),
  }))
  return { bookRef, imageTextRef, plainTextRef, layout, pages: reading.pages, page: reading.index, setPage }
}
