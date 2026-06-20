"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 대시보드 하위 컨텐츠 좌측 상단에 표시하는 "이전으로" 링크.
 * 기본적으로 /dashboard 로 돌아가지만, href 로 목적지를 바꿀 수 있고
 * onClick 을 주면 라우팅 대신 콜백을 실행한다(예: 같은 페이지 내 뷰 전환).
 */
export function BackLink({
  href = "/dashboard",
  label = "이전으로",
  onClick,
  className,
}: {
  href?: string
  label?: string
  onClick?: () => void
  className?: string
}) {
  const classes = cn(
    "inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
    className,
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        <ChevronLeft className="h-4 w-4" />
        {label}
      </button>
    )
  }

  return (
    <Link href={href} className={classes}>
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
