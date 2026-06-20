"use client"

import { AppHeader } from "@/components/app-header"
import { LibraryGallery } from "@/components/library-gallery"

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <LibraryGallery />
      </main>
    </div>
  )
}
