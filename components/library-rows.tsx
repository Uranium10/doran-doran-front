"use client"

import Link from "next/link"
import { Clock, Play } from "lucide-react"
import { folktales, rows, type Folktale } from "@/lib/folktales"

function Card({ tale }: { tale: Folktale }) {
  return (
    <Link
      href="/dashboard"
      className="group relative w-44 shrink-0 sm:w-52"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted shadow-md transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tale.cover || "/placeholder.svg"}
          alt={`${tale.title} 표지`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="font-heading text-lg text-white">{tale.title}</h3>
          <p className="text-xs text-white/80">{tale.subtitle}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/80">
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {tale.ageRange}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {tale.minutes}분
            </span>
          </div>
        </div>
        <div className="absolute right-3 top-3 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="h-4 w-4 fill-current" />
        </div>
      </div>
    </Link>
  )
}

export function LibraryRows() {
  const byId = (id: string) => folktales.find((t) => t.id === id)!

  return (
    <section id="library" className="scroll-mt-20 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-heading text-3xl text-foreground sm:text-4xl">
            전래동화 라이브러리
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            대대로 전해 내려온 우리 이야기를 골라 보세요. 어떤 이야기든 아이의
            이름과 수준에 맞춰 새롭게 다시 태어납니다.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          {rows.map((row) => (
            <div key={row.title}>
              <h3 className="mb-4 font-heading text-xl text-foreground sm:text-2xl">
                {row.title}
              </h3>
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                {row.ids.map((id, i) => (
                  <Card key={`${row.title}-${id}-${i}`} tale={byId(id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
