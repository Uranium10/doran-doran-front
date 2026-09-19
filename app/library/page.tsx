import { AppHeader } from "@/components/app-header"
import { LibraryGallery } from "@/components/library-gallery"
import { BackLink } from "@/components/back-link"
export default async function LibraryPage({searchParams}:{searchParams:Promise<{from?:string}>}) {
  const parent=(await searchParams).from==='parent'
  return <div className="min-h-screen bg-background"><AppHeader/><main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><BackLink href={parent?'/parent':'/dashboard'} label={parent?'부모님 책방으로 돌아가기':'내 책장으로'} className="mb-6"/><LibraryGallery from={parent?'parent-library':'library'}/></main></div>
}
