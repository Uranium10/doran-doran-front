"use client"
import {useEffect,useRef,useState} from 'react'
import {Save,FolderOpen,X,Clock3} from 'lucide-react'
import {AUTO_SAVE_MS,SLOT_IDS,readSketchSlots,writeSketchSlot,type SketchDocument,type SketchSlot,type SketchSlotId} from '@/lib/sketchbook-document'
import styles from './sketchbook.module.css'

const labels={'manual-1':'내 그림 1','manual-2':'내 그림 2',auto:'자동 저장'}
// 펜을 움직이는 동안에는 저장하지 않고, 확정된 벡터와 레이어 설정만 보관한다.
export function SketchStorage({scope,current,enabled,isBusy,open,action,onClose,onLoad,onNotice}:{scope:string;current:SketchDocument;enabled:boolean;isBusy:()=>boolean;open:boolean;action:'save'|'load';onClose:()=>void;onLoad:(doc:SketchDocument)=>void;onNotice:(s:string)=>void}){
  const [slots,setSlots]=useState<Partial<Record<SketchSlotId,SketchSlot>>>({}),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[choice,setChoice]=useState<SketchSlotId>('manual-1'),[confirm,setConfirm]=useState<'save'|'load'|null>(null)
  const dialog=useRef<HTMLDialogElement>(null),state=useRef({scope,current,enabled,isBusy,onNotice}),pending=useRef(false),alive=useRef(true),saved=useRef<SketchDocument|null>(null)
  state.current={scope,current,enabled,isBusy,onNotice}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  const same=(a:SketchDocument|null,b:SketchDocument)=>Boolean(a&&a.strokes===b.strokes&&a.layers===b.layers&&a.background===b.background&&a.width===b.width&&a.height===b.height)
  useEffect(()=>{
    saved.current=null
    const timer=setInterval(()=>{
      const s=state.current;if(!s.enabled||s.isBusy()||pending.current||same(saved.current,s.current)||(!s.current.strokes.length&&!saved.current))return
      pending.current=true
      void writeSketchSlot(s.scope,'auto',s.current).then(slot=>{if(alive.current&&state.current.scope===s.scope){saved.current=s.current;setSlots(v=>({...v,auto:slot}));s.onNotice('그림을 자동 저장했어요.')}}).catch(()=>{if(alive.current)s.onNotice('자동 저장을 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요.')}).finally(()=>{pending.current=false})
    },AUTO_SAVE_MS)
    return()=>clearInterval(timer)
  },[scope])
  useEffect(()=>{
    if(!open)return
    let cancelled=false;setChoice('manual-1');setConfirm(null);setMessage('저장한 그림을 확인하고 있어요.');setBusy(true)
    const d=dialog.current;d?.showModal()
    void readSketchSlots(scope).then(v=>{if(!cancelled){setSlots(v);setMessage('')}}).catch(()=>{if(!cancelled)setMessage('저장한 그림을 불러오지 못했어요. 다시 열어 주세요.')}).finally(()=>{if(!cancelled)setBusy(false)})
    return()=>{cancelled=true;d?.close()}
  },[open,scope,action])
  const save=async()=>{
    if(choice==='auto'||pending.current||busy)return
    const s=state.current;if(s.isBusy())return
    pending.current=true;setBusy(true);setConfirm(null)
    try{const slot=await writeSketchSlot(scope,choice,s.current);if(alive.current){setSlots(v=>({...v,[choice]:slot}));setMessage(`${labels[choice]}에 저장했어요.`)}}catch{if(alive.current)setMessage('저장하지 못했어요. 저장 공간이 부족하거나 브라우저에서 차단했을 수 있어요.')}
    finally{pending.current=false;if(alive.current)setBusy(false)}
  }
  const load=async()=>{
    if(pending.current||busy||state.current.isBusy())return
    setBusy(true);setConfirm(null)
    try{const fresh=await readSketchSlots(scope),slot=fresh[choice];if(!alive.current)return;setSlots(fresh);if(!slot){setMessage('이 칸에는 불러올 그림이 없어요.');return}onLoad(slot.document)}catch{if(alive.current)setMessage('그림을 불러오지 못했어요. 다시 시도해 주세요.')}
    finally{if(alive.current)setBusy(false)}
  }
  if(!open)return null
  return <dialog ref={dialog} className={styles.storageDialog} aria-labelledby="sketch-storage-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}>
    <header><div><h3 id="sketch-storage-title">{action==='save'?'그림 저장':'그림 불러오기'}</h3><p>이 기기·브라우저에만 저장돼요.</p></div><button type="button" aria-label="보관함 닫기" disabled={busy} onClick={onClose}><X size={21}/></button></header>
    <div className={styles.slotList} role="radiogroup" aria-label="그림 저장 칸">{SLOT_IDS.filter(id=>action==='load'||id!=='auto').map(id=><button type="button" role="radio" aria-checked={choice===id} key={id} disabled={busy} onClick={()=>{setChoice(id);setConfirm(null);setMessage('')}}><span className={styles.slotIcon}>{id==='auto'?<Clock3 size={22}/>:<FolderOpen size={22}/>}</span><span><strong>{labels[id]}</strong><small>{slots[id]?new Date(slots[id]!.savedAt).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'비어 있어요'}</small></span><i/></button>)}</div>
    <p className={styles.storageHint}>자동 저장은 변경한 그림을 2분마다 보관해요.<br/>브라우저 데이터를 지우면 보관한 그림도 사라져요.</p>
    <div className={styles.storageMessage} role="status">{busy?'잠시만 기다려 주세요…':message}</div>
    {confirm?<section className={styles.storageConfirm}><strong>{confirm==='save'?'이 칸의 그림을 바꿀까요?':'저장한 그림을 불러올까요?'}</strong><p>{confirm==='save'?'전에 저장한 그림을 덮어써요.':'현재 그림이 바뀌어요. 실행 취소로 되돌릴 수 있어요.'}</p><div><button type="button" disabled={busy} onClick={()=>setConfirm(null)}>취소</button><button type="button" disabled={busy} onClick={()=>void(confirm==='save'?save():load())}>{confirm==='save'?'덮어쓰기':'불러오기'}</button></div></section>:<footer>{action==='save'?<button type="button" disabled={busy||choice==='auto'} onClick={()=>slots[choice]?setConfirm('save'):void save()}><Save size={18}/>이 칸에 저장</button>:<button type="button" disabled={busy||!slots[choice]} onClick={()=>setConfirm('load')}><FolderOpen size={18}/>선택한 그림 불러오기</button>}</footer>}
  </dialog>
}
