# 0003 — Mobile notation: load feedback, fit to width, toggle icon

Status: approved (lead, from owner bug report with phone screenshots) · 2026-11-27

## Problem (owner report, drumlet.app on Android Chrome, 4-bar stock groove)
1. Tapping the notation toggle "appears to freeze": "Loading notation…" text, then an empty card for several seconds, no animation or info.
   - Measured: `NotationView-*.js` is **7.9 MB (2.26 MB brotli/gzip)** because `verovio/wasm` inlines the WASM; 5.6 s to download from a fast server link, then parse + WASM compile on the phone. Petaluma.zip (535 KB) also loads on first render. `serve` sends no `Cache-Control` for `/assets/*`, so returning visitors revalidate.
2. Once rendered, the score is wider than the phone: "Bars/line" defaults to 2 in portrait regardless of container width, so the system overflows the card.
3. The grid→notation toggle icon is a Petaluma glyph (`PageTabs.tsx:161`); the font isn't loaded until notation renders, so it shows as a blob.

## Goals
- Visible, honest loading state from the tap until the score is on screen.
- Notation is usually ready before the user taps.
- Score fits the card width by default on any screen; the user can still pick bars/line.
- A clear notation icon that never depends on a lazily-loaded font.

## Non-goals
- Replacing verovio, or the endless notation layout (that's 0001-t6, which runs after this).

## Decisions (lead)
- **Loading state**: one `notation-loading` panel used for both the lazy chunk (Suspense fallback) and the render phase: animated indicator (respect `prefers-reduced-motion`) + "Loading notation engine…" then "Rendering score…". Never an empty card. After 15 s, show "Still loading — slow connection?" with a Retry button; on error show the message + Retry.
- **Prefetch**: after first paint, on idle, start `import('./components/NotationView')` and the Petaluma fetch — skipped when `navigator.connection?.saveData` is true or `effectiveType` is `slow-2g`/`2g`/`3g`. Also start both on `pointerdown`/`focus` of the toggle.
- **Caching**: ship `public/serve.json` so `serve` sends `Cache-Control: public, max-age=31536000, immutable` for `/assets/**` (hashed files) and `no-cache` for `index.html`. Keep the SPA rewrite `serve -s` relies on.
- **Fit to width**: new default "Auto" bars/line = the largest of 1–4 that fits the scroll container's width at the current Size (measured with a ResizeObserver; re-render on width change, debounced). If even 1 bar doesn't fit, render 1 bar/line scaled down to fit (min scale 0.6, then allow horizontal scroll). Manual 2/3/4/∞ still override; add an "Auto" chip that is selected by default. Score left margin and title must not clip on 360 px.
- **Icon**: replace the Petaluma glyph with an inline SVG (two beamed eighth notes, `currentColor`, 18 px mobile / 15 px desktop) with the label "Notation" (visible ≥ md, `aria-label` always). The grid icon shown while in notation stays as is.
