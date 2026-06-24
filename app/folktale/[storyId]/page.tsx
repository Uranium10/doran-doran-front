import { FolktaleReader } from "@/components/folktale-reader"

export default async function FolktalePage({
  params,
}: {
  params: Promise<{ storyId: string }>
}) {
  const { storyId } = await params
  return (
    <main className="min-h-screen bg-background">
      <FolktaleReader storyId={storyId} />
    </main>
  )
}
