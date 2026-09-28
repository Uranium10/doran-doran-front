import type {Point} from './drawing-story'
export type Quad=[Point,Point,Point,Point]
export type TransformHandle='nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'rotate'|'move'
export type Modifiers={shift?:boolean;alt?:boolean;ctrl?:boolean;proportional?:boolean}
export const HANDLES=[['nw',0,0,'왼쪽 위'],['n',.5,0,'위'],['ne',1,0,'오른쪽 위'],['e',1,.5,'오른쪽'],['se',1,1,'오른쪽 아래'],['s',.5,1,'아래'],['sw',0,1,'왼쪽 아래'],['w',0,.5,'왼쪽']] as const
export const quadCenter=(q:Quad)=>({x:q.reduce((v,p)=>v+p.x,0)/4,y:q.reduce((v,p)=>v+p.y,0)/4})
export const translateQuad=(q:Quad,x:number,y:number)=>q.map(p=>({x:p.x+x,y:p.y+y})) as Quad
const sub=(a:Point,b:Point)=>({x:a.x-b.x,y:a.y-b.y})
const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x
export function validQuad(q:Quad){
  if(q.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>100000||Math.abs(p.y)>100000))return false
  const c=q.map((p,i)=>cross(sub(q[(i+1)%4],p),sub(q[(i+2)%4],q[(i+1)%4])))
  return c.every(n=>n>1)||c.every(n=>n< -1)
}
// 사각형 좌표에서 투시 사각형으로의 사영변환. 모서리 하나만 움직여도 사진의 네 점을 모두 사용한다.
export function projectQuad(q:Quad,u:number,v:number):Point{
  const [a,b,c,d]=q,dx=a.x-b.x+c.x-d.x,dy=a.y-b.y+c.y-d.y
  const x1=b.x-c.x,x2=d.x-c.x,y1=b.y-c.y,y2=d.y-c.y,den=x1*y2-x2*y1
  const g=Math.abs(den)>1e-10?(dx*y2-x2*dy)/den:0,h=Math.abs(den)>1e-10?(x1*dy-dx*y1)/den:0,z=g*u+h*v+1
  return {x:((b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v+a.x)/z,y:((b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v+a.y)/z}
}
export function rotateQuad(q:Quad,angle:number,pivot=quadCenter(q)):Quad{
  const c=Math.cos(angle),s=Math.sin(angle)
  return q.map(p=>({x:pivot.x+(p.x-pivot.x)*c-(p.y-pivot.y)*s,y:pivot.y+(p.x-pivot.x)*s+(p.y-pivot.y)*c})) as Quad
}
export function transformQuad(q:Quad,handle:TransformHandle,start:Point,end:Point,m:Modifiers={}):Quad{
  const center=quadCenter(q),delta=sub(end,start)
  if(handle==='move'){
    if(m.shift){if(Math.abs(delta.x)>Math.abs(delta.y))delta.y=0;else delta.x=0}
    return translateQuad(q,delta.x,delta.y)
  }
  if(handle==='rotate'){
    let angle=Math.atan2(end.y-center.y,end.x-center.x)-Math.atan2(start.y-center.y,start.x-center.x)
    if(m.shift){const current=Math.atan2(q[1].y-q[0].y,q[1].x-q[0].x);angle=Math.round((current+angle)/(Math.PI/12))*Math.PI/12-current}
    return rotateQuad(q,angle)
  }
  const info=HANDLES.find(h=>h[0]===handle)!,u=info[1],v=info[2],corner=u!==.5&&v!==.5
  if(m.ctrl){
    const next=q.map(p=>({...p})) as Quad,indices=corner?[handle==='nw'?0:handle==='ne'?1:handle==='se'?2:3]:handle==='n'?[0,1]:handle==='e'?[1,2]:handle==='s'?[2,3]:[3,0]
    let d=delta
    if(!corner&&m.shift){const edge=sub(q[indices[1]],q[indices[0]]),t=(d.x*edge.x+d.y*edge.y)/(edge.x*edge.x+edge.y*edge.y);d={x:edge.x*t,y:edge.y*t}}
    for(const i of indices){next[i].x+=d.x;next[i].y+=d.y}
    if(corner&&m.alt&&m.shift){
      const i=indices[0],horizontal=Math.abs(d.x)>=Math.abs(d.y),j=horizontal?([1,0,3,2][i]):([3,2,1,0][i])
      if(horizontal){next[i].y=q[i].y;next[j].x-=d.x}else{next[i].x=q[i].x;next[j].y-=d.y}
    }else if(m.alt)for(const i of indices){const j=(i+2)%4;next[j].x-=d.x;next[j].y-=d.y}
    return validQuad(next)?next:q
  }
  // 회전 후에도 변형 틀의 로컬 축으로 계산한다.
  const ex=sub(q[1],q[0]),ey=sub(q[3],q[0]),det=cross(ex,ey)
  if(Math.abs(det)<1e-8)return q
  const local=(p:Point)=>{const d=sub(p,q[0]);return{x:cross(d,ey)/det,y:cross(ex,d)/det}}
  const a={x:m.alt?.5:1-u,y:m.alt?.5:1-v},s=local(start),e=local(end)
  let sx=u===.5?1:(e.x-a.x)/(s.x-a.x||1),sy=v===.5?1:(e.y-a.y)/(s.y-a.y||1)
  if(corner&&Boolean(m.proportional??true)!==Boolean(m.shift)){
    const pivot=projectQuad(q,a.x,a.y),sv=sub(start,pivot),ev=sub(end,pivot),f=(sv.x*ev.x+sv.y*ev.y)/(sv.x*sv.x+sv.y*sv.y||1);sx=sy=f
  }
  const nonzero=(n:number)=>Math.abs(n)<.01?(n<0?-.01:.01):n;sx=nonzero(sx);sy=nonzero(sy)
  const next=q.map(p=>{const l=local(p),x=a.x+(l.x-a.x)*sx,y=a.y+(l.y-a.y)*sy;return{x:q[0].x+ex.x*x+ey.x*y,y:q[0].y+ex.y*x+ey.y*y}}) as Quad
  return validQuad(next)?next:q
}

type Projection=ReturnType<typeof homography>
function homography(q:Quad){
  const [a,b,c,d]=q,dx=a.x-b.x+c.x-d.x,dy=a.y-b.y+c.y-d.y,x1=b.x-c.x,x2=d.x-c.x,y1=b.y-c.y,y2=d.y-c.y,den=x1*y2-x2*y1
  const g=(dx*y2-x2*dy)/den,h=(x1*dy-dx*y1)/den
  return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h,1]
}
type GPU={canvas:HTMLCanvasElement;gl:WebGLRenderingContext;program:WebGLProgram;matrix:WebGLUniformLocation|null;resolution:WebGLUniformLocation|null;textures:Map<CanvasImageSource,WebGLTexture>}
let gpu:GPU|null|undefined
function projectionGPU():GPU|null{
  if(gpu!==undefined)return gpu
  gpu=null
  try{
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true})
    if(!gl)return null
    const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('shader');return s}
    const v=shader(gl.VERTEX_SHADER,'attribute vec2 uv;uniform mat3 matrix;uniform vec2 resolution;varying vec2 tex;void main(){vec3 p=matrix*vec3(uv,1.);gl_Position=vec4(2.*p.x/resolution.x-p.z,p.z-2.*p.y/resolution.y,0.,p.z);tex=uv;}')
    const f=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,tex);}')
    const program=gl.createProgram()!;gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null
    gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,1,1,0,0,1,1,0,1]),gl.STATIC_DRAW)
    const uv=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true)
    gpu={canvas,gl,program,matrix:gl.getUniformLocation(program,'matrix'),resolution:gl.getUniformLocation(program,'resolution'),textures:new Map()}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gpu=null})
    return gpu
  }catch{return null}
}
const pixels=new WeakMap<object,{data:Uint8ClampedArray;width:number;height:number}>()
const rasterBuffers=new WeakMap<CanvasRenderingContext2D,{canvas:HTMLCanvasElement;data:ImageData}>()
// GPU를 쓸 수 없는 기기에서는 역방향 픽셀 매핑으로 이음선 없는 투시를 만든다.
function rasterProjection(ctx:CanvasRenderingContext2D,image:CanvasImageSource,q:Quad,iw:number,ih:number,m:Projection){
  let source=pixels.get(image)
  if(!source){const c=document.createElement('canvas');c.width=iw;c.height=ih;const x=c.getContext('2d',{willReadFrequently:true})!;x.drawImage(image,0,0,iw,ih);source={data:x.getImageData(0,0,iw,ih).data,width:iw,height:ih};pixels.set(image,source)}
  const W=ctx.canvas.width,H=ctx.canvas.height
  let buffer=rasterBuffers.get(ctx)
  if(!buffer||buffer.canvas.width!==W||buffer.canvas.height!==H){const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;buffer={canvas,data:new ImageData(W,H)};rasterBuffers.set(ctx,buffer)}
  const out=buffer.data.data;out.fill(0);const src=source.data
  const [a,b,c,d,e,f,g,h,i]=m,inv=[e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d]
  const left=Math.max(0,Math.floor(Math.min(...q.map(p=>p.x)))),right=Math.min(W,Math.ceil(Math.max(...q.map(p=>p.x)))),top=Math.max(0,Math.floor(Math.min(...q.map(p=>p.y)))),bottom=Math.min(H,Math.ceil(Math.max(...q.map(p=>p.y))))
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const px=x+.5,py=y+.5,z=inv[6]*px+inv[7]*py+inv[8],u=(inv[0]*px+inv[1]*py+inv[2])/z,v=(inv[3]*px+inv[4]*py+inv[5])/z
    if(u<0||u>1||v<0||v>1||!Number.isFinite(u+v))continue
    const sx=Math.max(0,Math.min(iw-1,u*iw-.5)),sy=Math.max(0,Math.min(ih-1,v*ih-.5)),x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(iw-1,x0+1),y1=Math.min(ih-1,y0+1),fx=sx-x0,fy=sy-y0
    const i0=(y0*iw+x0)*4,i1=(y0*iw+x1)*4,i2=(y1*iw+x0)*4,i3=(y1*iw+x1)*4,w0=(1-fx)*(1-fy)*src[i0+3],w1=fx*(1-fy)*src[i1+3],w2=(1-fx)*fy*src[i2+3],w3=fx*fy*src[i3+3],alpha=w0+w1+w2+w3,k=(y*W+x)*4
    if(alpha){out[k+3]=alpha;for(let n=0;n<3;n++)out[k+n]=(src[i0+n]*w0+src[i1+n]*w1+src[i2+n]*w2+src[i3+n]*w3)/alpha}
  }
  buffer.canvas.getContext('2d')!.putImageData(buffer.data,0,0);ctx.drawImage(buffer.canvas,0,0)
}
// 일반 확대·회전은 drawImage 한 번. 투시만 공유 GPU 버퍼로 처리하며 텍스처는 최대 2장 보관한다.
export function drawQuad(ctx:CanvasRenderingContext2D,image:CanvasImageSource,q:Quad,iw:number,ih:number){
  const [a,b,c,d]=q
  if(Math.hypot(a.x-b.x+c.x-d.x,a.y-b.y+c.y-d.y)<.01){ctx.save();ctx.transform((b.x-a.x)/iw,(b.y-a.y)/iw,(d.x-a.x)/ih,(d.y-a.y)/ih,a.x,a.y);ctx.drawImage(image,0,0,iw,ih);ctx.restore();return}
  if(!validQuad(q))return
  const m=homography(q),renderer=projectionGPU()
  if(renderer){
    try{
      const {gl,canvas,textures}=renderer,W=ctx.canvas.width,H=ctx.canvas.height
      if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
      gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(renderer.program)
      let texture=textures.get(image)
      if(!texture){
        if(textures.size>=2){const oldest=textures.keys().next().value!;gl.deleteTexture(textures.get(oldest)!);textures.delete(oldest)}
        texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image as TexImageSource);textures.set(image,texture)
      }else gl.bindTexture(gl.TEXTURE_2D,texture)
      gl.uniformMatrix3fv(renderer.matrix,false,new Float32Array([m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]]));gl.uniform2f(renderer.resolution,W,H);gl.drawArrays(gl.TRIANGLES,0,6)
      if(gl.isContextLost())throw new Error('context lost')
      ctx.drawImage(canvas,0,0);return
    }catch{gpu=null}
  }
  rasterProjection(ctx,image,q,iw,ih,m)
}
