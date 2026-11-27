// SPDX-License-Identifier: MIT
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 6;
type FollowTarget = { x: number; margin?: number };

function scrollToTarget(element: HTMLElement, { x, margin }: FollowTarget): number | null {
  const width = element.clientWidth;
  if (!width) return null;

  const inset = Math.min(width / 2, Math.max(0, margin ?? width / 4));
  const left = element.scrollLeft;
  const minLeft = x - width + inset;
  const maxLeft = x - inset;
  const next = Math.max(0, Math.min(maxLeft, Math.max(minLeft, left)));
  if (next === left) return null;

  element.scrollLeft = next;
  // Read back the offset because the browser may clamp or round it.
  const actual = element.scrollLeft;
  return actual !== left ? actual : null;
}

export function useMeasuredAutoFollow(
  scrollEl: HTMLElement | null,
  isPlaying: boolean,
  getTarget: (element: HTMLElement) => FollowTarget | null,
) {
  const [following, setFollowing] = useState(true);
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  const expectedScrollLeft = useRef<number | null>(null);
  const followNow = useRef<(() => void) | null>(null);
  const followingRef = useRef(following);
  const dragged = useRef(false);

  if (wasPlaying !== isPlaying) {
    setWasPlaying(isPlaying);
    if (isPlaying) setFollowing(true);
  }

  const resume = useCallback(() => setFollowing(true), []);
  const isTap = useCallback((clickDetail: number) => clickDetail === 0 || !dragged.current, []);

  useLayoutEffect(() => {
    if (!scrollEl) return;

    const doc = scrollEl.ownerDocument;
    let pointer: { id: number; x: number; y: number; wasFollowing: boolean } | null = null;
    const pause = () => {
      followingRef.current = false;
      setFollowing(false);
    };
    const pointerDown = (event: PointerEvent) => {
      dragged.current = false;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, wasFollowing: followingRef.current };
    };
    const pointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId || dragged.current) return;
      if (Math.max(Math.abs(event.clientX - pointer.x), Math.abs(event.clientY - pointer.y)) < DRAG_THRESHOLD) return;
      dragged.current = true;
      if (pointer.wasFollowing || followingRef.current) pause();
    };
    const pointerEnd = (event: PointerEvent) => {
      if (pointer?.id === event.pointerId) pointer = null;
    };
    const onScroll = () => {
      const ownScroll = scrollEl.scrollLeft === expectedScrollLeft.current;
      expectedScrollLeft.current = null;
      if (ownScroll) return;
      if (pointer) dragged.current = true;
      pause();
    };

    scrollEl.addEventListener('wheel', pause, { passive: true });
    scrollEl.addEventListener('pointerdown', pointerDown, { passive: true });
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    doc.addEventListener('pointermove', pointerMove, { passive: true });
    doc.addEventListener('pointerup', pointerEnd, { passive: true });
    doc.addEventListener('pointercancel', pointerEnd, { passive: true });

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => followNow.current?.());
    observer?.observe(scrollEl);
    if (scrollEl.firstElementChild) observer?.observe(scrollEl.firstElementChild);

    return () => {
      scrollEl.removeEventListener('wheel', pause);
      scrollEl.removeEventListener('pointerdown', pointerDown);
      scrollEl.removeEventListener('scroll', onScroll);
      doc.removeEventListener('pointermove', pointerMove);
      doc.removeEventListener('pointerup', pointerEnd);
      doc.removeEventListener('pointercancel', pointerEnd);
      observer?.disconnect();
      expectedScrollLeft.current = null;
      dragged.current = false;
    };
  }, [scrollEl]);

  useLayoutEffect(() => {
    followingRef.current = following;
    followNow.current = () => {
      if (!scrollEl || !isPlaying || !followingRef.current) return;
      const target = getTarget(scrollEl);
      if (!target) return;
      const offset = scrollToTarget(scrollEl, target);
      if (offset !== null) expectedScrollLeft.current = offset;
    };
    followNow.current();
  }, [scrollEl, isPlaying, following, getTarget]);

  return { following, resume, isTap };
}

export function useAutoFollow(
  scrollEl: HTMLElement | null,
  targetX: number | null,
  { isPlaying, margin }: { isPlaying: boolean; margin?: number },
): { following: boolean; resume(): void } {
  const getTarget = useCallback(() => targetX === null ? null : { x: targetX, margin }, [targetX, margin]);
  const { following, resume } = useMeasuredAutoFollow(scrollEl, isPlaying, getTarget);
  return { following, resume };
}
