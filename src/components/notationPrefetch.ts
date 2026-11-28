// SPDX-License-Identifier: MIT
let notationModule: ReturnType<typeof importNotation> | undefined;
let petaluma: { promise: Promise<string>; controller?: AbortController } | undefined;

function importNotation() {
  return import('./NotationView.js');
}

export function loadNotation() {
  return notationModule ??= importNotation().catch((error) => {
    notationModule = undefined;
    throw error;
  });
}

export function loadPetaluma() {
  if (petaluma) return petaluma.promise;
  const controller = new AbortController();
  const promise = fetch('/fonts/Petaluma.zip', { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Failed to load Petaluma.zip (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      if (petaluma?.promise === promise) petaluma.controller = undefined;
      return btoa(binary);
    })
    .catch((error) => {
      if (petaluma?.promise === promise) petaluma = undefined;
      throw error;
    });
  petaluma = { promise, controller };
  return promise;
}

export function restartPendingPetaluma() {
  if (!petaluma?.controller) return;
  const { controller } = petaluma;
  petaluma = undefined;
  controller.abort();
}

export async function prefetchNotation(): Promise<void> {
  await Promise.all([loadNotation(), loadPetaluma()]);
}

export function shouldPrefetchOnIdle(conn?: { saveData?: boolean; effectiveType?: string }): boolean {
  return !conn?.saveData && !['slow-2g', '2g', '3g'].includes(conn?.effectiveType ?? '');
}
