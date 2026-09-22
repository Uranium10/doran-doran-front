const {test}=require('node:test')
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
function load(name){const s={exports:{},Intl};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,s);return s.exports}
const {paginateStory}=load('story-pagination')
const {isSoundPicturebook,buildBookSpreads,leafReadingPages,bookBookmark,bookmarkPosition,findBookPosition}=load('book-layout')
const {audioTimeline}=load('narration-timeline')
const scenes=Array.from({length:5},(_,i)=>({page_number:i+1,heading:'소리 '+i,text:'흔들흔들.\n빙글빙글.\n폴짝폴짝.\n둠칫둠칫.',image:'scene-'+i+'.webp'}))
const pages=paginateStory(scenes,()=>true),size={enabled:true,width:400,height:680,fontSize:22}
const leaves=s=>s.slice(1,-1).flatMap(x=>[x.left,x.right]).filter(l=>l.kind==='picturebook')
test('only known sound stages and bounded short scenes use picturebook',()=>{
 for(const lv of [1,2])assert.equal(isSoundPicturebook(lv,scenes),true)
 for(const lv of [undefined,null,0,3,6,10,20,NaN])assert.equal(isSoundPicturebook(lv,scenes),false)
 assert.equal(isSoundPicturebook(2,[{text:'말'.repeat(141)}]),false)
 assert.equal(isSoundPicturebook(2,[{text:'말\n'.repeat(9)}]),false)
 assert.equal(isSoundPicturebook(2,[]),false)
})
test('five scenes pack as 2+2+1 on mobile and preserve every original and image',()=>{
 const book=buildBookSpreads(pages,true,size),parts=leaves(book)
 assert.deepEqual(Array.from(parts,p=>p.pages.length),[2,2,1]);assert.equal(book.length,5)
 assert.deepEqual(Array.from(parts.flatMap(leafReadingPages),p=>[p.sceneIndex,p.text,p.image]),scenes.map((s,i)=>[i,s.text,s.image]))
 const desktop=buildBookSpreads(pages,false,size);assert.equal(desktop.length,4)
 const ordinary=buildBookSpreads(pages,true);assert.equal(ordinary.length,12)
 assert.equal(JSON.stringify(buildBookSpreads(pages,true,{...size,enabled:false})),JSON.stringify(ordinary))
 const noImage=paginateStory(scenes.map(s=>({...s,image:''})),()=>true)
 assert.deepEqual(Array.from(leaves(buildBookSpreads(noImage,true,size)),l=>l.pages.length),[2,2,1])
})
test('small paper or enlarged text reduces grouping without losing text',()=>{
 const small=buildBookSpreads(pages,true,{...size,width:280,height:360,fontSize:28})
 assert.ok(leaves(small).every(l=>l.pages.length===1))
 assert.equal(leaves(small).flatMap(leafReadingPages).map(p=>p.text).join(''),scenes.map(s=>s.text).join(''))
})
test('old text/image bookmarks restore to grouped chapter and back across resizing',()=>{
 const mobile=buildBookSpreads(pages,true,size),desktop=buildBookSpreads(pages,false,size),old=buildBookSpreads(pages,true)
 for(let sceneIndex=0;sceneIndex<5;sceneIndex++)for(const kind of ['text','image']){
  const b={kind,sceneIndex,offset:0},s=mobile[bookmarkPosition(mobile,b)]
  assert.ok([s.left,s.right].flatMap(leafReadingPages).some(p=>p.sceneIndex===sceneIndex))
 }
 const bookmark=bookBookmark(mobile[2]);assert.equal(bookmark.sceneIndex,2)
 assert.equal(old[bookmarkPosition(old,bookmark)].right.page.sceneIndex,2)
 assert.equal(findBookPosition(mobile,desktop[2]),3)
 assert.equal(bookmarkPosition(mobile,{kind:'ending'}),mobile.length-1)
})
test('every chapter retains its audio timing while paired chapters share leaf number',()=>{
 const book=buildBookSpreads(pages,true,size)
 const layout=pages.map((p,i)=>({audio_url:'audio-'+i,duration:4+i,ends:[4+i]}))
 const timeline=audioTimeline(pages,book,layout)
 assert.deepEqual(Array.from(timeline,s=>s.label),['1','1','2','2','3'])
 assert.deepEqual(Array.from(timeline,s=>s.spread),[1,1,2,2,3])
 assert.deepEqual(Array.from(timeline,s=>[s.offset,s.start,s.end]),[[0,0,4],[4,0,5],[9,0,6],[15,0,7],[22,0,8]])
 assert.equal(timeline.at(-1).offset+timeline.at(-1).end,30)
})
