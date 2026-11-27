import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.js';
import { createInitialState, type SequencerState } from './state/sequencerReducer.js';
import { readViewMode, writeViewMode } from './state/viewMode.js';

const { transport } = vi.hoisted(() => ({
  transport: {
    state: undefined as SequencerState | undefined,
    position: { isPlaying: false, currentStep: -1, currentPlayPage: -1, currentGlobalStep: -1 },
    seek: vi.fn(),
    toggle: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('./audio/useTransport.js', () => ({
  useTransport: (ref: { current: SequencerState }) => {
    transport.state = ref.current;
    return { ...transport, ...transport.position };
  },
}));

vi.mock('./components/Grid.js', () => ({
  default: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="paged-grid" data-step={currentStep} />
  ),
}));

vi.mock('./components/Library.js', () => ({ default: () => null }));

vi.mock('./components/NotationBoundary.js', () => ({
  default: ({ layout, currentGlobalStep }: { layout: string; currentGlobalStep: number }) => (
    <div data-testid="notation" data-layout={layout} data-step={currentGlobalStep} />
  ),
}));

vi.mock('./components/notationPrefetch.js', () => ({
  prefetchNotation: async () => undefined,
  shouldPrefetchOnIdle: () => false,
}));

function press(name: string) {
  fireEvent.click(document.querySelector(`button[aria-label="${name}"]`) ?? screen.getByText(name, { selector: 'button' }));
}

beforeEach(() => {
  localStorage.clear();
  transport.position = { isPlaying: false, currentStep: -1, currentPlayPage: -1, currentGlobalStep: -1 };
  const state = createInitialState();
  state.pages[0]!.tracks = state.pages[0]!.tracks.slice(0, 1);
  state.pages.push({ ...structuredClone(state.pages[0]!), id: 'second-bar' });
  localStorage.setItem('drumlet-state-v2', JSON.stringify(state));
});

describe('view preference', () => {
  it('defaults to Paged, accepts both modes, and ignores invalid or inaccessible storage', () => {
    expect(readViewMode()).toBe('paged');
    writeViewMode('endless');
    expect(readViewMode()).toBe('endless');
    writeViewMode('paged');
    expect(readViewMode()).toBe('paged');
    localStorage.setItem('drumlet-view-mode', 'unknown');
    expect(readViewMode()).toBe('paged');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readViewMode()).toBe('paged');
    expect(() => writeViewMode('endless')).not.toThrow();
  });
});

describe('App view mode', { timeout: 30_000 }, () => {
  it('wires playback and loop independently of chain mode and restores Endless on remount', () => {
    const app = render(<App />);
    expect(transport.state?.playMode).toBe('page');
    press('Endless');
    expect(transport.state?.playMode).toBe('groove');
    expect(localStorage.getItem('drumlet-view-mode')).toBe('endless');
    const chainMode = transport.state?.chainMode;
    const loopButtons = document.querySelectorAll('button[aria-label="Loop groove"]');
    expect(loopButtons).toHaveLength(2);
    for (const button of loopButtons) expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(loopButtons[0]!);
    expect(transport.state).toMatchObject({ playMode: 'groove', loopGroove: false, chainMode });
    for (const button of loopButtons) expect(button.getAttribute('aria-pressed')).toBe('false');
    app.unmount();

    render(<App />);
    expect(screen.getByText('Endless', { selector: 'button' }).getAttribute('aria-pressed')).toBe('true');
    expect(transport.state?.playMode).toBe('groove');
    press('Paged');
    expect(transport.state?.playMode).toBe('page');
    expect(document.querySelector('button[aria-label="Loop groove"]')).toBeNull();
    press(chainMode ? 'Chain mode' : 'Loop mode');
    expect(transport.state?.chainMode).toBe(!chainMode);
  });

  it('edits the clicked page and undoes the edit without changing the view preference', () => {
    const { container } = render(<App />);
    press('Endless');
    const before = [0, 1].map((page) => transport.state?.pages[page]?.tracks[0]?.steps[0]);
    const pad = container.querySelector<HTMLButtonElement>(
      `.endless-track-row[data-track-index="0"] [data-global-step="${transport.state?.stepsPerPage}"] .step-cell`,
    );
    expect(pad).not.toBeNull();
    fireEvent.click(pad!);
    expect(transport.state?.pages[0]?.tracks[0]?.steps[0]).toEqual(before[0]);
    expect(transport.state?.pages[1]?.tracks[0]?.steps[0]).not.toEqual(before[1]);
    press('Undo');
    expect(transport.state?.pages[1]?.tracks[0]?.steps[0]).toEqual(before[1]);
    expect(transport.state?.playMode).toBe('groove');
    expect(container.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')?.disabled).toBe(true);
  });

  it('switches both notation layouts and hides playheads while stopped or on a different grid page', () => {
    const app = render(<App />);
    press('Notation');
    const score = screen.getByTestId('notation');
    expect(score.dataset.layout).toBe('wrapped');
    press('Endless');
    expect(score.dataset.layout).toBe('endless');
    const globalStep = transport.state!.stepsPerPage + 1;
    transport.position = { isPlaying: true, currentStep: 1, currentPlayPage: 1, currentGlobalStep: globalStep };
    app.rerender(<App />);
    expect(score.dataset.step).toBe(String(globalStep));
    press('Paged');
    expect(score.dataset.layout).toBe('wrapped');
    expect(transport.state?.currentPageIndex).toBe(1);
    press('Switch to Grid Editor');
    expect(screen.getByTestId('paged-grid').dataset.step).toBe('1');
    transport.position.currentPlayPage = 0;
    app.rerender(<App />);
    expect(screen.getByTestId('paged-grid').dataset.step).toBe('-1');

    transport.position.isPlaying = false;
    press('Endless');
    expect(app.container.querySelector('.playhead-active')).toBeNull();
    press('Notation');
    expect(screen.getByTestId('notation').dataset.step).toBe('-1');
  });
});
