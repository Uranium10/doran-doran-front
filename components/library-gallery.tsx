"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutGrid,List,Trash2,BookOpen } from "lucide-react"
import { useProfile } from "@/lib/profile-context"
import { useSessionView } from "@/lib/use-session-view"
import { libraryInitial,validLibrary } from "@/lib/view-state"
import { isGuestProfile } from "@/lib/api"
import { fetchBookshelf,bookPath,type BookSummary,type Bookshelf } from "@/lib/bookshelf"
import { deleteStory } from "@/lib/workpad-data"
import { readingLabel } from "@/lib/book-status"
import { BookCover } from "./book-cover"
import { ConfirmModal } from "./confirm-modal"
import { ProfileRecovery } from "./profile-recovery"

export function LibraryGallery(){
  const {currentProfile,loading:profileLoading,error:profileError,sessionScope}=useProfile()
  const router=useRouter()
  const screen=useSessionView(sessionScope?`${sessionScope}:library`:null,libraryInitial,validLibrary)
  const [state,setState]=useState<{key:string;data?:Bookshelf;error?:string}>({key:''})
  const [busy,setBusy]=useState(false);const [retry,setRetry]=useState(0)
  const [pending,setPending]=useState<BookSummary|null>(null)
  const profileId=currentProfile?.id??''
  useEffect(()=>{if(!profileLoading&&!profileError&&!currentProfile)router.replace('/profiles')},[profileLoading,profileError,currentProfile,router])
  useEffect(()=>{
    setState({key:profileId});setPending(null);setBusy(false)
    if(!profileId||isGuestProfile(profileId))return
    let active=true
    fetchBookshelf(profileId).then(data=>{if(active)setState({key:profileId,data})})
      .catch(()=>{if(active)setState({key:profileId,error:'책장을 불러오지 못했어요.'})})
    return()=>{active=false}
  },[profileId,retry])
  useEffect(()=>{
    const saved=(event: Event)=>{if((event as CustomEvent).detail?.profileId===profileId)setRetry(v=>v+1)}
    window.addEventListener("doran-reading-saved",saved)
    return()=>window.removeEventListener("doran-reading-saved",saved)
  },[profileId])
  if(!currentProfile||!screen.ready)return <ProfileRecovery/>
  const data=state.key===profileId?state.data:undefined
  const list=screen.value.view==='list'
  const more=async()=>{
    if(!data||data.next_offset===null||busy)return
    setBusy(true)
    try{const next=await fetchBookshelf(profileId,data.next_offset)
      if(screen.isCurrent())setState(old=>old.key===profileId?{key:profileId,data:{...next,stories:[...(old.data?.stories??[]),...next.stories].filter((item,index,all)=>all.findIndex(x=>x.story_id===item.story_id)===index)}}:old)
    }catch{if(screen.isCurrent())toast.error('다음 책들을 불러오지 못했어요. 다시 눌러 주세요.')}
    finally{if(screen.isCurrent())setBusy(false)}
  }
  const remove=async()=>{
    if(!pending)return
    try{await deleteStory(pending.story_id);if(screen.isCurrent()){setPending(null);setRetry(v=>v+1);toast.success('책장에서 삭제했어요.')}}
    catch{if(screen.isCurrent())toast.error('삭제하지 못했어요. 다시 시도해 주세요.');throw new Error('Delete failed')}
  }
  return <div><div className="mb-8 flex items-end justify-between gap-3"><div><p className="text-xs tracking-widest text-primary">우리 아이가 만든 이야기</p><h1 className="mt-2 font-heading text-3xl">전체 책장</h1><p className="mt-2 text-sm text-muted-foreground">{data?`${data.total}권의 모험이 기다리고 있어요.`:'한 권씩 쌓이는 나만의 이야기'}</p></div>
    <div role="group" aria-label="책장 보기 방식" className="flex rounded-full border border-border bg-card p-1">{(['grid','list'] as const).map(mode=><button key={mode} onClick={()=>screen.setValue(old=>({...old,view:mode}))} aria-pressed={screen.value.view===mode} aria-label={mode==='grid'?'표지로 보기':'목록으로 보기'} className={`flex h-11 w-11 items-center justify-center rounded-full ${screen.value.view===mode?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-secondary'}`}>{mode==='grid'?<LayoutGrid size={18}/>:<List size={18}/>}</button>)}</div></div>
    {state.error?<div role="alert" className="rounded-3xl bg-card p-8">{state.error} <button onClick={()=>setRetry(v=>v+1)} className="underline">다시 불러오기</button></div>
    :isGuestProfile(profileId)||data?.total===0?<div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center"><BookOpen className="mx-auto mb-4 text-primary" size={36}/><h2 className="font-heading text-xl">첫 이야기를 기다리는 책장이에요</h2><Link href="/dashboard" className="mt-5 inline-block rounded-full bg-primary px-6 py-3 text-primary-foreground">내 책장으로</Link></div>
    :!data?<div role="status" className="py-20 text-center">책들을 꺼내고 있어요…</div>
    :<><div className={list?'space-y-3':'grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4'}>{data.stories.map(book=><article key={book.story_id} className={list?'flex items-center gap-4 rounded-2xl border border-border bg-card p-3':'min-w-0'}>
      <Link href={bookPath(book.story_id,'library')} className={list?'w-20 shrink-0':'block'} aria-label={`${book.title} 읽기`}><BookCover book={book} compact={list}/></Link>
      <div className={list?'min-w-0 flex-1':'mt-4'}><Link href={bookPath(book.story_id,'library')} className="line-clamp-2 font-heading text-lg leading-snug hover:text-primary">{book.title}</Link><p className="mt-2 text-xs text-muted-foreground">{readingLabel(book)}{book.created_at?` · ${new Date(book.created_at).toLocaleDateString('ko-KR')}`:''}</p></div>
      <button aria-label={`${book.title} 삭제`} onClick={()=>setPending(book)} className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={17}/></button>
    </article>)}</div>{data.next_offset!==null&&<div className="mt-9 text-center"><button disabled={busy} onClick={more} className="min-h-12 rounded-full border border-border bg-card px-8 py-3 disabled:opacity-50">{busy?'책을 가져오고 있어요…':'책 더 보기'}</button></div>}</>}
    <ConfirmModal open={pending!==null} title="동화를 삭제할까요?" description={pending?`‘${pending.title}’과 읽기 위치를 삭제해요. 되돌릴 수 없어요.`:undefined} confirmLabel="삭제하기" cancelLabel="취소" destructive onConfirm={remove} onClose={()=>setPending(null)}/>
  </div>
}
