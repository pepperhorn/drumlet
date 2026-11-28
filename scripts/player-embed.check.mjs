import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';
import { assetBase, hostStyles, withPackedHost } from './pack-smoke.mjs';

const executablePath = process.env.CHROMIUM_PATH || join(homedir(),
  '.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell');
const player = (page, index) => page.locator(`[data-player-index="${index}"] .drumlet-player`);
const playButton = root => root.getByRole('button', { name: 'Play', exact: true });
const stopButton = root => root.getByRole('button', { name: 'Stop', exact: true });
const kitRequest = url => new URL(url).pathname.includes('/kits/');
const snapshot = page => page.locator('[data-probe]').evaluateAll(nodes => nodes.map(node => {
  const css = getComputedStyle(node);
  // Private Tailwind @property initial values are registered document-wide.
  const names = Array.from(css).filter(name => !name.startsWith('--dp-tw-'));
  return [node.classList[0], Object.fromEntries(names.map(name => [name, css.getPropertyValue(name)]))];
}));

async function withPage(browser, origin, params, check) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  try {
    await context.addInitScript(() => {
      window.audioContexts = [];
      window.AudioContext = class extends window.AudioContext {
        constructor(...args) {
          super(...args);
          window.audioContexts.push(this);
        }
      };
    });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const requests = [];
    const errors = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => errors.push(error.message));
    const path = params.host === 'tailwind' ? '/tailwind.html' : '/';
    await page.goto(`${origin}${path}?${new URLSearchParams(params)}`);
    await player(page, 0).locator('.step-cell').first().waitFor({ state: 'attached' });
    const output = await check(page, requests);
    assert.deepEqual(errors, [], 'uncaught browser errors');
    const playbackErrors = await page.evaluate(() => window.playbackEvents.filter(([, event]) => event === 'error'));
    assert.deepEqual(playbackErrors, [], 'player callback errors');
    return output;
  } finally {
    await context.close();
  }
}

async function dimensions(root) {
  return root.evaluate(node => {
    const size = selector => {
      const { width, height } = node.querySelector(selector).getBoundingClientRect();
      return [width, height];
    };
    return {
      theme: node.dataset.theme,
      pad: size('.step-cell'),
      play: size('.drumlet-player-play-btn'),
    };
  });
}

async function checkStyles(browser, origin, report) {
  const measurements = new Map();
  for (const theme of ['light', 'dark']) {
    let clean;
    for (const host of Object.keys(hostStyles)) {
      const params = { theme, host };
      const baseline = await withPage(browser, origin, { ...params, 'no-player-css': '1' }, snapshot);
      const actual = await withPage(browser, origin, params, async page => {
        assert.ok(baseline.length >= 10, 'host needs at least 10 style probes');
        const styled = await snapshot(page);
        for (const [index, [probe, before]] of baseline.entries()) {
          const [, after] = styled[index];
          const names = new Set([...Object.keys(before), ...Object.keys(after)]);
          const changes = Object.fromEntries([...names].filter(name => before[name] !== after[name])
            .map(name => [name, [before[name], after[name]]]));
          assert.deepEqual(changes, {}, `${host} / ${theme}: leaked CSS on .${probe}`);
        }
        assert.deepEqual(await player(page, 0).evaluate(node => {
          const css = getComputedStyle(node);
          return [css.width, css.marginTop, css.marginRight, css.outlineWidth, css.outlineStyle, css.outlineColor];
        }), ['520px', '11px', '11px', '3px', 'solid', 'rgb(12, 34, 56)'], `${host} / ${theme}: className on player root`);
        if (host === 'tailwind') {
          // Also verify a compiled host utility, not just the presence of a stylesheet.
          assert.deepEqual(await page.locator('.fixture-heading').evaluate(node => {
            const css = getComputedStyle(node);
            const owners = Array.from(document.styleSheets, sheet => sheet.ownerNode);
            const hostIndex = owners.findIndex(owner => /\/assets\/tailwind-[\w-]+\.css$/.test(owner.href));
            const playerIndex = owners.indexOf(document.querySelector('.fixture-player-css'));
            return [css.fontWeight, css.paddingLeft, hostIndex >= 0 && playerIndex > hostIndex];
          }), ['700', '16px', true], 'compiled Tailwind host stylesheet precedes the player stylesheet');
        }
        return Promise.all([dimensions(player(page, 0)), dimensions(player(page, 1))]);
      });
      if (host === 'clean') {
        const otherTheme = theme === 'dark' ? 'light' : 'dark';
        assert.deepEqual(actual, [theme, otherTheme].map(theme => ({ theme, pad: [36, 36], play: [44, 44] })),
          `clean / ${theme}: expected pad and Play sizes at 520px player width`);
        clean = actual;
      }
      assert.deepEqual(actual, clean, `${host} / ${theme}: pad/Play dimensions differ from clean host`);
      measurements.set(host, `pad ${actual[0].pad.join('x')}, Play ${actual[0].play.join('x')}`);
    }
  }
  for (const [host, sizes] of measurements) report.push({ check: `${host} (light + dark)`, result: sizes });
  report.push({ check: 'CSS isolation', result: '12 host probes unchanged, host className applied' });
}

function waitForPlayback(page, index, event) {
  return page.waitForFunction(([index, event]) => window.playbackEvents.some(([id, type]) => id === index && type === event), [index, event]);
}

async function clickPlay(page, index) {
  await playButton(player(page, index)).click();
  await waitForPlayback(page, index, 'play');
  await waitForPlayback(page, index, 'step');
  await stopButton(player(page, index)).waitFor();
}

async function checkRequestsAndPlayback(browser, origin, notationFiles, report) {
  const notationRequest = url => {
    const path = new URL(url).pathname;
    return notationFiles.has(path) || /verovio|petaluma/i.test(path);
  };

  await withPage(browser, origin, { mode: 'none' }, async (page, requests) => {
    await page.waitForLoadState('networkidle');
    assert.equal(await player(page, 0).locator('.drumlet-player-play-btn').count(), 0);
    assert.equal(await page.evaluate(() => window.audioContexts.length), 0);
    assert.deepEqual(requests.filter(url => kitRequest(url) || notationRequest(url)), [], 'chrome="none" requests');
  });
  report.push({ check: 'chrome="none"', result: '0 kit/notation-engine requests, 0 AudioContexts' });

  await withPage(browser, origin, { mode: 'grid' }, async (page, requests) => {
    await page.waitForLoadState('networkidle');
    assert.deepEqual(requests.filter(notationRequest), [], 'grid requests before notation switch');
    await player(page, 0).getByRole('button', { name: 'Notation', exact: true }).click();
    await player(page, 0).locator('.verovio-container svg').first().waitFor();
    assert.ok(requests.some(url => notationFiles.has(new URL(url).pathname)), 'switching to notation requests its JS chunk');
    assert.ok(requests.some(url => /petaluma[^/]*\.zip$/i.test(new URL(url).pathname)), 'notation loads the packed Petaluma font');
  });
  report.push({ check: 'Grid / notation', result: '0 engine requests in grid, switch fetches chunk and renders SVG' });

  await withPage(browser, origin, {}, async (page, requests) => {
    const kitResponses = [];
    page.on('response', response => {
      if (kitRequest(response.url())) kitResponses.push([response.url(), response.ok()]);
    });
    await clickPlay(page, 0);
    await clickPlay(page, 1);
    await waitForPlayback(page, 0, 'stop');
    await playButton(player(page, 0)).waitFor();
    const transitions = await page.evaluate(() => window.playbackEvents.filter(([, event]) => event !== 'step'));
    assert.deepEqual(transitions, [[0, 'play'], [0, 'stop'], [1, 'play']], 'B claims playback from A');
    const base = `${origin}${assetBase}/kits/acoustic1/`;
    const kits = requests.filter(kitRequest);
    assert.ok(kits.length > 1 && kits.every(url => url.startsWith(base)), 'kit requests use assetBaseUrl');
    assert.ok(kitResponses.some(([url, ok]) => ok && url === base + 'kit.json'), 'packed kit manifest returns OK');
    assert.ok(kitResponses.some(([url, ok]) => ok && /\.(ogg|m4a)$/.test(url)), 'packed audio sample returns OK');
    assert.deepEqual(requests.filter(notationRequest), [], 'grid requests during playback');
  });
  report.push({ check: 'Playback handoff', result: 'B plays and A stops' });
  report.push({ check: 'assetBaseUrl', result: `manifest and samples use ${assetBase}/kits/` });

  await withPage(browser, origin, { mode: 'shared' }, async page => {
    assert.equal(await page.locator('.drumlet-player').count(), 8);
    for (let index = 0; index < 8; index++) {
      await clickPlay(page, index);
      if (index > 0) await waitForPlayback(page, index - 1, 'stop');
      assert.deepEqual(await page.evaluate(() => window.audioContexts.map(ctx => ctx.state)), ['running']);
    }
    await stopButton(player(page, 7)).click();
    await waitForPlayback(page, 7, 'stop');
    await page.waitForFunction(() => window.audioContexts[0]?.state === 'suspended');
    assert.deepEqual(await page.evaluate(() => window.audioContexts.map(ctx => ctx.state)), ['suspended']);
  });
  report.push({ check: 'Shared audio', result: '8 players, 1 AudioContext, suspended at idle' });
}

await withPackedHost(async (dir, report) => {
  const require = createRequire(join(dir, 'package.json'));
  const { chromium } = require('playwright-core');
  const manifest = JSON.parse(await readFile(join(dir, 'dist/.vite/manifest.json'), 'utf8'));
  const notationFiles = new Set(Object.entries(manifest)
    .filter(([id, entry]) => /notationview|verovio/i.test(id + entry.file) && entry.file.endsWith('.js'))
    .map(([, entry]) => '/' + entry.file));
  assert.ok(notationFiles.size > 0, 'Vite manifest identifies at least one notation JS chunk');

  const server = await preview({ configFile: false, root: dir, preview: { host: '0.0.0.0', port: 5210, strictPort: true } });
  try {
    const browser = await chromium.launch({ executablePath });
    try {
      const origin = 'http://127.0.0.1:5210';
      await checkStyles(browser, origin, report);
      await checkRequestsAndPlayback(browser, origin, notationFiles, report);
      console.table(report);
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}, { browser: true });
