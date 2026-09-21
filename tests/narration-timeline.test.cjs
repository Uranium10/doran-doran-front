const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')
const scope = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/narration-timeline.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope)
const { audioTimeline,segmentAt } = scope.exports
const pages=[{sceneIndex:0,startOffset:0},{sceneIndex:0,startOffset:4},{sceneIndex:1,startOffset:0}]
const text=i=>({kind:'text',page:pages[i]}), blank={kind:'blank'}
const spreads=[{left:blank,right:blank},{left:text(0),right:text(1)},{left:text(2),right:blank}]
const layouts=[{audio_url:'a',duration:10,ends:[4,10]},{audio_url:'b',duration:6,ends:[6]}]
test('two pages in one spread and chapter offsets remain separate checkpoints',()=>{
 const list=audioTimeline(pages,spreads,layouts)
 assert.deepEqual(Array.from(list,s=>[s.spread,s.offset,s.start,s.end]),[[1,0,0,4],[1,0,4,10],[2,10,0,6]])
 assert.equal(segmentAt(list,3.99),0);assert.equal(segmentAt(list,4),1);assert.equal(segmentAt(list,10),2);assert.equal(segmentAt(list,16),2)
})
test('partial or non-increasing alignment is never guessed',()=>{
 assert.throws(()=>audioTimeline(pages,spreads,[{...layouts[0],ends:[4]},layouts[1]]))
 assert.throws(()=>audioTimeline(pages,spreads,[{...layouts[0],ends:[5,4]},layouts[1]]))
 assert.throws(()=>audioTimeline(pages,spreads,[{...layouts[0],ends:[4,8]},layouts[1]]))
})
