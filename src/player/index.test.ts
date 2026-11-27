// SPDX-License-Identifier: MIT
// @vitest-environment node
import { expect, it } from 'vitest';

it('imports the player without DOM, storage or Web Audio globals', async () => {
  for (const key of ['window', 'document', 'localStorage', 'AudioContext']) {
    expect(Reflect.get(globalThis, key)).toBeUndefined();
  }
  const { DrumletPlayer, GrooveError, resolveChrome } = await import('./index.js');
  expect(DrumletPlayer).toBeDefined();
  expect(new GrooveError('empty')).toBeInstanceOf(Error);
  expect(resolveChrome('none').audio).toBe(false);
});
