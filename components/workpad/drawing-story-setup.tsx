"use client"
import {useEffect,useRef,useState} from 'react'
import {ImagePlus,Pencil,ArrowRight,Check,Trash2,BookOpen,RefreshCw,ArrowLeft,Download,Volume2,CheckCircle2} from 'lucide-react'
import {Sketchbook,ConfirmDialog} from './sketchbook'
import {DrawingVoice} from './drawing-voice'
import {ReadingModePicker} from './reading-mode-picker'
import {sketchBlob} from '@/lib/sketchbook'
import {analyzeDrawing,confirmDrawing,deleteDrawing,deleteVoice,drawingImage,getDrawing,listDrawings,loadDrawingDraft,normalizePicture,saveDrawingDraft,uploadDrawing,uploadVoice,type DrawingDraft,type DrawingInput,type Point} from '@/lib/drawing-story'
import type {StoryInput} from '@/lib/workpad-data'
import styles from './drawing-wizard.module.css'
const EMPTY:DrawingDraft={tab:'sketch',strokes:[],description:'',version:1,background:'#fffaf0',step:'reading',readingMode:'level_aligned'}
const newDraft=():DrawingDraft=>({...EMPTY,paperHeight:window.matchMedia('(max-width: 700px)').matches?1300:560})
export function DrawingStorySetup({profileId,draftKey,onSubmit,onAccepted,onStudioChange,onExit}:{profileId:string;draftKey:string;onSubmit:(input:StoryInput)=>Promise<boolean>;onAccepted:()=>void;onStudioChange?:(full:boolean)=>void;onExit?:()=>void}){
  const [draft,setDraft]=useState<DrawingDraft>(EMPTY),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[preview,setPreview]=useState(''),[row,setRow]=useState<DrawingInput|null>(null)
  const [name,setName]=useState(''),[event,setEvent]=useState(''),[character,setCharacter]=useState<number|null>(null),[point,setPoint]=useState<Point|null>(null),[answers,setAnswers]=useState<string[]>([]),[notes,setNotes]=useState(''),[tts,setTts]=useState(false),[provider,setProvider]=useState<'openai'|'gemini'>('openai'),[recording,setRecording]=useState(false)
  const [saved,setSaved]=useState<DrawingInput[]>([]),[showSaved,setShowSaved]=useState(false),[deleting,setDeleting]=useState<string|null>(null),[localWarning,setLocalWarning]=useState('')
  const mounted=useRef(true),readyRef=useRef(false),ref=useRef(draft),rowRef=useRef(row),task=useRef(false),accepted=useRef(false),savedWrites=useRef(Promise.resolve());ref.current=draft;rowRef.current=row;readyRef.current=ready
  const [drawingBusy,setDrawingBusy]=useState(false),[step,setStep]=useState('reading'),[leaving,setLeaving]=useState(false),[saveCopy,setSaveCopy]=useState(false)
  const previewBlob=useRef<Blob|null>(null),discarded=useRef(false),heading=useRef<HTMLHeadingElement>(null)
  const file=useRef<HTMLInputElement>(null),errorBox=useRef<HTMLDivElement>(null)
  const restore=(input:DrawingInput)=>{setRow(input);const a=input.analysis;if(a){setName(a.suggested_name);setEvent(a.desired_event);setCharacter(a.characters.length===1?0:null);setPoint(a.characters.length===1?a.characters[0].center:null);setAnswers([]);setNotes('')}}
  useEffect(()=>{
    mounted.current=true;let cancelled=false
    void loadDrawingDraft(draftKey).then(async value=>{
      if(cancelled)return
      if(!value){setDraft(newDraft());setStep('reading')}
      // 비어 있는 예전 초안도 모바일에서 세로로 시작하되, 이미 그린 그림의 비율은 보존한다.
      if(value){setDraft(value.strokes.length?value:{...value,paperHeight:newDraft().paperHeight});setStep(value.step??(value.strokes.length||value.upload?'canvas':'reading'));if(value.inputId){try{const input=await getDrawing(value.inputId);if(!cancelled)restore(input)}catch{if(!cancelled)setDraft(v=>({...v,inputId:undefined}))}}}
    }).catch(()=>{if(!cancelled){setDraft(newDraft());setLocalWarning('이 브라우저에서는 임시 저장이 어려워요. 창을 닫기 전에 그림을 저장해 주세요.')}}).finally(()=>{if(!cancelled)setReady(true)})
    return()=>{cancelled=true;mounted.current=false;if(readyRef.current&&!accepted.current&&!discarded.current){const value=ref.current;savedWrites.current=savedWrites.current.catch(()=>{}).then(()=>saveDrawingDraft(draftKey,value)).catch(()=>{})}}
  },[draftKey])
  useEffect(()=>{
    if(!ready||accepted.current||discarded.current)return
    const timer=setTimeout(()=>{savedWrites.current=savedWrites.current.catch(()=>{}).then(()=>saveDrawingDraft(draftKey,ref.current)).catch(()=>{if(mounted.current)setLocalWarning('임시 저장 공간이 부족해요. 창을 닫기 전에 그림을 저장해 주세요.')})},350)
    return()=>clearTimeout(timer)
  },[draft,ready,draftKey])
  useEffect(()=>{
    if(step==='canvas'&&draft.tab==='sketch')return
    let cancelled=false,url=''
    const make=async()=>{const blob=draft.tab==='upload'?draft.upload:draft.strokes.length?await sketchBlob(draft.strokes,draft.background,900,draft.paperHeight??650,draft.layers):undefined
      if(blob&&!cancelled){previewBlob.current=blob;url=URL.createObjectURL(blob);setPreview(url)}else if(!cancelled)setPreview('')}
    void make().catch(()=>{if(!cancelled)setError('그림 미리보기를 준비하지 못했어요. 다시 시도해 주세요.')});return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}
  },[step==='canvas',draft.tab,draft.upload,draft.strokes,draft.background,draft.paperHeight,draft.layers])
  const run=async(label:string,operation:()=>Promise<void>)=>{
    if(task.current)return;task.current=true;setBusy(label);setError('')
    try{await operation()}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'잠시 문제가 생겼어요. 다시 시도해 주세요.')}
    finally{task.current=false;if(mounted.current)setBusy('')}
  }
  const changePicture=(patch:Partial<DrawingDraft>)=>{setRow(null);setDraft(v=>({...v,...patch,inputId:undefined,version:v.version+1}))}
  const ensureInput=async()=>{
    if(rowRef.current&&rowRef.current.id===ref.current.inputId)return rowRef.current
    const d=ref.current,blob=d.tab==='upload'?d.upload:d.strokes.length?await sketchBlob(d.strokes,d.background,900,d.paperHeight??650,d.layers):undefined
    if(!blob)throw new Error('그림을 먼저 올리거나 그려 주세요.')
    const input=await uploadDrawing(profileId,blob)
    if(mounted.current){setRow(input);rowRef.current=input;setDraft(v=>({...v,inputId:input.id}))}
    return input
  }
  const analyze=()=>run('그림 속 이야기를 살펴보고 있어요…',async()=>{
    const input=await ensureInput();const result=await analyzeDrawing(input.id,ref.current.description)
    if(mounted.current){restore(result);setStep(result.analysis?.characters.length?'character':'name')}
  })
  const generate=()=>run('동화 만들기를 시작해요…',async()=>{
    if(!row||!row.analysis)throw new Error('그림 이야기를 먼저 확인해 주세요.')
    await confirmDrawing(row.id,{protagonist_name:name,protagonist_index:character,protagonist_point:point,desired_event:event,answers,preserve_notes:notes})
    const ok=await onSubmit({mode:'drawing',drawingInputId:row.id,protagonistName:'',favorite:'',todayEvent:'',pageImages:true,tts,imageProvider:provider,useJobs:true,readingMode:draft.readingMode??'level_aligned'})
    if(ok){accepted.current=true;await savedWrites.current.catch(()=>{});await saveDrawingDraft(draftKey,null).catch(()=>{});if(mounted.current)onAccepted()}
  })
  const refresh=async()=>{const result=await listDrawings(profileId);if(mounted.current)setSaved(result.inputs)}
  const useSaved=(input:DrawingInput)=>run('그림을 불러오고 있어요…',async()=>{
    const image=await drawingImage(input.id);if(!mounted.current)return
    // 이미 생성에 쓴 입력은 잠겨 있다. 같은 그림으로 새 이야기를 만들 때는 새 입력으로 복사한다.
    if(input.status==='queued'){setDraft({...newDraft(),tab:'upload',upload:image,description:input.description});setRow(null)}
    else {setDraft({...newDraft(),tab:'upload',upload:image,description:input.description,inputId:input.id});restore(input)}
    setShowSaved(false);setStep('preview')
  })
  const locked=Boolean(busy)||recording||drawingBusy,analysis=row?.analysis
  const full=step==='canvas'
  useEffect(()=>{if(error&&!busy&&!full){errorBox.current?.focus({preventScroll:true});errorBox.current?.scrollIntoView({block:'center',behavior:'instant'})}},[error,busy,full])
  useEffect(()=>{onStudioChange?.(full);return()=>onStudioChange?.(false)},[full,onStudioChange])
  useEffect(()=>{
    if(!full)return
    const body=document.body,html=document.documentElement,previous=[body.style.overflow,html.style.overflow,body.style.overscrollBehavior]
    body.style.overflow='hidden';html.style.overflow='hidden';body.style.overscrollBehavior='none'
    return()=>{body.style.overflow=previous[0];html.style.overflow=previous[1];body.style.overscrollBehavior=previous[2]}
  },[full])
  useEffect(()=>{if(!full){window.scrollTo({top:0,behavior:'instant'});heading.current?.focus({preventScroll:true})}},[step,full])
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(!accepted.current&&(ref.current.strokes.length||ref.current.upload)){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
  const hasPicture=Boolean(draft.tab==='upload'?draft.upload:draft.strokes.length)
  // API 구조체는 그대로 쓰고, 아이가 답할 입력만 한 화면씩 순서대로 연다.
  const steps=['preview','description',...['character','name','event','question-0','question-1','correction','artist','voice','final'].filter(s=>s==='character'?Boolean(analysis?.characters.length):s.startsWith('question-')?Boolean(analysis?.questions[Number(s.at(-1))]):true)]
  const next=()=>setStep(steps[steps.indexOf(step)+1]??'final')
  const previous=()=>setStep(step==='preview'?'canvas':steps[Math.max(0,steps.indexOf(step)-1)])
  const discard=()=>void run('그림을 정리하고 있어요.',async()=>{discarded.current=true;await savedWrites.current.catch(()=>{});await saveDrawingDraft(draftKey,null).catch(()=>{discarded.current=false;throw new Error('초안을 지우지 못했어요. 다시 시도해 주세요.')});setLeaving(false);onExit?.()})
  const download=()=>{if(!previewBlob.current)return;const url=URL.createObjectURL(previewBlob.current),a=document.createElement('a');a.href=url;a.download='내가-그린-이야기.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
  const prompt=busy||({reading:'먼저, 오늘 읽을 방법을 골라 주세요.',preview:'이 그림으로 이야기를 만들어 볼까요?',description:'이 그림에는 어떤 이야기가 숨어 있나요?',character:'누가 이야기의 주인공인가요?',name:'주인공의 이름을 알려 주세요.',event:'어떤 일이 생기면 좋을까요?',correction:'제가 다르게 이해한 곳이 있나요?',artist:'누가 그림을 그려 줄까요?',voice:'동화를 목소리로도 들을까요?',final:'준비됐어요. 동화를 만들어 볼까요?'} as Record<string,string>)[step]||analysis?.questions[Number(step.at(-1))]||''
  if(!ready)return <p role="status">그리던 이야기를 준비해요…</p>
  return <div className={full?styles.fullscreen:styles.wizard}>
    {/* 미리보기를 오가도 도구의 실행 취소 기록은 유지한다. */}
    <div className={styles.editorShell} hidden={!full}>
      <header className={styles.studioHeader}>
        <button type="button" aria-label="그림 도구 나가기" onClick={()=>{if(hasPicture)setLeaving(true);else {setDraft(v=>({...v,step:'reading'}));setStep('reading')}}} disabled={locked}><ArrowLeft size={23}/></button>
        <div className={styles.switch} role="tablist" aria-label="그림 또는 사진"><i data-photo={draft.tab==='upload'}/>{([{id:'sketch',label:'그림',Icon:Pencil},{id:'upload',label:'사진',Icon:ImagePlus}]as const).map(({id,label,Icon})=><button type="button" key={id} role="tab" aria-selected={draft.tab===id} disabled={locked} onClick={()=>{if(draft.tab!==id)changePicture({tab:id})}}><Icon size={19}/><span>{label}</span></button>)}</div>
        <button type="button" className={styles.done} disabled={!hasPicture||locked} onClick={()=>{setError('');setStep('preview')}}>다했어요!<Check size={18}/></button>
      </header>
      <div className={styles.editorBody}>
        <div className={styles.sketchPane} hidden={draft.tab!=='sketch'}><Sketchbook key={draftKey} storageKey={draftKey} layers={draft.layers} onDocumentChange={doc=>changePicture({strokes:doc.strokes,background:doc.background,paperHeight:doc.height,layers:doc.layers})} onBusyChange={setDrawingBusy} value={draft.strokes} background={draft.background} height={draft.paperHeight??650} disabled={locked||!full||draft.tab!=='sketch'} onChange={strokes=>changePicture({strokes})} onBackgroundChange={background=>changePicture({background})}/></div>
        {draft.tab==='upload'&&<div className={styles.photoPane}><input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="그림이나 사진 파일" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run('사진을 준비하고 있어요.',async()=>{const upload=await normalizePicture(f);if(mounted.current)changePicture({upload})})}}/><button type="button" className={styles.upload} disabled={locked} onClick={()=>file.current?.click()}>{draft.upload&&preview?/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt="선택한 사진"/>:<><ImagePlus size={52}/><strong>그림이나 사진을 골라 주세요</strong><span>종이에 그린 그림도 좋아요</span></>}</button>{draft.upload&&<button type="button" className={styles.textButton} onClick={()=>file.current?.click()}>다른 사진 고르기</button>}<button type="button" className={styles.savedLink} disabled={locked} onClick={()=>{setShowSaved(true);void run('저장한 그림을 찾아요.',refresh)}}><BookOpen size={17}/>보관한 그림</button></div>}
      </div>
      {error&&<p className={styles.studioError} role="alert">{error}</p>}
    </div>{!full&&<>
      <div className={styles.stepTop}><button type="button" onClick={()=>step==='reading'?onExit?.():previous()} disabled={locked}><ArrowLeft size={18}/>이전 단계</button><span>그림에서 시작하는 이야기</span></div>
      <div className={styles.conversation}>
        <header className={styles.question}><span>{step==='preview'?'내 작은 작품':step==='final'?'이야기 출발!':'생각을 들려주세요'}</span><h1 ref={heading} tabIndex={-1}>{prompt}</h1></header>
        <section className={styles.answer} aria-busy={Boolean(busy)}>
          {busy?<div className={styles.thinking} role="status">{preview&&/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt="살펴보는 그림"/>}<span><i/><i/><i/></span><p>그림의 모양과 색, 담아 준 생각을 모아요.</p></div>:<>
          {step==='reading'&&<ReadingModePicker value={draft.readingMode??'level_aligned'} onChange={readingMode=>setDraft(value=>({...value,readingMode}))}/>}
          {step==='preview'&&<><div className={styles.preview}>{preview&&/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt="내가 완성한 그림"/>}</div><label className={styles.saveChoice}><input type="checkbox" checked={saveCopy} onChange={e=>setSaveCopy(e.target.checked)}/><Download size={18}/>내 기기에도 그림을 저장할까요?</label><p className={styles.note}>다음 단계에서 그림을 분석할 때 비공개로 보관해요.</p></>}
          {step==='description'&&<><div className={styles.thumb}>{preview&&/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt="내 그림"/>}</div><textarea aria-label="내 그림 이야기" placeholder="이 친구는 누구인가요? 어떤 이야기를 만들고 싶나요?" value={draft.description} maxLength={2000} disabled={locked} onChange={e=>{setRow(v=>v?{...v,analysis:null,confirmed:null}:v);setDraft(v=>({...v,description:e.target.value}))}}/><p className={styles.note}>글로 쓰거나 말로 들려주세요. 그림만 있어도 괜찮아요.</p><DrawingVoice disabled={locked||Boolean(row&&row.status==='queued')} hasAudio={row?.has_audio??false} onRecording={setRecording} onVoice={async blob=>{const input=await ensureInput();const result=await uploadVoice(input.id,blob);if(mounted.current)setRow(result)}} onRemove={async()=>{if(row){const result=await deleteVoice(row.id);if(mounted.current)setRow(result)}}}/></>}
          {step==='character'&&analysis&&<><p className={styles.note}>동그라미를 누르거나, 그림에서 직접 짚어 주세요.</p><div className={styles.characterPicture} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPoint({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))});setCharacter(null)}}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="주인공을 고를 그림"/>{analysis.characters.map((c,i)=><button type="button" key={i} aria-label={`${c.label}를 주인공으로`} aria-pressed={character===i} style={{left:`${c.center.x*100}%`,top:`${c.center.y*100}%`}} onClick={e=>{e.stopPropagation();setCharacter(i);setPoint(c.center)}}>{character===i?<Check size={20}/>:i+1}</button>)}{point&&character===null&&<span className={styles.customPoint} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}}>★</span>}</div><div className={styles.characters}>{analysis.characters.map((c,i)=><button type="button" key={i} aria-pressed={character===i} onClick={()=>{setCharacter(i);setPoint(c.center)}}>{c.label}</button>)}</div></>}
          {step==='name'&&<><input className={styles.bigInput} aria-label="주인공 이름" value={name} maxLength={30} placeholder={analysis?.suggested_name||'이름을 함께 지어도 좋아요'} onChange={e=>setName(e.target.value)}/><p className={styles.note}>떠오르지 않으면 제가 지어 드릴게요.</p></>}
          {step==='event'&&<textarea aria-label="바라는 이야기" value={event} maxLength={1000} placeholder="하늘을 날아서 달에 가면 좋겠어요…" onChange={e=>setEvent(e.target.value)}/>}
          {step.startsWith('question-')&&<><textarea aria-label={prompt} value={answers[Number(step.at(-1))]||''} maxLength={500} placeholder="떠오르는 생각을 알려 주세요" onChange={e=>setAnswers(old=>[0,1].map(n=>n===Number(step.at(-1))?e.target.value:old[n]||''))}/><p className={styles.note}>잘 모르겠다면 비워 두어도 좋아요.</p></>}
          {step==='correction'&&<><p className={styles.understood}>{analysis?.child_meaning}</p><textarea aria-label="바로잡고 싶은 내용" value={notes} maxLength={500} placeholder="이건 괴물이 아니라 내 친구예요… (없으면 넘어가요)" onChange={e=>setNotes(e.target.value)}/><details><summary>그림에서 찾은 모습</summary><p>{analysis?.preserve_features.join(' · ')}</p>{analysis?.transcript&&<p>내가 들려준 말: {analysis.transcript}</p>}</details></>}
          {step==='artist'&&<><div className={styles.artists}>{(['openai','gemini']as const).map((id,i)=><button type="button" key={id} aria-pressed={provider===id} onClick={()=>setProvider(id)}><span className={i?styles.pinkFace:styles.blueFace}/><span>{i?'분홍 도깨비':'파랑 도깨비'}</span>{provider===id&&<CheckCircle2 size={22}/>}</button>)}</div><p className={styles.artistNote}>{provider==='openai'?'조금 기다려도 괜찮다면, 차근차근 그려요.':'조금 더 빠르게 그림을 만나요.'}<br/>내 그림의 모습과 색을 살려요.</p></>}
          {step==='voice'&&<div className={styles.voiceChoice}>{[false,true].map(v=><button type="button" key={String(v)} aria-pressed={tts===v} onClick={()=>setTts(v)}>{v?<Volume2 size={34}/>:<BookOpen size={34}/>}<strong>{v?'읽어 주세요':'직접 읽을래요'}</strong></button>)}</div>}
          {step==='final'&&<><div className={styles.preview}>{preview&&/* eslint-disable-next-line @next/next/no-img-element */<img src={preview} alt="동화가 될 내 그림"/>}</div><p className={styles.summary}><strong>{name||analysis?.suggested_name}</strong>의 이야기<br/>{event||'그림 속 친구와 작은 모험을 떠나요.'}</p><p className={styles.note}>{provider==='openai'?'파랑':'분홍'} 도깨비의 그림 · {tts?'읽어주는 동화':'내가 읽는 동화'}</p></>}
          </>}
        </section>
        {error&&<div ref={errorBox} tabIndex={-1} role="alert" className={styles.error}>{step==='final'&&<><strong>이런, 문제가 생겼어요!</strong><br/></>}{error}</div>}
        {!busy&&<div className={styles.actions}><button type="button" className={styles.primary} disabled={locked||(step==='preview'&&!preview)||(step==='character'&&!point)||(step==='final'&&row?.status!=='ready')} onClick={()=>{
          if(step==='reading'){setDraft(value=>({...value,step:'canvas'}));setStep('canvas')}
          else if(step==='preview'){if(saveCopy)download();setStep('description')}
          else if(step==='description')void analyze()
          else if(step==='final')void generate()
          else next()
        }}>{step==='final'?(error?'다시 시도':'동화 만들기'):step==='description'?'그림 속 이야기 살펴보기':step==='preview'?'이 그림으로 할래요':step==='reading'?'그림 시작하기':'다음으로'}<ArrowRight size={19}/></button></div>}
      </div>
      {!error&&<aside className={styles.guide} aria-hidden><div className={busy?styles.thought:styles.bubble}>{busy?'멋진 그림을 살펴보고 있어요…':prompt}</div><span className={provider==='openai'?styles.blueGuide:styles.pinkGuide}/></aside>}
      {localWarning&&<p className={styles.note} role="status">{localWarning}</p>}
    </>}
    {showSaved&&<div className={styles.savedOverlay}><section className={styles.saved} role="dialog" aria-modal="true" aria-label="보관한 그림"><button type="button" onClick={()=>setShowSaved(false)}>닫기</button><h2>보관한 그림</h2><p>원본을 지워도 완성한 책은 남아요.</p>{!saved.length&&<p>아직 저장한 그림이 없어요.</p>}{saved.map(input=><div key={input.id}><button type="button" disabled={locked||['deleting','uploading','analyzing'].includes(input.status)} onClick={()=>void useSaved(input)}>{input.analysis?.suggested_name||'내 그림'}<small>{new Date(input.created_at).toLocaleDateString('ko-KR')}</small></button><button type="button" aria-label="원본 삭제" disabled={locked} onClick={()=>setDeleting(input.id)}><Trash2 size={18}/></button></div>)}</section></div>}
    {deleting&&<ConfirmDialog title="원본을 지울까요?" description="그림과 녹음, 설명을 지워요. 완성된 동화와 스티커는 남아요." confirm="원본 지우기" onCancel={()=>setDeleting(null)} onConfirm={()=>{const id=deleting;setDeleting(null);void run('원본을 지우고 있어요.',async()=>{await deleteDrawing(id);if(row?.id===id){setRow(null);setDraft(newDraft());setStep('reading');await saveDrawingDraft(draftKey,null)}await refresh()})}}/>}
    {leaving&&<ConfirmDialog title="그림을 두고 나갈까요?" description="지금 그리던 그림과 이 기기의 초안이 사라져요. 완성 버튼을 누르면 그림을 기기에 저장할 수 있어요." confirm="나갈래요" onCancel={()=>setLeaving(false)} onConfirm={discard}/>}
  </div>
}
