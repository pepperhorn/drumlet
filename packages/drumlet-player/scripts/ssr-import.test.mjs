import assert from 'node:assert/strict';

for (const name of ['window', 'document', 'localStorage', 'AudioContext', 'webkitAudioContext']) {
  Object.defineProperty(globalThis, name, {
    get() { throw new Error(`Package accessed ${name} during import`); },
  });
}

const { DrumletPlayer, GrooveError, resolveChrome } = await import('@pepperhorn/drumlet-player');
assert.equal(typeof DrumletPlayer.render, 'function');
assert.equal(typeof GrooveError, 'function');
assert.equal(typeof resolveChrome, 'function');
console.log('SSR import passed with browser globals unavailable.');
