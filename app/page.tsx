import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { LibraryRows } from "@/components/library-rows"
import { Criteria } from "@/components/criteria"
// 가격 안내 재개 시 import와 아래 영역을 함께 복구한다.
// import { Pricing } from "@/components/pricing"
import { Faq } from "@/components/faq"
import { SiteFooter } from "@/components/site-footer"
import { AuthRedirectGate } from "@/components/auth-redirect-gate"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* <AuthRedirectGate /> */}
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <LibraryRows />
      <Criteria />
      {/* 가격 안내 임시 비활성화: <Pricing /> */}
      <Faq />
      <SiteFooter />
    </main>
  )
}
