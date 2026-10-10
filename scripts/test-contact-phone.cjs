const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')
const assert = require('node:assert/strict')
const file = require('node:path').resolve('src/contactPhone.ts')
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = new Module(file, module)
mod.filename = file
mod.paths = Module._nodeModulePaths(require('node:path').dirname(file))
mod._compile(compiled, file)
const { normalizePhone, phoneHash } = mod.exports
async function test() {
  assert.equal(normalizePhone('+220 701 2345', 'US'), '+2207012345')
  assert.equal(normalizePhone('7012345', 'GM'), '+2207012345')
  assert.equal(normalizePhone('00220 7012345', 'FR'), '+2207012345')
  assert.equal(normalizePhone('+٢٢٠ ٧٠١٢٣٤٥', 'GM'), '+2207012345')
  assert.equal(normalizePhone('+1 (415) 555-2671', 'GM'), '+14155552671')
  assert.equal(normalizePhone('020 7946 0018', 'GB'), '+442079460018')
  assert.equal(normalizePhone('06 12 34 56 78', 'FR'), '+33612345678')
  assert.equal(normalizePhone('030 123456', 'DE'), '+4930123456')
  assert.equal(normalizePhone('+86 138 0013 8000', 'US'), '+8613800138000')
  assert.equal(normalizePhone('not a phone', 'GM'), null)
  assert.equal(normalizePhone('+220 123', 'GM'), null)
  assert.equal(await phoneHash('+2207012345'), await phoneHash('2207012345'))
  assert.match(await phoneHash('+2207012345'), /^[a-f0-9]{64}$/)
  console.log('Passed 13 phone normalization/hash tests. No contacts or phone numbers logged.')
}
test().catch(error => { console.error(error); process.exitCode = 1 })
