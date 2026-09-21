// 실제 요청 직렬화를 검사한다. 네트워크만 대체하고 유료 생성은 하지 않는다.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')
const sent=[]
const api={ApiError:class extends Error{},LONG_TIMEOUT_MS:123,request:async(url,options)=>{sent.push({url,body:JSON.parse(options.body)});return {story_id:'fixture'}}}
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/workpad-data.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const context={exports:{},require:name=>{if(name==='@/lib/api')return api;throw new Error(name)}}
vm.runInNewContext(code,context)
async function run(){
  const input={protagonistName:'별이',favorite:'토끼',todayEvent:'',useJobs:false}
  for(const [extra,expected] of [[{},'level_aligned'],[{readingMode:'relaxed'},'relaxed'],[{mode:'original',readingMode:'relaxed'},'level_aligned']]){
    await context.exports.generateAssessment('profile','posttest',{...input,...extra})
    const call=sent.at(-1);assert.equal(call.url,'/stories/generate');assert.equal(call.body.reading_mode,expected)
    assert.equal(call.body.profile_id,'profile');assert.equal(call.body.favorite,'토끼')
  }
  console.log('PASS: ordinary/default/relaxed/original generation request modes')
}
run().catch(e=>{console.error(e);process.exitCode=1})
