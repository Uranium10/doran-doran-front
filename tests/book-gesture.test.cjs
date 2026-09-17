const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const scope = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/book-gesture.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, scope)
const { bookGestureDirection: direction, trackBookGesture: track } = scope.exports
const start = { pointerId: 1, x: 200, y: 300, maxTravel: 0, side: 'next' }
test('짧은 가로 스와이프와 완만한 대각선은 양방향으로 한 장 넘긴다', () => {
  assert.equal(direction(start, 167, 302), 1)
  assert.equal(direction(start, 233, 298), -1)
  assert.equal(direction(start, 100, 360), 1)
})
test('세로 이동·짧은 드래그·대각선 흔들림은 넘기지 않는다', () => {
  for (const [x, y] of [[202, 200], [199, 400], [175, 302], [240, 340]]) assert.equal(direction(start, x, y), 0)
})
test('손가락을 움직였다가 시작점으로 되돌려도 탭이 아니다', () => {
  assert.equal(direction(track(start, 100, 300), 201, 301), 0)
  assert.equal(direction(track(start, 200, 330), 200, 300), 0)
})
test('탭은 실제로 누른 면의 방향을 따르며 빈 공간은 무시한다', () => {
  assert.equal(direction(start, 203, 302), 1)
  assert.equal(direction({ ...start, side: 'previous' }, 203, 302), -1)
  assert.equal(direction({ ...start, side: undefined }, 200, 300), 0)
})
