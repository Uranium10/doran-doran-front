import type {DrawingLayer,Stroke} from './drawing-story'
import {adoptLayer,copyLayer,paintStroke,compositeLayers} from './sketchbook'

import {DEFAULT_LAYERS,type LayerSettings} from './sketchbook-document'

// 매 선마다 큰 캔버스 3장을 새로 할당하지 않는다. 편집 캔버스와 수명을 함께한다.
const previews=new WeakMap<HTMLCanvasElement,{original:HTMLCanvasElement;ink:HTMLCanvasElement;other:HTMLCanvasElement}>()
/** 원본 레이어 캐시에 미완성 선을 넣지 않는다. 지우는 동안 이전 크레파스/유동화 기록을 재생하지 않는다. */
export function beginStrokePreview(canvas:HTMLCanvasElement,strokes:Stroke[],layer:DrawingLayer,layers:LayerSettings=DEFAULT_LAYERS){
  const W=canvas.width,H=canvas.height
  let buffers=previews.get(canvas)
  if(!buffers){buffers={original:document.createElement('canvas'),ink:document.createElement('canvas'),other:document.createElement('canvas')};previews.set(canvas,buffers)}
  const {original,ink,other}=buffers
  for(const c of [original,ink,other])if(c.width!==W||c.height!==H){c.width=W;c.height=H}
  copyLayer(canvas,original,strokes,layer)
  copyLayer(canvas,other,strokes,layer==='color'?'outline':'color')
  const ctx=ink.getContext('2d',{willReadFrequently:true})!
  return {
    render(stroke:Stroke){
      // 같은 구간을 프레임마다 중복 삭제하면 반투명 지우개의 농도가 달라진다. 원본 위에서 현재 선만 다시 계산한다.
      ctx.clearRect(0,0,W,H);ctx.drawImage(original,0,0);paintStroke(ctx,stroke,W,H)
      compositeLayers(canvas,layer==='color'?ink:other,layer==='outline'?ink:other,layers)
    },
    commit(next:Stroke[]){adoptLayer(canvas,ink,next,layer)},
  }
}

export const beginEraserPreview=beginStrokePreview
