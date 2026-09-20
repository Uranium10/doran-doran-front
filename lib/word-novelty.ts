export type WordNovelty = {status:"pending"|"unavailable"} | {status:"ready";total_words:number;new_words:number;new_percent:number|null}

/** 0개와 미분석을 구분하고, 분모 0일 때 무의미한 퍼센트를 표시하지 않는다. */
export function noveltyLabel(value:WordNovelty|null):string {
  if(!value || value.status!=="ready")return "이야기 속 새 낱말을 살펴보고 있어요"
  const {total_words:total,new_words:fresh,new_percent:percent}=value
  if(!Number.isSafeInteger(total)||!Number.isSafeInteger(fresh)||total<0||fresh<0||fresh>total)return "이야기 속 새 낱말을 살펴보고 있어요"
  if(total===0)return "이번 이야기에는 사전과 비교할 낱말이 없어요"
  if(percent===null||!Number.isFinite(percent)||percent<0||percent>100)return "이야기 속 새 낱말을 살펴보고 있어요"
  return `사전에서 처음 만나는 낱말 ${fresh}개 · ${percent}%`
}
