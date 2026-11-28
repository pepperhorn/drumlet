import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import { defineConfig, normalizePath, type Plugin } from 'vite';
import { kitBaseUrl } from './scripts/copy-kits.mjs';

const src = normalizePath(resolve(import.meta.dirname, '../../src'));
const font = normalizePath(resolve(import.meta.dirname, '../../public/fonts/Petaluma.zip'));
const spdx = '// SPDX-License-Identifier: MIT';
const tailwind = resolve(src, 'player/styles/tailwind.css');

// The shared app sources keep their own asset URLs. Substitute only in the library build.
function playerAssets(): Plugin {
  const substitutions = new Map([
    [`${src}/audio/customKits.ts`, ["let kitBaseUrl = '/samples/';", `let kitBaseUrl = ${JSON.stringify(kitBaseUrl)};`]],
    [`${src}/components/notationPrefetch.ts`, [
      "fetch('/fonts/Petaluma.zip',",
      'fetch(petalumaUrl,',
    ]],
  ]);
  return {
    name: 'drumlet-player-assets',
    enforce: 'pre',
    transform(code, id) {
      const substitution = substitutions.get(id);
      if (!substitution) return;
      const [from, to] = substitution;
      if (!code.includes(from)) this.error(`Player asset substitution no longer matches ${id}`);
      const fontImport = id.endsWith('/notationPrefetch.ts')
        ? `import petalumaUrl from ${JSON.stringify(font + '?url&no-inline')};\n`
        : '';
      return fontImport + code.replace(from, to);
    },
    generateBundle(_options, bundle) {
      const modules = new Set(Object.values(bundle).flatMap(chunk => chunk.type === 'chunk' ? Object.keys(chunk.modules) : []));
      const sources = [...modules].filter(id => id.startsWith(src + '/'));
      // The generated stock catalog is JSON and cannot carry an SPDX comment.
      const missing = sources
        .filter(id => /\.[jt]sx?$/.test(id))
        .filter(id => readFileSync(id, 'utf8').split('\n', 1)[0] !== spdx);
      if (missing.length) this.error(`Missing MIT headers in bundled sources:\n${missing.sort().join('\n')}`);
      const scanned = new Set<string>();
      postcss.parse(readFileSync(tailwind, 'utf8'), { from: tailwind }).walkAtRules('source', at => {
        const path = /^"([^"]+)"$/.exec(at.params)?.[1];
        if (path) scanned.add(normalizePath(resolve(dirname(tailwind), path)));
      });
      const unscanned = sources.filter(id => id.endsWith('.tsx') && !scanned.has(id));
      if (unscanned.length) this.error(`Missing Tailwind @source entries for bundled JSX:\n${unscanned.sort().join('\n')}`);
      this.emitFile({
        type: 'asset',
        fileName: 'licenses/Petaluma-OFL.txt',
        source: readFileSync(resolve(import.meta.dirname, 'licenses/Petaluma-OFL.txt')),
      });
    },
  };
}

export default defineConfig({
  plugins: [playerAssets(), react()],
  base: './',
  publicDir: false,
  build: {
    target: 'es2022',
    license: { fileName: 'licenses/bundled.md' },
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, 'dist'),
    lib: {
      entry: { index: resolve(src, 'player/index.ts') },
      formats: ['es'],
    },
    rolldownOptions: {
      external: [/^react(?:-dom)?(?:\/|$)/, /^smplr(?:\/|$)/, /^verovio(?:\/|$)/],
    },
  },
});
