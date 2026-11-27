// SPDX-License-Identifier: MIT
export type PlayerChrome = 'full' | 'minimal' | 'none';

export function resolveChrome(chrome: PlayerChrome = 'full') {
  const full = chrome === 'full';
  const audio = chrome !== 'none';

  return {
    transport: full,
    bpm: full,
    displayToggle: full,
    viewToggle: full,
    playButton: audio,
    audio,
  };
}
