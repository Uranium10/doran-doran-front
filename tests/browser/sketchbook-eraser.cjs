// 실행: PLAYWRIGHT_MODULE(선택), BROWSER_EXECUTABLE(선택)을 설정하고 node tests/browser/sketchbook-eraser.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=process.env.SKETCHBOOK_ROOT||path.resolve(__dirname,'../..');
 const names=['sketchbook-document','sketchbook-controls','sketchbook-stickers','sketchbook-warp','sketchbook','sketchbook-eraser'];
 const source=names.map(n=>`factories[${JSON.stringify('./'+n)}]=function(exports,require){${ts.transpileModule(fs.readFileSync(path.join(root,'lib',n+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText}};`).join('\n');
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try{
 const page=await browser.newPage();await page.setContent('<html><body></body></html>');
 await page.addScriptTag({content:`const factories={},cache={};function require(n){if(!cache[n]){cache[n]={};factories[n](cache[n],require)}return cache[n]};${source};window.api={...require('./sketchbook'),...require('./sketchbook-eraser')};`});
 const result=await page.evaluate(()=>{
 const {paintSketch,beginEraserPreview}=window.api;
 const canvas=()=>{const c=document.createElement('canvas');c.width=900;c.height=1300;c.getContext('2d',{willReadFrequently:true});return c};
 const pixel=(c,x=.5,y=.5)=>Array.from(c.getContext('2d').getImageData(x*c.width,y*c.height,1,1).data);
 const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
 const same=(a,b)=>{const x=pixels(a),y=pixels(b);return x.every((v,i)=>v===y[i])};
 const base=[{id:'blue',color:'#467ba1',width:90,erase:false,layer:'color',points:[{x:.1,y:.5},{x:.9,y:.5}]},{id:'red',color:'#b84839',width:65,erase:false,layer:'outline',points:[{x:.1,y:.5},{x:.9,y:.5}]}];
 const cases=[];
 for(const layer of ['outline','color'])for(const opacity of [1,.4]){
 const c=canvas(),reference=canvas();paintSketch(c,base);
 const original=c.toDataURL(),e={id:'erase',color:'#000000',width:100,erase:true,layer,opacity,points:[{x:.2,y:.5}]};
 const preview=beginEraserPreview(c,base,layer);preview.render(e);e.points.push({x:.7,y:.5});preview.render(e);
 paintSketch(reference,[...base,e]);const previewMatches=same(c,reference),first=pixels(c);preview.render(e);const second=pixels(c),repeatedStable=first.every((v,i)=>v===second[i]);
 // 취소 후에도 확정된 레이어 캐시는 원래 그림을 보존해야 한다.
 paintSketch(c,base);const cancelled=c.toDataURL()===original;
 preview.render(e);preview.commit([...base,e]);paintSketch(c,[...base,e]);const committed=same(c,reference);
 paintSketch(c,base);const undo=c.toDataURL()===original;paintSketch(c,[...base,e]);const redo=same(c,reference);
 cases.push({layer,opacity,previewMatches,repeatedStable,cancelled,committed,undo,redo});
 }
 // 현재 선이 색칠 레이어에 있어도 밑그림보다 앞에 나타나지 않으며, 숨김/농도도 같은 결과를 내야 한다.
 for(const layer of ['outline','color'])for(const visible of [true,false])for(const alpha of [1,.35]){
  const c=canvas(),reference=canvas(),settings={outline:{visible,opacity:alpha},color:{visible:true,opacity:.6}};
  const stroke={id:'live',color:'#33aa55',width:95,erase:false,layer,opacity:.7,points:[{x:.2,y:.5},{x:.7,y:.5}]};
  paintSketch(c,base,settings);const preview=beginEraserPreview(c,base,layer,settings);preview.render(stroke);paintSketch(reference,[...base,stroke],settings);
  const previewMatches=same(c,reference);preview.commit([...base,stroke]);paintSketch(c,[...base,stroke],settings);
  cases.push({layer,visible,alpha,previewMatches,repeatedStable:true,cancelled:true,committed:same(c,reference),undo:true,redo:true});
 }
 const old=canvas();paintSketch(old,base);const e={id:'old',color:'#000000',width:100,erase:true,points:[{x:.2,y:.5}]};paintSketch(old,[...base,e]);const before=pixel(old);e.points.push({x:.7,y:.5});paintSketch(old,[...base,e]);const stale=JSON.stringify(before)===JSON.stringify(pixel(old));
 const history=Array.from({length:80},(_,i)=>({id:String(i),color:['#b84839','#467ba1'][i%2],width:30,erase:false,brush:'pencil',points:Array.from({length:160},(_,j)=>({x:.1+j*.0045,y:.1+i*.01+Math.sin(j/8)*.005}))}));
 history.push({id:'warp',color:'#000000',width:80,erase:false,brush:'warp',opacity:.8,points:Array.from({length:100},(_,j)=>({x:.3+j*.002,y:.3+Math.sin(j/7)*.02}))});
 const c=canvas();paintSketch(c,history);const er={id:'erase-heavy',color:'#000000',width:80,erase:true,opacity:.4,points:[{x:.2,y:.5}]};
 let t=performance.now();const preview=beginEraserPreview(c,history,'outline');const startMs=performance.now()-t,times=[];
 for(let i=0;i<60;i++){er.points.push({x:.2+i*.01,y:.5});t=performance.now();preview.render(er);pixel(c);times.push(performance.now()-t)}
 t=performance.now();preview.render(er);preview.commit([...history,er]);paintSketch(c,[...history,er]);pixel(c);const newFinishMs=performance.now()-t;
 const legacy=canvas();paintSketch(legacy,history);paintSketch(legacy,[...history,er]);t=performance.now();paintSketch(legacy,history);paintSketch(legacy,[...history,er]);pixel(legacy);const oldFinishMs=performance.now()-t;
 times.sort((a,b)=>a-b);return{cases,legacyPreviewStale:stale,benchmark:{size:'900x1300',strokes:81,points:12900,startMs,p50Ms:times[30],p95Ms:times[57],newFinishMs,oldFinishMs,finalMatches:same(c,legacy)}};
 });
 for(const c of result.cases)for(const k of ['previewMatches','repeatedStable','cancelled','committed','undo','redo'])assert.equal(c[k],true,JSON.stringify(c));
 assert.equal(result.legacyPreviewStale,true);assert.equal(result.benchmark.finalMatches,true);console.log(JSON.stringify(result,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
