const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')

// 실제 플레이어의 미디어 이벤트를 실행한다. 네트워크/유료 음성 생성은 쓰지 않는다.
function player() {
  const refs = [], moves = [], calls = [], timers = new Map()
  let timerId = 0, seconds = 0
  const audio = {
    paused: false, ended: false, readyState: 1,
    get currentTime() { return seconds },
    set currentTime(value) { calls.push('seek'); seconds = value },
    pause() { calls.push('pause'); this.paused = true },
    play() { calls.push('play'); this.paused = false; return Promise.resolve() },
    getAttribute() { return 'chapter-1.wav' }, load() { calls.push('load') },
  }
  const jsx = (type, props) => ({ type, props })
  const scope = { exports: {}, Date, AbortController,
    setTimeout(fn, ms) { timers.set(++timerId, {fn, ms}); return timerId },
    clearTimeout(id) { timers.delete(id) },
    require(name) {
      if (name === 'react') return {
        useRef(value) { const ref = {current: value}; refs.push(ref); return ref },
        useState(value) { return [value, () => {}] }, useEffect() {},
      }
      if (name === 'react/jsx-runtime') return {jsx, jsxs: jsx}
      if (name === 'lucide-react' || name === '@/lib/api' || name === '@/lib/narration-timeline') return {}
      if (name.endsWith('.css')) return {default: {}}
      throw Error(name)
    },
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../components/workpad/narration-player.tsx'), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  }).outputText, scope)
  const tree = scope.exports.NarrationPlayer({pages: [], readingPages: [], spreads: Array.from({length: 6}, () => ({left: {kind:'blank'}, right: {kind:'blank'}})), currentSpread: 1, onSpread: i => moves.push(i), onLock() {}})
  const media = tree.props.children[0].props
  media.ref.current = audio
  const list = refs.find(ref => Array.isArray(ref.current))
  list.current = [
    {chapter:0, start:0, end:2, offset:0, spread:1, url:'chapter-1.wav'},
    {chapter:0, start:2, end:4, offset:0, spread:2, url:'chapter-1.wav'},
    {chapter:0, start:4, end:6, offset:0, spread:3, url:'chapter-1.wav'},
    {chapter:1, start:0, end:5, offset:6, spread:4, url:'chapter-2.wav'},
  ]
  // 첫 boolean ref는 사용자의 재생 의도를 보관한다.
  refs.find(ref => ref.current === false).current = true
  return {media, audio, calls, moves, timers, list, time(t) { seconds = t; media.onTimeUpdate() }}
}

test('page boundary changes only the book; no pause, seek, or play', () => {
  const p = player()
  p.time(1.99); assert.deepEqual(p.moves, [])
  p.time(2.03); assert.deepEqual(p.moves, [2]); assert.deepEqual(p.calls, [])
  assert.equal(p.audio.currentTime, 2.03)
})
test('late timeupdate catches up multiple pages without replaying audio', () => {
  const p = player(); p.time(5.2)
  assert.deepEqual(p.moves, [3]); assert.deepEqual(p.calls, [])
})
test('two pages on the same spread do not trigger a book turn', () => {
  const p = player(); p.list.current[1].spread = 1; p.time(2.1)
  assert.deepEqual(p.moves, []); assert.deepEqual(p.calls, [])
})
test('estimated last boundary never truncates the real audio tail', () => {
  const p = player(); p.time(6.2)
  assert.deepEqual(p.calls, []); assert.equal(p.timers.size, 0)
  p.audio.ended = true; p.audio.paused = true; p.media.onEnded()
  assert.equal(p.timers.size, 1)
  assert.equal([...p.timers.values()][0].ms, 1200)
})
test('finishing the last file closes the book only after ended', () => {
  const p = player(); p.list.current.splice(3); p.time(6.2)
  assert.deepEqual(p.moves, [3])
  p.audio.ended = true; p.audio.paused = true; p.media.onEnded()
  assert.deepEqual(p.moves, [3, 5]); assert.equal(p.timers.size, 0)
})
