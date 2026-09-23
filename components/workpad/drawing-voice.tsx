"use client"
import {useEffect,useRef,useState} from 'react'
import {Mic,Square,Trash2} from 'lucide-react'
import {recordingToWav} from '@/lib/drawing-story'
import styles from './drawing-story.module.css'
export function DrawingVoice({onVoice,onRemove,disabled,hasAudio,onRecording}:{onVoice:(blob:Blob)=>Promise<void>;onRemove:()=>Promise<void>;disabled:boolean;hasAudio:boolean;onRecording:(value:boolean)=>void}){
  const [recording,setRecording]=useState(false),[working,setWorking]=useState(false),[seconds,setSeconds]=useState(0),[url,setUrl]=useState(''),[error,setError]=useState('')
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),mounted=useRef(true)
  const callbacks=useRef({onVoice,onRecording});callbacks.current={onVoice,onRecording}
  const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(timer.current)clearInterval(timer.current)}
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop()}},[])
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url)},[url])
  useEffect(()=>{if(!hasAudio&&!recording)setUrl('')},[hasAudio,recording])
  const start=async()=>{
    setError('');setWorking(true);callbacks.current.onRecording(true)
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('이 브라우저에서는 녹음을 지원하지 않아요. 글로 이야기해 주세요.')
      const audio=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true},video:false})
      if(!mounted.current){audio.getTracks().forEach(t=>t.stop());return}
      stream.current=audio
      const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));const r=new MediaRecorder(audio,mime?{mimeType:mime,audioBitsPerSecond:64000}:undefined)
      recorder.current=r;const chunks:Blob[]=[];let length=0
      r.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);length+=e.data.size;if(length>8*1024*1024)stop()}}
      r.onerror=()=>{stop();if(mounted.current){setError('녹음하지 못했어요. 다시 시도해 주세요.');setWorking(false);setRecording(false);callbacks.current.onRecording(false)}}
      r.onstop=async()=>{
        if(!mounted.current)return
        setRecording(false);setWorking(true)
        try{const wav=await recordingToWav(new Blob(chunks,{type:r.mimeType}));if(!mounted.current)return;await callbacks.current.onVoice(wav);if(mounted.current)setUrl(URL.createObjectURL(wav))}
        catch(e){if(mounted.current)setError(e instanceof Error?e.message:'목소리를 준비하지 못했어요.')}
        finally{if(mounted.current){setWorking(false);callbacks.current.onRecording(false)}}
      }
      r.start(1000);setSeconds(0);setRecording(true);setWorking(false);callbacks.current.onRecording(true)
      const start=Date.now();timer.current=setInterval(()=>{const n=Math.floor((Date.now()-start)/1000);setSeconds(Math.min(60,n));if(n>=60)stop()},250)
    }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.');setWorking(false);callbacks.current.onRecording(false)}}
  }
  return <div className={styles.voice}>
    <div><button type="button" disabled={working||(!recording&&disabled)} onClick={recording?stop:start}>{recording?<Square size={19}/>:<Mic size={19}/>} {recording?`그만 말하기 · ${seconds}초` :hasAudio?'다시 말하기':'말로 들려주기'}</button><span>{working?'목소리를 준비해요…':'1분까지 이야기해요'}</span>
    {hasAudio&&!recording&&<button type="button" disabled={disabled||working} aria-label="녹음 지우기" onClick={async()=>{setWorking(true);setError('');try{await onRemove();setUrl('')}catch{setError('목소리를 지우지 못했어요.')}finally{setWorking(false)}}}><Trash2 size={18}/></button>}</div>
    {url&&<audio src={url} controls preload="metadata" aria-label="내 목소리 다시 듣기"/>}
    {!url&&hasAudio&&<p>앞서 저장한 목소리가 있어요. 분석할 때 함께 들을게요.</p>}
    {error&&<p role="alert">{error}</p>}
  </div>
}
