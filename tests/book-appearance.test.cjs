const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), ts = require('typescript')
const scope = {exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/book-appearance.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope)
const {normalizeCoverColor,bookCoverStyle}=scope.exports
for(const value of [null,undefined,'','red','#123','#12345678','url(example)',{},7]) {
 assert.equal(normalizeCoverColor(value),'#B97A55')
 assert.equal(Object.keys(bookCoverStyle(value)).length,0)
}
assert.equal(Object.keys(bookCoverStyle('#b97a55')).length,0)
assert.equal(normalizeCoverColor(' #245e70 '),'#245E70')
assert.ok(bookCoverStyle('#245e70')['--cover-background'].includes('#245E70'))
assert.ok(bookCoverStyle('#245e70')['--back-cover-background'].includes('#245E70'))
assert.equal(bookCoverStyle('#FFFFFF')['--cover-ink'],'#30271F')
assert.equal(bookCoverStyle('#000000')['--cover-ink'],'#FFF2D3')
console.log('PASS: legacy exact palette, invalid color fallback, custom front/back palette, light/dark title contrast')
