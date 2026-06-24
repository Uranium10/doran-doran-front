"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/lib/profile-context"
import { AuthButton } from "@/components/auth-button"
import { ProfileMenu } from "@/components/profile-menu"

const navItems = [
  { label: "대쉬보드", href: "/#hero"},
  { label: "라이브러리", href: "/#library" },
  { label: "가격", href: "/#pricing" },
  { label: "문해력 평가기준", href: "/#criteria" },
  { label: "자주 묻는 질문", href: "/#faq" },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  // 프로필 선택까지 완료된 상태면 구글 계정 대신 아이 프로필 메뉴를 노출한다.
  const { currentProfile } = useProfile()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-gradient-to-b from-black/50 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "font-heading text-2xl tracking-tight transition-colors",
              scrolled ? "text-primary" : "text-white",
            )}
          >
            도란도란
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                scrolled ? "text-foreground/80" : "text-white/90",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {currentProfile ? <ProfileMenu /> : <AuthButton light={!scrolled} />}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full md:hidden",
            scrolled ? "text-foreground" : "text-white",
          )}
          aria-label="메뉴 열기"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground/90 hover:bg-secondary"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2">
              {currentProfile ? <ProfileMenu /> : <AuthButton fullWidth />}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
