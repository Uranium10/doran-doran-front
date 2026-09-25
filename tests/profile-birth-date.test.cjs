const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const scope={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../lib/profile-birth-date.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
const {koreaToday,birthDateError}=scope.exports;
test('한국 자정 경계에서 서버와 같은 오늘 날짜를 사용한다',()=>{
  assert.equal(koreaToday(new Date('2026-09-24T14:59:59Z')),'2026-09-24');
  assert.equal(koreaToday(new Date('2026-09-24T15:00:00Z')),'2026-09-25');
});
test('오늘과 과거·윤년은 허용하고 미래와 실제로 없는 날짜는 거부한다',()=>{
  for(const s of ['2026-09-25','2026-09-24','2024-02-29','2018-01-01'])assert.equal(birthDateError(s,'2026-09-25'),null);
  for(const s of ['2026-09-26','2099-01-01','2025-02-29','2026-04-31','0000-01-01','20260925','','bad'])assert.ok(birthDateError(s,'2026-09-25'));
});
