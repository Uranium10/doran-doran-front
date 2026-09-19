const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const scope={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/book-navigation.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope);
const {bookOrigin,bookPath,returnPath,returnLabel}=scope.exports;
test('parent library → book → quiz/result → library → parent retains origin after URL reload',()=>{
 const library=new URL('/library?from=parent','https://example.invalid');
 const origin=library.searchParams.get('from')==='parent'?'parent-library':'library';
 const book=new URL(bookPath('book/한 권',origin),'https://example.invalid');
 assert.equal(book.pathname,'/books/book%2F%ED%95%9C%20%EA%B6%8C');
 for(const suffix of ['', '&view=quiz','&view=quiz&practice=attempt']) {
  const url=new URL(book.href+suffix);
  assert.equal(returnPath(bookOrigin(url.searchParams.get('from'))),'/library?from=parent');
 }
 assert.equal(returnPath(library.searchParams.get('from')),'/parent');
 assert.equal(returnLabel(origin),'자녀 책장으로 돌아가기');
});
test('direct parent result and retry retain parent while child entry remains unchanged',()=>{
 for(const [origin,destination] of [['parent','/parent'],['dashboard','/dashboard'],['library','/library'],['stickers','/stickers']]) {
  const retry=new URL(bookPath('story',bookOrigin(origin))+'&view=quiz&practice=test','https://example.invalid');
  assert.equal(returnPath(retry.searchParams.get('from')),destination);
 }
});
test('unknown and external origins cannot redirect outside allowed destinations',()=>{
 for(const input of [undefined,'','https://evil.invalid','//evil.invalid','parent&from=evil']) {
  assert.equal(bookOrigin(input),'dashboard');assert.equal(returnPath(input),'/dashboard');
 }
});

test('sticker detour from parent keeps a route back to parent',()=>{
 const book=new URL(bookPath('story','parent-stickers'),'https://example.invalid');
 const stickers=new URL(returnPath(book.searchParams.get('from')),'https://example.invalid');
 assert.equal(stickers.pathname,'/stickers');
 assert.equal(returnPath(stickers.searchParams.get('from')),'/parent');
});
