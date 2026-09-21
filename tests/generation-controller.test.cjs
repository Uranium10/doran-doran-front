// 실제 추적기를 실행한다. 서버/시계만 대체하여 화면 이동·재접속·중복 생성 경계를 검사한다.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../lib/generation-controller.ts'), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
let nextTimer=0;const timers=new Map()
const context={exports:{},Error,setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer},clearTimeout:id=>timers.delete(id)}
vm.runInNewContext(outputText,context)
const {GenerationController}=context.exports
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
const job=(status='running',id='job-1')=>({job_id:id,profile_id:'profile-1',story_id:'story-1',status,stage:status==='completed'?'completed':'write_candidate',result:status==='completed'?{story_id:'story-1',pages:[]}:null,error_code:null,poll_after_ms:2000})
const input={protagonistName:'별이',favorite:'토끼',todayEvent:'',useJobs:true}
const memory=new Map();const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}
function make(api={},owner='owner-1',uuid=()=> 'job-1'){
 const notices=[];const calls={post:0,get:0};
 const services={current:async()=>({available:true,job:null}),get:async()=>{calls.get++;return job()},enqueue:async()=>{calls.post++;return job('queued')},legacy:async()=>({story_id:'legacy-story',pages:[]}),...api}
 const controller=new GenerationController(owner,services,storage,j=>notices.push(j),uuid)
 return {controller,notices,calls}
}
async function run(){
 memory.clear()
 // 접수 응답까지만 기다리고 반환한다. 아직 본문이 없어도 진행 상태는 보여야 한다.
 let a=make();await a.controller.start('profile-1',input)
 assert.equal(a.controller.state.job.status,'queued');assert.equal(a.controller.state.starting,false)
 await assert.rejects(a.controller.start('profile-1',input),/이미/);assert.equal(a.calls.post,1)
 const unsubscribe=a.controller.subscribe(()=>{});unsubscribe()
 a.controller.dispose()
 // 새 인스턴스/새 화면에서 저장한 작업 ID로 이어받고 재요청하지 않는다.
 a=make({get:async()=>job('completed'),current:async()=>({available:true,job:job('completed')})});await a.controller.refresh()
 assert.equal(a.controller.state.job.status,'completed');assert.equal(a.notices.length,1);assert.equal(a.calls.post,0)
 await a.controller.refresh();assert.equal(a.notices.length,1)
 a.controller.dismiss();a.controller.dispose()
 a=make({current:async()=>({available:true,job:job('completed')})});await a.controller.refresh()
 assert.equal(a.controller.state.job,null);assert.equal(a.notices.length,0);a.controller.dispose()
 // POST 응답 유실은 자동 재전송하지 않고 GET으로 복구한다.
 memory.clear();let posts=0
 a=make({enqueue:async()=>{posts++;throw new Error('network')},get:async()=>job('completed')})
 await a.controller.start('profile-1',input);assert.equal(a.controller.state.connectionLost,true)
 await a.controller.refresh();assert.equal(posts,1);assert.equal(a.controller.state.job.status,'completed');a.controller.dispose()
 // 동일 계정의 다른 탭에서 생성한 작업은 current API로 찾아낸다.
 memory.clear();a=make({enqueue:async()=>{throw {status:409}},get:async()=>{throw {status:404}},current:async()=>({available:true,job:job('running','other-tab')})})
 await a.controller.start('profile-1',input);await a.controller.refresh()
 assert.equal(a.controller.state.job.job_id,'other-tab');a.controller.dispose()
 // 조회 중 새 작업을 시작하면 늦게 도착한 이전 조회 결과가 새 작업을 덮지 않는다.
 memory.clear();const old=deferred();a=make({current:()=>old.promise})
 const poll=a.controller.refresh();await a.controller.start('profile-1',input);old.resolve({available:true,job:job('completed','old')});await poll
 assert.equal(a.controller.state.job.job_id,'job-1');assert.equal(a.controller.state.job.status,'queued');a.controller.dispose()
 // 로그아웃 뒤 늦은 응답은 화면이나 알림에 도착하면 안 된다.
 memory.clear();const late=deferred();a=make({current:()=>late.promise});const pending=a.controller.refresh();a.controller.dispose()
 late.resolve({available:true,job:job('completed')});await pending;assert.equal(a.notices.length,0)
 // 이전 계정의 작업 ID를 새 계정 조회에 사용하지 않는다.
 memory.set('doran-generation:owner-1:pending','secret-old-job')
 a=make({},'owner-2');await a.controller.refresh();assert.equal(a.calls.get,0);a.controller.dispose()
 // 일시적인 조회 장애 후에는 기존 작업을 보존하고 재접속 때 완료를 받는다.
 memory.clear();let online=false;a=make({get:async()=>{if(!online)throw new Error('offline');return job('completed')}})
 await a.controller.start('profile-1',input);await a.controller.refresh();assert.equal(a.controller.state.job.status,'queued')
 assert.equal(a.controller.state.connectionLost,true);online=true;await a.controller.refresh();assert.equal(a.controller.state.job.status,'completed');a.controller.dispose()
 // 큐가 아직 없을 때도 앱 전역의 동기 요청은 화면 구독 해제만으로 취소되지 않는다.
 memory.clear();const legacy=deferred();a=make({legacy:()=>legacy.promise})
 const done=a.controller.start('profile-1',{...input,useJobs:false});const off=a.controller.subscribe(()=>{});off()
 legacy.resolve({story_id:'legacy-story',pages:[]});await done
 assert.equal(a.notices.length,1);assert.equal(a.controller.state.job.mode,'legacy');a.controller.dispose()
 // 생성 실패 문구는 뒤따르는 '작업 없음' 조회로 즉시 사라지지 않아야 한다.
 memory.clear();a=make({legacy:async()=>{throw new Error('generation failed')}})
 await a.controller.start('profile-1',{...input,useJobs:false});await a.controller.refresh()
 assert.equal(a.controller.state.error,'generation failed');a.controller.dismiss();assert.equal(a.controller.state.error,null);a.controller.dispose()
 // 안전 차단은 입력 변경 안내를 유지하고 재접속/폴링에서도 재전송하지 않는다.
 memory.clear();const blocked={...job('failed'),stage:'failed',error_code:'safety_blocked'}
 a=make({current:async()=>({available:true,job:blocked})});await a.controller.refresh();await a.controller.refresh()
 assert.equal(a.controller.state.job.status,'failed');assert.match(a.controller.state.error,/소재/)
 assert.equal(a.calls.post,0);assert.equal(a.notices.length,0);a.controller.dismiss();a.controller.dispose()
 memory.clear();a=make({current:async()=>({available:true,job:blocked})});await a.controller.refresh()
 assert.match(a.controller.state.error,/소재/);a.controller.dispose()
 // 원전 부적합과 검사 장애를 구분하고 어느 경우에도 자동 재생성하지 않는다.
 for (const code of ['source_topic_unmatched', 'source_check_unavailable']) {
   memory.clear();const failed={...job('failed'),stage:'failed',error_code:code}
   a=make({current:async()=>({available:true,job:failed})});await a.controller.refresh();await a.controller.refresh()
   assert.match(a.controller.state.error, code==='source_topic_unmatched' ? /다른 주제/ : /잠시 뒤/)
   assert.equal(a.calls.post,0);assert.equal(a.notices.length,0);a.controller.dispose()
 }
 // 접수되지 않은 새 ID를 예전 완료/실패 작업으로 바꾸거나 성공 알림을 띄우지 않는다.
 for (const previous of [null,job('completed','old'),job('failed','old')]) {
   memory.clear();let acceptedLate=false;let posts=0
   a=make({enqueue:async()=>{posts++;throw {status:503}},
     get:async()=>{if(acceptedLate)return job('completed');throw {status:404}},
     current:async()=>({available:true,job:previous})})
   await a.controller.start('profile-1',input);await a.controller.refresh();await a.controller.refresh()
   assert.equal(a.controller.state.job.job_id,'job-1')
   assert.equal(a.controller.state.job.error_code,'submission_missing')
   assert.match(a.controller.state.error,/접수되지/);assert.equal(a.notices.length,0);assert.equal(posts,1)
   // DB에 늦게 접수된 요청은 같은 ID 조회로 복구되며 새 POST는 하지 않는다.
   acceptedLate=true;await a.controller.refresh()
   assert.equal(a.controller.state.job.status,'completed');assert.equal(a.notices.length,1);assert.equal(posts,1)
   a.controller.dispose()
 }
 memory.clear();a=make({enqueue:async()=>{throw {status:503}},get:async()=>{throw {status:404}}})
 await a.controller.start('profile-1',input);await a.controller.refresh();a.controller.dismiss()
 assert.equal(a.controller.state.error,null);assert.equal(memory.has('doran-generation:owner-1:pending'),false)
 a.controller.dispose()
 // 접수 여부 불명: 명시적 재시도도 같은 idempotency key로 보내야 한다.
 memory.clear();const sent=[];let first=true
 a=make({enqueue:async(p,i,key)=>{sent.push({p,i,key});if(first){first=false;throw {status:503}}return job('queued',key)},get:async()=>{throw {status:404}}})
 await a.controller.start('profile-1',input);await a.controller.refresh()
 assert.equal(a.controller.canRetry(),true);await a.controller.retry()
 assert.equal(sent.length,2);assert.equal(sent[0].key,sent[1].key)
 assert.equal(sent[1].i.favorite,input.favorite);assert.equal(a.controller.state.job.status,'queued');a.controller.dispose()
 // 실패 확정 후에는 새 작업 키를 사용한다. 두 번 누르는 동안 사전 조회/POST는 한 번뿐이다.
 memory.clear();const lookup=deferred();let queries=0;let submits=0;let ids=0;const keys=[]
 a=make({enqueue:async(p,i,key)=>{submits++;keys.push(key);return job('queued',key)},
   get:async()=>{queries++;if(queries===1)return job('failed','job-1');return lookup.promise}},'owner-1',()=>`job-${++ids}`)
 await a.controller.start('profile-1',input);await a.controller.refresh()
 const retrying=a.controller.retry();await a.controller.retry();assert.equal(queries,2)
 lookup.resolve(job('failed','job-1'));await retrying
 assert.equal(submits,2);assert.notEqual(keys[0],keys[1]);assert.equal(a.controller.state.starting,false);a.controller.dispose()
 // 재시도 직전 기존 작업이 실행/완료됐다면 새로 만들지 않고 복구한다.
 for(const status of ['running','completed']) {
   memory.clear();let visible=false;let posts=0
   a=make({enqueue:async()=>{posts++;throw {status:503}},get:async()=>{if(visible)return job(status);throw {status:404}}})
   await a.controller.start('profile-1',input);await a.controller.refresh();visible=true;await a.controller.retry()
   assert.equal(posts,1);assert.equal(a.controller.state.job.status,status);a.controller.dispose()
 }
 // 재확인 통신 장애에는 POST하지 않는다. 안전 차단에는 같은 입력 재시도를 제공하지 않는다.
 memory.clear();let down=false;posts=0
 a=make({enqueue:async()=>{posts++;return job('queued')},get:async()=>{if(down)throw {status:503};return job('failed')}})
 await a.controller.start('profile-1',input);await a.controller.refresh();down=true;await a.controller.retry()
 assert.equal(posts,1);assert.match(a.controller.state.error,/연결하지/);a.controller.dispose()
 memory.clear();a=make({get:async()=>({...job('failed'),error_code:'safety_blocked'})})
 await a.controller.start('profile-1',input);await a.controller.refresh();assert.equal(a.controller.canRetry(),false)
 await a.controller.retry();assert.equal(a.calls.post,1);a.controller.dispose()
 // 새로고침/다른 계정으로는 입력 메모리를 넘기지 않는다.
 memory.clear();a=make({current:async()=>({available:true,job:job('failed')})});await a.controller.refresh()
 assert.equal(a.controller.canRetry(),false);a.controller.dispose()
 assert.equal(timers.size,0)
 console.log('PASS: acceptance, navigation/reload recovery, no duplicate POST, conflict adoption, stale responses, logout/account isolation, reconnect, legacy completion')
}
run().catch(e=>{console.error(e);process.exitCode=1})
