import type {DrawingLayer,Stroke} from './drawing-story'
import {adoptLayer,copyLayer,paintStroke} from './sketchbook'

/** 원본 레이어 캐시에 미완성 선을 넣지 않는다. 지우는 동안 이전 크레파스/유동화 기록을 재생하지 않는다. */
export function beginEraserPreview(canvas:HTMLCanvasElement,strokes:Stroke[],layer:DrawingLayer){
  const W=canvas.width,H=canvas.height
  const buffer=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c}
  const original=buffer(),ink=buffer(),other=buffer()
  copyLayer(canvas,original,strokes,layer)
  copyLayer(canvas,other,strokes,layer==='color'?'outline':'color')
  const ctx=ink.getContext('2d',{willReadFrequently:true})!,output=canvas.getContext('2d')!
  return {
    render(stroke:Stroke){
      // 같은 구간을 프레임마다 중복 삭제하면 반투명 지우개의 농도가 달라진다. 원본 위에서 현재 선만 다시 계산한다.
      ctx.clearRect(0,0,W,H);ctx.drawImage(original,0,0);paintStroke(ctx,stroke,W,H)
      output.clearRect(0,0,W,H)
      output.drawImage(layer==='color'?ink:other,0,0)
      output.drawImage(layer==='outline'?ink:other,0,0)
    },
    commit(next:Stroke[]){adoptLayer(canvas,ink,next,layer)},
  }
}
