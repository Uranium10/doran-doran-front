"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppHeader } from "@/components/app-header"
import { MyBookshelf } from "@/components/my-bookshelf"
import { ConfirmModal } from "@/components/confirm-modal"
import { ProfileRecovery } from "@/components/profile-recovery"
import { useProfile } from "@/lib/profile-context"
import { useGeneration } from "@/lib/generation-context"
import { isGuestProfile } from "@/lib/api"
import { needsMeasurement } from "@/lib/levels"

export default function DashboardPage(){
  const router=useRouter()
  const {currentProfile,loading,error}=useProfile()
  const {requestedStory,consumeStory}=useGeneration()
  const [measure,setMeasure]=useState(false)
  useEffect(()=>{if(!loading&&!error&&!currentProfile)router.replace('/profiles')},[loading,error,currentProfile,router])
  useEffect(()=>{if(requestedStory)consumeStory()},[requestedStory,consumeStory])
  if(!currentProfile)return <ProfileRecovery/>
  const create=()=>{
    if(isGuestProfile(currentProfile.id)){toast.error('동화 만들기는 로그인 후 이용할 수 있어요.');return}
    if(needsMeasurement(currentProfile.level)){setMeasure(true);return}
    router.push('/stories/new')
  }
  return <div className="min-h-screen bg-background"><AppHeader/><main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10"><MyBookshelf key={currentProfile.id} onCreate={create}/></main>
    <ConfirmModal open={measure} title="우리 아이의 읽기 단계를 알아볼까요?" description="첫 동화를 만들기 전에 간단한 측정으로 알맞은 단계를 찾아요." confirmLabel="단계 알아보기" cancelLabel="나중에" onConfirm={()=>{setMeasure(false);router.push('/literacy')}} onClose={()=>setMeasure(false)}/>
  </div>
}
