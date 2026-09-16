"use client"

import type { ReactNode } from "react"
import { Toaster } from "sonner"
import { GenerationProvider } from "@/lib/generation-context"
import { ProfileProvider } from "@/lib/profile-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <GenerationProvider>
        {children}
        {/* 완료 알림은 라우트가 바뀌어도 유지한다. */}
        <Toaster position="top-center" richColors closeButton />
      </GenerationProvider>
    </ProfileProvider>
  )
}
