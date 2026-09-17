const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const ts=require('typescript')
const scope={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/progress-plan.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope)
const {planProgress,progressFrame}=scope.exports
test('같은 단계는 이전 퍼센트부터 서버 결과까지 이동',()=>{
 const plan=planProgress(10.65,65,.2)
 assert.equal(plan.previous,10.45);assert.equal(progressFrame(plan,0).percent,45)
 const middle=progressFrame(plan,600);assert(middle.percent>45&&middle.percent<65)
 assert.equal(progressFrame(plan,Infinity).percent,65)
 assert(!plan.steps.some(s=>s.phase==='promote'))
})
test('승급은 100%, 강조, 다음 단계 0%, 최종 진척도 순서',()=>{
 const plan=planProgress(11.15,15,.35)
 assert.equal(plan.previous,10.8)
 assert.equal(progressFrame(plan,0).percent,80)
 const pulse=plan.steps.findIndex(s=>s.phase==='promote')
 assert.equal(plan.steps[pulse].stage,10);assert.equal(plan.steps[pulse].to,100)
 assert.equal(plan.steps[pulse+1].stage,11);assert.equal(plan.steps[pulse+1].from,0)
 assert.equal(progressFrame(plan,Infinity).stage,11);assert.equal(progressFrame(plan,Infinity).percent,15)
})
test('최고 단계는 승급 뒤 100% 유지',()=>{
 const p=planProgress(20,100,.1)
 assert.equal(progressFrame(p,0).percent,90)
 assert.equal(progressFrame(p,Infinity).stage,20);assert.equal(progressFrame(p,Infinity).percent,100)
})
test('최초 측정은 이전 단계나 승급을 만들어내지 않음',()=>{
 const p=planProgress(10.3,30,null)
 assert.equal(p.previous,null);assert.equal(progressFrame(p,0).stage,10)
 assert.equal(progressFrame(p,0).percent,0);assert(!p.steps.some(s=>s.phase==='promote'))
})
test('변화 없음, 하락, 소수 오차, 큰 변화도 최종 서버 값과 일치',()=>{
 for(const [level,achievement,delta] of [[10.45,45,0],[9.85,85,-.35],[11,0,.2],[20,100,19],[1,0,-19]]){
  const p=planProgress(level,achievement,delta),f=progressFrame(p,Infinity)
  assert.equal(f.stage,Math.floor(level));assert.equal(f.percent,achievement)
  assert(p.duration<4000)
  if(delta<=0)assert(!p.steps.some(s=>s.phase==='promote'))
 }
 const down=planProgress(9.85,85,-.35)
 assert.equal(down.previous,10.2)
 assert(down.steps.some(s=>s.stage===10&&s.to===0))
 assert(down.steps.some(s=>s.stage===9&&s.from===100))
})
