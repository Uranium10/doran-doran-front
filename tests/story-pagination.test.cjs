// 런타임 의존성을 추가하지 않고 실제 TypeScript 페이징 함수를 컴파일하여 검사한다.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const source = fs.readFileSync(path.join(__dirname, '../lib/story-pagination.ts'), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
const context = { exports: {}, Intl }
vm.runInNewContext(outputText, context)
const { splitReadingText, paginateStory, findReadingPosition } = context.exports

const text = '별이가 말했어요. “우리 같이 놀자!”\n\n토끼가 폴짝 뛰었어요. 아주아주아주아주긴낱말도끝까지읽어요. 👨‍👩‍👧‍👦 반짝반짝 ✨\n'
for (const limit of [8, 25, 60, 200]) {
  const chunks = splitReadingText(text, value => value.length <= limit)
  assert.equal(chunks.join(''), text)
  // UTF-16 길이가 긴 가족 이모지는 한 글자이므로 작게 설정한 한도를 넘을 수 있다.
  assert.ok(chunks.every(chunk => chunk.length <= limit || chunk === '👨‍👩‍👧‍👦'))
  assert.ok(chunks.some(chunk => chunk.includes('👨‍👩‍👧‍👦')))
}
const sentences = splitReadingText('첫 문장입니다. 둘째 문장이 아주 길어요. 셋째 문장입니다.', value => value.length <= 23)
assert.equal(sentences[0], '첫 문장입니다. ')
assert.equal(splitReadingText('가'.repeat(2000), value => value.length <= 100).length, 20)
assert.equal(splitReadingText('별이', () => false).join(''), '별이')
assert.equal(splitReadingText('', () => true).length, 1)
const scenes = [1, 2].map(n => ({ page_number: n, heading: `장면 ${n}`, text: text.repeat(8), image: `scene-${n}.jpg`, image_status: 'ready' }))
const before = JSON.stringify(scenes)
const wide = paginateStory(scenes, value => value.length <= 180)
const narrow = paginateStory(scenes, value => value.length <= 65)
assert.equal(JSON.stringify(scenes), before)
for (const [i, scene] of scenes.entries()) {
  const pieces = narrow.filter(p => p.sceneIndex === i)
  assert.equal(pieces.map(p => p.text).join(''), scene.text)
  assert.ok(pieces.every(p => p.image === scene.image && p.page_number === scene.page_number && p.image_status === 'ready'))
  assert.equal(pieces.at(-1).endOffset, scene.text.length)
  assert.equal(pieces.at(-1).part, pieces.length)
}
const anchor = wide[2]
const newIndex = findReadingPosition(narrow, anchor)
assert.ok(narrow[newIndex].startOffset <= anchor.startOffset && narrow[newIndex].endOffset > anchor.startOffset)
assert.equal(findReadingPosition([], anchor), 0)
assert.equal(paginateStory([], () => true).length, 0)
console.log('PASS: exact text preservation, sentence boundaries, long words, emoji, image reuse, reading-position resize')

const voiceText='첫 문장입니다. 다음 문장도 읽어요. 마지막이에요.'
const bounds=[9,21,voiceText.length]
const narrated={page_number:1,heading:'',image:'',text:voiceText,audio_index_status:'ready',audio_duration:9,
  audio_cues:bounds.map((end_offset,i)=>({end_offset,end_seconds:(i+1)*3}))}
for(const size of [10,22,100]) {
 const result=paginateStory([narrated],t=>t.length<=size)
 assert.equal(result.map(p=>p.text).join(''),voiceText)
 assert.ok(result.every(p=>bounds.includes(p.endOffset)))
 assert.deepEqual(Array.from(result,p=>p.readingNumber),result.map((_,i)=>i+1))
}
// 음성 없는 기존 책/손상된 시간표는 원문 누락 없이 기존 페이징으로 처리한다.
const invalid={...narrated,audio_cues:[{end_offset:999,end_seconds:9}]}
assert.equal(paginateStory([invalid],t=>t.length<=10).map(p=>p.text).join(''),voiceText)
console.log('PASS: saved audio boundaries reused across page sizes without text loss')
