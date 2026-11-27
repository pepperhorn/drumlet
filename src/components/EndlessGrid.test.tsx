import { fireEvent, render } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

function mockGridLayout() {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const step = this.dataset.globalStep;
    if (step === undefined) return new DOMRect();
    const scrollEl = this.closest('.endless-grid')!;
    return new DOMRect(100 + Number(step) * 40 - scrollEl.scrollLeft, 0, 40, 40);
  });
}

describe('EndlessGrid', () => {
  afterEach(() => vi.restoreAllMocks());

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

  it('pauses following on a horizontal wheel and resumes after a playhead tap', () => {
    mockGridLayout();

    const props = fixture();
    const { container, rerender } = render(
      <EndlessGrid {...props} currentGlobalStep={5} isPlaying editable={false} />,
    );
    const scrollEl = container.querySelector('.endless-grid')!;
    expect(scrollEl.scrollLeft).toBe(95);
    fireEvent.wheel(scrollEl, { deltaX: 20, deltaY: 5 });

    rerender(<EndlessGrid {...props} currentGlobalStep={6} isPlaying editable={false} />);
    expect(scrollEl.scrollLeft).toBe(95);
    const playhead = container.querySelector('.playhead-active')!;
    fireEvent.pointerDown(playhead);
    fireEvent.pointerUp(playhead);
    fireEvent.click(playhead, { detail: 1 });
    expect(scrollEl.scrollLeft).toBe(135);
  });

  it('keeps following the playhead after a vertical wheel', () => {
    mockGridLayout();

    const props = fixture();
    const { container, rerender } = render(
      <EndlessGrid {...props} currentGlobalStep={5} isPlaying editable={false} />,
    );
    const scrollEl = container.querySelector('.endless-grid')!;
    expect(scrollEl.scrollLeft).toBe(95);
    fireEvent.wheel(scrollEl, { deltaY: 20 });

    rerender(<EndlessGrid {...props} currentGlobalStep={6} isPlaying editable={false} />);
    expect(scrollEl.scrollLeft).toBe(135);
  });

  it('commits once when the playhead advances on a 1024-pad groove', () => {
    mockGridLayout();
    const props = fixture();
    const tracks = Array.from({ length: 8 }, (_, i) => ({ ...props.pages[0]!.tracks[0]!, id: String(i) }));
    const pages = Array.from({ length: 8 }, (_, i) => ({ ...props.pages[0]!, tracks, id: String(i) }));
    const onRender = vi.fn();
    const tree = (step: number) => (
      <Profiler id="endless" onRender={onRender}>
        <EndlessGrid {...props} pages={pages} currentGlobalStep={step} isPlaying />
      </Profiler>
    );
    const { rerender } = render(tree(15));
    onRender.mockClear();

    rerender(tree(16));
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('keeps following after a non-playhead click (editable=%s)', editable => {
    mockGridLayout();
    const props = fixture();
    const { container, rerender } = render(<EndlessGrid {...props} isPlaying editable={editable} currentGlobalStep={0} />);
    const cells = container.querySelectorAll('.endless-track-row')[0]!.querySelectorAll('.step-cell');
    fireEvent.pointerDown(cells[2]!);
    fireEvent.pointerUp(cells[2]!);
    fireEvent.click(cells[2]!);
    if (editable) expect(props.onToggleStep).toHaveBeenCalledExactlyOnceWith(0, 0, 2);
    else expect(props.onSeek).toHaveBeenCalledExactlyOnceWith(2);

    rerender(<EndlessGrid {...props} isPlaying editable={editable} currentGlobalStep={5} />);
    expect(container.querySelector('.endless-grid')!.scrollLeft).toBe(95);
  });

  it('does not treat a drag ending over the playhead as a tap', () => {
    mockGridLayout();
    const props = fixture();
    const renderAt = (step: number) => <EndlessGrid {...props} currentGlobalStep={step} isPlaying editable={false} />;
    const { container, rerender } = render(renderAt(5));
    const scroller = container.querySelector('.endless-grid')!;
    const playhead = container.querySelector('.playhead-active')!;
    fireEvent.pointerDown(playhead, { pointerId: 1, clientX: 30 });
    fireEvent.pointerMove(playhead, { pointerId: 1, clientX: 40 });
    fireEvent.pointerUp(playhead, { pointerId: 1, clientX: 40 });
    fireEvent.click(playhead, { detail: 1 });

    rerender(renderAt(6));
    expect(props.onSeek).not.toHaveBeenCalled();
    expect(scroller.scrollLeft).toBe(95);
  });

  it('allows Tab to leave a track row and arrows to advance to the next page', () => {
    const { container } = render(<EndlessGrid {...fixture()} />);
    const rows = container.querySelectorAll('.endless-track-row');
    const pads = rows[0]!.querySelectorAll<HTMLButtonElement>('.step-cell');
    expect(container.querySelectorAll('.step-cell[tabindex="0"]')).toHaveLength(2);
    pads[15]!.focus();
    fireEvent.keyDown(pads[15]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(pads[16]);
    expect(pads[15]!.tabIndex).toBe(-1);
    expect(pads[16]!.tabIndex).toBe(0);
    expect(rows[1]!.querySelector('.step-cell[tabindex="0"]')).toBe(rows[1]!.querySelector('.step-cell'));
  });
});
