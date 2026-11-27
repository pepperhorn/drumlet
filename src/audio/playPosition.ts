// SPDX-License-Identifier: MIT
export type PlayMode = 'page' | 'groove';

type Position = { page: number; step: number };

export function advancePosition(pos: Position, s: {
  pages: number;
  stepsPerPage: number;
  mode: PlayMode;
  chain: boolean;
  loop: boolean;
}): Position | null {
  if (pos.step + 1 < s.stepsPerPage) return { page: pos.page, step: pos.step + 1 };

  if (s.mode === 'page' && !s.chain) return { page: pos.page, step: 0 };
  if (pos.page + 1 < s.pages) return { page: pos.page + 1, step: 0 };
  return s.mode === 'groove' && !s.loop ? null : { page: 0, step: 0 };
}

export function toGlobalStep(page: number, step: number, stepsPerPage: number): number {
  return page * stepsPerPage + step;
}

export function fromGlobalStep(g: number, stepsPerPage: number): Position {
  return { page: Math.floor(g / stepsPerPage), step: g % stepsPerPage };
}
