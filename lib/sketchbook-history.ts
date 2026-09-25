import type {SketchDocument} from './sketchbook-document'
import {UNDO_LIMIT} from './sketchbook-document'

// 스택은 동기적으로 갱신한다. React가 이벤트를 묶어도 같은 이전 기록을 두 번 꺼내지 않는다.
export class SketchHistory {
  past:SketchDocument[]=[]
  future:SketchDocument[]=[]
  record(before:SketchDocument,after:SketchDocument){
    if(sameSketch(before,after))return false
    this.past=[...this.past.slice(-(UNDO_LIMIT-1)),before];this.future=[];return true
  }
  undo(current:SketchDocument){const previous=this.past.pop();if(!previous)return null;this.future.push(current);return previous}
  redo(current:SketchDocument){const next=this.future.pop();if(!next)return null;this.past=[...this.past.slice(-(UNDO_LIMIT-1)),current];return next}
}
// 선택만 바뀐 상태, 같은 종이색, 원위치로 돌아온 레이어/올가미는 취소 단계를 소비하지 않는다.
export function sameSketch(a:SketchDocument,b:SketchDocument){
  if(a.width!==b.width||a.height!==b.height||a.background!==b.background)return false
  for(const key of ['outline','color'] as const)if(a.layers[key].visible!==b.layers[key].visible||a.layers[key].opacity!==b.layers[key].opacity)return false
  if(a.strokes===b.strokes)return true
  return a.strokes.length===b.strokes.length&&a.strokes.every((s,i)=>{
    const t=b.strokes[i];if(s===t)return true
    return s.id===t.id&&s.color===t.color&&s.width===t.width&&s.erase===t.erase&&s.opacity===t.opacity&&s.layer===t.layer&&s.brush===t.brush&&s.sticker===t.sticker&&s.photo===t.photo&&s.fillRuns===t.fillRuns&&s.points.length===t.points.length&&s.points.every((p,j)=>p.x===t.points[j].x&&p.y===t.points[j].y)
  })
}
