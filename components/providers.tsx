"use client"

import type { ReactNode } from "react"
import { Toaster } from "sonner"
import { ProfileProvider } from "@/lib/profile-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      {children}
      {/* 서버 통신 에러 등 전역 알림용 토스트 */}
      <Toaster position="top-center" richColors closeButton />
    </ProfileProvider>
  )
}
