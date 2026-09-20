const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const ts = require('typescript'); const vm = require('node:vm');
const js = ts.transpileModule(fs.readFileSync('lib/word-dictionary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const box = {exports:{}}; vm.runInNewContext(js,box); const d=box.exports;
test('같은 표기의 다른 품사는 별도 수집 항목',()=>assert.notEqual(d.wordKey({word:'가까이',pos:'명사'}),d.wordKey({word:'가까이',pos:'부사'})));
test('기록 감소 및 빈 결과의 마지막 페이지',()=>{assert.equal(d.dictionaryLastOffset(0),0);assert.equal(d.dictionaryLastOffset(24),0);assert.equal(d.dictionaryLastOffset(25),24)});
test('프로필 ID는 URL 문자열로만 전달',()=>assert.equal(d.dictionaryPath('a&profile=b'),'/parent/vocabulary?profile=a%26profile%3Db'));
