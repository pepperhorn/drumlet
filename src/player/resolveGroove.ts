// SPDX-License-Identifier: MIT
import { normalizeSequencerState } from '../state/normalizeSequencerState.js';
import { deserializeProject, type DottlProject } from '../state/projectSerializer.js';
import { createInitialState, type SequencerState } from '../state/sequencerReducer.js';
import { decodePayload } from '../state/shareCodec.js';

export type GrooveInput = string | DottlProject | { stock: string } | { share: string };

export class GrooveError extends Error {
  constructor(
    public readonly code: 'not-found' | 'invalid' | 'empty',
    message: string = code,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'GrooveError';
  }
}

type StockRhythms = typeof import('../state/stockRhythms.js');
let stockRhythms: StockRhythms | undefined;

export async function loadStockRhythms(): Promise<StockRhythms> {
  try {
    stockRhythms ??= await import('../state/stockRhythms.js');
    return stockRhythms;
  } catch (cause) {
    throw new GrooveError('invalid', 'Could not load the stock rhythm catalog.', { cause });
  }
}

function requireTracks(pages: SequencerState['pages'] | undefined): void {
  if (!pages?.length || pages.every((page) => page.tracks.length === 0)) {
    throw new GrooveError('empty', 'The groove has no pages or tracks.');
  }
}

function fromShare(input: string): SequencerState {
  const code = /#s=([^&]*)/.exec(input)?.[1] ?? input;
  const payload = code ? decodePayload(code) : null;
  if (!payload) throw new GrooveError('invalid', 'Invalid groove share code.');
  return payload.state;
}

function fromProject(project: DottlProject): SequencerState {
  try {
    if (!Array.isArray(project.layers)) {
      throw new GrooveError('invalid', 'Invalid .dottl groove.');
    }
    const state = deserializeProject(project);
    requireTracks(state.pages);
    const normalized = normalizeSequencerState(state);
    if (!normalized) throw new GrooveError('invalid', 'Invalid .dottl groove.');
    return normalized;
  } catch (cause) {
    if (cause instanceof GrooveError) throw cause;
    throw new GrooveError('invalid', 'Invalid .dottl groove.', { cause });
  }
}

function isStockInput(input: unknown): input is { stock: unknown } {
  return input !== null && typeof input === 'object' && 'stock' in input;
}

function fromStock(id: string): Partial<SequencerState> | undefined {
  if (!stockRhythms) return;
  const rhythm = stockRhythms.findStockRhythm(id);
  if (rhythm) return stockRhythms.stockRhythmToState(rhythm);
}

/** For stock IDs, preload with loadStockRhythms or call resolveGrooveAsync. */
export function resolveGroove(input: GrooveInput): SequencerState {
  let state: Partial<SequencerState>;
  if (typeof input === 'string') {
    state = fromStock(input) ?? fromShare(input);
  } else if (isStockInput(input)) {
    if (typeof input.stock !== 'string' || !input.stock) {
      throw new GrooveError('invalid', 'Expected a stock rhythm ID.');
    }
    if (!stockRhythms) {
      throw new GrooveError('not-found', 'Stock rhythms are not loaded. Use resolveGrooveAsync for stock IDs.');
    }
    const resolved = fromStock(input.stock);
    if (!resolved) throw new GrooveError('not-found', 'Stock rhythm not found.');
    state = resolved;
  } else if (input && typeof input === 'object') {
    if ('share' in input) {
      if (typeof input.share !== 'string') throw new GrooveError('invalid', 'Expected a groove share code.');
      state = fromShare(input.share);
    } else {
      state = fromProject(input);
    }
  } else {
    throw new GrooveError('invalid', 'Expected a groove input.');
  }

  requireTracks(state.pages);
  return { ...createInitialState(), ...state };
}

export async function resolveGrooveAsync(input: GrooveInput): Promise<SequencerState> {
  // The stock catalog generator restricts IDs to this grammar.
  const stockId = isStockInput(input) ? input.stock : input;
  if (typeof stockId === 'string' && /^[a-z0-9-]+$/.test(stockId)) {
    await loadStockRhythms();
  }
  return resolveGroove(input);
}
