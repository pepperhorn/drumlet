# 0003 Mobile notation fixes — Implementation Plan

> Single task (key `0003`). Spec: `docs/specs/0003-mobile-notation.md`. Verify: `npm run typecheck && npm run lint && npm run build && npm test`.

**Owns:** `src/components/NotationView.tsx`, `src/components/PageTabs.tsx` (notation toggle only), `src/App.tsx` (lazy import, Suspense fallback, prefetch hook only), `src/notation/renderStaff.ts` (scale option only if needed), `src/components/notationPrefetch.ts` (new), `src/components/NotationLoading.tsx` (new), tests next to them, `public/serve.json` (new), `Dockerfile` (only if serve needs a flag to read serve.json).
**Depends on:** nothing. Runs before 0001-t6 (same files).

## Steps
- [ ] `notationPrefetch.ts`: `prefetchNotation(): Promise<void>` (idempotent; imports the chunk + warms Petaluma via the existing loader) and `shouldPrefetchOnIdle(conn?: {saveData?: boolean; effectiveType?: string}): boolean`. Tests: saveData → false; `3g` → false; `4g`/undefined → true; prefetch called twice imports once.
- [ ] `NotationLoading.tsx` (`phase: 'engine' | 'render' | 'slow' | 'error'`, `onRetry?`), reduced-motion aware; used as Suspense fallback and by NotationView while rendering. Test: each phase's text; Retry calls handler.
- [ ] NotationView: render phase shows `NotationLoading phase="render"`; 15 s → `slow`; catch → `error` + Retry re-runs render.
- [ ] Fit to width: `pickBarsPerLine(containerWidth: number, barWidthPx: number, leftMarginPx: number): { bars: 1|2|3|4; scale: number }` pure helper + tests (e.g. 360 px phone → 1 bar, scale ≤ 1; 1280 px → 4). Wire with ResizeObserver; "Auto" chip default.
- [ ] Toggle icon: inline SVG + label/aria per spec.
- [ ] `public/serve.json` cache headers; confirm with `npx serve -s dist` + `curl -I`.
- [ ] Manual check at 360×800 and 412×900 (headless Chromium OK, throttle network to "Fast 3G" for the loading states): loading panel visible throughout, 4-bar stock groove fits without horizontal scroll at Auto, icon renders before notation ever loads. Paste screenshots paths in the return handoff.
