"use client"

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react"
import { BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCcw } from "lucide-react"
import type { StoryPage } from "@/lib/workpad-data"
import type { ReadingPage } from "@/lib/story-pagination"
import { useReadingPages } from "./use-reading-pages"
import styles from "./popup-book.module.css"

function Illustration({ page }: { page: ReadingPage }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const available = page.image && page.image !== failedUrl
  return <div className={styles.illustration}>
    <div className={styles.art}>
      {available ? <>
        {/* 이미지를 잘라 확대하지 않는다. 장면의 전체 구도가 종이 안에 들어가게 한다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={page.image} alt={page.heading} draggable={false} onError={() => setFailedUrl(page.image)} />
      </> : <div className={styles.emptyArt}>
        <BookOpen size={56} strokeWidth={1} aria-hidden="true" />
        <span>{page.image_status === "failed" || failedUrl === page.image ? "그림은 잠시 쉬고 있어요" : "상상 속 풍경을 펼쳐 보세요"}</span>
      </div>}
    </div>
    <div className={styles.caption}>
      <span className={styles.eyebrow}>장면 {page.sceneIndex + 1}</span>
      <h3>{page.heading}</h3>
    </div>
  </div>
}

function Words({ page, areaRef }: { page: ReadingPage; areaRef?: RefObject<HTMLDivElement | null> }) {
  return <div className={styles.words}>
    <div className={styles.runningHead}><span>도란도란 이야기</span><span aria-hidden="true">✦</span></div>
    <div ref={areaRef} className={styles.textArea}><p className={styles.prose}>{page.text.trim()}</p></div>
    <div className={styles.pageNote}>{page.partCount > 1 ? `같은 장면의 이야기 · ${page.part} / ${page.partCount}` : "이야기 속으로 한 걸음 더"}</div>
  </div>
}

type Turn = { from: ReadingPage; to: ReadingPage; target: number; forward: boolean }

export function PopupBook({ pages, childName, title, onFinish, isLib = false }: {
  pages: StoryPage[]; childName: string | null; title?: string | null; onFinish: () => void; isLib?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locked = useRef(false)
  const gesture = useRef<{ x: number; y: number; side: string | undefined } | null>(null)
  const [fontSize, setFontSize] = useState(22)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState(false)
  const [turn, setTurn] = useState<Turn | null>(null)
  const { textAreaRef, measureRef, pages: readingPages, page, setPage } = useReadingPages(pages, fontSize)
  const current = readingPages[page]
  const total = readingPages.length
  const bookTitle = title?.trim() || (isLib ? childName?.trim() : `${childName?.trim() || "아이"}의 도란도란 이야기`)

  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener("fullscreenchange", changed)
    return () => document.removeEventListener("fullscreenchange", changed)
  }, [])
  // 리사이즈로 쪽 번호가 달라지면 이전 크기로 만든 애니메이션과 타이머를 버린다.
  useEffect(() => {
    setTurn(null); locked.current = false
    if (timer.current) clearTimeout(timer.current)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [readingPages])

  const go = (target: number) => {
    if (locked.current || target < 0 || target >= total || target === page || !current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPage(target); return }
    locked.current = true
    setTurn({ from: current, to: readingPages[target], target, forward: target > page })
    timer.current = setTimeout(() => { setPage(target); setTurn(null); locked.current = false }, 620)
  }
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || locked.current) return
    gesture.current = { x: event.clientX, y: event.clientY,
      side: (event.target as HTMLElement).closest<HTMLElement>("[data-side]")?.dataset.side }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    gesture.current = null
    if (!start) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(page + (dx < 0 ? 1 : -1))
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && start.side) go(page + (start.side === "previous" ? -1 : 1))
  }
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await rootRef.current?.requestFullscreen()
      setFullscreenError(false)
    } catch { setFullscreenError(true) }
  }
  if (!current) return <p role="status">표시할 동화가 없어요.</p>

  return <div ref={rootRef} className={styles.reader} style={{ "--reading-size": `${fontSize}px` } as CSSProperties}>
    <header className={styles.toolbar}>
      <div className={styles.bookTitle}><span className={styles.eyebrow}>{isLib ? "우리의 전래동화" : "나만의 전래동화"}</span><h2 title={bookTitle}>{bookTitle}</h2></div>
      <div className={styles.tools}>
        <button type="button" aria-label="글자 작게" disabled={fontSize <= 20 || !!turn} onClick={() => setFontSize(v => v - 2)}>가−</button>
        <button type="button" aria-label="글자 크게" disabled={fontSize >= 28 || !!turn} onClick={() => setFontSize(v => v + 2)}>가+</button>
        <button type="button" aria-label={fullscreen ? "전체 화면 닫기" : "전체 화면으로 읽기"} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
        </button>
      </div>
    </header>
    <div className={styles.stage} aria-label="동화책" aria-busy={!!turn}
      onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null }}
      onLostPointerCapture={() => { gesture.current = null }}
      onClick={event => {
        // 보조기기의 가상 클릭은 pointer 이벤트가 없으므로 별도로 지원한다.
        if (event.detail !== 0) return
        const side = (event.target as HTMLElement).closest<HTMLElement>("[data-side]")?.dataset.side
        if (side) go(page + (side === "previous" ? -1 : 1))
      }}
      onKeyDown={event => {
        if (event.key === "ArrowLeft") { event.preventDefault(); go(page - 1) }
        if (event.key === "ArrowRight") { event.preventDefault(); go(page + 1) }
        if (event.key === "Home") { event.preventDefault(); go(0) }
        if (event.key === "End") { event.preventDefault(); go(total - 1) }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          go(page + ((event.target as HTMLElement).dataset.side === "previous" ? -1 : 1))
        }
      }}>
      <div className={styles.spread}>
        <section className={styles.leftPage} data-side="previous" role="button" tabIndex={0} aria-label="왼쪽 페이지 · 이전 장" aria-disabled={page === 0 || !!turn}>
          <Illustration page={turn ? (turn.forward ? turn.from : turn.to) : current} />
        </section>
        <section className={styles.rightPage} data-side="next" role="button" tabIndex={0} aria-label="오른쪽 페이지 · 다음 장" aria-disabled={page === total - 1 || !!turn}>
          <Words page={turn ? (turn.forward ? turn.to : turn.from) : current} areaRef={textAreaRef} />
        </section>
      </div>
      {/* 책등을 축으로 종이 한 장의 앞면/뒷면을 회전시킨다. 복제면은 접근성 트리에서 제외한다. */}
      {turn && <div aria-hidden="true" className={`${styles.leaf} ${turn.forward ? styles.forward : styles.backward}`}>
        <div className={styles.front}>{turn.forward ? <Words page={turn.from} /> : <Illustration page={turn.from} />}</div>
        <div className={styles.back}>{turn.forward ? <Illustration page={turn.to} /> : <Words page={turn.to} />}</div>
      </div>}
      {turn && <div aria-hidden="true" className={styles.mobileUnderlay}>
        <div className={styles.spread}><Illustration page={turn.to} /><Words page={turn.to} /></div>
      </div>}
      {turn && <div aria-hidden="true" className={`${styles.mobileLeaf} ${turn.forward ? styles.mobileForward : styles.mobileBackward}`}>
        <div className={styles.spread}><Illustration page={turn.from} /><Words page={turn.from} /></div>
      </div>}
    </div>
    <p ref={measureRef} aria-hidden="true" className={`${styles.prose} ${styles.measure}`} />
    <footer className={styles.footer}>
      <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${(page + 1) / total * 100}%` }} /></div>
      <div className={styles.controls}>
        <button type="button" onClick={() => go(page - 1)} disabled={page === 0 || !!turn}><ChevronLeft size={19} /> 이전 장</button>
        <div className={styles.position} role="status" aria-live="polite"><strong>{page + 1}</strong> / {total} 펼침<span>장면 {current.sceneIndex + 1} / {pages.length}</span></div>
        {page === total - 1 ? <button type="button" className={styles.finish} disabled={!!turn} onClick={onFinish}>다 읽었어요 <ChevronRight size={19} /></button>
          : <button type="button" onClick={() => go(page + 1)} disabled={!!turn}>다음 장 <ChevronRight size={19} /></button>}
      </div>
      <div className={styles.hints}><button type="button" onClick={() => go(0)} disabled={page === 0 || !!turn}><RotateCcw size={13} /> 처음으로</button><span>왼쪽은 이전 · 오른쪽은 다음 · 옆으로 밀어 넘기기</span></div>
      {fullscreenError && <p role="status">이 브라우저에서는 전체 화면을 열 수 없어요. 현재 화면에서도 읽을 수 있어요.</p>}
    </footer>
  </div>
}
