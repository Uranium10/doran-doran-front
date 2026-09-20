import { ParentVocabularyPage } from "@/components/parent-vocabulary"

export default async function Page({searchParams}: {searchParams: Promise<{profile?: string}>}) {
  const params = await searchParams
  return <ParentVocabularyPage profileId={params.profile ?? ""}/>
}
