// 실행: PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE(선택). 실제 컴포넌트를 임시 번들로 검증한다.
const fs=require('fs'),path=require('path');
const root=(process.env.SKETCHBOOK_ROOT||path.resolve(__dirname,'../..')).replaceAll('\\','/');
const webpackLib=require(root+'/node_modules/next/dist/compiled/webpack/webpack');
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'sketch-ui-')).replaceAll('\\','/');
fs.writeFileSync(dir+'/loader.cjs',`const ts=require('${root}/node_modules/typescript');module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}`);
fs.writeFileSync(dir+'/css.cjs',`module.exports=function(s){return 'const style=document.createElement("style");style.textContent='+JSON.stringify(s)+';document.head.append(style);export default new Proxy({},{get:(_,k)=>k});'}`);
fs.writeFileSync(dir+'/entry.tsx',`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{Sketchbook}from'${root}/components/workpad/sketchbook';import{sketchBlob}from'${root}/lib/sketchbook';import{drawQuad,projectQuad}from'${root}/lib/sketchbook-transform';window.projection={drawQuad,projectQuad};import{writeSketchSlot,readSketchSlots}from'${root}/lib/sketchbook-document';import{preparePhotos}from'${root}/lib/sketchbook-photo';import{DEFAULT_LAYERS}from'${root}/lib/sketchbook-document';function App(){const[doc,setDoc]=useState({strokes:[],layers:DEFAULT_LAYERS,background:'#fffaf0',width:900,height:window.innerWidth>700?560:1300,activeLayer:'outline'});window.doc=doc;window.setDoc=setDoc;window.exportSketch=()=>sketchBlob(doc.strokes,doc.background,900,doc.height,doc.layers);window.slots={writeSketchSlot,readSketchSlots,preparePhotos};return <div style={{height:'100dvh',display:'grid',gridTemplateRows:'56px minmax(0,1fr)'}}><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 20px',background:'#fffaf0'}}>〈　그림 / 사진 <button>다했어요!</button></header><Sketchbook value={doc.strokes} layers={doc.layers} width={900} height={doc.height} background={doc.background} onChange={strokes=>setDoc({...doc,strokes})} onBackgroundChange={background=>setDoc({...doc,background})} onDocumentChange={setDoc} storageKey="ui-test"/></div>};createRoot(document.getElementById('root')).render(<App/>);`);
async function build(){await new Promise((resolve,reject)=>{webpackLib.webpack({mode:'development',devtool:false,entry:dir+'/entry.tsx',output:{path:dir+'/dist',filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,use:[dir+'/loader.cjs']},{test:/\.css$/,use:[dir+'/css.cjs']}]},performance:{hints:false}},(err,stats)=>{if(err||stats.hasErrors())reject(err||new Error(stats.toString({all:false,errors:true})));else resolve()});});}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const http=require('http'),assert=require('assert/strict');
(async()=>{await build();const server=http.createServer((req,res)=>{if(req.url.startsWith('/images/sketchbook/')){res.setHeader('content-type','image/webp');res.end(fs.readFileSync(root+'/public'+req.url))}else if(req.url.endsWith('.js')){res.setHeader('content-type','text/javascript; charset=utf-8');res.end(fs.readFileSync(dir+'/dist/'+req.url.split('/').pop()))}else res.end('<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}h3,p{margin:0}svg{display:block}</style><div id="root"></div><script src="/bundle.js"></script></html>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});try{const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(String(e))});
await page.goto(url);
// GPU와 CPU 대체 경로 모두 사진의 색/투명도/투시 내부 이음선을 검증한다.
const checkProjection=async(target)=>target.evaluate(()=>{
 const {drawQuad,projectQuad}=window.projection,c=document.createElement('canvas');c.width=200;c.height=200;const ctx=c.getContext('2d',{willReadFrequently:true});
 const src=document.createElement('canvas');src.width=src.height=64;const sc=src.getContext('2d');sc.fillStyle='#ef341f';sc.fillRect(0,0,32,64);sc.fillStyle='#226bee';sc.fillRect(32,0,32,64);
 const q=[{x:20,y:20},{x:175,y:8},{x:156,y:181},{x:32,y:161}];drawQuad(ctx,src,q,64,64);
 let bad=0;for(let y=1;y<9;y++)for(let x=1;x<9;x++){const p=projectQuad(q,x/10,y/10),v=ctx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data;if(v[3]<250)bad++}
 const at=u=>{const p=projectQuad(q,u,.5);return Array.from(ctx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data)};
 return {bad,left:at(.2),right:at(.8),outside:ctx.getImageData(0,0,1,1).data[3]};
});
for(const fallback of [false,true]){
 const target=fallback?await browser.newPage():page;
 if(fallback){await target.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args)}});await target.goto(url)}
 const result=await checkProjection(target);assert.equal(result.bad,0);assert.equal(result.outside,0);assert.ok(result.left[0]>220&&result.left[2]<50);assert.ok(result.right[2]>220&&result.right[0]<50);if(fallback)await target.close();
}
console.log('PASS seam-free projective GPU/CPU color and transparency');

// 문서 전체에서 삭제/변형 키를 받고 입력 칸과 확인 창에서는 실행하지 않는다.
{
 const initial=await page.evaluate(()=>{const doc={...window.doc,strokes:[{id:'outline-a',color:'#ce6a43',width:32,erase:false,layer:'outline',points:[{x:.25,y:.35},{x:.55,y:.5}]},{id:'color-b',color:'#467ba1',width:26,erase:false,layer:'color',points:[{x:.25,y:.5},{x:.55,y:.65}]}]};window.setDoc(doc);return doc});
 await page.getByLabel('여기에 자유롭게 그려 주세요').focus();await page.keyboard.press('Control+a');
 await page.getByRole('button',{name:'다했어요!',exact:true}).focus();await page.keyboard.press('Delete');
 assert.deepEqual(await page.evaluate(()=>window.doc.strokes.map(s=>s.id)),['color-b']);
 await page.keyboard.press('Control+z');assert.deepEqual(await page.evaluate(()=>window.doc),initial);
 await page.getByLabel('펜',{exact:true}).click();await page.keyboard.press('Delete');
 await page.getByRole('dialog',{name:'어디를 지울까요?'}).waitFor();
 await page.keyboard.press('Delete');assert.equal(await page.evaluate(()=>window.doc.strokes.length),2);
 await page.getByRole('button',{name:'취소',exact:true}).click();
 await page.evaluate(()=>{const input=document.createElement('input');input.id='shortcut-test';input.value='test';document.body.append(input);input.focus()});await page.keyboard.press('Delete');assert.equal(await page.evaluate(()=>window.doc.strokes.length),2);await page.evaluate(()=>document.getElementById('shortcut-test').remove());
 await page.getByRole('button',{name:'다했어요!',exact:true}).focus();await page.keyboard.press('Control+t');
 await page.getByRole('toolbar',{name:'자유 변형 옵션'}).waitFor();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowDown');
 assert.deepEqual(await page.evaluate(()=>window.doc),initial,'preview does not change saved document');
 await page.keyboard.press('Escape');assert.deepEqual(await page.evaluate(()=>window.doc),initial);
 await page.keyboard.press('Control+Alt+t');await page.getByRole('toolbar',{name:'자유 변형 옵션'}).waitFor();
 const h=await page.getByRole('button',{name:'자유 변형 오른쪽 아래',exact:true}).boundingBox();
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+22,h.y+h.height/2+20,{steps:5});await page.mouse.up();
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Control+z');await page.keyboard.press('Control+y');
 await page.screenshot({path:dir+'/free-transform-mobile.png'});
 await page.keyboard.press('Enter');await page.getByRole('toolbar',{name:'자유 변형 옵션'}).waitFor({state:'detached'});
 const transformed=await page.evaluate(()=>({id:window.doc.strokes[0].id,hasPhoto:window.doc.strokes[0].photo instanceof Blob,color:window.doc.strokes[1]}));assert.ok(transformed.hasPhoto);assert.deepEqual(transformed.color,initial.strokes[1]);
 await page.keyboard.press('Control+z');assert.deepEqual(await page.evaluate(()=>window.doc),initial,'one undo restores original stroke objects and their layer');
 await page.keyboard.press('Control+y');assert.equal(await page.evaluate(()=>window.doc.strokes[0].photo instanceof Blob),true);
 await page.getByRole('button',{name:'자유 변형',exact:true}).click();await page.getByRole('toolbar',{name:'자유 변형 옵션'}).waitFor();
 const c=await page.getByRole('button',{name:'자유 변형 오른쪽 위',exact:true}).boundingBox();
 await page.keyboard.down('Control');await page.mouse.move(c.x+c.width/2,c.y+c.height/2);await page.mouse.down();await page.mouse.move(c.x+c.width/2+24,c.y+c.height/2-12,{steps:4});await page.mouse.up();await page.keyboard.up('Control');
 await page.screenshot({path:dir+'/free-transform-perspective.png'});await page.keyboard.press('Enter');
 const exported=await page.evaluate(async()=>{await window.slots.writeSketchSlot('transform-test','manual-1',window.doc);const restored=(await window.slots.readSketchSlots('transform-test'))['manual-1'].document;return{size:(await window.exportSketch()).size,points:restored.strokes[0].points}});assert.ok(exported.size>1000);assert.equal(exported.points.length,4);
 await page.getByRole('button',{name:'다했어요!',exact:true}).focus();await page.keyboard.press('Delete');assert.deepEqual(await page.evaluate(()=>window.doc.strokes.map(s=>s.id)),['color-b']);
 await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>window.doc.strokes.length),2);
 await page.reload();console.log('PASS Delete selection/clear confirmation/input guard, transform cancel/atomic undo/redo, modifier distortion, PNG persistence and export');
}

// 생성 스티커의 디코딩, 8종 삽입, 실행 취소, 로컬 저장과 JPEG 내보내기를 확인한다.
{
 const labels=['리본','해','달','별','하트','구름','꽃','나뭇잎'];
 for(let i=0;i<labels.length;i++){
  await page.getByLabel('기본 스티커 붙이기',{exact:true}).click();
  if(!i){await page.locator('.stickerGrid image').first().waitFor();await page.screenshot({path:dir+'/stickers-menu-mobile.png'});}
  await page.getByRole('button',{name:labels[i]+' 붙이기',exact:true}).click();
  await page.waitForFunction(n=>window.doc.strokes.length===n,i+1);
 }
 await page.keyboard.press('Control+z');await page.waitForFunction(()=>window.doc.strokes.length===7);
 await page.keyboard.press('Control+y');await page.waitForFunction(()=>window.doc.strokes.length===8);
 const saved=await page.evaluate(async()=>{
  const doc={...window.doc,strokes:window.doc.strokes.map((s,i)=>{const x=.09+(i%2)*.46,y=.03+Math.floor(i/2)*.24,dx=.35,dy=.35*900/1300;return {...s,points:[{x,y},{x:x+dx,y},{x:x+dx,y:y+dy},{x,y:y+dy}]}})};
  window.setDoc(doc);await window.slots.writeSketchSlot('stickers-test','manual-1',doc);return doc;
 });
 const before=await page.evaluate(async()=>Array.from(new Uint8Array(await(await window.exportSketch()).arrayBuffer())));
 assert.ok(before.length>10000,'export contains raster sticker art');
 await page.screenshot({path:dir+'/stickers-canvas-mobile.png'});
 await page.reload();
 const restored=await page.evaluate(async()=>{const doc=(await window.slots.readSketchSlots('stickers-test'))['manual-1'].document;window.setDoc(doc);return doc});
 assert.deepEqual(restored,saved);
 // 새 페이지의 미디코딩 상태에서도 내보내기가 로딩을 기다려 같은 그림을 만든다.
 const after=await page.evaluate(async()=>Array.from(new Uint8Array(await(await window.exportSketch()).arrayBuffer())));
 assert.deepEqual(after,before);
 await page.waitForTimeout(200);await page.screenshot({path:dir+'/stickers-restored-mobile.png'});
 await page.reload();console.log('PASS 8 generated stickers, undo/redo, local save/reload, cold image decode and identical JPEG export');
}

// S펜과 같은 pen 포인터의 압력 전달, 스위치 지속, 저장 복원 경로를 검증한다.
{
 await page.getByLabel('스케치북 더 보기').click();
 assert.equal(await page.getByRole('switch',{name:'필압',exact:true}).getAttribute('aria-checked'),'true');
 assert.equal(await page.getByRole('switch',{name:'손떨림 방지',exact:true}).getAttribute('aria-checked'),'false');
 await page.getByRole('switch',{name:'손떨림 방지',exact:true}).click();await page.keyboard.press('Escape');
 const penSession=await page.context().newCDPSession(page);
 const drawPen=async()=>{const b=await page.locator('.canvasWrap').boundingBox(),x=b.x+b.width*.2,y=b.y+b.height*.45;
  await penSession.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:'pen',force:.1});
  for(let i=1;i<=12;i++)await penSession.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+b.width*.5*i/12,y:y+Math.sin(i)*1.2,button:'left',buttons:1,pointerType:'pen',force:.1+.8*i/12});
  await penSession.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+b.width*.5,y,button:'left',buttons:0,clickCount:1,pointerType:'pen',force:0});
 };
 await drawPen();
 const stroke=await page.evaluate(()=>window.doc.strokes[0]);assert.equal(stroke.pressure,true);assert.ok(stroke.points.some(p=>p.pressure<.2));assert.ok(stroke.points.some(p=>p.pressure>.7));assert.ok(stroke.points.at(-1).pressure>.7);
 const stored=await page.evaluate(async()=>{await window.slots.writeSketchSlot('pressure-test','manual-1',window.doc);return (await window.slots.readSketchSlots('pressure-test'))['manual-1'].document.strokes[0]});assert.deepEqual(stored,stroke);
 await page.getByLabel('스케치북 더 보기').click();await page.getByRole('switch',{name:'필압',exact:true}).click();await page.keyboard.press('Escape');
 await drawPen();const fixed=await page.evaluate(()=>window.doc.strokes.at(-1));assert.equal(fixed.pressure,undefined);assert.ok(fixed.points.every(p=>p.pressure===undefined));
 await page.reload();await page.getByLabel('스케치북 더 보기').click();
 assert.equal(await page.getByRole('switch',{name:'필압',exact:true}).getAttribute('aria-checked'),'false');assert.equal(await page.getByRole('switch',{name:'손떨림 방지',exact:true}).getAttribute('aria-checked'),'true');
 await page.screenshot({path:dir+'/input-switches-mobile.png'});
 await page.getByRole('switch',{name:'필압',exact:true}).click();await page.getByRole('switch',{name:'손떨림 방지',exact:true}).click();await page.keyboard.press('Escape');
 await page.reload();await penSession.detach();
 console.log('PASS pen pressure, pressure-off fixed stroke, switches persistence, IndexedDB pressure roundtrip');
}

assert.equal((await page.locator('.layerControl').first().boundingBox()).width,66);
assert.equal((await page.locator('.layerEye').first().boundingBox()).width,22);
const eyeBox=await page.locator('.layerEye').first().boundingBox(),tileBox=await page.locator('.layerTile').first().boundingBox();assert.ok(eyeBox.x+eyeBox.width<=tileBox.x);
await page.screenshot({path:dir+'/compact-layers.png'});
// 두 손가락 회전 값과 표시·초기화가 일치하고 메뉴가 좁은 화면을 넘지 않는지 확인한다.
assert.equal(await page.locator('.viewAngle').count(),0);
const touchBox=await page.locator('.canvasWrap').boundingBox(),cx=touchBox.x+touchBox.width/2,cy=touchBox.y+touchBox.height/2;
const cdp=await page.context().newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}]});
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-21.213,y:cy-21.213,id:1},{x:cx+21.213,y:cy+21.213,id:2}]});
await page.getByLabel('캔버스 회전 45도',{exact:true}).waitFor();
await page.screenshot({path:dir+'/rotation-angle.png'});
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.equal(await page.locator('.viewAngle').count(),0);
await page.getByLabel('종이를 화면에 맞추기',{exact:true}).click();
assert.equal(await page.locator('.viewAngle').count(),0);
assert.equal(await page.evaluate(()=>window.doc.strokes.length),0);
await page.getByLabel('스케치북 더 보기').click();
await page.getByRole('dialog',{name:'스케치북',exact:true}).waitFor();
await page.locator('.modeCard img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
await page.screenshot({path:dir+'/menu-mobile.png'});
await page.setViewportSize({width:320,height:568});
assert.equal(await page.locator('.modeMenu').evaluate(el=>el.scrollWidth>el.clientWidth),false);
const narrowMenu=await page.locator('.modeMenu').boundingBox();assert.ok(narrowMenu.x>=0&&narrowMenu.x+narrowMenu.width<=320);
await page.keyboard.press('Escape');
assert.equal(await page.getByLabel('스케치북 더 보기').evaluate(el=>el===document.activeElement),true);
await page.setViewportSize({width:1280,height:850});
await page.getByLabel('스케치북 더 보기').click();
await page.screenshot({path:dir+'/menu-desktop.png'});
await page.mouse.click(5,5);
assert.equal(await page.locator('.modeMenu').count(),0);
await page.setViewportSize({width:390,height:844});
await page.getByLabel('스케치북 더 보기').click();
await page.getByRole('button',{name:'저장',exact:true}).click();
await page.getByRole('dialog',{name:'그림 저장',exact:true}).waitFor();
assert.equal(await page.getByRole('radio').count(),2);
await page.getByRole('button',{name:'이 칸에 저장',exact:true}).click();
await page.getByText('내 그림 1에 저장했어요.',{exact:true}).waitFor();
await page.getByLabel('보관함 닫기').click();
await page.getByLabel('스케치북 더 보기').click();
await page.getByRole('button',{name:'불러오기',exact:true}).click();
await page.getByRole('dialog',{name:'그림 불러오기',exact:true}).waitFor();
assert.equal(await page.getByRole('radio').count(),3);
await page.getByRole('button',{name:'선택한 그림 불러오기',exact:true}).click();
await page.getByRole('button',{name:'불러오기',exact:true}).click();
await page.getByRole('dialog',{name:'그림 불러오기',exact:true}).waitFor({state:'detached'});



await page.getByLabel('색칠에 그리기',{exact:true}).click();
assert.equal(await page.getByLabel('색칠에 그리기',{exact:true}).getAttribute('aria-pressed'),'true');
await page.getByLabel('밑그림 숨기기',{exact:true}).click();
assert.equal(await page.getByLabel('색칠에 그리기',{exact:true}).getAttribute('aria-pressed'),'true');
assert.equal(await page.evaluate(()=>window.doc.layers.outline.visible),false);
await page.getByLabel('밑그림 보이기',{exact:true}).click();
const tile=page.getByLabel('색칠에 그리기',{exact:true}),b=await tile.boundingBox();
await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
await page.mouse.down();
await page.mouse.move(b.x+b.width/2,b.y+b.height/2+60,{steps:8});
assert.equal(await page.locator('.layerOpacity').count(),1);
await page.mouse.up();
assert.equal(await page.locator('.layerOpacity').count(),0);
assert.equal(await page.evaluate(()=>window.doc.layers.color.visible),true);
assert.ok(await page.evaluate(()=>window.doc.layers.color.opacity)<1);
// 불투명도를 원래 값까지 끌어도 빈 기록이 생기지 않아야 한다.
await page.getByLabel('실행 취소',{exact:true}).click();
assert.equal(await page.evaluate(()=>window.doc.layers.color.opacity),1);
await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y-40,{steps:4});await page.mouse.up();
// 직전 유효 변경인 눈 버튼이 바로 취소된다.
await page.getByLabel('실행 취소',{exact:true}).click();assert.equal(await page.evaluate(()=>window.doc.layers.outline.visible),false);
await page.getByLabel('다시 실행',{exact:true}).click();assert.equal(await page.evaluate(()=>window.doc.layers.outline.visible),true);
await page.getByLabel('밑그림에 그리기',{exact:true}).click();
const paper=await page.locator('.canvasWrap').boundingBox();
await page.mouse.move(paper.x+paper.width*.3,paper.y+paper.height*.4);
await page.mouse.down();
await page.mouse.move(paper.x+paper.width*.7,paper.y+paper.height*.5,{steps:15});
await page.mouse.up();
assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
// 캔버스 포커스와 실제 키 입력을 통해 실행 취소/다시 실행을 확인한다.
assert.equal(await page.locator('.ink').evaluate(el=>el===document.activeElement),true);
for(const redoKey of ['Control+y','Control+Shift+z']){
  await page.keyboard.press('Control+z');
  assert.equal(await page.evaluate(()=>window.doc.strokes.length),0);
  await page.keyboard.press(redoKey);
  assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
}
await page.locator('.ink').evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'ㅋ',code:'KeyZ',ctrlKey:true,bubbles:true,cancelable:true})));
assert.equal(await page.evaluate(()=>window.doc.strokes.length),0);
await page.locator('.ink').evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'ㅛ',code:'KeyY',ctrlKey:true,bubbles:true,cancelable:true})));
assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
await page.getByLabel('스케치북 더 보기').click();
await page.keyboard.press('Control+z');
assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
await page.keyboard.press('Escape');
// 다른 도구와 스케치북 바깥 상단 버튼을 눌러도 단축키가 한 번씩만 실행된다.
for(const button of [page.getByLabel('펜',{exact:true}),page.getByLabel('종이를 화면에 맞추기'),page.locator('.palette button').first(),page.getByRole('button',{name:'다했어요!',exact:true})]){
  await button.click();
  await page.keyboard.press('Control+z');
  assert.equal(await page.evaluate(()=>window.doc.strokes.length),0);
  await page.keyboard.press('Control+y');
  assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
}
// 입력란의 텍스트 편집과 숨겨진 그리기 화면에는 기록 단축키를 적용하지 않는다.
await page.evaluate(()=>{const input=document.createElement('textarea');input.id='shortcut-input';document.querySelector('header').append(input);input.focus()});
await page.keyboard.press('Control+z');
assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
await page.evaluate(()=>document.getElementById('shortcut-input').remove());
await page.evaluate(()=>{document.querySelector('.studio').style.display='none'});
await page.getByRole('button',{name:'다했어요!',exact:true}).click();
await page.keyboard.press('Control+z');
assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
await page.evaluate(()=>{document.querySelector('.studio').style.display=''});
const before=await page.evaluate(()=>JSON.stringify(window.doc));
await page.getByLabel('스케치북 더 보기').click();
await page.getByRole('button',{name:/저학년용/}).click();
assert.equal(await page.evaluate(()=>JSON.stringify(window.doc)),before);
await page.getByLabel('크레파스',{exact:true}).click();
await page.getByLabel('굵은 촉',{exact:true}).click();
assert.equal(await page.getByLabel('크레파스',{exact:true}).getAttribute('aria-pressed'),'true');
await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
await page.screenshot({path:dir+'/junior-mobile.png'});
await page.getByLabel('실행 취소',{exact:true}).click();
assert.equal(await page.evaluate(()=>window.doc.strokes.length),0);
await page.getByLabel('다시 실행',{exact:true}).click();
assert.equal(await page.evaluate(()=>window.doc.strokes.length),1);
await page.getByLabel('스케치북 더 보기').click();
await page.getByRole('button',{name:/전체 기능/}).click();
assert.equal(await page.evaluate(()=>JSON.stringify(window.doc)),before);
// 빠른 키보드 취소도 같은 선을 두 번 취소하지 않는다.
for(let n=0;n<2;n++){await page.mouse.move(paper.x+paper.width*.2,paper.y+paper.height*(.6+n*.1));await page.mouse.down();await page.mouse.move(paper.x+paper.width*.6,paper.y+paper.height*(.6+n*.1),{steps:4});await page.mouse.up()}
assert.equal(await page.evaluate(()=>window.doc.strokes.length),3);
await page.locator('.studio').evaluate(el=>{for(let i=0;i<3;i++)el.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}))});
assert.equal(await page.evaluate(()=>window.doc.strokes.length),0);
await page.locator('.studio').evaluate(el=>{for(let i=0;i<3;i++)el.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,shiftKey:true,bubbles:true}))});
assert.equal(await page.evaluate(()=>window.doc.strokes.length),3);
// 기존 그림 위에 가져온 사진만 이동/회전/축소하고 저장/복원/내보내기를 확인한다.
const originalStrokes=await page.evaluate(()=>JSON.stringify(window.doc.strokes));
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=60;const x=c.getContext('2d');x.fillStyle='#ee3344';x.fillRect(0,0,100,60);return c.toDataURL().split(',')[1]});
await page.getByLabel('스케치북 더 보기').click();
const chooserEvent=page.waitForEvent('filechooser');await page.getByRole('button',{name:'사진 가져오기',exact:true}).click();const chooser=await chooserEvent;
await chooser.setFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
await page.getByRole('button',{name:'배치 완료',exact:true}).waitFor();
assert.equal(await page.evaluate(()=>window.doc.strokes.length),4);
const beforePhoto=await page.evaluate(()=>JSON.stringify(window.doc.strokes.at(-1).points));
let box=await page.locator('.selection').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2+15,{steps:4});await page.mouse.up();
assert.notEqual(await page.evaluate(()=>JSON.stringify(window.doc.strokes.at(-1).points)),beforePhoto);
await page.getByLabel('실행 취소',{exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(window.doc.strokes.at(-1).points)),beforePhoto);
// 배치 중 undo 후에도 선택은 사진 한 장에만 고정된다.
box=await page.getByLabel('오른쪽 아래 크기 조절',{exact:true}).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-15,box.y-10,{steps:4});await page.mouse.up();
box=await page.getByLabel('선택한 그림 회전',{exact:true}).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+30,box.y+15,{steps:4});await page.mouse.up();
assert.equal(await page.evaluate(()=>JSON.stringify(window.doc.strokes.slice(0,3))),originalStrokes);
await page.getByRole('button',{name:'배치 완료',exact:true}).click();
const storageResult=await page.evaluate(async()=>{const {writeSketchSlot,readSketchSlots,preparePhotos}=window.slots;await writeSketchSlot('photo-test','manual-1',window.doc);const slots=await readSketchSlots('photo-test'),restored=slots['manual-1'].document;await preparePhotos(restored.strokes);window.setDoc(restored);return {photo:restored.strokes.at(-1).photo instanceof Blob,count:restored.strokes.length}});
assert.deepEqual(storageResult,{photo:true,count:4});
const exported=await page.evaluate(async()=>{const blob=await window.exportSketch(),img=await createImageBitmap(blob),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);img.close();const pixels=x.getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>180&&pixels[i+1]<120&&pixels[i+2]<130)red++;return red});assert.ok(exported>1000,'export contains photo pixels');
await page.getByLabel('스케치북 더 보기').click();await page.getByRole('button',{name:/저학년용/}).click();await page.reload();
await page.waitForSelector('[data-mode=junior]');
await page.setViewportSize({width:1280,height:850});await page.reload();await page.waitForSelector('[data-mode=junior]');
await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
await page.screenshot({path:dir+'/junior-desktop.png'});
await page.setViewportSize({width:740,height:390});
await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
await page.screenshot({path:dir+'/junior-landscape.png'});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
assert.deepEqual(errors,[]);assert.ok(await page.locator('.realTool img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));console.log('PASS: layer select / visibility / drag overlay, mode preserves strokes+layers+undo, tools, preference reload, responsive overflow, no browser errors');}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exit(1)});
