import { CreationPage } from '@/components/workpad/creation-page'
import { notFound } from 'next/navigation'
export default async function Page({params}:{params:Promise<{mode:string}>}) {
  const {mode}=await params
  if(!['original','personalized','drawing'].includes(mode))notFound()
  return <CreationPage mode={mode}/>
}
