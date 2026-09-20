const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
const scope={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/word-novelty.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
const {noveltyLabel}=scope.exports;
test('new distinct words and percentage shown together',()=>assert.match(noveltyLabel({status:'ready',total_words:200,new_words:100,new_percent:50}),/100개 · 50%/));
test('pending is not zero new words',()=>assert.match(noveltyLabel({status:'pending'}),/살펴보고/));
test('zero denominator does not show a fake percentage',()=>assert.doesNotMatch(noveltyLabel({status:'ready',total_words:0,new_words:0,new_percent:null}),/%/));
test('zero new words is a valid result',()=>assert.match(noveltyLabel({status:'ready',total_words:20,new_words:0,new_percent:0}),/0개 · 0%/));
test('invalid counts are not displayed',()=>assert.doesNotMatch(noveltyLabel({status:'ready',total_words:2,new_words:3,new_percent:150}),/150%/));
