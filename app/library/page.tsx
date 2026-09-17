"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { LibraryGallery } from "@/components/library-gallery"
import { BackLink } from "@/components/back-link"
import { HomeLink } from "@/components/home-link"

export default function LibraryPage() {
  const [reading, setReading] = useState(false)
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className={reading ? "w-full" : "mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14"}>
        {!reading && <BackLink className="mb-6" />}
        <LibraryGallery onReadingChange={setReading} />
        {!reading && <HomeLink />}
      </main>
    </div>
  )
}
