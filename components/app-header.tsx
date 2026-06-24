"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { useProfile } from "@/lib/profile-context"
import { AuthButton } from "@/components/auth-button"
import { ProfileMenu } from "@/components/profile-menu"

export function AppHeader() {
  const { currentProfile } = useProfile()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-heading text-xl text-primary">도란도란</span>
        </Link>

        {/* 프로필이 없으면 구글 계정(AuthButton), 있으면 아이 프로필 배지 */}
        {!currentProfile ? <AuthButton /> : <ProfileMenu />}
      </div>
    </header>
  )
}
