/** 서버 결과를 바꾸지 않고 보여 줄 순서만 만든다. 점수 계산은 이 파일에서 하지 않는다. */
export type ProgressPhase = "hold" | "fill" | "promote" | "reset" | "done"
export type ProgressStep = { stage: number; from: number; to: number; duration: number; phase: ProgressPhase }
export type ProgressPlan = { steps: ProgressStep[]; stage: number; percent: number; previous: number | null; delta: number | null; duration: number }
export type ProgressFrame = { stage: number; percent: number; phase: ProgressPhase; step: number }
const bounded = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number) => Math.round(value * 100) / 100
const percentOf = (level: number) => level >= 20 ? 100 : round((level - Math.floor(level)) * 100)

export function planProgress(level: number, achievement: number, delta: number | null): ProgressPlan {
  const target = bounded(Number.isFinite(level) ? round(level) : 1, 1, 20)
  const stage = Math.floor(target)
  const percent = stage === 20 ? 100 : bounded(Number.isFinite(achievement) ? achievement : percentOf(target), 0, 100)
  const change = delta !== null && Number.isFinite(delta) ? delta : null
  // DB가 저장한 소수 두 자리 level/delta에서 이전 레벨을 복원한다. 부동소수 오차로 단계가 내려가지 않게 반올림한다.
  const previous = change === null ? null : bounded(round(target - change), 1, 20)
  const firstStage = previous === null ? stage : Math.floor(previous)
  const firstPercent = previous === null ? 0 : percentOf(previous)
  const steps: ProgressStep[] = []
  const add = (s: number, from: number, to: number, duration: number, phase: ProgressPhase) => steps.push({ stage: s, from, to, duration, phase })
  const boundaries = Math.abs(stage - firstStage)
  // 비정상적으로 큰 과거 변화도 긴 연출로 사용자를 붙잡지 않도록 전체 길이를 제한한다.
  const fillTime = boundaries > 1 ? 1100 / boundaries : 950
  const pulseTime = boundaries > 1 ? 700 / boundaries : 700
  add(firstStage, firstPercent, firstPercent, 320, "hold")
  let cursor = firstStage, value = firstPercent
  while (cursor < stage) {
    add(cursor, value, 100, fillTime, "fill")
    add(cursor, 100, 100, pulseTime, "promote")
    cursor++;value = cursor === 20 ? 100 : 0
    add(cursor, value, value, boundaries > 1 ? 30 : 160, "reset")
  }
  while (cursor > stage) {
    add(cursor, value, 0, fillTime, "fill")
    cursor--;value = 100
    // 낮아진 결과에는 승급 효과를 재생하지 않는다. 같은 수치 이동만 차분하게 보여준다.
    add(cursor, value, value, boundaries > 1 ? 30 : 160, "reset")
  }
  if (Math.abs(value - percent) > 0.01) add(stage, value, percent, 950, "fill")
  return { steps, stage, percent, previous, delta: change, duration: steps.reduce((sum, step) => sum + step.duration, 0) }
}

export function progressFrame(plan: ProgressPlan, elapsed: number): ProgressFrame {
  let time = Math.max(0, elapsed)
  for (let index = 0; index < plan.steps.length; index++) {
    const step = plan.steps[index]
    if (time < step.duration) {
      const t = time / step.duration
      const ease = 1 - Math.pow(1 - t, 3)
      return { stage: step.stage, percent: Math.round((step.from + (step.to - step.from) * ease) * 10) / 10, phase: step.phase, step: index }
    }
    time -= step.duration
  }
  return { stage: plan.stage, percent: plan.percent, phase: "done", step: plan.steps.length }
}
