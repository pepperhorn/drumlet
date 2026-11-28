# Handoff: 0001-t11 — Replace the iframe embed (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#replacing-the-iframe-embed) · [Task 11](../plans/0001-drumlet-player.md#task-11-replace-the-iframe-embed) · [Dispatch](2026-11-28-0001-t11-iframe-replace--lead-to-codex.md)
- Branch: `orch/0001-t11-iframe-replace`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-3f7aa9be-0fbe799fa197d659`
- PR: [#45](https://github.com/pepperhorn/drumlet/pull/45) · [Round 2 review](https://github.com/pepperhorn/drumlet/pull/45#pullrequestreview-6095698322)
- Base: `46cac6dc97872e168520ae149d66469b87926eff` (Task 10 merged and Round 3 scope approved)
- Round 3 code: `5471d78`
- Port: 5211 (stopped)

## Outcome and scope

Plain iframe shares use the read-only DrumletPlayer with full chrome. Empty, malformed and unknown-version shares show the player's alert without loading App. Challenge and valid legacy `#dottl=` payloads still use App. Share offers React/npm and iframe snippets with separate copy buttons. The React snippet follows the package README and inserts the current groove's share code.

The production app build injects a guarded, high-priority preload for the hashed App chunk. Vite’s normal import starts the smaller dependencies. The normal route starts the App request while the entry downloads. Embed URLs do not add the link. The plugin leaves the index source, development server, package build and packed host alone.

Round 3 changed the amended dispatch's allowed app build configuration, the entry, the route test, and this return handoff. Task 10 files, the package build, and the ledger are unchanged.

## Startup and request waterfall

Compared gzipped production builds of rebased main and the final branch in headless Chromium. Each route and network profile used five alternating main/branch pairs with fresh contexts, cache off, and external traffic blocked. Time starts at navigation. App time is the first DOM commit of `.drumlet-app`. For the plain v3 embed, main has no player, so its baseline is the legacy App commit. The branch measures the player's ready grid.

| Network | Route | Main median | Branch median | Paired median delta | Main JS request start → end | Branch JS request start → end |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Fast 3G | App | 6,486 ms | 6,424 ms | −28 ms | Entry incl. App 589 → 6,106 ms | Entry 586 → 1,938 ms, App 593 → 6,156 ms |
| Fast 3G | Embed | 6,498 ms | 2,470 ms | −4,016 ms | Entry incl. App 591 → 6,113 ms | Entry 593 → 1,619 ms, EmbedPage 1,650 → 2,304 ms. No App request. |
| 40 ms | App | 1,572 ms | 1,217 ms | −243 ms | Entry incl. App 115 → 770 ms | Entry 104 → 237 ms, App 116 → 606 ms |
| 40 ms | Embed | 3,407 ms | 1,710 ms | −1,697 ms | Entry incl. App 190 → 1,129 ms | Entry 148 → 333 ms, EmbedPage 784 → 859 ms. No App request. |

Fast 3G used 562.5 ms latency and 1.44 Mbps down. The 40 ms profile used 30 Mbps down and ran during rising host load. Its render times are noisy. The request overlap holds on both profiles. On Fast 3G the smaller app dependencies start at 1,961–1,963 ms and finish by 3,154 ms, while App is downloading. The final build meets the +50 ms Fast 3G target. Raw timings and all resource waterfalls are in `/tmp/drumlet-t11-r3-all-measurements.json`. The runner is `/tmp/drumlet-t11-r3-benchmark.mjs`.

## Production output

Compared the production `dist/` with a fresh build of `46cac6d`. All 36 files outside `index.html` and `assets/` are byte-identical. The demo is absent from the app build, as on main.

- `index.html` adds the guarded preload script and updates the generated asset references. The source HTML is unchanged.
- Five hashed assets change names and contents with the new module graph: the entry JS, entry CSS, shared JS chunk, NotationView chunk, and Vite browser-external shim.
- Nine app chunks are new: App, EmbedPage, NotationBoundary, NotationLoading, preload-helper, projectSerializer, stepHelpers, stockRhythms, and v4. The normal preload graph does not include the lazy notation engine chunk.
- A PostCSS comparison found four new rules and no changed or removed rules. The new selectors cover `max-h-[90dvh]`, `min-h-9`, `min-h-dvh`, and `content-start`.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run check:embed-route
npm run build:lib && npm run verify:lib && npm run check:embed
```

```text
Typecheck passed
Lint: 0 errors, 2 existing AuthModal hook warnings
App build passed
Vitest: 21 files, 256 tests passed
check:embed-route: 7 groups passed, including absent and empty share codes
verify:lib: distribution and SSR import passed
check:embed: 15 packed-host checks passed, including 12 unchanged host probes
check:embed: 8 players shared 1 AudioContext, suspended at idle
```

orch-deslop removed the broad dependency preload and kept the App hint. The browser check also records distinct playhead steps instead of polling for one transient step. The final browser gates passed with that change and emitted the same app asset names as the benchmark build.

The app loads acoustic1 from its existing `/samples/` path. EmbedPage does not set `assetBaseUrl`. The browser check uses headless Chromium and verifies buffer starts, not listening quality. GBrain's `projects/drumlet` records the protected-main workflow. The dispatch governs Task 11.

## Return

Outcome: ready for exact-head review. The regenerated HTML restores the normal route’s parallel fetch and keeps App off plain and invalid embeds. No open questions.
