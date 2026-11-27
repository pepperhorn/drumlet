import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const pkgRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(pkgRoot, '../..');
const styleRoot = resolve(repoRoot, 'src/player/styles');
const require = createRequire(import.meta.url);

export const SCOPE = '.drumlet-player';
export const SCOPE_GUARD = `:where(${SCOPE}, ${SCOPE} *)`;
const VAR_PREFIX = '--dp-tw-';
const NAME_PREFIX = 'dp-';
const LAYERS = ['properties', 'theme', 'base', 'components', 'utilities'];
const LAYER_ORDER = `@layer ${LAYERS.map(name => NAME_PREFIX + name).join(', ')};`;
const guard = selectorParser().astSync(SCOPE_GUARD).first.first;

export function isRootScope(node) {
  return node?.type === 'class' && node.value === SCOPE.slice(1);
}

function isDocumentRoot(node) {
  return (node.type === 'pseudo' && [':root', ':host'].includes(node.value))
    || (node.type === 'tag' && node.value === 'html');
}

export function isPseudoElement(node) {
  return node.type === 'pseudo' && (node.value.startsWith('::')
    || [':before', ':after', ':first-line', ':first-letter'].includes(node.value));
}

const scopeSelector = selectorParser(selectors => {
  const seen = new Set();
  selectors.each(selector => {
    const head = selector.first;
    if (isDocumentRoot(head)) head.replaceWith(selectorParser.className({ value: SCOPE.slice(1) }));
    const subject = selector.nodes.slice(selector.nodes.findLastIndex(node => node.type === 'combinator') + 1);
    const text = selector.toString().trim();
    if (seen.has(text)) {
      selector.remove();
      return;
    }
    seen.add(text);
    if (subject.some(isRootScope)) return;
    const pseudoElement = subject.find(isPseudoElement);
    if (pseudoElement) {
      const scope = guard.clone();
      scope.spaces.before = pseudoElement.spaces.before;
      pseudoElement.spaces.before = '';
      selector.insertBefore(pseudoElement, scope);
    } else selector.append(guard.clone());
  });
});

const remToPx = value => value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${+(Number(n) * 16).toFixed(4)}px`);
const widthQuery = /^\(\s*(?:(?:min|max)-width\s*:|width\s*[<>]=?)\s*[\d.]+(?:rem|px)\s*\)$/;

function compileTailwind() {
  const dir = mkdtempSync(resolve(tmpdir(), 'drumlet-player-css-'));
  const out = resolve(dir, 'tailwind.css');
  try {
    const cliManifest = require.resolve('@tailwindcss/cli/package.json');
    const cli = resolve(dirname(cliManifest), require(cliManifest).bin.tailwindcss);
    execFileSync(process.execPath, [cli, '-i', resolve(styleRoot, 'tailwind.css'), '-o', out, '--optimize'], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    return readFileSync(out, 'utf8').replace(/^\/\*!.*?\*\/\s*/, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function scopeTailwind(css) {
  const keyframes = new Map();
  css.walkAtRules(at => {
    if (at.name === 'property') at.params = at.params.replace(/^--tw-/, VAR_PREFIX);
    if (at.name === 'layer') {
      if (!at.nodes) {
        at.remove();
        return;
      }
      at.params = at.params.split(',').map(layer => NAME_PREFIX + layer.trim()).join(', ');
    }
    // Reuse the app's responsive classes against the player width, including Cell's pad sizes.
    if (at.name === 'media' && widthQuery.test(at.params)) {
      at.name = 'container';
      at.params = `dp-player ${at.params}`;
    }
    if (/^(?:container|supports|media)$/.test(at.name)) at.params = remToPx(at.params);
    if (at.name === 'keyframes') {
      keyframes.set(at.params, NAME_PREFIX + at.params);
      at.params = keyframes.get(at.params);
    }
  });

  css.walkRules(rule => {
    if (rule.parent.name !== 'keyframes') rule.selector = scopeSelector.processSync(rule.selector);
  });
  css.walkDecls(decl => {
    decl.prop = decl.prop.replace(/^--tw-/, VAR_PREFIX);
    decl.value = remToPx(decl.value.replaceAll('--tw-', VAR_PREFIX));
    if (/^(animation(?:-name)?|--animate-[\w-]+)$/.test(decl.prop)) {
      decl.value = decl.value.replace(/[\w-]+/g, word => keyframes.get(word) ?? word);
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const css = postcss.parse(compileTailwind());
  scopeTailwind(css);
  const base = postcss.parse(readFileSync(resolve(styleRoot, 'base.css'), 'utf8'));
  scopeTailwind(base);
  css.prepend(postcss.atRule({ name: 'layer', params: 'dp-base', nodes: base.nodes }));
  const { name, version } = JSON.parse(readFileSync(resolve(pkgRoot, 'package.json'), 'utf8'));
  const output = `/*! ${name} v${version} | Tailwind CSS (MIT) | Scoped to ${SCOPE} */\n${LAYER_ORDER}\n${css}\n`;
  writeFileSync(resolve(pkgRoot, 'dist/style.css'), output);
  console.log(`dist/style.css  ${Buffer.byteLength(output)} bytes`);
}
