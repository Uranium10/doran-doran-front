const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const scope={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/book-status.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope)
const {readingStatus,readingLabel}=scope.exports
for(const [state,label] of Object.entries({new:'새 동화',reading:'읽는 중',quiz_pending:'퀴즈 푸는 중',completed:'다 읽은 동화'})){
 assert.equal(readingStatus({reading_status:state}),state)
 assert.equal(readingLabel({reading_status:state}),label)
}
assert.equal(readingStatus({reading_status:'quiz_pending',reading_progress:{completed_at:'2026-09-18'}}),'quiz_pending')
assert.equal(readingStatus({}),'new')
assert.equal(readingStatus({reading_progress:{}}),'reading')
assert.equal(readingStatus({reading_progress:{completed_at:'2026-09-18'}}),'completed')
console.log('PASS: server state wins over completed_at; legacy fallback does not invent quizzes')
