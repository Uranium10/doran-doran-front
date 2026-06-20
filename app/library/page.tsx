"use client"

import { AppHeader } from "@/components/app-header"
import { LibraryGallery } from "@/components/library-gallery"
import { BackLink } from "@/components/back-link"

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <BackLink className="mb-6" />
        <LibraryGallery />
      </main>
    </div>
  )
}
