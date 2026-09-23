const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const scope={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../lib/sketchbook-controls.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
const {pinchView,paperPoint,TouchView,IDENTITY}=scope.exports;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const polar=(deg,r=100)=>({x:r*Math.cos(deg*Math.PI/180),y:r*Math.sin(deg*Math.PI/180)});
test('동시 확대·이동·90도 회전에서도 손가락 사이 종이 지점을 유지한다',()=>{
 const v={x:25,y:-30,scale:1.5,rotation:25},start=[{x:0,y:20},{x:100,y:20}],next=[{x:90,y:-40},{x:90,y:160}];
 const n=pinchView(v,start,next),a=paperPoint({x:50,y:20},v,300,450),b=paperPoint({x:90,y:60},n,300,450);
 close(n.rotation,115);close(n.scale,3);close(a.x,b.x);close(a.y,b.y);
});
test('수평 스냅은 4도 진입·7도 이탈로 흔들림을 억제한다',()=>{
 const g=new TouchView();g.down(1,{x:0,y:0},IDENTITY);g.down(2,polar(0),IDENTITY);
 close(g.move(2,polar(6)).rotation,0);close(g.move(2,polar(8)).rotation,8);
 close(g.move(2,polar(5)).rotation,5);close(g.move(2,polar(3)).rotation,0);
 close(g.move(2,polar(-6)).rotation,0);close(g.move(2,polar(-8)).rotation,-8);
});
test('각도 경계를 지나거나 한 바퀴 돌아도 올바른 방향이며 수평에 스냅된다',()=>{
 close(pinchView({...IDENTITY,rotation:170},[{x:0,y:0},polar(179)],[{x:0,y:0},polar(-179)]).rotation,172);
 close(pinchView({...IDENTITY,rotation:350},[{x:0,y:0},polar(0)],[{x:0,y:0},polar(12)]).rotation,0);
});
test('회전된 세로 종이의 입력 좌표를 복원하고 종이 밖 빈 모서리를 구별한다',()=>{
 for(const rotation of [-170,-90,-35,0,45,90,179]){
 const v={x:21,y:-13,scale:2.2,rotation},r=rotation*Math.PI/180,w=300,h=450;
 for(const p of [{x:.1,y:.9},{x:.5,y:.5},{x:1.1,y:.2}]){
 const x=(p.x-.5)*w*v.scale,y=(p.y-.5)*h*v.scale;
 const n=paperPoint({x:v.x+x*Math.cos(r)-y*Math.sin(r),y:v.y+x*Math.sin(r)+y*Math.cos(r)},v,w,h);
 close(p.x,n.x);close(p.y,n.y);
 }}
 const outside=paperPoint({x:200,y:-200},{...IDENTITY,rotation:45},300,450);assert.ok(outside.y<0);
});
test('스냅 중에도 줌 제한과 두 손가락 사이 기준점이 유지된다',()=>{
 const v={x:40,y:-10,scale:5,rotation:3},start=[{x:0,y:0},{x:100,y:0}],next=[{x:20,y:30},{x:300,y:30}],n=pinchView(v,start,next);
 assert.equal(n.scale,6);assert.equal(n.rotation,0);const a=paperPoint({x:50,y:0},v,300,450),b=paperPoint({x:160,y:30},n,300,450);close(a.x,b.x);close(a.y,b.y);
});
test('세 번째 손가락 전환은 회전을 유지하고 마지막 손가락까지 그리기를 잠근다',()=>{
 const g=new TouchView(),v={...IDENTITY,rotation:35};g.down(1,{x:0,y:0},v);g.down(2,{x:100,y:0},v);g.down(3,{x:50,y:80},v);g.up(1,v);
 close(g.move(3,{x:50,y:80}).rotation,35);g.up(2,v);assert.equal(g.locked,true);g.up(3,v);assert.equal(g.locked,false);assert.equal(IDENTITY.rotation,0);
});
