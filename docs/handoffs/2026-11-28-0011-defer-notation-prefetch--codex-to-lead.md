# Handoff 0011 — Defer notation prefetch (Codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: [0011 / S30](../wip/LEDGER.md) · [Dispatch and acknowledgement](2026-11-28-0011-defer-notation-prefetch--lead-to-codex.md)
- Branch: `orch/0011-defer-notation-prefetch`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-9832d393-f85f724165292ec5`
- Base: `aea44ca` · Ack: `3bac160` · Code: `75f3577`
- PR: draft against `main`. The PR body links this handoff.

## Goal and scope

On the full app, wait until React mounts and either the first pointerdown/keydown arrives or five seconds have elapsed since window load. Queue the background notation chunk and Petaluma font at idle. Keep the connection guard, immediate notation-toggle warmup, and shared in-flight requests.

Only the prefetch import/effect in `src/App.tsx`, `src/components/notationPrefetch.ts`, and `src/components/notationPrefetch.test.ts` changed, plus the two handoffs. Player behavior, markup, and embed routes did not change.

## Verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run check:embed-route
npm run build:lib
PLAYWRIGHT_CORE_PATH=/home/shaun/piano-invaders/node_modules/playwright-core npm run check:embed
```

```text
eslint: 0 errors, 2 existing AuthModal.tsx warnings
vite: 217 modules transformed, built in 6.13s
Test Files  21 passed (21)
     Tests  264 passed (264)
check:embed-route: 7 PASS groups
check:embed: 15 packed-host checks, 12 unchanged host probes, 8 players shared one idle AudioContext
Chromium: 4g keydown warms early. Save Data and 3g skip gesture and timer warmup.
Chromium: the notation toggle still warms on pointerdown with those connection settings.
```

The deslop pass removed cancellation closures and reused the timer ID for the non-idle fallback. The full verification command passed again.

## Decisions made

- Listen in window capture so the first gesture counts even if a child control stops propagation. Cancel the unused trigger and any queued work on unmount.
- If the app mounts after load, use the navigation entry to count only the remaining delay. If navigation timing is unavailable, wait five seconds from mount.
- GBrain [default:projects/drumlet] records the earlier App modulepreload fix. The benchmark uses the same Fast 3G rate and latency while checking that network throttling leaves the reported connection at 4g.

## Fast 3G waterfall

Chromium loaded `/` from gzip-served production builds in cold contexts, with no gestures. Baseline was `origin/main` at `3d130fc`. The browser throttled actual requests to 562.5 ms latency, 1.44 Mbps down, and 0.72 Mbps up. CDP reported the matched throttling rule on the App request. The app-ready marker is the first attached sequencer step.

| Alternating pairs | Main median app-ready | Branch median app-ready | Median paired delta |
| --- | ---: | ---: | ---: |
| Series 1 (6) | 6,664 ms | 6,758 ms | +60 ms |
| Series 2 (6) | 6,633 ms | 6,884 ms | +243 ms |
| Combined (12) | 6,636 ms | 6,758 ms | +92 ms |
| Main vs itself (4) | 6,955 ms | 6,834 ms | −139 ms |

In all 12 branch runs, the notation chunk started 725–1,469 ms after the App chunk finished and 5,000–5,635 ms after window load. Petaluma started 732–1,469 ms after App finished and 5,002–5,635 ms after load. Main already started notation after App finished in these runs (378–1,867 ms later). The branch enforces the load deadline, but this benchmark does not show that it removed overlap with App or improved startup.

## Acceptance and open question

- [x] Test the deadline, first gestures, connection skip rules, immediate toggle warmup, and idempotency.
- [x] Run both embed checks with no markup or route changes.
- [x] Show in Chromium that the notation chunk starts after the App download and the no-gesture deadline.
- [ ] Establish that time-to-app is no worse. Paired branch timings ran −97 to +470 ms, with a +92 ms median. The identical-build control also varied from −540 to −9 ms. The measurements do not separate a regression from host variation. Rerun on a quieter runner before clearing this criterion.

Outcome: partial. Implementation and behavior gates passed. Startup parity remains unverified. No deployment or production check.

Local evidence: `/tmp/drumlet-0011-ekQyQd/benchmark.mjs`, `waterfall-series-1.json`, `waterfall-series-2.json`, `waterfall-control.json`, `verify.log`, and `embed.log` in that directory.
