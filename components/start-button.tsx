"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useProfile } from "@/lib/profile-context"

type StartButtonProps = {
  /** 어두운 배경(footer primary 등) 위에서 흰 버튼으로 대비를 확보한다. */
  light?: boolean
  className?: string
}

/**
 * 랜딩(hero/footer)용 CTA 버튼.
 * - 비로그인: "무료로 시작하기" -> Google 로그인 트리거
 * - 로그인 상태: "대쉬보드로 이동" -> 프로필 유무에 따라 /dashboard 또는 /profiles 로 이동
 */
export function StartButton({ light = false, className }: StartButtonProps) {
  const router = useRouter()
  const { currentProfile } = useProfile()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isReady, setIsReady] = useState(false) // 깜빡임 방지용

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setIsReady(true)
      return
    }

    // 1. 마운트 시 현재 로그인 세션 확인
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setIsLoggedIn(!!data.session)
      setIsReady(true)
    }
    
    checkSession()

    // 2. 다른 탭이나 화면에서 로그인 상태가 변할 경우 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleClick = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    // 로그인 되어있는 경우: 프로필이 선택됐으면 대시보드, 아니면 프로필 선택 화면
    if (isLoggedIn) {
      router.push(currentProfile ? "/dashboard" : "/profiles")
      return
    }

    // 비로그인: Google OAuth 진행 후 프로필 선택 화면으로 리다이렉트
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/profiles` : undefined
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    })
    
    if (error) {
      console.error("[v0] Google 로그인 실패:", error.message)
    }
  }

  return (
    <Button
      onClick={handleClick}
      // 세션 확인 전까지는 버튼을 살짝 투명하게 처리하여 텍스트 깜빡임 방지
      className={cn(
        "rounded-full transition-opacity duration-300",
        !isReady && "opacity-0", 
        light && "bg-white text-primary hover:bg-white/90 border border-white/40",
        className,
      )}
    >
      {isLoggedIn ? "대쉬보드로 이동" : "무료로 시작하기"}
    </Button>
  )
}