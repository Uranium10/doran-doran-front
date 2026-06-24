import Link from "next/link"
import { Sparkles } from "lucide-react"
import { AuthButton } from "@/components/auth-button"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-12 sm:py-14">
          <h2 className="text-balance font-heading text-3xl sm:text-4xl">
            오늘, 우리 아이의 첫 전래동화를 시작해 보세요
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-primary-foreground/90">
            문해력 테스트부터 나만의 팝업북까지, 3분이면 충분해요.
          </p>
          {/* 로그인 상태에 따라 'Google 로그인' 또는 프로필 화면 진입으로 연결 */}
          <div className="mt-7 flex justify-center">
            <AuthButton light className="h-13 px-8 text-base" />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-heading text-xl text-primary">도란도란</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/#library" className="hover:text-primary">라이브러리</Link>
            <Link href="/#pricing" className="hover:text-primary">가격</Link>
            <Link href="/#criteria" className="hover:text-primary">평가 기준</Link>
            <Link href="/#faq" className="hover:text-primary">FAQ</Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} 도란도란
          </p>
        </div>
      </div>
    </footer>
  )
}
