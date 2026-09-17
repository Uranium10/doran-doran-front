"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 대시보드 및 그 하위 컨텐츠 페이지 최하단에 두는 "홈 화면" 링크.
 * 로그인 후 홈은 내 책장으로 통일한다.
 */
export function HomeLink({ className }: { className?: string }) {
  return (
    <div className={cn("mt-12 flex justify-center border-t border-border pt-8", className)}>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <Home className="h-4 w-4" />
        내 책장
      </Link>
    </div>
  )
}
