import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { isPseudoElement, isRootScope, SCOPE_GUARD } from './build-css.mjs';
import { kitBaseUrl } from './copy-kits.mjs';

const dist = resolve(import.meta.dirname, '../dist');
const sourceKit = resolve(import.meta.dirname, '../../../public/samples/acoustic1');
const manifest = JSON.parse(readFileSync(resolve(dist, '../package.json'), 'utf8'));

function read(file) {
  const data = readFileSync(resolve(dist, file), 'utf8');
  assert(data.length, `Empty dist/${file}`);
  return data;
}

const main = read('index.js');
assert(main.includes(kitBaseUrl), 'Main chunk lacks the versioned kit URL');
read(resolve(dist, '..', manifest.exports['.'].types));

const chunks = readdirSync(dist).filter(name => name.endsWith('.js'));
const notation = chunks.filter(name => read(name).includes('"verovio/wasm"'));
assert.equal(notation.length, 1, 'Expected one notation chunk importing Verovio');
const eager = new Set();
function checkEager(file) {
  if (eager.has(file)) return;
  eager.add(file);
  const code = read(file);
  assert(!/verovio/i.test(code), `Verovio in eager chunk: ${file}`);
  for (const match of code.matchAll(/^(?:import|export)\s+(?:[^\n]*?\s+from\s+)?["']\.\/([^"']+)["']/gm)) {
    checkEager(match[1]);
  }
}
checkEager('index.js');
assert(chunks.some(name => read(name).includes(`import("./${notation[0]}")`)), 'Notation chunk must be a dynamic import');
assert(readdirSync(dist).some(name => /^Petaluma.*\.zip$/.test(name) && statSync(resolve(dist, name)).size > 0));
read('licenses/Petaluma-OFL.txt');
read('licenses/bundled.md');

const css = postcss.parse(read('style.css'));
const viewportUnit = /(?:\d|\.)[dsl]?(?:vw|vh|vi|vb|vmin|vmax)\b/i;
css.walkDecls(decl => {
  assert(!viewportUnit.test(decl.value), `Viewport unit in ${decl}`);
  assert(!/^position$/i.test(decl.prop) || !/^fixed$/i.test(decl.value), `Fixed position in ${decl}`);
  assert(!/\drem\b/.test(decl.value), `Host-relative rem in ${decl}`);
  assert(!decl.prop.startsWith('--tw-') && !/var\(\s*--tw-/.test(decl.value), `Unprefixed Tailwind variable in ${decl}`);
});
css.walkAtRules(at => {
  assert(at.name.toLowerCase() !== 'layer', 'Cascade layers are not allowed in the player stylesheet');
  assert(!viewportUnit.test(at.params), `Viewport unit in ${at.name} ${at.params}`);
  if (at.name === 'media') {
    assert(!/\b(?:width|height|orientation|aspect-ratio)\b/i.test(at.params), `Viewport media query: ${at.params}`);
  } else if (at.name === 'property') {
    assert(at.params.startsWith('--dp-tw-'), `Unprefixed property: ${at.params}`);
  } else if (at.name === 'keyframes') {
    assert(at.params.startsWith('dp-'), `Unprefixed keyframes: ${at.params}`);
  } else {
    assert(['container', 'supports'].includes(at.name), `Unexpected global at-rule: @${at.name}`);
  }
});

const guard = selectorParser().astSync(SCOPE_GUARD).first.first.toString();
css.walkRules(rule => {
  if (rule.parent.name === 'keyframes') return;
  selectorParser(selectors => selectors.each(selector => {
    const subject = selector.nodes.slice(selector.nodes.findLastIndex(node => node.type === 'combinator') + 1);
    assert(subject.some(node => isRootScope(node) || (node.type === 'pseudo' && node.toString().trim() === guard)),
      `Selector can escape the player: ${selector}`);
    const pseudoElement = subject.findIndex(isPseudoElement);
    if (pseudoElement !== -1) assert(pseudoElement === subject.length - 1, `Invalid pseudo-element: ${selector}`);
  })).processSync(rule.selector);
});

const kit = resolve(dist, 'kits/acoustic1');
const kitManifest = JSON.parse(read('kits/acoustic1/kit.json'));
assert.deepEqual(kitManifest.formats, ['ogg', 'm4a']);
const expected = Object.values(kitManifest.samples).flatMap(({ file }) =>
  kitManifest.formats.map(format => file.replace(/\.[^.]+$/, '.' + format)));
assert.equal(new Set(expected).size, 28);
assert.deepEqual(readdirSync(kit).sort(), [...expected, 'kit.json'].sort());
for (const name of [...expected, 'kit.json']) {
  const bytes = readFileSync(resolve(kit, name));
  assert(bytes.length && bytes.equals(readFileSync(resolve(sourceKit, name))), `Kit file does not match source: ${name}`);
}

console.log('dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.');
