"use client"

import { useId, useRef } from "react"
import type { ReadingMode } from "@/lib/workpad-data"
import styles from "./reading-mode-picker.module.css"

const choices = [
  { id: "level_aligned", label: "실력 쑥쑥", hint: "내 읽기 단계에 맞춰 한 뼘 더 자라요." },
  { id: "relaxed", label: "편하게 읽기", hint: "쉬운 말로 즐겨요. 퀴즈와 스티커는 그대로, 단계 진척도는 쉬어 가요." },
] as const

/** 가벼운 벡터 그림: 작은 모바일에서도 선명하고 추가 이미지 요청 없이 나타난다. */
function ReadingPicture({ relaxed }: { relaxed: boolean }) {
  return <svg viewBox="0 0 180 128" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="91" cy="111" rx="61" ry="8" fill={relaxed ? "#d4c8ae" : "#c7d1ac"} opacity=".4"/>
    <circle cx={relaxed ? 112 : 77} cy="53" r="44" fill={relaxed ? "#f1dfb7" : "#e0e8c6"}/>
    {relaxed ? <>
      <path d="M127 19c-18 8-15 31 5 34-28 7-42-23-20-38 4-3 9-4 15-3-4 2-5 5 0 7Z" fill="#d49a49"/>
      <path d="m45 26 2 8 8 2-8 3-2 8-3-8-8-3 8-2Z" fill="#b88c4b"/>
      <path d="m144 65 2 5 6 2-6 2-2 6-2-6-5-2 5-2Z" fill="#b88c4b"/>
      <path d="M42 101c17-20 73-24 100-4l-8 15H51Z" fill="#bdcbbd" stroke="#758d80" strokeWidth="2.5" strokeLinejoin="round"/>
    </> : <>
      <path d="M88 77c3-19 1-36 3-50" stroke="#5e7e50" strokeWidth="4" strokeLinecap="round"/>
      <path d="M89 52C65 57 58 41 60 30c20-2 32 5 29 22Z" fill="#88a06a" stroke="#5e7e50" strokeWidth="2"/>
      <path d="M91 41c-2-21 11-29 30-28 1 17-10 31-30 28Z" fill="#b2c57e" stroke="#6b894e" strokeWidth="2"/>
      <path d="m137 50 2 7 8 2-8 3-2 7-2-7-7-3 7-2Z" fill="#d7a74e"/>
      <path d="M46 61v-8m-4 4h8" stroke="#c99648" strokeWidth="3" strokeLinecap="round"/>
    </>}
    <path d="M33 77c20-6 39-5 57 4 18-10 35-12 56-7l-4 34c-20-3-34-2-52 5-18-5-34-6-54-3Z" fill={relaxed ? "#ad765d" : "#638774"} stroke={relaxed ? "#865740" : "#466858"} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M39 68c19-5 35-2 51 9 17-12 34-16 50-12l-1 35c-17-3-33 0-49 10-15-8-31-10-48-7Z" fill="#fff9e9" stroke="#bdac86" strokeWidth="2" strokeLinejoin="round"/>
    <path d="m90 78 0 30M49 80c11-1 21 2 31 7m-29 3c10 0 18 3 26 6m24-10c9-6 18-9 28-9m-26 18c8-4 16-6 24-6" stroke="#d5c7a8" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="m116 70-1 22 5-3 4 2 1-22" fill={relaxed ? "#bd835f" : "#daa34d"}/>
  </svg>
}

export function ReadingModePicker({ value, onChange }: { value: ReadingMode; onChange: (value: ReadingMode) => void }) {
  const id = useId()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  return <div className={styles.root}>
    <p id={`${id}-label`} className={styles.caption}>오늘은 어떻게 읽을까요?</p>
    {/* 두 요소를 계속 유지하고 transform/z-index만 바꿔 폼의 높이나 스크롤을 흔들지 않는다. */}
    <div role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} className={styles.deck}>
      {choices.map((choice, index) => <button key={choice.id} ref={node => { buttons.current[index] = node }}
        type="button" role="radio" aria-checked={value === choice.id} aria-label={choice.label}
        tabIndex={value === choice.id ? 0 : -1} data-selected={value === choice.id} data-side={index === 0 ? "left" : "right"}
        className={`${styles.choice} ${choice.id === "relaxed" ? styles.relaxed : styles.growth}`}
        onClick={() => onChange(choice.id)} onKeyDown={event => {
          const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) ? 1-index : null
          if (next !== null) { event.preventDefault(); onChange(choices[next].id); buttons.current[next]?.focus() }
        }}>
        <ReadingPicture relaxed={choice.id === "relaxed"}/>
        <span className={styles.label}>{choice.label}</span>
        <span className={styles.selection} aria-hidden="true">{value === choice.id ? "✓" : "+"}</span>
      </button>)}
    </div>
    <p id={`${id}-hint`} className={styles.hint} aria-live="polite">{choices.find(choice => choice.id === value)?.hint}</p>
  </div>
}
