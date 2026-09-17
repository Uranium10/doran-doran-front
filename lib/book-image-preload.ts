/** URL이 같은 표지/장면은 한 번만 읽는다. 공개 동화와 생성 동화 모두 같은 경로를 쓴다. */
export function bookImageUrls(pages: { image?: string | null }[], cover?: string | null): string[] {
  return [...new Set([cover || pages[0]?.image, ...pages.map(page => page.image)]
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0))]
}

export type BookImages = { images: HTMLImageElement[]; failedUrls: string[] }

/** 다운로드뿐 아니라 decode까지 끝내 책장을 넘길 때 처음 그림을 해석하는 지연을 줄인다. */
export async function preloadBookImages(urls: string[], options: {
  signal: AbortSignal; onProgress?: (completed: number) => void; timeoutMs?: number
}): Promise<BookImages> {
  const { signal, onProgress, timeoutMs = 15_000 } = options
  let completed = 0
  const results = await Promise.all([...new Set(urls)].map(url => new Promise<{ url: string; image: HTMLImageElement | null }>(resolve => {
    const image = new Image()
    let settled = false
    let decoding = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = (success: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      image.onload = null; image.onerror = null
      signal.removeEventListener("abort", abort)
      // 실패/이탈한 요청의 핸들러와 리소스 연결은 남기지 않는다.
      if (!success) image.removeAttribute("src")
      if (!signal.aborted) onProgress?.(++completed)
      resolve({ url, image: success ? image : null })
    }
    const abort = () => finish(false)
    const loaded = () => {
      if (settled || decoding) return
      decoding = true
      if (!image.naturalWidth) { finish(false); return }
      if (typeof image.decode !== "function") { finish(true); return }
      // 깨진 파일/해석 실패도 완료로 처리하되, 해당 컷에는 기존 대체 그림을 보여준다.
      try { image.decode().then(() => finish(true), () => finish(false)) }
      catch { finish(false) }
    }
    if (signal.aborted) { finish(false); return }
    signal.addEventListener("abort", abort, { once: true })
    timer = setTimeout(() => finish(false), timeoutMs)
    image.onload = loaded
    image.onerror = () => finish(false)
    image.decoding = "async"
    try {
      image.src = url
      if (image.complete) loaded()
    } catch { finish(false) }
  })))
  // 읽는 동안 Image 참조를 유지해 디코딩된 그림이 바로 정리되지 않도록 한다.
  return {
    images: results.flatMap(result => result.image ? [result.image] : []),
    failedUrls: results.filter(result => !result.image).map(result => result.url),
  }
}
