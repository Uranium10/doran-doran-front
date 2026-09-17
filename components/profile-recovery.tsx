"use client"

import { useProfile } from "@/lib/profile-context"

/** 통신 실패를 '선택한 아이 없음'으로 취급하지 않고 현재 URL에서 재시도한다. */
export function ProfileRecovery() {
  const { error, refreshProfiles } = useProfile()
  return <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
    <p role="status">{error || "이전 화면을 준비하고 있어요…"}</p>
    {error && <button type="button" className="rounded-full bg-primary px-6 py-3 text-primary-foreground" onClick={() => void refreshProfiles()}>다시 시도</button>}
  </div>
}
