"use client"

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Headphones, LoaderCircle } from 'lucide-react'
import { request } from '@/lib/api'
import type { StoryPage } from '@/lib/workpad-data'
import type { ReadingPage } from '@/lib/story-pagination'
import type { BookSpread } from '@/lib/book-layout'
import { audioTimeline, segmentAt, type AudioLayout, type AudioSegment } from '@/lib/narration-timeline'
import styles from './narration-player.module.css'

type Props = {
  identity: { storyId: string; profileId: string }
  pages: StoryPage[]; readingPages: ReadingPage[]; spreads: BookSpread[]; currentSpread: number
  onSpread: (spread: number) => void; onLock: (locked: boolean) => void
}
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export function NarrationPlayer(props: Props) {
  const latest = useRef(props)
  latest.current = props
  const audioRef = useRef<HTMLAudioElement>(null)
  const segmentsRef = useRef<AudioSegment[]>([])
  const segment = useRef(0)
  const pendingSeek = useRef<number | null>(null)
  const intent = useRef(false)
  const epoch = useRef(0)
  const busy = useRef(false)
  const preparingRef = useRef(false)
  const [settled, setSettled] = useState(false)
  const ownSpread = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controller = useRef<AbortController | null>(null)
  const preparedAt = useRef(0)
  const [segments, setSegments] = useState<AudioSegment[]>([])
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [resting, setResting] = useState(false)
  const [error, setError] = useState('')
  const [readyCount, setReadyCount] = useState(0)
  const preIndexed = props.pages.every(p => p.audio_index_status === 'ready' && p.audio_cues?.length)
  const total = segments.length ? segments[segments.length - 1].offset + segments[segments.length - 1].end : props.pages.reduce((sum, p) => sum + (p.audio_duration ?? 0), 0)

  function clearTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null }
  function stop() {
    intent.current = false; epoch.current++; clearTimer()
    audioRef.current?.pause(); setPlaying(false); setResting(false); latest.current.onLock(false)
  }
  function moveBook(target: number) { ownSpread.current = target; latest.current.onSpread(target) }
  function fail(message: string) { stop(); setError(message) }

  // 페이지 재분할로 이 컴포넌트가 교체되거나 책을 나가면 음성과 요청을 모두 정리한다.
  useEffect(() => {
    const audio = audioRef.current
    let active = true
    let settling: ReturnType<typeof setTimeout> | undefined
    // 글꼴이 정착한 뒤 페이지를 연결한다. 새 동화는 모델 분석 없이 저장된 시각을 읽는다.
    void document.fonts.ready.then(() => { if (active) settling = setTimeout(() => setSettled(true), preIndexed ? 0 : 400) })
    return () => {
      active = false; clearTimeout(settling)
      intent.current = false; epoch.current++; clearTimer(); controller.current?.abort()
      audio?.pause(); latest.current.onLock(false)
    }
  }, [])

  useEffect(() => {
    const hidden = () => { if (document.hidden) { stop(); busy.current = false; controller.current?.abort(); preparingRef.current = false; setPreparing(false) } }
    document.addEventListener("visibilitychange", hidden)
    return () => document.removeEventListener("visibilitychange", hidden)
  }, [])

  async function prepare() {
    if (segmentsRef.current.length && Date.now() - preparedAt.current < 7_000_000) return segmentsRef.current
    const abort = new AbortController(); controller.current = abort
    preparingRef.current = true; setPreparing(true); setReadyCount(0)
    const layouts: AudioLayout[] = []
    try {
      const load = async (i: number) => {
        const ranges = props.readingPages.filter(p => p.sceneIndex === i).map(p => ({ start: p.startOffset, end: p.endOffset }))
        const layout = await request<AudioLayout>(`/stories/${encodeURIComponent(props.identity.storyId)}/narration-layout`, {
          method: 'POST', signal: abort.signal,
          body: JSON.stringify({ profile_id: props.identity.profileId, chapter: props.pages[i].page_number, ranges }),
        }, { timeoutMs: preIndexed ? 20_000 : 90_000 })
        if (abort.signal.aborted) throw new Error('준비가 중단됐어요.')
        setReadyCount(n => n + 1)
        return layout
      }
      // 생성 시 인덱싱한 책은 서명 URL과 경계 연결만 병렬로 읽는다. 기존 책의
      // 유료 분석은 사용자가 재생을 누를 때 기존 순차 경로로만 실행한다.
      if (preIndexed) layouts.push(...await Promise.all(props.pages.map((_, i) => load(i))))
      else for (let i = 0; i < props.pages.length; i++) layouts.push(await load(i))
      const next = audioTimeline(props.readingPages, props.spreads, layouts)
      segmentsRef.current = next; setSegments(next); preparedAt.current = Date.now()
      return next
    } finally {
      if (controller.current === abort) { preparingRef.current = false; setPreparing(false) }
    }
  }

  useEffect(() => {
    if (!settled || !preIndexed) return
    let active = true
    void prepare().then(list => {
      const audio = audioRef.current
      // 첫 재생 전에 파일 헤더도 읽어 둔다. 음성을 자동으로 재생하지 않는다.
      if (active && audio && list[0] && !intent.current && !audio.getAttribute('src')) {
        audio.src = list[0].url; audio.load()
      }
    }).catch(e => { if (active && !controller.current?.signal.aborted) setError(e instanceof Error ? e.message : '음성을 불러오지 못했어요.') })
    return () => { active = false }
  }, [settled, preIndexed])

  function finishSegment() {
    if (!intent.current || busy.current) return
    const list = segmentsRef.current, current = list[segment.current]
    if (!current) return
    clearTimer(); busy.current = true; audioRef.current?.pause()
    setPosition(current.offset + current.end)
    if (segment.current === list.length - 1) {
      stop(); moveBook(latest.current.spreads.length - 1); return
    }
    busy.current = true; setResting(true)
    const next = segment.current + 1, sameChapter = list[next].chapter === current.chapter
    if (!sameChapter) showChapterArt(next)
    // 쪽 사이 0.7초, 장 사이 1.2초를 쉰다. 쉼 시간은 음성 진행률에 더하지 않는다.
    timer.current = setTimeout(() => { busy.current = false; void start(next, list[next].start) }, sameChapter ? 700 : 1200)
  }

  function scheduleBoundary() {
    const audio = audioRef.current, current = segmentsRef.current[segment.current]
    if (!audio || !current || !intent.current || busy.current || audio.paused || pendingSeek.current !== null) return
    clearTimer()
    // timeupdate만 쓰면 최대 수백 ms 늦어질 수 있어 종료 타이머와 함께 확인한다.
    const remain = current.end - audio.currentTime
    if (remain <= .025) { finishSegment(); return }
    timer.current = setTimeout(scheduleBoundary, Math.min(250, remain * 1000))
  }

  function showChapterArt(index: number) {
    const item = segmentsRef.current[index]
    if (!item || item.start !== 0) return false
    const picture = latest.current.spreads.findIndex(s => [s.left, s.right].some(leaf => leaf.kind === 'image' && leaf.page.sceneIndex === item.chapter))
    // 모바일의 삽화 전용 쪽은 1.2초 보여 준 뒤 본문으로 이동한다.
    if (picture >= 0 && picture !== item.spread) { moveBook(picture); return true }
    return false
  }

  function positionAudio(audio: HTMLAudioElement, seconds: number) {
    // 일부 모바일 브라우저는 metadata 전 currentTime 쓰기를 거부한다.
    pendingSeek.current = seconds
    if (audio.readyState >= 1) { audio.currentTime = seconds; pendingSeek.current = null }
  }

  async function start(index: number, seconds: number) {
    const audio = audioRef.current, current = segmentsRef.current[index]
    if (!audio || !current || !intent.current) return
    const ticket = ++epoch.current
    clearTimer(); busy.current = false; setResting(false); segment.current = index
    moveBook(current.spread)
    try {
      if (audio.getAttribute('src') !== current.url || audio.error) { audio.src = current.url; audio.load() }
      // 같은 audio 요소를 유지하여 모바일의 사용자 재생 허용을 장 전환에도 이어간다.
      positionAudio(audio, Math.max(current.start, Math.min(seconds, current.end)))
      await audio.play()
      if (ticket !== epoch.current || !intent.current) return
      scheduleBoundary()
    } catch { if (ticket === epoch.current) fail('재생 버튼을 다시 눌러 주세요. 음성을 열지 못했어요.') }
  }

  async function toggle() {
    if (intent.current) { stop(); busy.current = false; return }
    if (preparingRef.current || !settled) return
    setError('')
    try {
      const list = segmentsRef.current.length && Date.now() - preparedAt.current < 7_000_000 ? segmentsRef.current : await prepare()
      const visible = latest.current.spreads[latest.current.currentSpread]
      const picture = [visible.left, visible.right].find(leaf => leaf.kind === 'image')
      const matching = list.findIndex(s => s.spread === latest.current.currentSpread || (picture?.kind === 'image' && s.chapter === picture.page.sceneIndex && s.start === 0))
      const index = list[segment.current]?.spread === latest.current.currentSpread && position < total - .1 ? segment.current : matching >= 0 ? matching : position >= total - .1 || latest.current.currentSpread === 0 ? 0 : segment.current
      const audio = audioRef.current
      const current = list[index]
      const second = index === segment.current && audio?.getAttribute('src') === current.url && audio.currentTime < current.end ? Math.max(current.start, audio.currentTime) : current.start
      intent.current = true; busy.current = false; setPlaying(true); latest.current.onLock(true)
      if (second === 0 && showChapterArt(index)) {
        busy.current = true; setResting(true)
        timer.current = setTimeout(() => { busy.current = false; void start(index, second) }, 1200)
      } else await start(index, second)
    } catch (e) { if (!controller.current?.signal.aborted) fail(e instanceof Error ? e.message : '읽어 줄 준비를 마치지 못했어요.') }
  }

  function seek(seconds: number) {
    const list = segmentsRef.current
    if (!list.length) return
    const resume = intent.current
    stop(); busy.current = false
    const index = segmentAt(list, seconds), current = list[index]
    segment.current = index; setPosition(seconds); moveBook(current.spread)
    const audio = audioRef.current
    if (!audio) return
    if (audio.getAttribute('src') !== current.url || audio.error) { audio.src = current.url; audio.load() }
    const localSeconds = Math.max(current.start, Math.min(seconds - current.offset, current.end))
    positionAudio(audio, localSeconds)
    if (resume) { intent.current = true; setPlaying(true); latest.current.onLock(true); void start(index, localSeconds) }
  }

  // 일시정지 상태에서 책을 손으로 넘기면 그 쪽부터 다시 읽는다.
  useEffect(() => {
    if (ownSpread.current === props.currentSpread) { ownSpread.current = null; return }
    if (intent.current) return
    const target = segmentsRef.current.find(s => s.spread === props.currentSpread)
    if (target) seek(target.offset + target.start)
    else if (props.currentSpread === 0 && segmentsRef.current.length) {
      stop(); segment.current = 0; setPosition(0)
      if (audioRef.current) { audioRef.current.removeAttribute('src'); audioRef.current.load() }
    }
  }, [props.currentSpread])

  return <section className={styles.remote} aria-label="읽어 주는 동화 리모컨">
    <audio ref={audioRef} preload="auto" onLoadedMetadata={() => {
      const audio = audioRef.current
      if (audio && pendingSeek.current !== null) positionAudio(audio, pendingSeek.current)
      scheduleBoundary()
    }} onTimeUpdate={() => {
      const current = segmentsRef.current[segment.current], audio = audioRef.current
      if (current && audio && !busy.current && pendingSeek.current === null) setPosition(current.offset + Math.min(current.end, audio.currentTime))
      scheduleBoundary()
    }} onPause={() => { if (intent.current && !busy.current && audioRef.current?.paused && !audioRef.current.ended) stop() }} onPlaying={scheduleBoundary} onEnded={finishSegment} onError={() => { if (intent.current) fail('음성을 불러오지 못했어요. 잠시 후 다시 눌러 주세요.') }} />
    <button className={styles.play} type="button" onClick={() => void toggle()} disabled={preparing || !settled} aria-label={playing ? '동화 읽기 일시정지' : '동화 읽기 재생'}>
      {preparing ? <LoaderCircle className={styles.spinner} size={22} /> : playing ? <Pause size={22} /> : <Play size={22} />}
    </button>
    <div className={styles.controls}>
      <div className={styles.caption}><span><Headphones size={14} />{preparing ? `목소리를 불러오고 있어요 ${readyCount}/${props.pages.length}` : resting ? '잠깐 숨을 고르고 있어요' : playing ? '목소리를 따라 책장이 넘어가요' : '읽어 주는 동화'}</span><time>{clock(position)} / {clock(total)}</time></div>
      <input type="range" min="0" max={total || 1} step="0.1" value={position} disabled={!segments.length || preparing} aria-label="동화 전체 재생 위치" aria-valuetext={`${clock(position)} / ${clock(total)}`} onChange={e => seek(Number(e.target.value))} />
      <nav className={styles.checkpoints} aria-label="페이지별 음성 이동">{segments.map((s, i) => <button type="button" key={i} onClick={() => seek(s.offset + s.start)} aria-current={i === segmentAt(segments, position) ? 'step' : undefined} title={`${s.label}쪽 · ${clock(s.offset + s.start)}`} aria-label={`${s.label}쪽부터 듣기`}>{s.label}</button>)}</nav>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!preIndexed && !segments.length && !preparing && !error && <p className={styles.hint}>처음 재생할 때 쪽별 시간을 준비해요.</p>}
    </div>
  </section>
}
