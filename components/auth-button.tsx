"use client"

import { useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { ChevronDown, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { syncCurrentUser } from "@/lib/api"

type AuthButtonProps = {
  /** When true, render labels in a light tone for use over dark/hero backgrounds. */
  light?: boolean
  /** When true, the button stretches to fill its container (mobile menu). */
  fullWidth?: boolean
  className?: string
  /** Called after a successful sign-out (e.g. to navigate elsewhere). */
  onSignedOut?: () => void
}

function getInitial(name: string | undefined, email: string | undefined) {
  const source = name?.trim() || email?.trim() || "?"
  return source.charAt(0).toUpperCase()
}

export function AuthButton({ light = false, fullWidth = false, className, onSignedOut }: AuthButtonProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Real-time session detection.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      // 로그인 상태면 백엔드 DB와 동기화 (없으면 생성, 있으면 통과)
      if (data.session) void syncCurrentUser()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      if (nextSession) void syncCurrentUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  const handleSignIn = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    // After Google login, land on the profile selection screen.
    // Use the current origin so OAuth returns to whatever host we're on
    // (localhost, v0 preview, or production) instead of a hardcoded URL.
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/profiles` : undefined
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) {
      console.error("[v0] Google 로그인 실패:", error.message)
    }
  }

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    await supabase.auth.signOut()
    setMenuOpen(false)
    onSignedOut?.()
  }

  // Loading: subtle themed placeholder that matches the button footprint.
  if (loading) {
    return (
      <div
        className={cn(
          "h-9 animate-pulse rounded-full bg-muted/60",
          fullWidth ? "w-full" : "w-28",
          className,
        )}
        aria-hidden="true"
      />
    )
  }

  // Logged out: identical to the original "무료 시작하기" button.
  if (!session) {
    return (
      <Button
        onClick={handleSignIn}
        className={cn("rounded-full", fullWidth && "w-full", className)}
      >
        무료 시작하기
      </Button>
    )
  }

  const user = session.user
  const meta = user.user_metadata ?? {}
  const fullName: string | undefined = meta.full_name || meta.name
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture
  const displayName = fullName ? `${fullName}님` : `${user.email}님`

  return (
    <div ref={menuRef} className={cn("relative", fullWidth && "w-full", className)}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          fullWidth && "w-full justify-start",
          light
            ? "border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
            : "border-border bg-card text-foreground hover:bg-muted shadow-sm",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground ring-2 ring-primary/20">
          {avatarUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt={`${fullName ?? "사용자"} 프로필 사진`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold">{getInitial(fullName, user.email)}</span>
          )}
        </span>
        <span className="max-w-[10rem] truncate font-heading text-sm tracking-tight">
          {displayName}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-70 transition-transform duration-200",
            menuOpen && "rotate-180",
          )}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150",
            fullWidth && "left-0 right-auto w-full",
          )}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
              {avatarUrl && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl || "/placeholder.svg"}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold">{getInitial(fullName, user.email)}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm">{fullName ?? "사용자"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
