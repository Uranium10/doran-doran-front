"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { BackLink } from "@/components/back-link"
import { ProfileRecovery } from "@/components/profile-recovery"
import { StickerCollection } from "@/components/sticker-collection"
import { useProfile } from "@/lib/profile-context"
import { isGuestProfile } from "@/lib/api"
import styles from "@/components/sticker-book.module.css"
export default function StickersPage() {
  const {currentProfile,loading,error}=useProfile();const router=useRouter()
  useEffect(()=>{if(!loading&&!error&&!currentProfile)router.replace('/profiles')},[loading,error,currentProfile,router])
  if(!currentProfile)return <ProfileRecovery/>
  return <div className="min-h-screen bg-background"><AppHeader/><main className={styles.page}><BackLink href="/dashboard" label="내 책장으로"/>
    <header className={styles.heading}><p>이야기가 남긴 작은 선물</p><h1>{currentProfile.name}님의 스티커북</h1><small>함께 모험한 친구들의 마음을 한 장씩 모아요.</small></header>
    <div className={styles.paper}>{isGuestProfile(currentProfile.id)?<p className="py-16 text-center">로그인하면 나만의 스티커를 모을 수 있어요.</p>:<StickerCollection key={currentProfile.id} profileId={currentProfile.id}/>}</div>
  </main></div>
}
