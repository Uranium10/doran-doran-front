"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type StartButtonProps = {
  /** 어두운 배경(footer primary 등) 위에서 흰 버튼으로 대비를 확보한다. */
  light?: boolean
  className?: string
  children?: React.ReactNode
}

/**
 * 랜딩(hero/footer)용 "무료 시작하기" CTA.
 * AuthButton 과 달리 로그인 상태에 따라 외형이 바뀌지 않고 항상 동일한 버튼을 보여준다.
 * - 비로그인: Google 로그인 트리거
 * - 로그인: 프로필 선택 화면(/profiles)으로 이동
 */
export function StartButton({ light = false, className, children = "무료 시작하기" }: StartButtonProps) {
  const router = useRouter()

  const handleClick = async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      router.push("/profiles")
      return
    }

    const { data } = await supabase.auth.getSession()
    // 이미 로그인된 상태라면 바로 프로필 선택 화면으로 보낸다.
    if (data.session) {
      router.push("/profiles")
      return
    }

    // 비로그인: Google OAuth 후 프로필 선택 화면으로 복귀.
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/profiles` : undefined
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
      className={cn(
        "rounded-full",
        light && "bg-white text-primary hover:bg-white/90 border border-white/40",
        className,
      )}
    >
      {children}
    </Button>
  )
}
