"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sparkles, ChevronLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ComingSoonPage() {
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-8 w-8 text-primary" />
      </span>
      <h1 className="mt-6 text-balance font-heading text-3xl text-foreground sm:text-4xl">
        준비 중인 기능이에요
      </h1>
      <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
        더 좋은 모습으로 찾아뵙기 위해 열심히 만들고 있어요. 조금만 기다려
        주세요!
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="h-12 rounded-full px-7 text-base"
          onClick={() => router.back()}
        >
          <ChevronLeft className="mr-1 h-5 w-5" />
          이전 화면으로
        </Button>
        <Button
          render={<Link href="/" />}
          size="lg"
          variant="secondary"
          className="h-12 rounded-full px-7 text-base"
        >
          <Home className="mr-1 h-5 w-5" />
          홈으로 가기
        </Button>
      </div>
    </main>
  )
}
