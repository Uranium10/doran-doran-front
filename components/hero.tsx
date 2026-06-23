import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { folktales } from "@/lib/folktales"

export function Hero() {
  // Build a tiled grid of covers for the background mosaic.
  const tiles = [...folktales, ...folktales].slice(0, 12)

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background cover mosaic */}
      <div className="absolute inset-0 -z-10 grid-container" style={{width: '200vw'}}>
        <div className="grid-lane h-full" style={{display: 'flex'}}>
        <div className="grid h-full grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {tiles.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className="relative overflow-hidden"
              style={{ transform: i % 2 === 0 ? "translateY(-6%)" : "translateY(6%)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.cover || "/placeholder.svg"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="grid h-full grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {tiles.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className="relative overflow-hidden"
              style={{ transform: i % 2 === 0 ? "translateY(-6%)" : "translateY(6%)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.cover || "/placeholder.svg"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-background/70" />
      </div>

      <div className="mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            AI가 만드는 우리 아이만의 전래동화
          </span>
          <h1 className="mt-6 text-balance font-heading text-5xl leading-tight text-foreground text-shadow-storybook sm:text-6xl lg:text-7xl">
            지금 아이들에게
            <br />
            <span className="text-primary">전래동화</span>를 선물하세요
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            문해력 테스트로 아이의 수준을 확인하고, 아이 이름이 주인공이 되는
            한국형 전래동화를 만들어 보세요. 3D 팝업북처럼 살아 움직이는 그림책을
            만나보세요.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              render={<Link href="/dashboard" />}
              size="lg"
              className="h-13 rounded-full px-7 text-base point-hover"
            >
              <Play className="mr-1 h-5 w-5 fill-current" style={{ display: "inline", marginTop: "-4px" }} />
              무료 시작하기
            </Button>
            <Button
              render={<Link href="/#library" />}
              size="lg"
              variant="secondary"
              className="h-13 rounded-full px-7 text-base point-hover"
            >
              라이브러리 둘러보기
              <ArrowRight className="ml-1 h-5 w-5" style={{ display: "inline", marginTop: "-4px" }} />
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span>신용카드 없이 시작</span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground sm:block" />
            <span>3분이면 첫 동화 완성</span>
            <span className="hidden h-1 w-1 rounded-full bg-muted-foreground sm:block" />
            <span>문해력 전후 비교 리포트</span>
          </div>
        </div>
      </div>
    </section>
  )
}

