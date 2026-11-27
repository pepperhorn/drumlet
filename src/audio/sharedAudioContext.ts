// SPDX-License-Identifier: MIT
type AudioState = 'running' | 'suspended';

interface SharedAudio {
  context: AudioContext;
  holders: number;
  active: Set<string>;
  transition?: Promise<void>;
}

let shared: SharedAudio | undefined;

function syncState(audio: SharedAudio) {
  const target: AudioState = audio.active.size ? 'running' : 'suspended';
  if (!audio.transition && audio.context.state === target) return;

  // Submit the command now, so Play can resume under the user's gesture even
  // when a previous suspend has not settled.
  const transition = target === 'running' ? audio.context.resume() : audio.context.suspend();
  audio.transition = transition;
  const settled = () => {
    if (audio.transition === transition) audio.transition = undefined;
  };
  void transition.then(settled, settled);
}

export function acquireAudioContext(): AudioContext {
  if (!shared) {
    shared = { context: new AudioContext(), holders: 0, active: new Set() };
    syncState(shared);
  }
  shared.holders++;
  return shared.context;
}

// A holder must remove its active ID before releasing.
export function releaseAudioContext(): void {
  if (!shared || --shared.holders > 0) return;
  const { context } = shared;
  shared = undefined;
  void context.close().catch(() => {});
}

export function setAudioActive(id: string, active: boolean): void {
  if (!shared) return;
  if (active) {
    shared.active.add(id);
    syncState(shared);
  } else if (shared.active.delete(id) && shared.active.size === 0) {
    syncState(shared);
  }
}

export function waitForAudioContext(): Promise<void> {
  return shared?.transition ?? Promise.resolve();
}
