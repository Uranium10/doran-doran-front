"use client"

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react"
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCcw, Sparkles, SlidersHorizontal, Check } from "lucide-react"
import type { StoryPage } from "@/lib/workpad-data"
import type { ReadingPage } from "@/lib/story-pagination"
import { buildBookSpreads, findBookPosition, restingBookSpread, resolveBookPage, type BookLeaf, type BookSpread } from "@/lib/book-layout"
import { useReadingPages } from "./use-reading-pages"
import { useBookImages } from "./use-book-images"
import styles from "./popup-book.module.css"

function Picture({ src, alt, unavailable = false }: { src?: string | null; alt: string; unavailable?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || unavailable || src === failed) return <div className={styles.emptyArt}><BookOpen size={52} strokeWidth={1} aria-hidden="true" /><span>{src ? "그림은 잠시 쉬고 있어요" : "상상으로 펼치는 이야기"}</span></div>
  // 비율을 유지해 그림 전체를 담는다. 오류가 나도 본문/다음 장 이동은 계속 가능하다.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} onError={() => setFailed(src)} />
}

function Words({ page, areaRef }: { page: ReadingPage; areaRef?: RefObject<HTMLDivElement | null> }) {
  return <div className={styles.words}>
    <div className={styles.runningHead}><span title={page.heading}>{page.heading}</span><span aria-hidden="true">✦</span></div>
    <div ref={areaRef} className={styles.textArea}><p className={styles.prose}>{page.text.trim()}</p></div>
    <div className={styles.pageNote}>{page.sceneIndex + 1}장{page.partCount > 1 ? ` · ${page.part} / ${page.partCount}` : ""}</div>
  </div>
}

type Turn = { from: BookSpread; to: BookSpread; forward: boolean; spreads: BookSpread[] }

type PopupBookProps = {
  pages: StoryPage[]; childName: string | null; title?: string | null; coverImage?: string | null
  onFinish: () => void; onExit: () => void; hasQuiz?: boolean; exitLabel?: string; isLib?: boolean
}

/** 모든 진입 경로에서 표지와 전체 컷이 준비된 뒤 실제 책을 마운트한다. */
export function PopupBook(props: PopupBookProps) {
  const images = useBookImages(props.pages, props.coverImage)
  if (!images.ready) return <div className={styles.preparing} aria-busy="true">
    <BookOpen size={44} strokeWidth={1} aria-hidden="true" />
    <h2>그림들을 책 속에 담고 있어요</h2>
    <p role="status" aria-live="polite">{images.completed} / {images.total}개 그림 준비 중</p>
    <progress aria-label="동화 이미지 준비" value={images.completed} max={images.total} />
    <button type="button" onClick={props.onExit}>이전으로</button>
  </div>
  return <PreparedBook key={images.key} {...props} failedImages={images.failedUrls} />
}

function PreparedBook({ pages, childName, title, coverImage, onFinish, onExit, hasQuiz = false, exitLabel = "이전으로", isLib = false, failedImages }: PopupBookProps & { failedImages: string[] }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locked = useRef(false)
  const gesture = useRef<{ x: number; y: number; side?: string } | null>(null)
  const anchor = useRef<BookSpread | undefined>(undefined)
  const source = useRef(pages)
  const toolsId = useId()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [fontSize, setFontSize] = useState(22)
  const [singlePage, setSinglePage] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState(false)
  const [turn, setTurn] = useState<Turn | null>(null)
  const [index, setIndex] = useState(0)
  const [pageInput, setPageInput] = useState("1")
  const { textAreaRef, measureRef, pages: readingPages } = useReadingPages(pages, fontSize)
  const spreads = useMemo(() => buildBookSpreads(readingPages, singlePage), [readingPages, singlePage])
  const page = Math.min(index, spreads.length - 1)
  const current = spreads[page]
  const activeTurn = turn?.spreads === spreads ? turn : null
  const bookTitle = title?.trim() || (isLib ? childName?.trim() : `${childName?.trim() || "아이"}의 도란도란 이야기`) || "도란도란 이야기"
  const cover = coverImage || pages[0]?.image
  const atCover = page === 0
  const atEnd = page === spreads.length - 1
  const contentCount = spreads.length - 2
  useEffect(() => { setPageInput(String(Math.max(1, Math.min(page, contentCount)))) }, [page, contentCount])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const changed = () => setSinglePage(media.matches)
    const full = () => setFullscreen(document.fullscreenElement === rootRef.current)
    changed()
    media.addEventListener("change", changed)
    document.addEventListener("fullscreenchange", full)
    return () => { media.removeEventListener("change", changed); document.removeEventListener("fullscreenchange", full) }
  }, [])
  useLayoutEffect(() => {
    // 표지/뒷표지는 유지하고 본문은 장면·원문 위치로 새 펼침을 찾는다.
    if (source.current !== pages) { source.current = pages; anchor.current = undefined }
    setIndex(findBookPosition(spreads, anchor.current))
    setTurn(null); locked.current = false
    if (timer.current) clearTimeout(timer.current)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [spreads, pages])

  const go = (target: number) => {
    if (locked.current || target < 0 || target >= spreads.length || target === page) return
    setToolsOpen(false)
    const finish = () => { anchor.current = spreads[target]; setIndex(target); setTurn(null); locked.current = false }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return }
    // 넘김 도중 글꼴/화면 재측정이 발생해도 요청한 목적지로 이동한다.
    // 완료 시점에만 기억하면 재분배 효과가 타이머를 취소해 이전 페이지로 돌아간다.
    anchor.current = spreads[target]
    locked.current = true
    setTurn({ from: current, to: spreads[target], forward: target > page, spreads })
    timer.current = setTimeout(finish, 620)
  }
  const jumpToInput = () => {
    const target = resolveBookPage(pageInput, contentCount)
    // 빈 값/문자는 현재 위치로 되돌리고, 유효한 입력만 동일한 넘김 경로로 보낸다.
    setPageInput(String(target ?? Math.max(1, Math.min(page, contentCount))))
    if (target !== null) go(target)
  }
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || locked.current || (event.target as HTMLElement).closest("button,a")) return
    gesture.current = { x: event.clientX, y: event.clientY, side: (event.target as HTMLElement).closest<HTMLElement>("[data-side]")?.dataset.side }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current; gesture.current = null
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
  const leafContent = (leaf: BookLeaf) => {
    if (leaf.kind === "text") return <Words page={leaf.page} />
    if (leaf.kind === "image") return <div className={styles.illustration}><span className={styles.eyebrow}>{leaf.page.sceneIndex + 1}장</span><figure className={styles.illustrationBody}><div className={styles.art}><Picture src={leaf.page.image} unavailable={failedImages.includes(leaf.page.image ?? "")} alt={leaf.page.heading} /></div><figcaption>{leaf.page.heading}</figcaption></figure></div>
    if (leaf.kind === "cover") return <div className={styles.cover}><span className={styles.coverSeries}>도란도란 작은 책방</span><h2>{bookTitle}</h2><div className={styles.coverArt}><Picture src={cover} unavailable={failedImages.includes(cover ?? "")} alt={`${bookTitle} 표지`} /></div><span className={styles.coverBottom}>나를 위해 펼쳐지는 이야기</span><span className={styles.openHint}>표지를 눌러 펼쳐 보세요 <ChevronRight size={14} /></span></div>
    if (leaf.kind === "back") return <div className={`${styles.cover} ${styles.backCover}`}><Sparkles size={32} strokeWidth={1} aria-hidden="true" /><p>이야기는 끝나도<br />상상은 계속돼요.</p><span>도란도란</span></div>
    if (leaf.kind === "ending") return <div className={styles.ending}><span className={styles.eyebrow}>THE END</span><h2>한 권의 모험을<br />마쳤어요!</h2><p>{hasQuiz ? "마음에 남은 이야기를\n문제로 다시 만나 볼까요?" : "이야기를 마음에 담고\n다시 책장 밖으로 나가 볼까요?"}</p><button type="button" disabled={!!activeTurn} onClick={onFinish}>{hasQuiz ? "문제 풀러 가기" : "돌아가기"}<ChevronRight size={18} /></button><button type="button" disabled={!!activeTurn} className={styles.readAgain} onClick={() => go(0)}>처음부터 다시 읽기</button></div>
    if (leaf.kind === "outside") return null
    return <div className={styles.blankPaper} aria-hidden="true"><span>✦</span></div>
  }
  const spreadView = (spread: BookSpread, interactive = false) => <div className={`${styles.spread} ${spread.right.kind === "ending" ? styles.closedBack : ""}`}>
    {(["left", "right"] as const).map((side) => {
      const leaf = spread[side]
      const action = interactive && leaf.kind !== "outside" && leaf.kind !== "ending" && !(side === "left" && leaf.kind === "blank")
      return <section key={side} className={`${styles.paper} ${styles[side]} ${leaf.kind === "ending" ? styles.endPaper : ""} ${leaf.kind === "outside" ? styles.outside : ""}`}
        data-side={action ? side === "left" ? "previous" : "next" : undefined}
        role={action ? "button" : undefined} tabIndex={action ? 0 : undefined}
        aria-label={action ? side === "left" ? "왼쪽 페이지 · 이전 장" : atCover ? "책 표지 펼치기" : "오른쪽 페이지 · 다음 장" : undefined}
        aria-disabled={action ? !!activeTurn || (side === "left" ? atCover : atEnd) : undefined}>{leafContent(leaf)}</section>
    })}
  </div>
  if (!pages.length) return <div><p role="status">표시할 동화가 없어요.</p><button onClick={onExit}>돌아가기</button></div>

  const resting = activeTurn ? restingBookSpread(activeTurn.from, activeTurn.to, activeTurn.forward) : current
  return <div ref={rootRef} className={styles.reader} style={{ "--reading-size": `${fontSize}px` } as CSSProperties}>
    <aside className={styles.remote} aria-label="책 리모컨">
      <button type="button" className={styles.exit} onClick={onExit} aria-label={exitLabel} title={exitLabel}><ArrowLeft size={20} /><span>이전으로</span></button>
      <div className={`${styles.remoteGroup} ${styles.pageControls}`}>
        <button type="button" aria-label="이전 장" disabled={atCover || !!activeTurn} onClick={() => go(page - 1)}><ChevronLeft size={23} /><span>이전 장</span></button>
        <form className={styles.position} onSubmit={event => { event.preventDefault(); jumpToInput() }}>
          <span className={styles.positionLabel} role="status" aria-live="polite">{atCover ? "앞표지" : atEnd ? "뒷표지" : "페이지"}</span>
          <div className={styles.pageEntry}><input aria-label="이동할 페이지 번호" title={`1~${contentCount} 입력 후 Enter 또는 이동`} type="text" inputMode="numeric" enterKeyHint="go" value={pageInput}
            disabled={!!activeTurn || contentCount < 1} onChange={event => setPageInput(event.target.value)} onFocus={event => event.currentTarget.select()}
            onKeyDown={event => { if (event.key === "Escape") { setPageInput(String(Math.max(1, Math.min(page, contentCount)))); event.currentTarget.blur() } }} /><span>/ {contentCount}</span></div>
          <button className={styles.jumpButton} type="submit" aria-label="입력한 페이지로 이동" disabled={!!activeTurn || contentCount < 1}><span className={styles.jumpLabel}>이동</span><Check className={styles.jumpIcon} size={16} aria-hidden="true" /></button>
        </form>
        <button type="button" className={styles.next} aria-label={atCover ? "책 펼치기" : "다음 장"} disabled={atEnd || !!activeTurn} onClick={() => go(page + 1)}><ChevronRight size={23} /><span>{atCover ? "펼치기" : "다음 장"}</span></button>
      </div>
      {/* 모바일은 자주 쓰는 넘김/번호만 남기고 보조 도구를 한 번에 펼친다. */}
      <button type="button" className={styles.toolsToggle} aria-label="읽기 설정" title="읽기 설정" aria-expanded={toolsOpen} aria-controls={toolsId} onClick={() => setToolsOpen(open => !open)}><SlidersHorizontal size={20} /></button>
      <div id={toolsId} className={styles.readerTools} data-open={toolsOpen} role="group" aria-label="읽기 설정 도구">
      <div className={styles.remoteGroup}>
        <button type="button" aria-label="글자 크게" disabled={fontSize >= 28 || !!activeTurn} onClick={() => setFontSize(v => v + 2)}>가+<span>크게</span></button>
        <button type="button" aria-label="글자 작게" disabled={fontSize <= 18 || !!activeTurn} onClick={() => setFontSize(v => v - 2)}>가−<span>작게</span></button>
      </div>
      <button type="button" aria-label="처음부터 다시 보기" disabled={atCover || !!activeTurn} onClick={() => go(0)}><RotateCcw size={18} /><span>처음</span></button>
      <button type="button" aria-label={fullscreen ? "전체 화면 닫기" : "전체 화면으로 읽기"} onClick={toggleFullscreen}>{fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}<span>전체 화면</span></button>
      </div>
    </aside>
    <div className={styles.bookArea}>
      <header className={styles.bookHeader}><span title={bookTitle}>{bookTitle}</span></header>
      <div className={styles.desk}>
        <div className={styles.stage} aria-label="동화책" aria-busy={!!activeTurn}
          onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null }} onLostPointerCapture={() => { gesture.current = null }}
          onClick={event => {
            // 보조기기의 가상 클릭은 pointer 이벤트가 없으므로 별도로 받는다.
            if (event.detail !== 0 || (event.target as HTMLElement).closest("button,a")) return
            const side = (event.target as HTMLElement).closest<HTMLElement>("[data-side]")?.dataset.side
            if (side) go(page + (side === "previous" ? -1 : 1))
          }}
          onKeyDown={event => {
            if ((event.target as HTMLElement).closest("button,a")) return
            const target = event.key === "ArrowLeft" ? page - 1 : event.key === "ArrowRight" ? page + 1 : event.key === "Home" ? 0 : event.key === "End" ? spreads.length - 1 : null
            if (target !== null) { event.preventDefault(); go(target) }
            else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); go(page + ((event.target as HTMLElement).dataset.side === "previous" ? -1 : 1)) }
          }}>
          {spreadView(resting, !activeTurn)}
          {/* 안내는 책 바깥에 두고 표지를 넘기기 시작하면 숨긴다. 종이 복제면에는 넣지 않는다. */}
          {atCover && !activeTurn && <div className={styles.coverGuide}><BookOpen size={28} strokeWidth={1} aria-hidden="true" /><p>누르거나 옆으로 밀어<br className={styles.guideBreak} /> 넘겨 보세요</p><ChevronRight size={20} aria-hidden="true" /></div>}
          {/* 표지에서도 실제 종이와 같은 본문 상자로 페이지 분량을 미리 측정한다. */}
          <div className={styles.measurePage} aria-hidden="true"><Words page={readingPages[0]} areaRef={textAreaRef} /></div>
          {activeTurn && <>
            <div aria-hidden="true" inert className={`${styles.leaf} ${activeTurn.forward ? styles.forward : styles.backward}`}><div className={styles.front}>{leafContent(activeTurn.forward ? activeTurn.from.right : activeTurn.from.left)}</div><div className={styles.back}>{leafContent(activeTurn.forward ? activeTurn.to.left : activeTurn.to.right)}</div></div>
            <div aria-hidden="true" inert className={styles.mobileUnderlay}>{spreadView(activeTurn.to)}</div>
            <div aria-hidden="true" inert className={`${styles.mobileLeaf} ${activeTurn.forward ? styles.mobileForward : styles.mobileBackward}`}>{spreadView(activeTurn.from)}</div>
          </>}
        </div>
      </div>
      {fullscreenError && <p role="status">전체 화면을 열 수 없어요. 현재 화면에서도 읽을 수 있어요.</p>}
    </div>
    <p ref={measureRef} aria-hidden="true" className={`${styles.prose} ${styles.measure}`} />
  </div>
}
