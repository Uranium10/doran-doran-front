"use client"
import {useEffect,useRef,useState} from 'react'
import {ImagePlus,Pencil,ArrowRight,Check,Trash2,BookOpen,RefreshCw} from 'lucide-react'
import {Sketchbook,ConfirmDialog} from './sketchbook'
import {DrawingVoice} from './drawing-voice'
import {sketchBlob} from '@/lib/sketchbook'
import {analyzeDrawing,confirmDrawing,deleteDrawing,deleteVoice,drawingImage,getDrawing,listDrawings,loadDrawingDraft,normalizePicture,saveDrawingDraft,uploadDrawing,uploadVoice,type DrawingDraft,type DrawingInput,type Point} from '@/lib/drawing-story'
import type {StoryInput} from '@/lib/workpad-data'
import styles from './drawing-story.module.css'
const EMPTY:DrawingDraft={tab:'upload',strokes:[],description:'',version:1}
export function DrawingStorySetup({profileId,draftKey,onSubmit,onAccepted}:{profileId:string;draftKey:string;onSubmit:(input:StoryInput)=>Promise<boolean>;onAccepted:()=>void}){
  const [draft,setDraft]=useState<DrawingDraft>(EMPTY),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState(''),[row,setRow]=useState<DrawingInput|null>(null)
  const [name,setName]=useState(''),[event,setEvent]=useState(''),[character,setCharacter]=useState<number|null>(null),[point,setPoint]=useState<Point|null>(null),[answers,setAnswers]=useState<string[]>([]),[notes,setNotes]=useState(''),[tts,setTts]=useState(false),[provider,setProvider]=useState<'openai'|'gemini'>('openai'),[recording,setRecording]=useState(false)
  const [saved,setSaved]=useState<DrawingInput[]>([]),[showSaved,setShowSaved]=useState(false),[deleting,setDeleting]=useState<string|null>(null),[localWarning,setLocalWarning]=useState('')
  const mounted=useRef(true),readyRef=useRef(false),ref=useRef(draft),rowRef=useRef(row),task=useRef(false),accepted=useRef(false),savedWrites=useRef(Promise.resolve());ref.current=draft;rowRef.current=row;readyRef.current=ready
  const file=useRef<HTMLInputElement>(null),review=useRef<HTMLElement>(null)
  const restore=(input:DrawingInput)=>{setRow(input);const a=input.analysis;if(a){setName(a.suggested_name);setEvent(a.desired_event);setCharacter(a.characters.length===1?0:null);setPoint(a.characters.length===1?a.characters[0].center:null);setAnswers([]);setNotes('')}}
  useEffect(()=>{
    mounted.current=true;let cancelled=false
    void loadDrawingDraft(draftKey).then(async value=>{
      if(cancelled)return
      if(value){setDraft(value);if(value.inputId){try{const input=await getDrawing(value.inputId);if(!cancelled)restore(input)}catch{if(!cancelled)setDraft(v=>({...v,inputId:undefined}))}}}
    }).catch(()=>{if(!cancelled)setLocalWarning('이 브라우저에서는 임시 저장이 어려워요. 창을 닫기 전에 그림을 저장해 주세요.')}).finally(()=>{if(!cancelled)setReady(true)})
    return()=>{cancelled=true;mounted.current=false;if(readyRef.current&&!accepted.current){const value=ref.current;savedWrites.current=savedWrites.current.catch(()=>{}).then(()=>saveDrawingDraft(draftKey,value)).catch(()=>{})}}
  },[draftKey])
  useEffect(()=>{
    if(!ready||accepted.current)return
    const timer=setTimeout(()=>{savedWrites.current=savedWrites.current.catch(()=>{}).then(()=>saveDrawingDraft(draftKey,ref.current)).catch(()=>{if(mounted.current)setLocalWarning('임시 저장 공간이 부족해요. 창을 닫기 전에 그림을 저장해 주세요.')})},350)
    return()=>clearTimeout(timer)
  },[draft,ready,draftKey])
  useEffect(()=>{
    let cancelled=false,url=''
    const make=async()=>{const blob=draft.tab==='upload'?draft.upload:draft.strokes.length?await sketchBlob(draft.strokes):undefined
      if(blob&&!cancelled){url=URL.createObjectURL(blob);setPreview(url)}else if(!cancelled)setPreview('')}
    void make();return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}
  },[draft.tab,draft.upload,draft.strokes])
  const run=async(label:string,operation:()=>Promise<void>)=>{
    if(task.current)return;task.current=true;setBusy(label);setError('')
    try{await operation()}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'잠시 문제가 생겼어요. 다시 시도해 주세요.')}
    finally{task.current=false;if(mounted.current)setBusy('')}
  }
  const changePicture=(patch:Partial<DrawingDraft>)=>{setRow(null);setDraft(v=>({...v,...patch,inputId:undefined,version:v.version+1}))}
  const ensureInput=async()=>{
    if(rowRef.current&&rowRef.current.id===ref.current.inputId)return rowRef.current
    const d=ref.current,blob=d.tab==='upload'?d.upload:d.strokes.length?await sketchBlob(d.strokes):undefined
    if(!blob)throw new Error('그림을 먼저 올리거나 그려 주세요.')
    const input=await uploadDrawing(profileId,blob)
    if(mounted.current){setRow(input);rowRef.current=input;setDraft(v=>({...v,inputId:input.id}))}
    return input
  }
  const analyze=()=>run('그림 속 이야기를 살펴보고 있어요…',async()=>{
    const input=await ensureInput();const result=await analyzeDrawing(input.id,ref.current.description)
    if(mounted.current){restore(result);setTimeout(()=>review.current?.scrollIntoView({behavior:'smooth',block:'start'}),50)}
  })
  const generate=()=>run('동화 만들기를 시작해요…',async()=>{
    if(!row||!row.analysis)throw new Error('그림 이야기를 먼저 확인해 주세요.')
    await confirmDrawing(row.id,{protagonist_name:name,protagonist_index:character,protagonist_point:point,desired_event:event,answers,preserve_notes:notes})
    const ok=await onSubmit({mode:'drawing',drawingInputId:row.id,protagonistName:'',favorite:'',todayEvent:'',pageImages:true,tts,imageProvider:provider,useJobs:true,readingMode:'level_aligned'})
    if(ok){accepted.current=true;await savedWrites.current.catch(()=>{});await saveDrawingDraft(draftKey,null).catch(()=>{});if(mounted.current)onAccepted()}
  })
  const refresh=async()=>{const result=await listDrawings(profileId);if(mounted.current)setSaved(result.inputs)}
  const useSaved=(input:DrawingInput)=>run('그림을 불러오고 있어요…',async()=>{
    const image=await drawingImage(input.id);if(!mounted.current)return
    // 이미 생성에 쓴 입력은 잠겨 있다. 같은 그림으로 새 이야기를 만들 때는 새 입력으로 복사한다.
    if(input.status==='queued'){setDraft({...EMPTY,tab:'upload',upload:image,description:input.description});setRow(null)}
    else {setDraft({...EMPTY,tab:'upload',upload:image,description:input.description,inputId:input.id});restore(input)}
    setShowSaved(false)
  })
  const locked=Boolean(busy)||recording,analysis=row?.analysis,canAnalyze=Boolean(preview)&&!locked&&(!row||!['queued','deleting','deleted'].includes(row.status))
  if(!ready)return <p role="status">그리던 이야기를 준비해요…</p>
  return <div className={styles.editor}>
    <header className={styles.intro}><p>내 그림이 한 권의 책으로</p><h1>그림으로 만드는 동화</h1><span>멋지게 그리지 않아도 괜찮아요. 마음껏 상상해요.</span></header>
    <button type="button" className={styles.savedLink} disabled={locked} onClick={()=>{setShowSaved(v=>!v);void run('저장한 그림을 찾아요…',refresh)}}><BookOpen size={17}/>내 그림 · 원본 관리</button>
    {showSaved&&<section className={styles.saved}><h2>저장한 그림</h2><p>동화가 완성되면 원본 그림·목소리·분석을 지울 수 있어요. 완성된 책은 남아요.</p>{!saved.length&&<p>아직 저장한 그림이 없어요.</p>}{saved.map(input=><div key={input.id}><button type="button" disabled={locked||['deleting','uploading'].includes(input.status)} onClick={()=>void useSaved(input)}>{input.analysis?.suggested_name||'내 그림'}<small>{new Date(input.created_at).toLocaleDateString('ko-KR')} · {input.status==='queued'?'생성에 사용한 그림':input.status==='analyzing'?'분석 중':input.status==='deleting'?'삭제 재시도 필요':'보관 중'}</small></button><button type="button" aria-label={`${input.analysis?.suggested_name||'그림'} 원본 삭제`} disabled={locked} onClick={()=>setDeleting(input.id)}><Trash2 size={18}/></button></div>)}</section>}
    <section className={styles.paper}><h2><b>1</b>어떤 그림으로 만들까요?</h2>
      <div className={styles.tabs} role="tablist" aria-label="그림 준비 방법">{([{id:'upload',label:'사진 올리기',Icon:ImagePlus},{id:'sketch',label:'직접 그리기',Icon:Pencil}]as const).map(({id,label,Icon})=><button type="button" role="tab" key={id} aria-selected={draft.tab===id} aria-controls={`drawing-panel-${id}`} disabled={locked} onClick={()=>{if(draft.tab!==id)changePicture({tab:id})}}><Icon size={20}/>{label}</button>)}</div>
      <div role="tabpanel" id={`drawing-panel-${draft.tab}`} aria-label={draft.tab==='upload'?'사진 올리기':'직접 그리기'}>
        {draft.tab==='upload'?<><input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="그림이나 사진 파일" disabled={locked} onChange={e=>{const selected=e.target.files?.[0];e.target.value='';if(selected)void run('그림을 준비해요…',async()=>{const upload=await normalizePicture(selected);if(mounted.current)changePicture({upload})})}}/>
          <button type="button" className={styles.upload} disabled={locked} onClick={()=>file.current?.click()}>{preview?/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt="내가 올린 그림"/>:<><ImagePlus size={48}/><strong>내 그림이나 사진을 올려요</strong><span>여기를 눌러 골라 주세요</span></>}</button>{preview&&<button type="button" className={styles.textButton} disabled={locked} onClick={()=>file.current?.click()}>다른 그림 고르기</button>}</>:
          <Sketchbook value={draft.strokes} disabled={locked} onChange={strokes=>changePicture({strokes})}/>}
      </div>
      <p className={styles.hint}>그림은 비공개로 저장해요. 동화를 만들 때 AI가 그림과 설명을 살펴봐요.</p>
    </section>
    <section className={styles.paper}><h2><b>2</b>어떤 이야기가 떠오르나요?</h2><p>글로 쓰거나 말로 들려주세요. 그림만 있어도 괜찮아요.</p>
      <textarea aria-label="내 그림 이야기" placeholder="이 친구는 누구인가요? 무슨 일이 생기면 좋을까요?" value={draft.description} maxLength={2000} disabled={locked} onChange={e=>{setRow(v=>v?{...v,analysis:null,confirmed:null}:v);setDraft(v=>({...v,description:e.target.value}))}}/>
      <DrawingVoice disabled={locked||!preview||Boolean(row&&row.status==='queued')} hasAudio={row?.has_audio??false} onRecording={setRecording} onVoice={async blob=>{const input=await ensureInput();const result=await uploadVoice(input.id,blob);if(mounted.current)setRow(result)}} onRemove={async()=>{if(row){const result=await deleteVoice(row.id);if(mounted.current)setRow(result)}}}/>
      <button type="button" className={styles.secondary} disabled={!canAnalyze} onClick={()=>void analyze()}><RefreshCw size={18}/>{analysis?'이야기 다시 살펴보기':'그림 속 이야기 살펴보기'}</button>
    </section>
    {analysis&&<section ref={review} className={styles.paper}><h2><b>3</b>이렇게 만들면 될까요?</h2><p>{analysis.child_meaning||'그림 속 친구들과 새로운 이야기를 만들어요.'}</p>
      <p className={styles.hint}>동그라미를 눌러 주인공을 골라요. 다른 곳을 눌러 표시해도 좋아요.</p>
      <div className={styles.characterPicture} onClick={e=>{if(locked)return;const r=e.currentTarget.getBoundingClientRect();setPoint({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))});setCharacter(null)}}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="주인공을 고를 그림"/>
        {analysis.characters.map((c,i)=><button type="button" key={i} disabled={locked} aria-label={`${c.label}를 주인공으로`} aria-pressed={character===i} style={{left:`${c.center.x*100}%`,top:`${c.center.y*100}%`}} onClick={e=>{e.stopPropagation();setCharacter(i);setPoint(c.center)}}>{character===i?<Check size={20}/>:i+1}</button>)}
        {point&&character===null&&<span className={styles.customPoint} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}}>★</span>}
      </div>
      {analysis.characters.length>0&&<div className={styles.characterNames}>{analysis.characters.map((c,i)=><button type="button" key={i} disabled={locked} aria-pressed={character===i} onClick={()=>{setCharacter(i);setPoint(c.center)}}>{i+1}. {c.label}</button>)}</div>}
      <label>주인공 이름<input value={name} disabled={locked} maxLength={30} placeholder={analysis.suggested_name} onChange={e=>setName(e.target.value)}/></label>
      <label>이런 일이 생기면 좋겠어요<textarea value={event} disabled={locked} maxLength={1000} onChange={e=>setEvent(e.target.value)}/></label>
      {analysis.questions.map((q,i)=><label key={i}>{q}<span className={styles.optional}>선택</span><input value={answers[i]||''} disabled={locked} maxLength={500} placeholder="떠오르는 생각을 적어 주세요" onChange={e=>setAnswers(old=>analysis.questions.map((_,n)=>n===i?e.target.value:old[n]||''))}/></label>)}
      <details><summary>읽어 낸 내용 확인·고치기</summary>{analysis.transcript&&<p>내가 한 말: {analysis.transcript}</p>}<p>그림에서 찾은 것: {analysis.observed_elements.join(', ')}</p><p>꼭 살릴 모습: {analysis.preserve_features.join(', ')}</p><label>다르게 이해한 부분이 있나요?<textarea value={notes} maxLength={500} disabled={locked} placeholder="이건 괴물이 아니라 내 친구예요…" onChange={e=>setNotes(e.target.value)}/></label></details>
      <label className={styles.check}><input type="checkbox" checked={tts} disabled={locked} onChange={e=>setTts(e.target.checked)}/>목소리로도 읽어 주세요</label>
      <fieldset disabled={locked} className={styles.artist}><legend>누가 그릴까요?</legend>{(['openai','gemini']as const).map((id,i)=><label key={id}><input type="radio" name="drawing-artist" value={id} checked={provider===id} onChange={()=>setProvider(id)}/><span className={i?styles.pinkFace:styles.blueFace}/><span>{i?'분홍 도깨비':'파랑 도깨비'}</span></label>)}<p>{provider==='openai'?'조금 기다려도 괜찮다면, 차근차근 그려요.':'조금 더 빠르게 그림을 만나요.'} 내 그림의 모습과 색을 살려요.</p></fieldset>
    </section>}
    {localWarning&&<p className={styles.hint} role="status">{localWarning}</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.dock}>{busy&&<p role="status">{busy}</p>}<button type="button" className={styles.primary} disabled={!analysis||locked||row?.status!=='ready'} onClick={()=>void generate()}>이 그림으로 동화 만들기<ArrowRight size={21}/></button></div>
    {deleting&&<ConfirmDialog title="원본을 지울까요?" description="그림, 녹음, 설명과 분석을 지워요. 완성된 동화와 스티커는 남아요. 만들고 있는 동안에는 지울 수 없어요." confirm="원본 지우기" onCancel={()=>setDeleting(null)} onConfirm={()=>{const id=deleting;setDeleting(null);void run('원본을 지우고 있어요…',async()=>{await deleteDrawing(id);if(row?.id===id){setRow(null);setDraft({...EMPTY});await saveDrawingDraft(draftKey,null)}await refresh()})}}/>}
  </div>
}
