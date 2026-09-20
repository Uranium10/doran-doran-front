"use client"

import { useEffect, useState } from "react"
import { request } from "@/lib/api"
import { noveltyLabel, type WordNovelty } from "@/lib/word-novelty"
import styles from "./story-new-words.module.css"

/** 본문이나 전체 사전 대신 집계 한 건만 받는다. 분석이 늦어도 독서를 막지 않는다. */
export function StoryNewWords({profileId, storyId, active}: {profileId:string; storyId:string; active:boolean}) {
  const [result,setResult]=useState<WordNovelty|null>(null)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{
    if (!active || result?.status==='ready' || result?.status==='unavailable') return
    let alive=true, attempts=0
    const controller=new AbortController()
    let timer:ReturnType<typeof setTimeout>|undefined
    const poll=async()=>{
      if (!alive) return
      if(document.hidden){ timer=setTimeout(poll,15000); return }
      try {
        const value=await request<WordNovelty>(`/stories/${encodeURIComponent(storyId)}/vocab-novelty?profile_id=${encodeURIComponent(profileId)}`,{signal:controller.signal})
        if(!alive)return
        setResult(value);setFailed(false)
        // 최대 여섯 번만 기다린다. 분석 창을 닫으면 요청도 취소한다.
        if(value.status==='pending' && ++attempts<6)timer=setTimeout(poll,15000)
      }catch{if(alive)setFailed(true)}
    }
    void poll()
    return()=>{alive=false;controller.abort();if(timer)clearTimeout(timer)}
  },[profileId,storyId,active,result?.status==='ready',result?.status==='unavailable'])
  if(failed || result?.status==='unavailable')return <p className={styles.note}>지금은 읽기 기록과 비교할 수 없어요. 나중에 다시 확인해 주세요.</p>
  const label=noveltyLabel(result)
  return <div className={styles.note} role="note" title="이 책을 만들기 전 완독한 동화와 비교해요. 사전에 실린 낱말을 기본형·품사별로 한 번씩 세며, 아이가 모르는 말이라는 뜻은 아니에요.">
    <p>{label}</p>{result?.status==='ready' && result.total_words>0 && <small>이 책을 만들기 전 읽기 기록 기준</small>}
  </div>
}
