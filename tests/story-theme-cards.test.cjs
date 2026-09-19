const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const js = ts.transpileModule(fs.readFileSync('lib/story-theme-cards.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const exportsObject = {}
vm.runInNewContext(js, { exports: exportsObject, Math, Map, Set })
const { drawThemeCards } = exportsObject
const pool = Array.from({ length: 12 }, (_, n) => ({ theme_id: `T${n}` }))
test('reroll chooses three unique unseen topics when possible without modifying pool', () => {
  const first = drawThemeCards(pool), second = drawThemeCards(pool, first)
  assert.equal(new Set(second.map(t => t.theme_id)).size, 3)
  assert.ok(second.every(t => !first.some(p => p.theme_id === t.theme_id)))
  assert.equal(pool.length, 12)
})
test('small pools cannot create duplicate or invented topics', () => {
  for (let n = 0; n < 5; n++) {
    const current = pool.slice(0, n), next = drawThemeCards(current, current.slice(0, 3))
    assert.equal(next.length, Math.min(n, 3))
    assert.equal(new Set(next.map(t => t.theme_id)).size, next.length)
    assert.ok(next.every(t => current.includes(t)))
    if (n === 4) assert.ok(next.includes(current[3]))
  }
})
