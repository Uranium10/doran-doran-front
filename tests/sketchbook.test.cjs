const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(name){const scope={exports:{},require:p=>load(path.basename(p))};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,`../lib/${name}.ts`),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);return scope.exports}
const scope={exports:load('sketchbook')};
const {insidePolygon,moveSelection,resizeSelection,strokeLayer,orderedStrokes}=scope.exports;
const strokes=[{id:'a',width:7,color:'#000',erase:false,points:[{x:.2,y:.2},{x:.4,y:.4}]},{id:'b',width:7,color:'#000',erase:false,points:[{x:.7,y:.7}]}];
test('올가미는 둘러싼 점만 선택한다',()=>{const polygon=[{x:.1,y:.1},{x:.5,y:.1},{x:.5,y:.5},{x:.1,y:.5}];assert.equal(insidePolygon(strokes[0].points[0],polygon),true);assert.equal(insidePolygon(strokes[1].points[0],polygon),false)});
test('이동은 종이 밖으로 나가지 않으면서 선택한 그림 모양과 다른 선을 보존한다',()=>{const before=JSON.stringify(strokes),next=moveSelection(strokes,['a'],1,-1);assert.equal(JSON.stringify(strokes),before);assert.equal(next[1],strokes[1]);assert.equal(next[0].points[1].x,1);assert.equal(next[0].points[0].y,0);assert.ok(Math.abs(next[0].points[1].x-next[0].points[0].x-.2)<1e-9)});
test('크기 조절은 중심을 보존하고 경계에서 멈추며 원본을 수정하지 않는다',()=>{const before=JSON.stringify(strokes),next=resizeSelection(strokes,['a'],100);for(const p of next[0].points)assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);assert.ok(Math.abs((next[0].points[0].x+next[0].points[1].x)/2-.3)<1e-9);assert.equal(next[1],strokes[1]);assert.equal(JSON.stringify(strokes),before)});
test('기존 선은 밑그림으로 보존하고 색칠 뒤에 밑그림을 합성한다',()=>{const outline={...strokes[0]},color={...strokes[1],layer:'color'};assert.equal(strokeLayer(outline),'outline');assert.deepEqual(Array.from(orderedStrokes([outline,color])).map(s=>s.id),['b','a'])});

const {floodRuns}=scope.exports;
function pixels(w,h){const a=new Uint8ClampedArray(w*h*4);a.fill(255);return a}
test('채우기는 닫힌 경계 너머로 번지지 않는다',()=>{const a=pixels(5,5);for(let y=0;y<5;y++){const k=(y*5+2)*4;a[k]=a[k+1]=a[k+2]=0}const runs=floodRuns(a,5,5,0,2);assert.deepEqual(Array.from(runs),[0,0,2,0,1,2,0,2,2,0,3,2,0,4,2]);assert.equal(a[0],255)});
test('채우기는 화면 밖 좌표를 가장자리로 제한한다',()=>{const runs=floodRuns(pixels(3,2),3,2,999,-5);assert.deepEqual(Array.from(runs),[0,0,3,0,1,3])});
test('세로 종이 전체 채우기는 재귀 없이 압축된 행 목록을 반환한다',()=>{const start=performance.now(),runs=floodRuns(pixels(900,1300),900,1300,450,600);assert.equal(runs.length,3900);assert.equal(runs.filter((_,i)=>i%3===2).reduce((a,b)=>a+b,0),1170000);console.log('portrait fill milliseconds:',(performance.now()-start).toFixed(1))});
