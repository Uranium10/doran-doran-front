// 실제 카드와 대시보드를 렌더링해 실패 상태가 DOM에서 사라지지 않는지 검사한다.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const {renderToStaticMarkup} = require('react-dom/server')
let state = {}
const noop = () => {}
const Empty = () => null
const modules = {
 'next/navigation': {useRouter:()=>({push:noop})},
 'next/link': {default: ({children, ...props}) => React.createElement('a', props, children)},
 '@/lib/generation-context': {useGeneration: () => ({dismiss: noop, openStory: noop, consumeGenerationScroll: noop, ...state})},
 '@/lib/profile-context': {useProfile: () => ({currentProfile:{id:'p',name:'아이'}, profiles:[{id:'p',name:'아이'}]})},
 '@/lib/api': {isGuestProfile:()=>false},
 '@/lib/generation-messages': {generationMessage:()=> '만드는 중'},
 '@/lib/bookshelf': {bookPath: id => `/books/${id}`},
 '@/lib/book-status': {readingLabel:()=>''},
 './paper-theatre': {PaperTheatre:Empty},
 './dashboard-summary': {DashboardSummary:Empty},
 './book-cover': {BookCover:Empty},
}
function load(file) {
 const output=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}
 }).outputText
 const context={exports:{},require:name=>name.endsWith('.css')?{default:{}}:modules[name]??require(name)}
 vm.runInNewContext(output,context)
 return context.exports
}
const {StoryGenerationCard}=load('components/workpad/story-generation-card.tsx')
modules['./workpad/story-generation-card']={StoryGenerationCard}
const {MyBookshelf}=load('components/my-bookshelf.tsx')
const render=(props={})=>renderToStaticMarkup(React.createElement(StoryGenerationCard,{bookshelfMode:true,...props}))
state={job:{job_id:'job',profile_id:'p',status:'failed',error_code:'safety_blocked'},error:'안전 필터가 생성을 중단했어요.'}
let html=renderToStaticMarkup(React.createElement(MyBookshelf,{onCreate:noop}))
assert.match(html,/role="alert"/)
assert.match(html,/안전 필터/)
assert.match(html,/>내용 바꾸기</)
// 이전 미독 책이 있어도 방금 일어난 실패를 성공 카드로 덮으면 안 된다.
html=render({latestUnread:{story_id:'old',title:'이전 동화'}})
assert.match(html,/안전 필터/)
assert.doesNotMatch(html,/따끈한 동화가 완성/)
state={job:{status:'failed',error_code:'generation_failed'},canRetry:true}
assert.match(render(),/완성하지 못했어요/)
assert.match(render(),/이런, 문제가 생겼어요!/)
assert.match(render(),/>다시 시도</)
assert.match(render(),/>나중에 할래요</)
state={...state,starting:true};assert.match(render(),/disabled/)
assert.match(render(),/확인 중/)
state={job:null,error:'접수 실패'}
assert.match(renderToStaticMarkup(React.createElement(MyBookshelf,{onCreate:noop})),/접수 실패/)
// 접수 검증 실패는 이전 미독 동화보다 우선하고 입력 수정 경로를 제공한다.
state={job:{job_id:'new',profile_id:'p',status:'failed',error_code:'submission_invalid'},error:'읽기 방식 항목을 다시 확인해 주세요.',canRetry:false}
html=render({latestUnread:{story_id:'old',title:'이전 동화'}})
assert.match(html,/읽기 방식/);assert.match(html,/>내용 바꾸기</);assert.doesNotMatch(html,/따끈한 동화가 완성/)
// 확인한 뒤에는 오류가 사라지고 기존 미독 책 안내로 돌아간다.
state={job:null,error:null}
assert.equal(render(),'')
assert.match(render({latestUnread:{story_id:'old',title:'이전 동화'}}),/이전 동화/)
state={job:{status:'running'}}
assert.match(render(),/만드는 중/)
assert.doesNotMatch(render(),/role="alert"/)
console.log('PASS: dashboard/card safety and ordinary failures, unread precedence, dismissal, running state')
