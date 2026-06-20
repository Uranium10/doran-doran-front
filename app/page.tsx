import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { HowItWorks } from "@/components/how-it-works"
import { LibraryRows } from "@/components/library-rows"
import { Criteria } from "@/components/criteria"
import { Pricing } from "@/components/pricing"
import { Faq } from "@/components/faq"
import { SiteFooter } from "@/components/site-footer"
import { AuthRedirectGate } from "@/components/auth-redirect-gate"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <AuthRedirectGate />
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <LibraryRows />
      <Criteria />
      <Pricing />
      <Faq />
      <SiteFooter />
    </main>
  )
}
