const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function load(name) {
  const code = fs.readFileSync(path.join(__dirname, '../lib', name + '.ts'), 'utf8')
  const scope = { exports: {}, Intl }
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope)
  return scope.exports
}
const { paginateStory } = load('story-pagination')
const { buildBookSpreads, findBookPosition, restingBookSpread, resolveBookPage } = load('book-layout')
const scenes = [1,2,3].map(n=>({page_number:n,heading:`장면 ${n}`,text:'별이는 친구와 함께 걸었어요. '.repeat(n*9),image:n===3?'':`scene-${n}.jpg`}))
const pages = paginateStory(scenes, text=>text.length<=75)
for(const mobile of [false,true]) {
  const spreads = buildBookSpreads(pages,mobile)
  assert.equal(spreads[0].right.kind,'cover')
  assert.equal(spreads[0].left.kind,'outside')
  assert.equal(spreads.at(-1).left.kind,'back')
  assert.equal(spreads.at(-1).right.kind,'ending')
  const leaves = spreads.flatMap(s=>[s.left,s.right])
  assert.equal(leaves.filter(l=>l.kind==='image').length,2)
  for(let i=0;i<scenes.length;i++) {
    assert.equal(leaves.filter(l=>l.kind==='text'&&l.page.sceneIndex===i).map(l=>l.page.text).join(''),scenes[i].text)
    assert.equal(leaves.filter(l=>l.kind==='image'&&l.page.sceneIndex===i).length,i===2?0:1)
  }
  const old = spreads.find(s=>[s.left,s.right].some(l=>l.kind==='text'&&l.page.startOffset>0))
  const resized = buildBookSpreads(paginateStory(scenes,text=>text.length<=120),!mobile)
  const index = findBookPosition(resized,old)
  const anchor=[old.left,old.right].find(l=>l.kind==='text').page
  assert.ok([resized[index].left,resized[index].right].some(l=>l.kind==='text'&&l.page.sceneIndex===anchor.sceneIndex&&l.page.startOffset<=anchor.startOffset&&l.page.endOffset>anchor.startOffset))
  assert.equal(findBookPosition(resized,spreads.at(-1)),resized.length-1)
  assert.equal(findBookPosition(resized,spreads[0]),0)
}
console.log('PASS: covers, one illustration per scene, continuation text on both sides, exact text preservation, no-image story, resize anchors')

const desktop = buildBookSpreads(pages, false)
// 표지를 열고 닫는 중에도 고정된 왼쪽 면은 책 바깥이며 흰 종이로 변하지 않는다.
assert.equal(restingBookSpread(desktop[0], desktop[1], true).left.kind, 'outside')
assert.equal(restingBookSpread(desktop[1], desktop[0], false).left.kind, 'outside')
assert.equal(restingBookSpread(desktop[1], desktop[2], true).left, desktop[1].left)
for (const [input, expected] of [['3',3], ['0',1], ['-8',1], ['99999',9], ['3.9',3], ['',null], ['text',null], ['1e2',null], [' 4 ',4], ['9'.repeat(400),9]]) {
  assert.equal(resolveBookPage(input,9),expected)
}
assert.equal(resolveBookPage('1',0),null)
console.log('PASS: transparent cover underlay, page input bounds/decimals/invalid/huge values')
