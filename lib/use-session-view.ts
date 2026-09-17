"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react"

type Envelope<T> = { version: 1; value: T }
/** 화면 복구 전 기본값이 저장된 내용을 덮지 않도록 ready/key를 함께 관리한다. */
export function useSessionView<T>(key: string | null, initial: T, valid: (value: unknown) => value is T) {
  const defaults = useRef(initial)
  const validator = useRef(valid)
  defaults.current = initial; validator.current = valid
  const [state, setState] = useState({ key, ready: key === null, value: initial })
  const latest = useRef(state)
  const lifetime = useMemo(() => ({ active: true }), [key])
  useEffect(() => {
    lifetime.active = true
    let value = defaults.current
    if (key) try {
      const raw = sessionStorage.getItem(key)
      const parsed: Envelope<unknown> | null = raw ? JSON.parse(raw) : null
      if (parsed?.version === 1 && validator.current(parsed.value)) value = parsed.value
    } catch { /* 저장소 차단/손상은 현재 화면의 기본 상태로 복구한다. */ }
    latest.current = { key, ready: true, value }
    setState(latest.current)
    return () => { lifetime.active = false }
  }, [key, lifetime])
  const isCurrent = useCallback(() => lifetime.active, [lifetime])
  const setValue = useCallback((next: SetStateAction<T>) => {
    // 화면을 떠난 뒤 도착한 응답이 로그아웃 때 지운 개인 기록을 다시 쓰지 않게 한다.
    if (!lifetime.active) return
    const before = latest.current.key === key ? latest.current.value : defaults.current
    const value = typeof next === "function" ? (next as (previous: T) => T)(before) : next
    // React 상태 갱신 함수 밖에서 기록하므로 StrictMode에서도 저장 부작용을 재실행하지 않는다.
    if (key) try { sessionStorage.setItem(key, JSON.stringify({ version: 1, value })) } catch {}
    latest.current = { key, ready: true, value }
    setState(latest.current)
  }, [key, lifetime])
  return { value: state.key === key ? state.value : initial, ready: state.key === key && state.ready, setValue, isCurrent }
}

export const objectValue = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
export const answerValues = (value: unknown): value is Record<string, string> => objectValue(value) && Object.values(value).every(v => typeof v === "string")

/** 서로 다른 출제 내용을 같은 임시 답안으로 복구하지 않도록 문항 내용까지 키에 반영한다. */
export function questionKey(value: unknown): string {
  let hash = 2166136261
  for (const letter of JSON.stringify(value)) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(36)
}
