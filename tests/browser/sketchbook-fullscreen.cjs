// 실행: PLAYWRIGHT_MODULE, BROWSER_EXECUTABLE(선택). 실제 컴포넌트를 임시 번들로 검증한다.
const fs=require('fs'),path=require('path');
const root=(process.env.SKETCHBOOK_ROOT||path.resolve(__dirname,'../..')).replaceAll('\\','/');
const webpackLib=require(root+'/node_modules/next/dist/compiled/webpack/webpack');
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'sketch-ui-')).replaceAll('\\','/');
fs.writeFileSync(dir+'/loader.cjs',`const ts=require('${root}/node_modules/typescript');module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}`);
fs.writeFileSync(dir+'/css.cjs',`module.exports=function(s){return 'const style=document.createElement("style");style.textContent='+JSON.stringify(s)+';document.head.append(style);export default new Proxy({},{get:(_,k)=>k});'}`);
fs.writeFileSync(dir+'/entry.tsx',`import React,{useState,useRef}from'react';import{createRoot}from'react-dom/client';import{useSketchFullscreen}from'${root}/components/workpad/use-sketch-fullscreen';function App(){const root=useRef(null),[active,setActive]=useState(false),screen=useSketchFullscreen(root,active);return <div ref={root} id="editor"><button onClick={()=>{screen.request();setActive(true)}}>enter</button><button onClick={()=>setActive(false)}>leave</button><output>{screen.fullscreen?'fullscreen':'window'}</output><p>{screen.message}</p></div>}const app=createRoot(document.getElementById('root'));window.removeApp=()=>app.unmount();app.render(<App/>);`);
async function build(){await new Promise((resolve,reject)=>{webpackLib.webpack({mode:'development',devtool:false,entry:dir+'/entry.tsx',output:{path:dir+'/dist',filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,use:[dir+'/loader.cjs']},{test:/\.css$/,use:[dir+'/css.cjs']}]},performance:{hints:false}},(err,stats)=>{if(err||stats.hasErrors())reject(err||new Error(stats.toString({all:false,errors:true})));else resolve()});});}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const http=require('http'),assert=require('assert/strict');
(async()=>{await build();const server=http.createServer((req,res)=>{if(req.url.startsWith('/images/sketchbook/')){res.setHeader('content-type','image/webp');res.end(fs.readFileSync(root+'/public'+req.url))}else if(req.url.endsWith('.js')){res.setHeader('content-type','text/javascript; charset=utf-8');res.end(fs.readFileSync(dir+'/dist/'+req.url.split('/').pop()))}else res.end('<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0}h3,p{margin:0}svg{display:block}</style><div id="root"></div><script src="/bundle.js"></script></html>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});try{const page=await browser.newPage({viewport:{width:390,height:844}});
const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(String(e))});
await page.goto(url);
// 실제 API에 넘기는 탐색바 숨김 옵션과 사용자 제스처 진입/복귀를 확인한다.
await page.evaluate(()=>{const original=HTMLElement.prototype.requestFullscreen;window.originalFullscreen=original;HTMLElement.prototype.requestFullscreen=function(options){window.requestOptions=options;return original.call(this,options)}});
await page.getByText('enter',{exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement?.id==='editor');
await page.waitForFunction(()=>document.querySelector('output').textContent==='fullscreen');
assert.equal(await page.evaluate(()=>window.requestOptions.navigationUI),'hide');
await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>document.querySelector('output').textContent==='window');
await page.getByText('enter',{exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement?.id==='editor');
await page.getByText('leave',{exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
// 거부되어도 CSS 편집 화면은 남고 다시 시도할 수 있다.
await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=function(){return Promise.reject(new Error('denied'))}});
await page.getByText('enter',{exact:true}).click();await page.getByText('이 브라우저에서는 전체 화면을 열 수 없어요.').waitFor();assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false);
await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=window.originalFullscreen});
await page.getByText('enter',{exact:true}).click();await page.waitForFunction(()=>document.fullscreenElement?.id==='editor');
await page.evaluate(()=>window.removeApp());await page.waitForFunction(()=>!document.fullscreenElement);
assert.deepEqual(errors,[]);console.log('PASS: native fullscreen entry, hide navigation request, browser exit/reentry, preview exit, rejection fallback, unmount cleanup');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exit(1)});
