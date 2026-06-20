"use client"

import type { ReactNode } from "react"
import { ProfileProvider } from "@/lib/profile-context"

export function Providers({ children }: { children: ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>
}
