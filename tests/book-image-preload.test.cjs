const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const ts = require('typescript')
const instances = []
let decodeGate = null
class FakeImage {
  constructor() { this.complete = false; this.naturalWidth = 100; instances.push(this) }
  set src(value) { this.url = value; if (value === 'cached') this.complete = true }
  decode() { return this.url === 'decode-pending' ? decodeGate.promise : this.url === 'decode-error' ? Promise.reject(new Error('decode failed')) : Promise.resolve() }
  removeAttribute(name) { if (name === 'src') this.removed = true }
}
const scope = { exports: {}, Image: FakeImage, setTimeout, clearTimeout }
const code = fs.readFileSync(path.join(__dirname,'../lib/book-image-preload.ts'),'utf8')
vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope)
const { bookImageUrls, preloadBookImages } = scope.exports
const tick = () => new Promise(resolve => setImmediate(resolve))
async function run() {
  assert.equal(JSON.stringify(bookImageUrls([{image:'same'},{image:'second'},{image:''},{image:null}], 'same')), JSON.stringify(['same','second']))
  assert.equal(bookImageUrls([],null).length,0)
  decodeGate = {}; decodeGate.promise = new Promise(resolve => decodeGate.resolve = resolve)
  const progress = []
  let done = false
  const pending = preloadBookImages(['first','decode-pending','first'],{signal:new AbortController().signal,onProgress:n=>progress.push(n)}).then(result=>{done=true;return result})
  assert.equal(instances.length,2)
  instances.forEach(image=>image.onload())
  await tick()
  assert.equal(done,false,'load alone must not reveal a book while decode is pending')
  assert.deepEqual(progress,[1])
  decodeGate.resolve()
  const success = await pending
  assert.equal(success.images.length,2)
  assert.equal(success.failedUrls.length,0)
  assert.deepEqual(progress,[1,2])
  instances.length=0
  const failure = preloadBookImages(['network-error','decode-error','hang'],{signal:new AbortController().signal,timeoutMs:25})
  instances[0].onerror(); instances[1].onload()
  const failed = await failure
  assert.equal(failed.failedUrls.length,3)
  assert.ok(instances.every(i=>i.onload===null&&i.onerror===null&&i.removed))
  instances.length=0
  const controller = new AbortController()
  let afterAbort=0
  const abandoned = preloadBookImages(['slow'],{signal:controller.signal,onProgress:()=>afterAbort++})
  const lateLoad = instances[0].onload
  controller.abort(); lateLoad()
  await abandoned
  assert.equal(afterAbort,0)
  assert.equal(instances[0].onload,null)
  const cached=await preloadBookImages(['cached'],{signal:new AbortController().signal})
  assert.equal(cached.images.length,1)
  const empty=await preloadBookImages([],{signal:new AbortController().signal})
  assert.equal(empty.images.length,0)
  console.log('PASS: deduplication, all-images/decode barrier, cache, network/decode error, timeout, abort and late callbacks')
}
run().catch(error=>{console.error(error);process.exitCode=1})
