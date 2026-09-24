import {floodRuns} from './sketchbook'
// DOM을 만지지 않는 채우기 전용 작업자. 원본 픽셀 버퍼를 이전받아 복사 비용을 줄인다.
self.onmessage=(event:MessageEvent<{data:Uint8ClampedArray;width:number;height:number;x:number;y:number;tolerance:number}>)=>{
  const {data,width,height,x,y,tolerance}=event.data
  const result=Int32Array.from(floodRuns(data,width,height,x,y,tolerance))
  self.postMessage(result,{transfer:[result.buffer]})
}
