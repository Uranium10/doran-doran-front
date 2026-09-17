export type BookGesture = {
  pointerId: number
  x: number
  y: number
  maxTravel: number
  side?: string
}

/** 시작점으로 되돌아온 드래그를 짧은 탭으로 오인하지 않도록 이동 이력을 남긴다. */
export function trackBookGesture(gesture: BookGesture, x: number, y: number): BookGesture {
  return { ...gesture, maxTravel: Math.max(gesture.maxTravel, Math.hypot(x - gesture.x, y - gesture.y)) }
}

/** 손을 뗄 때 한 번만 넘긴다. 세로 움직임·떨림은 페이지 이동으로 바꾸지 않는다. */
export function bookGestureDirection(gesture: BookGesture, x: number, y: number): -1 | 0 | 1 {
  const dx = x - gesture.x, dy = y - gesture.y
  // 작은 화면의 짧은 가로 스와이프도 받되, 대각선은 가로 이동이 분명할 때만 받는다.
  if (Math.abs(dx) >= 32 && Math.abs(dx) > Math.abs(dy) * 1.2) return dx < 0 ? 1 : -1
  if (trackBookGesture(gesture, x, y).maxTravel < 10) {
    if (gesture.side === "previous") return -1
    if (gesture.side === "next") return 1
  }
  return 0
}
