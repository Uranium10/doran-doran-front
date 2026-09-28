const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function load(name){const scope={exports:{},require:p=>load(path.basename(p))};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,`../lib/${name}.ts`),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);return scope.exports}
const {brushPoint}=load('sketchbook-input'),{moveSelection,resizeSelection,transformSelection}=load('sketchbook'),{validSketchDocument,DEFAULT_LAYERS}=load('sketchbook-document'),{sameSketch}=load('sketchbook-history');
test('고정 보정은 작은 흔들림을 줄이고 빠른 이동을 지연 없이 따라간다',()=>{
 const last={x:.5,y:.5},jitter={x:.501,y:.501},fast={x:.6,y:.6};
 assert.ok(Math.abs(brushPoint(jitter,last,900,650,true).x-last.x)<.0005);
 assert.ok(Math.abs(brushPoint(fast,last,900,650,true).x-fast.x)<.00001);
 assert.equal(brushPoint(jitter,last,900,650,false).x,jitter.x);
 assert.equal(brushPoint(jitter,last,900,650,false).pressure,undefined);
 assert.equal(brushPoint(jitter,undefined,900,650,false,1.2).pressure,1);
});
test('필압은 올가미 이동·크기·회전 및 기록 비교에서 보존된다',()=>{
 const stroke={id:'p',width:20,color:'#112233',erase:false,pressure:true,points:[{x:.3,y:.3,pressure:.1},{x:.5,y:.5,pressure:.9}]};
 for(const list of [moveSelection([stroke],['p'],.1,.1),resizeSelection([stroke],['p'],1.5),transformSelection([stroke],['p'],'rotate',{x:.4,y:.1},{x:.7,y:.4})])assert.deepEqual(Array.from(list[0].points,p=>p.pressure),[.1,.9]);
 const d={width:900,height:650,background:'#fffaf0',activeLayer:'outline',layers:DEFAULT_LAYERS,strokes:[stroke]};
 assert.equal(validSketchDocument(d),true);
 assert.equal(sameSketch(d,{...d,strokes:[{...stroke,points:stroke.points.map(p=>({...p,pressure:.5}))}]}),false);
 for(const pressure of [-.1,1.1,NaN,Infinity])assert.equal(validSketchDocument({...d,strokes:[{...stroke,points:[{x:.4,y:.4,pressure}]}]}),false);
 const legacy={...stroke};delete legacy.pressure;legacy.points=legacy.points.map(({x,y})=>({x,y}));assert.equal(validSketchDocument({...d,strokes:[legacy]}),true);
});
