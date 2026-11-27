// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef, useState } from 'react';

function scrollToTarget(element: HTMLElement, targetX: number, margin?: number): number | null {
  const width = element.clientWidth;
  if (!width) return null;

  const inset = Math.min(width / 2, Math.max(0, margin ?? width / 4));
  const left = element.scrollLeft;
  const minLeft = targetX - width + inset;
  const maxLeft = targetX - inset;
  const next = Math.max(0, Math.min(maxLeft, Math.max(minLeft, left)));
  if (next === left) return null;

  element.scrollLeft = next;
  // Read back the offset because the browser may clamp or round it.
  return element.scrollLeft !== left ? element.scrollLeft : null;
}

export function useAutoFollow(
  scrollEl: HTMLElement | null,
  targetX: number | null,
  { isPlaying, margin }: { isPlaying: boolean; margin?: number },
): { following: boolean; resume(): void } {
  const [following, setFollowing] = useState(true);
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  const expectedScrollLeft = useRef<number | null>(null);

  if (wasPlaying !== isPlaying) {
    setWasPlaying(isPlaying);
    if (isPlaying) setFollowing(true);
  }

  const resume = useCallback(() => setFollowing(true), []);

  useEffect(() => {
    if (!scrollEl) return;

    const pause = () => setFollowing(false);
    const onScroll = () => {
      const ownScroll = scrollEl.scrollLeft === expectedScrollLeft.current;
      expectedScrollLeft.current = null;
      if (!ownScroll) pause();
    };

    scrollEl.addEventListener('wheel', pause, { passive: true });
    scrollEl.addEventListener('pointerdown', pause, { passive: true });
    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener('wheel', pause);
      scrollEl.removeEventListener('pointerdown', pause);
      scrollEl.removeEventListener('scroll', onScroll);
      expectedScrollLeft.current = null;
    };
  }, [scrollEl]);

  useEffect(() => {
    if (!scrollEl || targetX === null || !isPlaying || !following) return;

    const followTarget = () => {
      const offset = scrollToTarget(scrollEl, targetX, margin);
      if (offset !== null) expectedScrollLeft.current = offset;
    };

    followTarget();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(followTarget);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [scrollEl, targetX, isPlaying, following, margin]);

  return { following, resume };
}
