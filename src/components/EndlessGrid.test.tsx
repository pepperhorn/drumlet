import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createNewPatternState, type Page } from '../state/sequencerReducer.js';
import EndlessGrid from './EndlessGrid.js';

function fixture() {
  const state = createNewPatternState();
  const tracks = state.pages[0]!.tracks.slice(0, 2);
  const pages: Page[] = ['Intro', 'Verse', 'Outro'].map((name, index) => ({
    id: String(index),
    name,
    tracks: structuredClone(tracks),
    sectionHeadings: [],
  }));
  pages[2]!.sectionHeadings.push({ id: 'fill', step: 0, label: 'Fill' });

  return {
    pages,
    stepsPerPage: 16,
    beatsPerBar: 4,
    noteValue: '1/4' as const,
    stepValue: '1/16' as const,
    currentGlobalStep: -1,
    isPlaying: false,
    editable: true,
    onToggleStep: vi.fn(),
    onSeek: vi.fn(),
  };
}

describe('EndlessGrid', () => {
  it('renders 96 cells, one label per track, and a named join between pages', () => {
    const props = fixture();
    const { container } = render(<EndlessGrid {...props} />);

    expect(container.querySelectorAll('.step-cell')).toHaveLength(96);
    expect(container.querySelectorAll('.endless-track-label')).toHaveLength(2);
    expect(Array.from(container.querySelectorAll('.endless-page-join'), join => join.textContent))
      .toEqual(['Verse', 'Fill']);
    expect(container.querySelector('.playhead-active')).toBeNull();
  });

  it('toggles page 1, track 1, step 4 when editing the second track at step 20', () => {
    const props = fixture();
    const { container } = render(<EndlessGrid {...props} />);

    const cells = container.querySelectorAll('.endless-track-row')[1]!.querySelectorAll('.step-cell');
    fireEvent.click(cells[20]!);
    expect(props.onToggleStep).toHaveBeenCalledExactlyOnceWith(1, 1, 4);
    expect(props.onSeek).not.toHaveBeenCalled();
  });

  it('seeks to global step 20 from the same cell when read-only', () => {
    const props = fixture();
    const { container } = render(<EndlessGrid {...props} editable={false} />);

    const cells = container.querySelectorAll('.endless-track-row')[1]!.querySelectorAll('.step-cell');
    fireEvent.click(cells[20]!);
    expect(props.onSeek).toHaveBeenCalledExactlyOnceWith(20);
    expect(props.onToggleStep).not.toHaveBeenCalled();
  });

  it('highlights the global step on both tracks and keeps split pads', () => {
    const props = fixture();
    props.pages[1]!.tracks[1]!.steps[4] = [1, 0, 3];
    const { container } = render(<EndlessGrid {...props} currentGlobalStep={20} isPlaying />);
    const active = Array.from(container.querySelectorAll('.step-cell.playhead-active'));
    expect(active.map(cell => cell.closest('.endless-step')?.getAttribute('data-global-step')))
      .toEqual(['20', '20']);
    expect(active[1]!.querySelectorAll('.split-segment')).toHaveLength(3);
  });

  it('keeps the moving playhead in view until manual input, then follows again after a playhead tap', () => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const step = this.dataset.globalStep;
      if (step === undefined) return new DOMRect();
      const scrollEl = this.closest('.endless-grid')!;
      return new DOMRect(100 + Number(step) * 40 - scrollEl.scrollLeft, 0, 40, 40);
    });

    const props = fixture();
    const { container, rerender } = render(
      <EndlessGrid {...props} currentGlobalStep={5} isPlaying editable={false} />,
    );
    const scrollEl = container.querySelector('.endless-grid')!;
    expect(scrollEl.scrollLeft).toBe(95);
    fireEvent.wheel(scrollEl);

    rerender(<EndlessGrid {...props} currentGlobalStep={6} isPlaying editable={false} />);
    expect(scrollEl.scrollLeft).toBe(95);
    const playhead = container.querySelector('.playhead-active')!;
    fireEvent.pointerDown(playhead);
    fireEvent.click(playhead);
    expect(scrollEl.scrollLeft).toBe(135);
  });
});
