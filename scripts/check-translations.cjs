const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/i18n.tsx', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(require, mod, mod.exports);
const { catalog, languages, translate, localizeView, savedLanguage } = mod.exports;
assert.equal(languages.length, 8);
for (const [key, values] of catalog) {
  assert.equal(values.length, 7, key);
  assert(values.every(value => typeof value === 'string' && value.length > 0), key);
}
for (const [language] of languages) {
  global.localStorage = { getItem: () => language };
  assert.equal(savedLanguage(), language);
  for (const key of ['Home', 'Sign in', 'Chats', 'Delete this message?', 'Notifications', 'Kids Stories']) assert(translate(key, language));
}
assert.equal(translate('Home', 'zh'), '首页');
assert.equal(translate('Home', 'ar'), 'الرئيسية');
const React = require('react');
const view = React.createElement('div', null, React.createElement('button', { 'aria-label': 'Delete message' }, 'Delete'), React.createElement('p', { translate: 'no' }, 'Home'));
const localized = localizeView(view, 'zh');
assert.equal(localized.props.children[0].props.children, '删除');
assert.equal(localized.props.children[1].props.children, 'Home');
assert.equal(translate('A moment shared by Alex', 'zh'), 'Alex 分享的瞬间');
// Audit literal JSX copy, excluding deliberately opaque user-authored regions.
const missing = new Set();
const file = ts.createSourceFile('App.tsx', fs.readFileSync('src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(p => p.name?.text === 'translate' && p.initializer?.text === 'no')) return;
  if (ts.isJsxText(node)) {
    const text = node.text.trim();
    if (/[A-Za-z]/.test(text) && !catalog.has(text) && !['Mingle', 'Nest', 'STORIES', '?'].includes(text)) missing.add(text);
  }
  ts.forEachChild(node, visit);
}
visit(file);
assert.equal(missing.size, 0, 'Untranslated JSX text: ' + [...missing].join(' | '));
console.log(`Passed: ${catalog.size} complete translation entries, eight saved languages, Chinese/Arabic labels, nested interface translation, content protection and JSX copy audit.`);
