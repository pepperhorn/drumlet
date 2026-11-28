import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, preview } from 'vite';

const require = createRequire(import.meta.url);
function resolvePlaywright() {
  try {
    return require.resolve('playwright-core');
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return '/home/shaun/piano-invaders/node_modules/playwright-core';
  }
}
const { chromium } = require(resolvePlaywright());
const executablePath = process.env.CHROMIUM_PATH ?? join(
  homedir(), '.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell',
);

const width = 360;
const height = 400;
const port = 5211;
const origin = `http://localhost:${port}`;
const hostUrl = `${origin}/__embed-route-check`;
const encode = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64url');
const kick = { n: 'Kick', st: 'k', ki: 'acoustic1', ks: 'kick' };
const v3 = { v: 3, b: 120, sp: 16, t: [{ ...kick, s: '3000300030003000' }] };
const v4 = {
  v: 4, sp: 16, t: [kick],
  pg: [
    { n: 'Intro', s: ['3000000000000000'] },
    { n: 'Verse', s: ['0300000000000000'] },
    { n: 'Finale', s: ['0030000000000000'] },
  ],
};
const challenge = { ...v3, pm: { modeId: 'rhythm-challenge', loops: 2 } };

async function checkRoutes(browser) {
  const context = await browser.newContext({
    viewport: { width, height: 640 },
    colorScheme: 'dark',
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url === hostUrl) {
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><body style="margin:0"><iframe title="Drumlet" width="${width}" height="${height}" style="display:block;border:0" allow="autoplay"></iframe></body>`,
      });
    }
    return url.startsWith(`${origin}/`) ? route.continue() : route.abort();
  });
  await context.addInitScript(() => {
    const start = AudioBufferSourceNode.prototype.start;
    window.sampleStarts = 0;
    window.playheadSteps = new Set();
    AudioBufferSourceNode.prototype.start = function (...args) {
      start.apply(this, args);
      if (this.buffer && this.context.state === 'running') window.sampleStarts++;
    };
    new MutationObserver(() => {
      const step = document.querySelector('.playhead-active')?.closest('[data-global-step]');
      if (step) window.playheadSteps.add(step.dataset.globalStep);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const appChunkRequests = [];
  const pageErrors = [];
  page.on('request', (request) => {
    if (/\/assets\/App-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      appChunkRequests.push(request.url());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const iframe = page.locator('iframe');
  const frame = iframe.contentFrame();
  const player = frame.locator('.drumlet-player');
  const app = frame.locator('.drumlet-app');

  // Reload the host each time so a hash-only iframe URL change cannot reuse the old document.
  async function openEmbed(code, params = '') {
    await page.goto(hostUrl);
    const hash = code === undefined ? '' : `#s=${code}`;
    const src = `${origin}/?embed=1${params}${hash}`;
    await iframe.evaluate((element, src) => { element.src = src; }, src);
  }

  await openEmbed(encode(v3));
  const play = player.getByRole('button', { name: 'Play', exact: true });
  await play.waitFor();
  assert.equal(await app.count(), 0);
  assert.deepEqual(appChunkRequests, [], 'Plain embed must not request the App chunk');
  assert.equal(await player.locator('.endless-page-heading').count(), 1);
  const sampleResponse = page.waitForResponse((response) =>
    /\/samples\/acoustic1\/acoustic-Kick\.(?:ogg|m4a)$/.test(response.url()),
  );
  const [sample] = await Promise.all([sampleResponse, play.click()]);
  assert.equal(sample.status(), 200);
  const playerFrame = page.frame({ url: /\?embed=1/ });
  await playerFrame.waitForFunction(() => window.sampleStarts >= 2 && window.playheadSteps.size >= 2);
  await player.getByRole('button', { name: 'Stop', exact: true }).click();
  await play.waitFor();
  console.log('PASS v3 mounts the player, loads the local kick and advances playback');

  await openEmbed(encode(v4));
  await player.getByRole('button', { name: 'Endless', pressed: true }).waitFor();
  assert.deepEqual(await player.locator('.endless-page-name').allTextContents(), ['Intro', 'Verse', 'Finale']);
  assert.equal(await player.locator('.endless-step').count(), 48);
  console.log('PASS v4 renders all three pages and 48 steps in the endless view');

  const size = await player.evaluate((element) => {
    const root = document.documentElement;
    const grid = element.querySelector('.endless-grid');
    const rect = element.getBoundingClientRect();
    return {
      frameWidth: window.innerWidth,
      frameHeight: window.innerHeight,
      documentWidth: root.scrollWidth,
      playerWidth: rect.width,
      playerHeight: rect.height,
      gridScrolls: grid.scrollWidth > grid.clientWidth,
    };
  });
  assert.deepEqual(size, {
    frameWidth: width, frameHeight: height, documentWidth: width,
    playerWidth: width, playerHeight: height, gridScrolls: true,
  });
  console.log(`PASS ${width}×${height} iframe is filled and only the grid scrolls horizontally`);

  assert.equal(await player.getAttribute('data-theme'), 'light');
  assert.equal(await player.evaluate((element) => getComputedStyle(element).colorScheme), 'light');
  await openEmbed(encode(v4), '&theme=dark');
  await player.getByRole('button', { name: 'Play', exact: true }).waitFor();
  assert.equal(await player.getAttribute('data-theme'), 'dark');
  assert.equal(await player.evaluate((element) => getComputedStyle(element).colorScheme), 'dark');
  console.log('PASS embed defaults to light on a dark system and accepts ?theme=dark');

  await openEmbed(encode(challenge));
  await app.locator('.plugin-start-btn').waitFor();
  assert.equal(await player.count(), 0);
  assert.ok(appChunkRequests.length > 0, 'The request matcher must detect the challenge App chunk');
  console.log('PASS challenge metadata opens the full app’s challenge setup');

  for (const code of ['garbage___', encode({ v: 9 }), undefined, '']) {
    appChunkRequests.length = 0;
    pageErrors.length = 0;
    await openEmbed(code);
    const error = player.getByRole('alert');
    await error.waitFor();
    assert.equal(await error.textContent(), 'Invalid groove share code.');
    assert.equal(await app.count(), 0);
    assert.deepEqual(appChunkRequests, [], `App chunk requested for invalid code ${code}`);
    assert.deepEqual(pageErrors, [], `Uncaught error for invalid code ${code}`);
  }
  console.log('PASS garbage, unknown-version and empty embeds show the player error without requesting App');

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.setViewportSize({ width, height: 500 });
  await page.goto(`${origin}/#s=${encode(v4)}`);
  await page.getByRole('button', { name: /Tap to Start/ }).click();
  assert.ok(await page.locator('head link[data-drumlet-app-preload][rel="modulepreload"][href*="/App-"]').count(),
    'The full app route must preload its App chunk');
  await page.getByRole('button', { name: 'More controls' }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  for (const [label, expected] of [
    ['React / npm', /<DrumletPlayer groove=/],
    ['Iframe HTML', /<iframe .*\?embed=1#s=/],
  ]) {
    const copy = page.getByRole('button', { name: `Copy ${label} embed snippet` });
    const snippet = await page.getByRole('textbox', { name: label }).inputValue();
    assert.match(snippet, expected);
    await copy.click();
    await copy.filter({ hasText: 'Copied!' }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), snippet);
  }
  console.log('PASS both Share modal embed buttons copy their snippets at 360×500');
}

const outDir = await mkdtemp(join(tmpdir(), 'drumlet-embed-route-'));
let server;
let browser;
try {
  const buildOptions = { outDir, emptyOutDir: true };
  await build({ build: buildOptions });
  server = await preview({ build: buildOptions, preview: { host: '0.0.0.0', port, strictPort: true } });
  browser = await chromium.launch({ executablePath });
  await checkRoutes(browser);
} finally {
  await browser?.close();
  await server?.close();
  await rm(outDir, { recursive: true, force: true });
}
