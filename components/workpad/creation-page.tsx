"use client"
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { ProfileRecovery } from '@/components/profile-recovery'
import { StorySetup } from './story-setup'
import { DrawingStorySetup } from './drawing-story-setup'
import { useProfile } from '@/lib/profile-context'
import { useGeneration } from '@/lib/generation-context'
import { isGuestProfile } from '@/lib/api'
import { needsMeasurement } from '@/lib/levels'
import type { StoryInput } from '@/lib/workpad-data'
import styles from './drawing-story.module.css'
const MODES = [
  {id:'original',title:'옛이야기',description:'오래된 이야기 속으로 떠나요',image:'original',color:'#e9eddc'},
  {id:'personalized',title:'나만의 이야기',description:'내가 주인공이 되어 볼까요?',image:'personalized',color:'#fae9d1'},
  {id:'drawing',title:'그림으로 만드는 동화',description:'내 그림에 이야기를 더해요',image:'drawing',color:'#e2edf0'},
] as const
export function CreationChoices(){return <><header className={styles.intro}><p>새로운 모험의 시작</p><h1>오늘은 어떤 이야기를 만들까요?</h1></header>
  <div className={styles.modes}>{MODES.map(item=><Link key={item.id} href={`/stories/new/${item.id}`} className={styles.modeCard} style={{background:item.color}}>
    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/images/story-creation/${item.image}.webp`} alt="" width={512} height={512}/>
    <div><h2>{item.title}</h2><p>{item.description}</p></div><ArrowUpRight aria-hidden size={22}/>
  </Link>)}</div></>}
export function CreationPage({mode}:{mode?:string}) {
  const router=useRouter(); const {currentProfile,loading,error,sessionScope}=useProfile(); const generation=useGeneration()
  useEffect(()=>{
    if(loading||error)return
    if(!currentProfile)router.replace('/profiles')
    else if(isGuestProfile(currentProfile.id))router.replace('/dashboard')
    else if(needsMeasurement(currentProfile.level))router.replace('/literacy')
  },[currentProfile,loading,error,router])
  if(!currentProfile||isGuestProfile(currentProfile.id)||needsMeasurement(currentProfile.level))return <ProfileRecovery/>
  const submit=async(input:StoryInput)=>{
    const accepted=await generation.start(currentProfile.id,input)
    if(!accepted)router.push('/dashboard',{scroll:false})
    return accepted
  }
  const accepted=()=>router.push('/dashboard',{scroll:false})
  const valid=MODES.some(item=>item.id===mode)
  return <div className="min-h-screen bg-background"><AppHeader/><main className={styles.page}>
    <Link href={valid?'/stories/new':'/dashboard'} className={styles.back}><ArrowLeft size={18}/>{valid?'다른 이야기 고르기':'내 책장으로'}</Link>
    {!valid ? <CreationChoices/> : mode==='drawing' ?
      <DrawingStorySetup key={`${sessionScope}:${currentProfile.id}`} profileId={currentProfile.id} draftKey={`${sessionScope}:${currentProfile.id}:drawing`} onSubmit={submit} onAccepted={accepted}/> :
      <StorySetup key={`${currentProfile.id}:${mode}`} fixedMode={mode as 'original'|'personalized'} profileId={currentProfile.id} persistenceKey={`${sessionScope}:story-form:${currentProfile.id}:${mode}`} defaultName={currentProfile.name} onSubmit={submit} onAccepted={accepted}/>}
  </main></div>
}
