const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),ts=require('typescript');
const scope={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/sketchbook-transform.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
const {transformQuad,quadCenter,projectQuad,rotateQuad,validQuad}=scope.exports;
const q=[{x:100,y:100},{x:300,y:100},{x:300,y:200},{x:100,y:200}],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('크기 조절은 기본 비율 유지, Shift는 비율 해제',()=>{
 const a=transformQuad(q,'se',q[2],{x:400,y:220});near((a[1].x-a[0].x)/(a[3].y-a[0].y),2);near(a[0].x,100);
 const b=transformQuad(q,'se',q[2],{x:400,y:220},{shift:true});near(b[1].x-b[0].x,300);near(b[3].y-b[0].y,120);
});
test('Alt 중심 확대, Shift 15도 스냅과 회전된 좌표 확대',()=>{
 const a=transformQuad(q,'se',q[2],{x:400,y:250},{alt:true});near(quadCenter(a).x,200);near(quadCenter(a).y,150);
 const b=transformQuad(q,'rotate',{x:300,y:150},{x:280,y:220},{shift:true});near(Math.atan2(b[1].y-b[0].y,b[1].x-b[0].x),Math.PI/4);
 const rot=rotateQuad(q,.6),c=quadCenter(rot),end={x:c.x+(rot[2].x-c.x)*1.5,y:c.y+(rot[2].y-c.y)*1.5};const bigger=transformQuad(rot,'se',rot[2],end,{alt:true});near(Math.hypot(bigger[1].x-bigger[0].x,bigger[1].y-bigger[0].y),300);
});
test('Ctrl 모서리 왜곡, Ctrl Shift 측면 기울이기, 투시는 모서리 보존',()=>{
 const a=transformQuad(q,'ne',q[1],{x:350,y:80},{ctrl:true});near(a[1].x,350);near(a[2].x,300);
 const b=transformQuad(q,'n',{x:200,y:100},{x:240,y:50},{ctrl:true,shift:true});near(b[0].x,140);near(b[0].y,100);near(b[2].x,300);
 const c=transformQuad(q,'ne',q[1],{x:340,y:100},{ctrl:true,shift:true,alt:true});near(c[0].x,60);near(c[1].x,340);near(c[2].x,300);
 for(const [i,u,v] of [[0,0,0],[1,1,0],[2,1,1],[3,0,1]]){near(projectQuad(a,u,v).x,a[i].x);near(projectQuad(a,u,v).y,a[i].y)}
});
test('원본 불변, 좌우 반전 가능, 꼬인 사각형 차단, Shift 이동 축 고정',()=>{
 const before=JSON.stringify(q),a=transformQuad(q,'se',q[2],{x:0,y:50},{shift:true});assert.ok(validQuad(a));assert.equal(JSON.stringify(q),before);
 const b=transformQuad(q,'move',{x:0,y:0},{x:5,y:30},{shift:true});near(b[0].x,100);near(b[0].y,130);
 assert.equal(validQuad([q[0],q[2],q[1],q[3]]),false);
});
