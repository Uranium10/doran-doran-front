const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const code = fs.readFileSync(path.join(__dirname, '../lib/profile-session.ts'), 'utf8')
const scope = { exports: {} }
vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, scope)
const { ProfileSession } = scope.exports
class Store extends Map {
  get length() { return this.size }
  key(i) { return [...this.keys()][i] ?? null }
  getItem(k) { return this.get(k) ?? null }
  setItem(k,v) { this.set(k,v) }
  removeItem(k) { this.delete(k) }
}
const profile = id => ({ id, name:'테스트', birth_date:'2020-01-01', avatar_url:'', level:1 })
async function run() {
 const store = new Store([['doran-profile:a','p1']])
 let fail=false
 const fetch = async()=>{ if(fail)throw Error('offline'); return [profile('p1')] }
 const first = new ProfileSession(fetch,store)
 assert.equal(first.snapshot().loading,true)
 first.attach('a')
 assert.equal(first.snapshot().profiles.length,0) // 저장 ID만으로 프로필 객체를 신뢰하지 않는다.
 await first.refresh()
 assert.equal(first.snapshot().selected,'p1')
 const reloaded = new ProfileSession(fetch,store)
 reloaded.attach('a'); await reloaded.refresh()
 assert.equal(reloaded.snapshot().selected,'p1')
 reloaded.select('unknown'); assert.equal(reloaded.snapshot().selected,'p1')
 fail=true; await reloaded.refresh()
 assert.ok(reloaded.snapshot().error); assert.equal(store.getItem('doran-profile:a'),'p1')
 fail=false; await reloaded.refresh(); assert.equal(reloaded.snapshot().error,null)
 store.setItem('doran-view:a:p1:quiz','private');store.setItem('other','keep')
 reloaded.attach(null)
 assert.equal(store.getItem('doran-view:a:p1:quiz'),null)
 assert.equal(store.getItem('doran-profile:a'),null)
 assert.equal(store.getItem('other'),'keep')
 store.setItem('doran-profile:a','deleted')
 first.attach(null);first.attach('a');await first.refresh()
 assert.equal(first.snapshot().selected,null)
 let resolveA
 let calls=0
 const race = new ProfileSession(()=>++calls===1 ? new Promise(resolve=>resolveA=resolve) : Promise.resolve([profile('b1')]),store)
 race.attach('a'); const oldEpoch=race.epoch(); const oldRequest=race.refresh()
 race.attach('b'); await race.refresh(); race.select('b1')
 resolveA([profile('a1')]); await oldRequest
 assert.equal(race.snapshot().profiles[0].id,'b1')
 race.mutate(oldEpoch,()=>[profile('wrong')]); assert.equal(race.snapshot().profiles[0].id,'b1')
 const blocked=new ProfileSession(fetch,{getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()},key(){throw Error()},get length(){throw Error()}})
 blocked.attach('a');await blocked.refresh();blocked.select('p1')
 assert.equal(blocked.snapshot().selected,'p1')
 blocked.attach(null)
 console.log('PASS: profile reload, server validation, retry, logout cleanup, account races, late mutations, blocked storage')
}
run().catch(e=>{console.error(e);process.exitCode=1})
