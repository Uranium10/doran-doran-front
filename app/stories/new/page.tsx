"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { ProfileRecovery } from "@/components/profile-recovery"
import { StorySetup } from "@/components/workpad/story-setup"
import { useProfile } from "@/lib/profile-context"
import { useGeneration } from "@/lib/generation-context"
import { isGuestProfile } from "@/lib/api"
import { needsMeasurement } from "@/lib/levels"
import type { StoryInput } from "@/lib/workpad-data"
export default function Page(){
  const router=useRouter();const {currentProfile,loading,error,sessionScope}=useProfile();const generation=useGeneration()
  useEffect(()=>{
    if(loading||error)return
    if(!currentProfile)router.replace('/profiles')
    else if(isGuestProfile(currentProfile.id))router.replace('/dashboard')
    else if(needsMeasurement(currentProfile.level))router.replace('/literacy')
  },[currentProfile,loading,error,router])
  if(!currentProfile||isGuestProfile(currentProfile.id)||needsMeasurement(currentProfile.level))return <ProfileRecovery/>
  const submit=(input:StoryInput)=>{void generation.start(currentProfile.id,input).catch(e=>toast.error(e instanceof Error?e.message:'동화를 시작하지 못했어요.'));router.push('/dashboard', { scroll: false })}
  return <div className="min-h-screen bg-background"><AppHeader/><main className="mx-auto max-w-4xl px-5 py-8"><BackLink label="내 책장으로" className="mb-6"/><StorySetup key={currentProfile.id} profileId={currentProfile.id} persistenceKey={`${sessionScope}:story-form`} defaultName={currentProfile.name} onSubmit={submit}/></main></div>
}
