"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AppHeader } from "./app-header"
import { BackLink } from "./back-link"
import { ProfileRecovery } from "./profile-recovery"
import { RemoteBook } from "./workpad/remote-book"
import { Quiz, type QuizResult } from "./workpad/quiz"
import { useProfile } from "@/lib/profile-context"
import { useSessionView } from "@/lib/use-session-view"
import { dashboardInitial, validDashboard } from "@/lib/view-state"
import { fetchSavedStory, buildSubmission, submitAssessment } from "@/lib/workpad-data"
import { bookPath, returnPath, openStoryAssessment, fetchStoryAttempt } from "@/lib/bookshelf"

export function BookReaderPage({storyId,from,view}:{storyId:string;from:string;view:string}) {
  const router=useRouter()
  const practiceId=useSearchParams().get("practice")
  const {currentProfile,loading:profileLoading,error:profileError,sessionScope,updateProfile}=useProfile()
  const origin=from==='stickers'?'stickers':from==='library'?'library':'dashboard'
  const screen=useSessionView(sessionScope?`${sessionScope}:story:${storyId}`:null,dashboardInitial,validDashboard)
  const [error,setError]=useState<string|null>(null)
  const [retry,setRetry]=useState(0)
  const [verified,setVerified]=useState('')
  const [busy,setBusy]=useState(false)
  const profileId=currentProfile?.id
  useEffect(()=>{if(!profileLoading&&!profileError&&!profileId)router.replace('/profiles')},[profileLoading,profileError,profileId,router])
  useEffect(()=>{
    if(!profileId||!screen.ready)return
    let active=true;setError(null);setVerified('')
    // 저장된 화면 상태가 있어도 본인 소유의 책인지 서버에서 다시 확인한다.
    fetchSavedStory(storyId,profileId).then(assessment=>{if(active){screen.setValue(old=>({...old,assessment:{...assessment,attempt_id:old.assessment?.attempt_id}}));setVerified(`${profileId}:${storyId}`)}})
      .catch(()=>{if(active)setError('책을 열지 못했어요. 삭제된 책이거나 연결이 잠시 끊겼을 수 있어요.')})
    return()=>{active=false}
  },[profileId,storyId,screen.ready,screen.setValue,retry])
  const assessment=screen.value.assessment
  useEffect(()=>{
    if(view!=='quiz'||!profileId||!screen.ready||!assessment||error)return
    let active=true;setBusy(true);
    (practiceId?fetchStoryAttempt(profileId,storyId,practiceId):openStoryAssessment(profileId,storyId)).then(attempt=>{
      if(!active)return
      if(attempt.result?.result_id){router.replace(`/results/${attempt.result.result_id}?from=${origin}`);return}
      screen.setValue(old=>({...old,assessment:old.assessment?{...old.assessment,attempt_id:attempt.attempt_id,quizzes:attempt.quizzes}:null}))
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'문제를 준비하지 못했어요.')}).finally(()=>{if(active)setBusy(false)})
    return()=>{active=false}
  // 문항 객체 갱신으로 회차 발급을 반복하지 않는다.
  },[view,practiceId,profileId,storyId,screen.ready,Boolean(assessment),retry,origin,router,screen.setValue])
  const submit=async(quiz:QuizResult)=>{
    if(!assessment||!currentProfile||busy)return
    setBusy(true)
    try{
      const result=await submitAssessment(buildSubmission(currentProfile.id,assessment,quiz.answers))
      if(!screen.isCurrent())return
      updateProfile(currentProfile.id,{level:result.level})
      screen.setValue(old=>({...old,result}))
      router.replace(`/results/${result.result_id}?from=${origin}`)
    }catch(e){if(screen.isCurrent())toast.error(e instanceof Error?e.message:'결과를 저장하지 못했어요. 다시 제출해 주세요.')}
    finally{if(screen.isCurrent())setBusy(false)}
  }
  if(!currentProfile||!screen.ready)return <ProfileRecovery/>
  return <div className="min-h-screen bg-background"><AppHeader/>
    {error?<main className="mx-auto max-w-xl px-5 py-16"><BackLink href={returnPath(origin)} label="책장으로 돌아가기"/><p role="alert" className="my-6">{error}</p><button onClick={()=>{setError(null);setRetry(v=>v+1)}} className="rounded-full bg-primary px-6 py-3 text-primary-foreground">다시 불러오기</button></main>
    :!assessment||verified!==`${profileId}:${storyId}`?<p role="status" className="py-20 text-center">책을 펼치고 있어요…</p>
    :view==='quiz'?<main className="mx-auto max-w-3xl px-5 py-8"><BackLink href={bookPath(storyId,origin)} label="본문 다시 보기" className="mb-6"/>{busy&&<p role="status" className="mb-4 text-center">문제와 결과를 준비하고 있어요…</p>}<fieldset disabled={busy||!assessment.attempt_id}><Quiz persistenceKey={`${sessionScope}:quiz:${storyId}:${assessment.attempt_id}`} questions={assessment.quizzes} title="이야기를 떠올려 볼까요?" intro="천천히 읽고 마음에 드는 답을 골라 보세요." onComplete={submit}/></fieldset></main>
    :<RemoteBook key={`${currentProfile.id}:${storyId}`} profileId={currentProfile.id} storyId={storyId} vocabulary={{ profileId: currentProfile.id, storyId, initialAnalysis: assessment.generation?.vocab_analysis }} persistenceKey={`${sessionScope}:book:${storyId}`} pages={assessment.pages} title={assessment.title} coverImage={assessment.cover_image} coverColor={assessment.cover_color} childName={currentProfile.name} hasQuiz={assessment.quizzes.length>0}
      onExit={()=>router.push(returnPath(origin))} exitLabel={origin==='stickers'?'스티커북으로 돌아가기':origin==='library'?'전체 책장으로 돌아가기':'내 책장으로 돌아가기'} onFinish={()=>router.push(assessment.quizzes.length?`${bookPath(storyId,origin)}&view=quiz`:returnPath(origin))}/>}
  </div>
}
