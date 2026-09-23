const FIELDS:Record<string,string>={
  profile_id:'선택한 프로필',mode:'동화 종류',reading_mode:'읽기 방식',
  drawing_input_id:'그림 입력',page_images:'삽화 옵션',image_provider:'그림 담당',
  theme_id:'주제',custom_topic:'직접 쓴 주제',protagonist_name:'주인공 이름',
  favorite:'좋아하는 것',today_event:'오늘 일어난 일',tts:'음성 옵션',
}
const CONTEXT_MESSAGES=new Set([
  '확인한 그림과 삽화 옵션이 필요해요. 그림 모드에는 별도 주제를 넣지 않아요.',
  '그림 입력은 그림으로 만드는 동화에서만 사용해 주세요.',
  '편하게 읽기는 나만의 이야기에서 선택해 주세요.',
  '추천 주제와 직접 입력 중 하나만 선택해 주세요. 직접 입력은 나만의 이야기에서 사용할 수 있어요.',
  '이야기 주제를 선택해 주세요.',
  '주인공 이름과 이야기 주제 또는 좋아하는 것을 입력해 주세요.',
])
/** 검증 응답의 input/ctx와 내부 오류 원문을 표시하지 않고 고칠 수 있는 입력만 안내한다. */
export function requestErrorMessage(body:unknown,status:number):string{
  const detail=body&&typeof body==='object'&&'detail' in body?body.detail:null
  if(typeof detail==='string')return detail
  if(status===422&&Array.isArray(detail)){
    for(const error of detail){
      if(!error||typeof error!=='object')continue
      if(error.type==='value_error'&&typeof error.msg==='string'){
        const message=error.msg.replace(/^Value error, /,'')
        if(CONTEXT_MESSAGES.has(message))return message
      }
      const field=Array.isArray(error.loc)?error.loc.find((v:unknown)=>typeof v==='string'&&Object.hasOwn(FIELDS,v)):null
      if(field)return `${FIELDS[field]} 항목을 다시 확인해 주세요.`
    }
    return '동화 만들기 입력을 확인하지 못했어요. 읽기 방식과 그림 선택을 다시 확인해 주세요.'
  }
  return '요청을 처리하지 못했습니다.'
}
