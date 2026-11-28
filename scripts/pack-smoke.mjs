import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const packageDir = join(repo, 'packages/drumlet-player');
const playerPackage = '@pepperhorn/drumlet-player';

export const assetBase = '/custom-player-assets';
export const hostStyles = {
  clean: '',
  'button reset': 'button{all:unset}',
  'large fonts': '*{font-size:30px}',
  'button layout': 'button{padding:12px 20px;display:inline-block;font-size:18px}',
  'div padding': 'div{padding:20px}',
  tailwind: '',
};

function hostHtml(tailwind) {
  return `<!doctype html>
<html lang="en" class="fixture-document">
  <head class="fixture-head">
    <meta class="fixture-charset" charset="utf-8">
    <meta class="fixture-viewport" name="viewport" content="width=device-width, initial-scale=1">
    <title class="fixture-title">Packed Drumlet Player</title>
    ${tailwind ? '<link class="fixture-tailwind" rel="stylesheet" href="/host-tailwind.css">' : ''}
    <style class="fixture-layout">
      .fixture-page { width: 640px; margin: 24px auto; }
      .fixture-player { margin-block: 16px; }
      .fixture-embed { width: 520px; margin: 11px; outline: 3px solid rgb(12, 34, 56); }
      .fixture-content-box { box-sizing: content-box; width: 84px; padding: 7px; }
    </style>
  </head>
  <body class="fixture-body">
    <main class="fixture-page">
      <h1 class="fixture-heading font-bold px-4" data-probe>Packed Drumlet Player</h1>
      <h2 class="fixture-subheading text-text" data-probe>Outside the player</h2>
      <p class="fixture-paragraph" data-probe>Host copy</p>
      <button class="fixture-button hw-btn size-11" type="button" data-probe>Host button</button>
      <button class="fixture-pad step-cell pad" type="button" data-probe>Host pad</button>
      <a class="fixture-link text-text" href="#players" data-probe>Players</a>
      <a class="fixture-secondary-link" href="#players" data-probe>Another link</a>
      <input class="fixture-input" aria-label="Host text" value="Host text" data-probe>
      <input class="fixture-checkbox" aria-label="Host checkbox" type="checkbox" data-probe>
      <div class="fixture-content-box grid bg-card" data-probe>Content box</div>
      <span class="fixture-span step-cell-label" data-probe>Host label</span>
      <select class="fixture-select" aria-label="Host select" data-probe>
        <option class="fixture-option">Host option</option>
      </select>
      <section id="players" class="fixture-players" aria-label="Drumlet players"></section>
    </main>
    <script class="fixture-entry" type="module" src="/main.jsx"></script>
  </body>
</html>`;
}

const hostEntry = `
import { createRoot } from 'react-dom/client';
import { DrumletPlayer } from '${playerPackage}';
import playerCss from '${playerPackage}/style.css?url&no-inline';

const params = new URLSearchParams(location.search);
const mode = params.get('mode');
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const variant = document.createElement('style');
variant.className = 'fixture-host-variant';
variant.textContent = ${JSON.stringify(hostStyles)}[params.get('host')] ?? '';
document.head.append(variant);

if (!params.has('no-player-css')) {
  const sheet = document.createElement('link');
  sheet.className = 'fixture-player-css';
  sheet.rel = 'stylesheet';
  sheet.href = playerCss;
  await new Promise((resolve, reject) => {
    sheet.onload = resolve;
    sheet.onerror = reject;
    document.head.append(sheet);
  });
}

window.playbackEvents = [];
const presets = mode === 'shared' ? Array(8).fill('minimal')
  : mode === 'none' ? ['none'] : mode === 'grid' ? ['full'] : ['full', 'minimal'];

createRoot(document.getElementById('players')).render(presets.map((chrome, index) => (
  <div className="fixture-player" data-player-index={index} key={index}>
    <DrumletPlayer
      className="fixture-embed" groove="rock-basic-8ths" display="grid" chrome={chrome}
      theme={index % 2 === 0 ? theme : theme === 'dark' ? 'light' : 'dark'}
      assetBaseUrl="${assetBase}"
      onPlay={() => window.playbackEvents.push([index, 'play'])}
      onStop={() => window.playbackEvents.push([index, 'stop'])}
      onStep={() => window.playbackEvents.push([index, 'step'])}
      onError={error => window.playbackEvents.push([index, 'error', error.message])}
    />
  </div>
)));
`;

async function assertFreshLibrary() {
  const entry = join(packageDir, 'dist/index.js');
  const built = await stat(entry).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    throw new Error('Missing packages/drumlet-player/dist/index.js. Run npm run build:lib first.');
  });
  for (const dir of ['player', 'audio', 'components']) {
    const source = join(repo, 'src', dir);
    const files = await readdir(source, { withFileTypes: true, recursive: true });
    for (const file of files) {
      if (!file.isFile() || !/\.(tsx?|css)$/.test(file.name) || /\.test\.tsx?$|^demo\.tsx$/.test(file.name)) continue;
      const path = join(file.parentPath, file.name);
      if ((await stat(path)).mtimeMs > built.mtimeMs) {
        throw new Error(`Packed library is stale: ${path.slice(repo.length + 1)} is newer than dist/index.js. Run npm run build:lib first.`);
      }
    }
  }
}

function npm(args, cwd, { capture = false, timeout } = {}) {
  try {
    return execFileSync('npm', args, { cwd, timeout, encoding: 'utf8', stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'] });
  } catch (error) {
    if (error.code !== 'ETIMEDOUT') throw error;
    throw new Error(`Temporary host npm ${args[0]} timed out after ${timeout / 1000}s`, { cause: error });
  }
}

export async function withPackedHost(check, { installPlaywright = false } = {}) {
  await assertFreshLibrary();
  const dir = await mkdtemp(join(tmpdir(), 'drumlet-pack-'));
  try {
    const lock = JSON.parse(await readFile(join(repo, 'package-lock.json'), 'utf8'));
    const version = name => lock.packages[`node_modules/${name}`].version;
    const [pack] = JSON.parse(npm(['pack', packageDir, '--json', '--ignore-scripts'], dir, { capture: true }));
    const host = {
      private: true,
      type: 'module',
      scripts: { build: 'vite build' },
      dependencies: { [playerPackage]: `file:./${pack.filename}`, react: version('react'), 'react-dom': version('react-dom') },
      devDependencies: {
        vite: version('vite'),
        '@vitejs/plugin-react': version('@vitejs/plugin-react'),
        tailwindcss: version('tailwindcss'),
        '@tailwindcss/vite': version('@tailwindcss/vite'),
        ...(installPlaywright && { 'playwright-core': '1.64.1' }),
      },
    };
    await Promise.all([
      writeFile(join(dir, 'package.json'), JSON.stringify(host)),
      writeFile(join(dir, 'index.html'), hostHtml(false)),
      writeFile(join(dir, 'tailwind.html'), hostHtml(true)),
      writeFile(join(dir, 'host-tailwind.css'), '@import "tailwindcss" source(none);\n@source "./tailwind.html";\n'),
      writeFile(join(dir, 'main.jsx'), hostEntry),
      writeFile(join(dir, 'vite.config.js'), `
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default {
  plugins: [react(), tailwind()],
  build: { manifest: true, rolldownOptions: { input: ['index.html', 'tailwind.html'] } },
};
`),
    ]);
    npm(['install', '--no-audit', '--no-fund', '--ignore-scripts', '--prefer-offline'], dir, { timeout: 120_000 });
    await cp(join(dir, 'node_modules', playerPackage, 'dist', 'kits'), join(dir, 'public', assetBase, 'kits'), { recursive: true });
    npm(['run', 'build'], dir);
    await check(dir, [
      { check: 'npm pack', result: pack.filename },
      { check: 'fresh host install', result: 'tarball + React peers' },
      { check: 'Vite production build', result: 'standard and Tailwind hosts' },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  await withPackedHost((_dir, results) => console.table(results));
}
