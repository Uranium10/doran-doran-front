"use client"

import { useEffect, useState } from "react"
import { bookImageUrls, preloadBookImages, type BookImages } from "@/lib/book-image-preload"

/** 동화가 바뀌면 이전 준비 결과를 숨기고, 떠난 화면의 늦은 응답은 반영하지 않는다. */
export function useBookImages(pages: { image?: string | null }[], cover?: string | null) {
  const key = JSON.stringify(bookImageUrls(pages, cover))
  const total = JSON.parse(key).length as number
  const [state, setState] = useState<{ key: string; completed: number; result: BookImages | null }>({ key, completed: 0, result: null })
  useEffect(() => {
    const controller = new AbortController()
    const urls: string[] = JSON.parse(key)
    setState({ key, completed: 0, result: null })
    void preloadBookImages(urls, {
      signal: controller.signal,
      onProgress: completed => setState({ key, completed, result: null }),
    }).then(result => {
      if (!controller.signal.aborted) setState({ key, completed: urls.length, result })
    })
    return () => controller.abort()
  }, [key])
  const current = state.key === key ? state : null
  return { key, total, completed: current?.completed ?? 0, ready: total === 0 || !!current?.result, failedUrls: current?.result?.failedUrls ?? [] }
}
