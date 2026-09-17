const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const scope={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/vocab-analysis.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope)
const parse=scope.exports.vocabAnalysis
const zero={'총_내용형태소_수':0,'상위등급_어휘_목록':[],'상위등급_어휘_개수':0,'표현_어휘_목록':[],'표현_어휘_개수':0}
test('0과 빈 목록은 분석 완료이고 null/구형/손상 결과와 구분한다',()=>{
 assert(parse(zero))
 for(const raw of [null,{}, {'총_내용형태소_수':3},{...zero,'상위등급_어휘_개수':null},{...zero,'총_내용형태소_수':-1},{...zero,'총_내용형태소_수':NaN}])assert.equal(parse(raw),null)
})
test('단어 종류 수와 칩을 일치시키며 내부 지표는 공개 값에 복사하지 않는다',()=>{
 const raw={...zero,'상위등급_어휘_목록':['탐험'],'상위등급_어휘_개수':1,'적중률':.9,'주입_예시_어휘':['숨김']}
 const parsed=parse(raw);assert(parsed);assert.equal(parsed.상위등급_어휘_개수,1);assert.equal(parsed.적중률,undefined)
 assert.equal(parse({...raw,'상위등급_어휘_목록':['탐험','탐험'],'상위등급_어휘_개수':2}),null)
 assert.equal(parse({...raw,'상위등급_어휘_개수':2}),null)
 assert.equal(parse({...raw,'상위등급_어휘_목록':[' ']}),null)
})
