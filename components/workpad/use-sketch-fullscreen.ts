"use client"
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react'

// CSS 전체 화면만으로는 모바일 브라우저의 탐색바를 숨길 수 없다.
// 사용자 클릭 안에서 요청하고, 이 편집기가 연 전체 화면만 종료한다.
export function useSketchFullscreen(root:RefObject<HTMLDivElement|null>,active:boolean){
  const [fullscreen,setFullscreen]=useState(false),[available,setAvailable]=useState(false),[message,setMessage]=useState('')
  const owned=useRef<HTMLElement|null>(null),pending=useRef(false),alive=useRef(true),isActive=useRef(active)
  isActive.current=active
  const exit=useCallback(()=>{const target=owned.current;owned.current=null;if(target&&document.fullscreenElement===target)void document.exitFullscreen().catch(()=>{})},[])
  const request=useCallback(()=>{
    const target=root.current
    if(!target||!document.fullscreenEnabled||!target.requestFullscreen||pending.current||document.fullscreenElement)return
    pending.current=true;owned.current=target;setMessage('')
    void target.requestFullscreen({navigationUI:'hide'}).then(()=>{if(!alive.current||!isActive.current){if(document.fullscreenElement===target)void document.exitFullscreen().catch(()=>{})}}).catch(()=>{if(owned.current===target)owned.current=null;if(alive.current)setMessage('이 브라우저에서는 전체 화면을 열 수 없어요.')}).finally(()=>{pending.current=false})
  },[root])
  useEffect(()=>{
    alive.current=true;setAvailable(Boolean(document.fullscreenEnabled&&document.documentElement.requestFullscreen))
    const changed=()=>setFullscreen(Boolean(root.current&&document.fullscreenElement===root.current))
    document.addEventListener('fullscreenchange',changed);changed()
    return()=>{alive.current=false;document.removeEventListener('fullscreenchange',changed);exit()}
  },[root,exit])
  useEffect(()=>{if(!active)exit()},[active,exit])
  return {fullscreen,available,message,request,exit}
}
