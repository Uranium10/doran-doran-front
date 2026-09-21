"use client"

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react"
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCcw, Sparkles, SlidersHorizontal, Check } from "lucide-react"
import type { StoryPage } from "@/lib/workpad-data"
import type { ReadingPage } from "@/lib/story-pagination"
import { buildBookSpreads, findBookPosition, restingBookSpread, resolveBookPage, bookBookmark, bookmarkPosition, validBookmark, type BookBookmark, type BookLeaf, type BookSpread } from "@/lib/book-layout"
import { useReadingPages } from "./use-reading-pages"
import { useSessionView } from "@/lib/use-session-view"
import { useBookImages } from "./use-book-images"
import { bookCoverStyle } from "@/lib/book-appearance"
import { bookGestureDirection, trackBookGesture, type BookGesture } from "@/lib/book-gesture"
import styles from "./popup-book.module.css"
import { NarrationPlayer } from "./narration-player"
import { narrationKey } from "@/lib/narration-timeline"
import { StoryVocabulary } from "./story-vocabulary"

function Picture({ src, alt, unavailable = false }: { src?: string | null; alt: string; unavailable?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || unavailable || src === failed) return <div className={styles.emptyArt}><BookOpen size={52} strokeWidth={1} aria-hidden="true" /><span>{src ? "그림은 잠시 쉬고 있어요" : "상상으로 펼치는 이야기"}</span></div>
  // 비율을 유지해 그림 전체를 담는다. 오류가 나도 본문/다음 장 이동은 계속 가능하다.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} onError={() => setFailed(src)} />
}

function Words({ page, areaRef }: { page: ReadingPage; areaRef?: RefObject<HTMLDivElement | null> }) {
  const localArea = useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = useState(false)
  useLayoutEffect(() => {
    const area = localArea.current
    if (!area) return
    // 보통은 페이지 분할 덕분에 본문이 모두 들어간다. 실제로 넘칠 때만
    // 세로 스크롤을 브라우저에 맡겨 확대 글꼴 등에서도 마지막 줄을 읽게 한다.
    const measure = () => setScrollable(area.scrollHeight > area.clientHeight + 2)
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    if (area.firstElementChild) observer.observe(area.firstElementChild)
    measure()
    return () => observer.disconnect()
  }, [page.text])
  return <div className={styles.words}>
    <div className={styles.runningHead}><span title={page.heading}>{page.heading}</span><span aria-hidden="true">✦</span></div>
    <div ref={element => { localArea.current = element; if (areaRef) areaRef.current = element }} className={styles.textArea} data-scrollable={scrollable || undefined}><p className={styles.prose}>{page.text.trim()}</p></div>
    <div className={styles.pageNote}>{page.sceneIndex + 1}장{page.partCount > 1 ? ` · ${page.part} / ${page.partCount}` : ""}</div>
  </div>
}

type Turn = { id: number; from: BookSpread; to: BookSpread; forward: boolean; spreads: BookSpread[] }

type PopupBookProps = {
  narrationIdentity?: { storyId: string; profileId: string }
  vocabulary?: { profileId: string; storyId: string; initialAnalysis?: unknown }
  initialBookmark?: BookBookmark
  onBookmarkChange?: (bookmark: BookBookmark) => void
  coverColor?: string | null
  persistenceKey?: string | null
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
  return <PreparedBook key={`${images.key}:${props.persistenceKey ?? ""}`} {...props} failedImages={images.failedUrls} />
}

function PreparedBook({ narrationIdentity, vocabulary, pages, childName, title, coverImage, coverColor, onFinish, onExit, hasQuiz = false, exitLabel = "이전으로", isLib = false, failedImages, persistenceKey, initialBookmark, onBookmarkChange }: PopupBookProps & { failedImages: string[] }) {
  const bookmark = useSessionView<BookBookmark>(persistenceKey ?? null, { kind: "cover" }, validBookmark)
  const rootRef = useRef<HTMLDivElement>(null)
  const pageInputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destination = useRef(0)
  const turnSequence = useRef(0)
  const gesture = useRef<BookGesture | null>(null)
  const anchor = useRef<BookSpread | undefined>(undefined)
  const source = useRef(pages)
  const toolsId = useId()
  const [audioLocked, setAudioLocked] = useState(false)
  const narrated = !!narrationIdentity && pages.length > 0 && pages.every(p => p.audio_status === "ready" && !!p.audio_path && !!p.audio_duration)
  const audioFailed = pages.some(p => p.audio_status === "failed")
  const [toolsOpen, setToolsOpen] = useState(false)
  const [vocabOpen, setVocabOpen] = useState(false)
  const [vocabReady, setVocabReady] = useState(false)
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
    if (!bookmark.ready) return
    const restored = anchor.current ? findBookPosition(spreads, anchor.current) : bookmarkPosition(spreads, initialBookmark ?? bookmark.value)
    destination.current = restored
    setIndex(restored)
    setTurn(null)
    if (timer.current) clearTimeout(timer.current)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [spreads, pages, bookmark.ready])

  const go = (target: number, fromAudio = false) => {
    if (audioLocked && !fromAudio) return
    const previous = destination.current
    if (target < 0 || target >= spreads.length || target === previous) return
    // 연속 입력은 진행 중인 장의 도착 지점에서 이어간다. 입력을 버리거나 긴 대기열로 쌓지 않는다.
    // 이전 타이머를 취소해야 늦은 완료 콜백이 새 목적지를 덮어쓰지 않는다.
    if (timer.current) clearTimeout(timer.current)
    const id = ++turnSequence.current
    destination.current = target
    anchor.current = spreads[target]
    setIndex(target)
    const position = bookBookmark(spreads[target])
    bookmark.setValue(position)
    onBookmarkChange?.(position)
    setToolsOpen(false)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTurn(null); return }
    setTurn({ id, from: spreads[previous], to: spreads[target], forward: target > previous, spreads })
    timer.current = setTimeout(() => {
      // 이미 교체된 애니메이션의 완료 알림은 무시한다.
      if (turnSequence.current === id) setTurn(null)
    }, 620)
  }
  // 빠른 키 반복처럼 React가 다시 그리기 전 들어온 입력도 최신 목적지를 기준으로 계산한다.
  const step = (direction: number) => go(destination.current + direction)
  const jumpToInput = () => {
    const target = resolveBookPage(pageInput, contentCount)
    // 빈 값/문자는 현재 위치로 되돌리고, 유효한 입력만 동일한 넘김 경로로 보낸다.
    setPageInput(String(target ?? Math.max(1, Math.min(page, contentCount))))
    if (target !== null) {
      go(target)
      // 모바일 키보드가 닫힌 뒤에도 입력칸 포커스로 화면이 끌려가지 않도록 이동 시 해제한다.
      if (singlePage) pageInputRef.current?.blur()
    }
  }
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (audioLocked) return
    // 두 손가락 확대는 책 넘김이 아니다. 두 번째 손가락이 닿으면 첫 입력도 취소한다.
    if (!event.isPrimary) { gesture.current = null; return }
    if (event.button !== 0 || (event.target as HTMLElement).closest("button,a,input,textarea,select,[data-book-ending]")) return
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, maxTravel: 0, side: (event.target as HTMLElement).closest<HTMLElement>("[data-side]")?.dataset.side }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (start?.pointerId === event.pointerId) gesture.current = trackBookGesture(start, event.clientX, event.clientY)
  }
  const pointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start || start.pointerId !== event.pointerId) return
    gesture.current = null
    const direction = bookGestureDirection(start, event.clientX, event.clientY)
    if (direction) step(direction)
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
    if (leaf.kind === "cover") return <div className={styles.cover}><span className={styles.coverSeries}>도란도란 작은 책방</span><h2>{bookTitle}</h2><div className={styles.coverArt}><Picture src={cover} unavailable={failedImages.includes(cover ?? "")} alt={`${bookTitle} 표지`} /></div><span className={styles.coverBottom}>나를 위해 펼쳐지는 이야기</span><span className={styles.openHint}>{narrated ? "아래 재생 버튼으로 들어 보세요" : "표지를 눌러 펼쳐 보세요"} <ChevronRight size={14} /></span></div>
    if (leaf.kind === "back") return <div className={`${styles.cover} ${styles.backCover}`}><Sparkles size={32} strokeWidth={1} aria-hidden="true" /><p>이야기는 끝나도<br />상상은 계속돼요.</p><span>도란도란</span></div>
    if (leaf.kind === "ending") return <div className={styles.ending} data-book-ending><span className={styles.eyebrow}>THE END</span><h2>한 권의 모험을<br />마쳤어요!</h2><p>{hasQuiz ? "마음에 남은 이야기를\n문제로 다시 만나 볼까요?" : "이야기를 마음에 담고\n다시 책장 밖으로 나가 볼까요?"}</p><button type="button" disabled={!!activeTurn} onClick={hasQuiz ? onFinish : onExit}>{hasQuiz ? "문제 풀러 가기" : exitLabel}<ChevronRight size={18} /></button>{hasQuiz && <button type="button" disabled={!!activeTurn} className={styles.vocabButton} onClick={onExit}>{exitLabel}</button>}{vocabulary && <button type="button" disabled={!!activeTurn} className={styles.vocabLink} onClick={() => setVocabOpen(true)}>{vocabReady ? "동화 수준 확인하기" : "동화 수준 데이터를 준비중입니다…"}</button>}<button type="button" disabled={!!activeTurn} className={styles.readAgain} onClick={() => go(0)}>처음부터 다시 읽기</button></div>
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
        aria-disabled={action ? audioLocked || (side === "left" ? atCover : atEnd) : undefined}
        aria-label={leaf.kind === "ending" ? "완독 안내" : action ? side === "left" ? "왼쪽 페이지 · 이전 장" : atCover ? "책 표지 펼치기" : "오른쪽 페이지 · 다음 장" : undefined}>{leafContent(leaf)}</section>
    })}
  </div>
  if (!pages.length) return <div><p role="status">표시할 동화가 없어요.</p><button onClick={onExit}>돌아가기</button></div>

  const resting = activeTurn ? restingBookSpread(activeTurn.from, activeTurn.to, activeTurn.forward) : current
  return <div ref={rootRef} className={styles.reader} data-narrated={narrated || undefined} style={{ ...bookCoverStyle(coverColor), "--reading-size": `${fontSize}px`, visibility: bookmark.ready ? "visible" : "hidden" } as CSSProperties}>
    {/* 모달은 회전 복제면 밖에 한 번만 렌더한다. 마지막 페이지 진입 시 분석만 조회한다. */}
    {vocabulary && <StoryVocabulary key={`${vocabulary.profileId}:${vocabulary.storyId}`} {...vocabulary} active={atEnd || vocabOpen} onReady={setVocabReady} open={vocabOpen} onClose={() => setVocabOpen(false)} />}
    <aside className={styles.remote} aria-label="책 리모컨">
      <button type="button" className={styles.exit} onClick={onExit} aria-label={exitLabel} title={exitLabel}><ArrowLeft size={20} /><span>이전으로</span></button>
      <div className={`${styles.remoteGroup} ${styles.pageControls}`}>
        <button type="button" aria-label="이전 장" disabled={atCover || audioLocked} onClick={() => step(-1)}><ChevronLeft size={23} /><span>이전 장</span></button>
        <form className={styles.position} onSubmit={event => { event.preventDefault(); jumpToInput() }}>
          <span className={styles.positionLabel} role="status" aria-live="polite">{atCover ? "앞표지" : atEnd ? "뒷표지" : "페이지"}</span>
          <div className={styles.pageEntry}><input ref={pageInputRef} aria-label="이동할 페이지 번호" title={`1~${contentCount} 입력 후 Enter 또는 이동`} type="text" inputMode="numeric" enterKeyHint="go" value={pageInput}
            disabled={contentCount < 1 || audioLocked} onChange={event => setPageInput(event.target.value)} onFocus={event => event.currentTarget.select()}
            onKeyDown={event => { if (event.key === "Escape") { setPageInput(String(Math.max(1, Math.min(page, contentCount)))); event.currentTarget.blur() } }} /><span>/ {contentCount}</span></div>
          <button className={styles.jumpButton} type="submit" aria-label="입력한 페이지로 이동" disabled={contentCount < 1 || audioLocked}><span className={styles.jumpLabel}>이동</span><Check className={styles.jumpIcon} size={16} aria-hidden="true" /></button>
        </form>
        <button type="button" className={styles.next} aria-label={atCover ? "책 펼치기" : "다음 장"} disabled={atEnd || audioLocked} onClick={() => step(1)}><ChevronRight size={23} /><span>{atCover ? "펼치기" : "다음 장"}</span></button>
      </div>
      {/* 모바일은 자주 쓰는 넘김/번호만 남기고 보조 도구를 한 번에 펼친다. */}
      <button type="button" className={styles.toolsToggle} aria-label="읽기 설정" title="읽기 설정" aria-expanded={toolsOpen} aria-controls={toolsId} onClick={() => setToolsOpen(open => !open)}><SlidersHorizontal size={20} /></button>
      <div id={toolsId} className={styles.readerTools} data-open={toolsOpen} role="group" aria-label="읽기 설정 도구">
      <div className={styles.remoteGroup}>
        <button type="button" aria-label="글자 크게" disabled={fontSize >= 28 || !!activeTurn || audioLocked} onClick={() => setFontSize(v => v + 2)}>가+<span>크게</span></button>
        <button type="button" aria-label="글자 작게" disabled={fontSize <= 18 || !!activeTurn || audioLocked} onClick={() => setFontSize(v => v - 2)}>가−<span>작게</span></button>
      </div>
      <button type="button" aria-label="처음부터 다시 보기" disabled={atCover || audioLocked} onClick={() => go(0)}><RotateCcw size={18} /><span>처음</span></button>
      <button type="button" aria-label={fullscreen ? "전체 화면 닫기" : "전체 화면으로 읽기"} onClick={toggleFullscreen}>{fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}<span>전체 화면</span></button>
      </div>
    </aside>
    <div className={styles.bookArea}>
      <header className={styles.bookHeader}><span title={bookTitle}>{bookTitle}</span></header>
      <div className={styles.desk}>
        <div className={styles.stage} data-ending={atEnd || undefined} aria-label="동화책" aria-busy={!!activeTurn}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onLostPointerCapture={pointerCancel}
          onClick={event => {
            // 보조기기의 가상 클릭은 pointer 이벤트가 없으므로 별도로 받는다.
            if (event.detail !== 0 || (event.target as HTMLElement).closest("button,a")) return
            const side = (event.target as HTMLElement).closest<HTMLElement>("[data-side]")?.dataset.side
            if (side) step(side === "previous" ? -1 : 1)
          }}
          onKeyDown={event => {
            if ((event.target as HTMLElement).closest("button,a")) return
            const target = event.key === "ArrowLeft" ? destination.current - 1 : event.key === "ArrowRight" ? destination.current + 1 : event.key === "Home" ? 0 : event.key === "End" ? spreads.length - 1 : null
            if (target !== null) { event.preventDefault(); go(target) }
            else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); step((event.target as HTMLElement).dataset.side === "previous" ? -1 : 1) }
          }}>
          {spreadView(resting, true)}
          {/* 안내는 책 바깥에 두고 표지를 넘기기 시작하면 숨긴다. 종이 복제면에는 넣지 않는다. */}
          {atCover && !activeTurn && <div className={styles.coverGuide}><BookOpen size={28} strokeWidth={1} aria-hidden="true" /><p>{narrated ? <>읽어 주는 동화예요.<br />화면 아래쪽의 재생 버튼을 눌러 보세요.</> : <>책을 누르거나 옆으로 밀어<br className={styles.guideBreak} /> 넘겨 보세요</>}</p><ChevronRight size={20} aria-hidden="true" /></div>}
          {/* 표지에서도 실제 종이와 같은 본문 상자로 페이지 분량을 미리 측정한다. */}
          <div className={styles.measurePage} aria-hidden="true"><Words page={readingPages[0]} areaRef={textAreaRef} /></div>
          {activeTurn && <>
            <div key={`desktop-${activeTurn.id}`} aria-hidden="true" inert className={`${styles.leaf} ${activeTurn.forward ? styles.forward : styles.backward}`}><div className={styles.front}>{leafContent(activeTurn.forward ? activeTurn.from.right : activeTurn.from.left)}</div><div className={styles.back}>{leafContent(activeTurn.forward ? activeTurn.to.left : activeTurn.to.right)}</div></div>
            <div aria-hidden="true" inert className={styles.mobileUnderlay}>{spreadView(activeTurn.to)}</div>
            <div key={`mobile-${activeTurn.id}`} aria-hidden="true" inert className={`${styles.mobileLeaf} ${activeTurn.forward ? styles.mobileForward : styles.mobileBackward}`}>{spreadView(activeTurn.from)}</div>
          </>}
        </div>
      </div>
      {fullscreenError && <p role="status">전체 화면을 열 수 없어요. 현재 화면에서도 읽을 수 있어요.</p>}
    </div>
    {narrated && narrationIdentity && <NarrationPlayer key={`${narrationIdentity.storyId}:${narrationKey(readingPages)}:${singlePage}`} identity={narrationIdentity} pages={pages} readingPages={readingPages} spreads={spreads} currentSpread={page} onSpread={target => go(target, true)} onLock={setAudioLocked} />}
    {audioFailed && <p className={styles.audioFailure} role="status">목소리를 모두 준비하지 못했어요. 글과 그림으로 읽어 주세요.</p>}
    <p ref={measureRef} aria-hidden="true" className={`${styles.prose} ${styles.measure}`} />
  </div>
}
