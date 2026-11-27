// SPDX-License-Identifier: MIT
let owner: { id: string; stop: () => void } | undefined;

export function claimPlayback(id: string, stop: () => void): () => void {
  const previous = owner;
  const claim = { id, stop };
  owner = claim;
  const release = () => {
    if (owner === claim) owner = undefined;
  };
  try {
    if (previous && previous.id !== id) previous.stop();
  } catch (error) {
    release();
    throw error;
  }
  return release;
}
