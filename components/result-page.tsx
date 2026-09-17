"use client"

import { useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "./app-header"
import { BackLink } from "./back-link"
import { ProfileRecovery } from "./profile-recovery"
import { StickerCollection } from "./sticker-collection"
import { LiteracyResultView } from "./workpad/literacy-result"
import { useProfile } from "@/lib/profile-context"
import { fetchQuizResult,returnPath,startStoryPractice,bookPath } from "@/lib/bookshelf"
import type { LiteracyResult } from "@/lib/levels"

export function ResultPage({resultId,from}:{resultId:string;from:string}) {
  const {currentProfile,loading,error:profileError}=useProfile();const router=useRouter()
  const [state,setState]=useState<{key:string;result?:LiteracyResult;error?:string}>({key:''})
  const [retry,setRetry]=useState(0)
  const [practicing,setPracticing]=useState(false)
  const [practiceError,setPracticeError]=useState("")
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
  const practice=async()=>{
    if(!result?.story_id||practicing)return
    setPracticing(true);setPracticeError("")
    try{
      const attempt=await startStoryPractice(currentProfile.id,result.story_id)
      const origin=from==='library'?'library':from==='stickers'?'stickers':'dashboard'
      router.push(`${bookPath(result.story_id,origin)}&view=quiz&practice=${encodeURIComponent(attempt.attempt_id)}`)
    }catch{setPracticeError('다시 풀기를 준비하지 못했어요. 잠시 후 다시 눌러 주세요.');setPracticing(false)}
  }
  return <div className="min-h-screen bg-background"><AppHeader/><main className="mx-auto max-w-4xl px-5 py-8"><BackLink href={returnPath(from)} label={from==='stickers'?'스티커북으로 돌아가기':from==='parent'?'부모님 책방으로 돌아가기':from==='library'?'전체 책장으로 돌아가기':'내 책장으로 돌아가기'} className="mb-6"/>
    {state.error?<p role="alert">{state.error} <button onClick={()=>setRetry(v=>v+1)} className="underline">다시 시도</button></p>:result?<LiteracyResultView rewards={result.story_id?<StickerCollection key={`${currentProfile.id}:${result.story_id}`} profileId={currentProfile.id} storyId={result.story_id}/>:undefined} secondaryLabel={result.story_id?(practicing?'문제를 준비하고 있어요…':'다시 풀고 스티커 도전하기'):undefined} onSecondary={result.story_id?practice:undefined} result={result} childName={currentProfile.name} showScore={result.assessment_type!=='checklist'} primaryLabel={from==='stickers'?'스티커북으로 돌아가기':from==='parent'?'부모님 책방으로 돌아가기':from==='library'?'전체 책장으로 돌아가기':'내 책장으로 돌아가기'} onPrimary={()=>router.push(returnPath(from))}/>:<p role="status" className="py-16 text-center">답안지를 펼치고 있어요…</p>}
    {practiceError&&<p role="alert" className="mt-4 text-center text-sm">{practiceError}</p>}
  </main></div>
}
