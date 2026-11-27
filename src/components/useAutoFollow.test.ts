import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAutoFollow } from './useAutoFollow.js';

function setup(targetX = 50, isPlaying = true) {
  const { container } = render(null);
  const scrollEl = container;
  Object.defineProperty(scrollEl, 'clientWidth', { value: 200 });

  const hook = renderHook(
    ({ targetX, isPlaying }) => useAutoFollow(scrollEl, targetX, { isPlaying }),
    { initialProps: { targetX, isPlaying } },
  );
  return { scrollEl, ...hook };
}

describe('useAutoFollow', () => {
  it('scrolls past the right margin, pauses on horizontal wheel, and resumes at the latest target', () => {
    const { scrollEl, result, rerender } = setup();
    rerender({ targetX: 180, isPlaying: true });
    expect(scrollEl.scrollLeft).toBe(30);
    fireEvent.scroll(scrollEl);
    expect(result.current.following).toBe(true);

    fireEvent.wheel(scrollEl, { deltaX: -20, deltaY: 10 });
    expect(result.current.following).toBe(false);
    rerender({ targetX: 220, isPlaying: true });
    expect(scrollEl.scrollLeft).toBe(30);

    act(() => result.current.resume());
    expect(result.current.following).toBe(true);
    expect(scrollEl.scrollLeft).toBe(70);
  });

  it.each([
    { deltaX: 0, deltaY: 20, shiftKey: false },
    { deltaX: 10, deltaY: -20, shiftKey: false },
    { deltaX: 20, deltaY: -20, shiftKey: false },
    { deltaX: 0, deltaY: 0, shiftKey: true },
  ])('keeps following after wheel input %j', (wheel) => {
    const { scrollEl, result, rerender } = setup();
    fireEvent.wheel(scrollEl, wheel);
    expect(result.current.following).toBe(true);

    rerender({ targetX: 180, isPlaying: true });
    expect(scrollEl.scrollLeft).toBe(30);
  });

  it('pauses on Shift plus vertical wheel', () => {
    const { scrollEl, result } = setup();
    fireEvent.wheel(scrollEl, { deltaY: -20, shiftKey: true });
    expect(result.current.following).toBe(false);
  });

  it('keeps following through a tap, pauses on a drag, and re-arms on the next play', () => {
    const { scrollEl, result, rerender } = setup(180);
    fireEvent.pointerDown(scrollEl, { pointerId: 1, clientX: 10 });
    expect(result.current.following).toBe(true);
    fireEvent.pointerUp(scrollEl, { pointerId: 1, clientX: 10 });
    expect(result.current.following).toBe(true);

    fireEvent.pointerDown(scrollEl, { pointerId: 2, clientX: 10 });
    fireEvent.pointerMove(scrollEl, { pointerId: 2, clientX: 12 });
    expect(result.current.following).toBe(true);
    fireEvent.pointerMove(scrollEl, { pointerId: 2, clientX: 30 });
    fireEvent.pointerUp(scrollEl, { pointerId: 2, clientX: 30 });
    expect(result.current.following).toBe(false);

    rerender({ targetX: 240, isPlaying: false });
    expect(result.current.following).toBe(false);
    expect(scrollEl.scrollLeft).toBe(30);

    rerender({ targetX: 240, isPlaying: true });
    expect(result.current.following).toBe(true);
    expect(scrollEl.scrollLeft).toBe(90);
  });

  it('pauses on an unowned scroll and follows a loop back to the left', () => {
    const { scrollEl, result, rerender } = setup(400);
    scrollEl.scrollLeft = 270;
    fireEvent.scroll(scrollEl);
    expect(result.current.following).toBe(false);

    rerender({ targetX: 70, isPlaying: true });
    expect(scrollEl.scrollLeft).toBe(270);

    act(() => result.current.resume());
    expect(scrollEl.scrollLeft).toBe(20);
  });

  it('uses the supplied margin and does not scroll while stopped', () => {
    const scrollEl = document.createElement('div');
    Object.defineProperty(scrollEl, 'clientWidth', { value: 200 });
    const { rerender } = renderHook(
      ({ isPlaying }) => useAutoFollow(scrollEl, 185, { isPlaying, margin: 20 }),
      { initialProps: { isPlaying: false } },
    );
    expect(scrollEl.scrollLeft).toBe(0);
    rerender({ isPlaying: true });
    expect(scrollEl.scrollLeft).toBe(5);
  });
});
