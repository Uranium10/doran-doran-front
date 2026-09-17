"use client"

import { useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "./app-header"
import { BackLink } from "./back-link"
import { ProfileRecovery } from "./profile-recovery"
import { LiteracyResultView } from "./workpad/literacy-result"
import { useProfile } from "@/lib/profile-context"
import { fetchQuizResult,returnPath } from "@/lib/bookshelf"
import type { LiteracyResult } from "@/lib/levels"

export function ResultPage({resultId,from}:{resultId:string;from:string}) {
  const {currentProfile,loading,error:profileError}=useProfile();const router=useRouter()
  const [state,setState]=useState<{key:string;result?:LiteracyResult;error?:string}>({key:''})
  const [retry,setRetry]=useState(0)
  const key=`${currentProfile?.id}:${resultId}`
  useEffect(()=>{if(!loading&&!profileError&&!currentProfile)router.replace('/profiles')},[loading,profileError,currentProfile,router])
  useEffect(()=>{
    if(!currentProfile)return
    let active=true;setState({key})
    fetchQuizResult(currentProfile.id,resultId).then(result=>{if(active)setState({key,result})})
      .catch(()=>{if(active)setState({key,error:'결과지를 불러오지 못했어요.'})})
    return()=>{active=false}
  },[currentProfile?.id,resultId,key,retry])
  if(!currentProfile)return <ProfileRecovery/>
  const result=state.key===key?state.result:undefined
  return <div className="min-h-screen bg-background"><AppHeader/><main className="mx-auto max-w-4xl px-5 py-8"><BackLink href={returnPath(from)} label={from==='parent'?'부모님 책방으로 돌아가기':from==='library'?'전체 책장으로 돌아가기':'내 책장으로 돌아가기'} className="mb-6"/>
    {state.error?<p role="alert">{state.error} <button onClick={()=>setRetry(v=>v+1)} className="underline">다시 시도</button></p>:result?<LiteracyResultView result={result} childName={currentProfile.name} showScore={result.assessment_type!=='checklist'} primaryLabel={from==='parent'?'부모님 책방으로 돌아가기':from==='library'?'전체 책장으로 돌아가기':'내 책장으로 돌아가기'} onPrimary={()=>router.push(returnPath(from))}/>:<p role="status" className="py-16 text-center">답안지를 펼치고 있어요…</p>}
  </main></div>
}
