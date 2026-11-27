import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath, type Plugin } from 'vite';
import { kitBaseUrl } from './scripts/copy-kits.mjs';

const src = normalizePath(resolve(import.meta.dirname, '../../src'));
const font = normalizePath(resolve(import.meta.dirname, '../../public/fonts/Petaluma.zip'));
const spdx = '// SPDX-License-Identifier: MIT';

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
      // The generated stock catalog is JSON and cannot carry an SPDX comment.
      const missing = [...modules]
        .filter(id => id.startsWith(src + '/') && /\.[jt]sx?$/.test(id))
        .filter(id => readFileSync(id, 'utf8').split('\n', 1)[0] !== spdx);
      if (missing.length) this.error(`Missing MIT headers in bundled sources:\n${missing.sort().join('\n')}`);
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
