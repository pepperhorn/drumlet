# WIP Ledger

> Single writer: the **lead**, on the main branch only. Implementers report status through their return handoff.
> Status: proposed · specced · planned · dispatched · in-review · changes-requested · ready · merged · closed · blocked · parked
> Waiting on: `child <taskId>` · `review <taskId>` · `ci` · `human: <why>` · `lead: <next action>`. Set it on every status change. A row needs the lead when it starts with `lead`, or when it's empty and Status is dispatched, in-review, changes-requested, ready, or merged. The lead's Stop hook won't let the lead end its turn while any row needs it.
> Type: normal items have a spec and plan. Quick items have the title prefix `[quick]` (no spec or plan, a short handoff). PRs adopted by `orch-sweep` have the prefix `[pr]`.

Next ID: 0016

## Active

| K | Title | Status | Waiting on | Owner (provider/model) | Branch | PR | Worktree | T3 task/thread | Spec | Plan | Latest handoff | Updated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0015 | [quick] Endless notation shows a clipped "Dru…" title fragment | dispatched | child 0015-impl-r1 | codex/gpt-6.2-sol | orch/0015-endless-title-fragment | — | — | — | — | — | docs/handoffs/2026-11-28-0015-endless-title-fragment--lead-to-codex.md | 2026-11-28 |

## Done / closed

| K | Title | PR | Merged | Notes |
|---|---|---|---|---|
| 0014 | [quick] Paged→Endless notation no longer leaves a stale score | https://github.com/pepperhorn/drumlet/pull/52 | 2026-11-28 | auto-merged (38 code lines, approve, CI green) |
| 0011 | [quick] Defer the notation prefetch on drumlet.app | https://github.com/pepperhorn/drumlet/pull/51 | 2026-11-28 | 1 review round (opus; startup within noise); owner OK |
| 0013 | [quick] Dark theme notation glyphs follow the theme | https://github.com/pepperhorn/drumlet/pull/50 | 2026-11-28 | auto-merged (47 code lines, approve, CI green) |
| 0012 | [quick] Pin workflow actions to commit SHAs | https://github.com/pepperhorn/drumlet/pull/49 | 2026-11-28 | 1 review round (opus); owner OK |
| 0010 | [quick] prepublishOnly guard | https://github.com/pepperhorn/drumlet/pull/48 | 2026-11-28 | auto-merged (3 code lines, approve, CI green) |
| 0001-t12 | Release workflow, CI and docs | https://github.com/pepperhorn/drumlet/pull/47 | 2026-11-28 (ee8fe16) | 1 review round (opus); owner OK; first CI on main green |
| 0001 | Drumlet Player (embeddable component) + endless view — ALL 12 TASKS (+t8b) MERGED | #28–#47 | 2026-11-28 | first npm publish pending (owner, after 0010) |
| 0001-t11 | Iframe embed rebuilt on DrumletPlayer | https://github.com/pepperhorn/drumlet/pull/45 | 2026-11-28 (c0a37de) | 3 review rounds (opus); startup parity restored; owner OK |
| 0001-t10 | Demo page, embed checks, pack smoke | https://github.com/pepperhorn/drumlet/pull/46 | 2026-11-28 (f1dfd50) | 2 review rounds (opus; 8 mutations caught); owner OK |
| 0001-t9 | @pepperhorn/drumlet-player package build (MIT) | https://github.com/pepperhorn/drumlet/pull/44 | 2026-11-28 (f2cfd53) | 3 review rounds (opus): unlayered scoped CSS, :where root reset; owner OK |
| 0001-t8b | One shared AudioContext per page | https://github.com/pepperhorn/drumlet/pull/43 | 2026-11-28 (6408ec8) | 1 review round (opus); owner OK |
| 0009 | [quick] Pad-name follow-ups | https://github.com/pepperhorn/drumlet/pull/42 | 2026-11-28 (fed6ddd) | 1 review round (opus); owner OK |
| 0001-t8 | DrumletPlayer component | https://github.com/pepperhorn/drumlet/pull/38 | 2026-11-28 (3af5989) | 2 review rounds (opus); owner OK |
| 0001-t7 | App Paged / Endless toggle | https://github.com/pepperhorn/drumlet/pull/37 | 2026-11-28 (e65dc20) | 2 review rounds (opus); owner OK |
| 0008 | [quick] Screen-reader names for step pads | https://github.com/pepperhorn/drumlet/pull/40 | 2026-11-28 (2153eed) | 1 review round (opus); owner OK |
| 0007 | [quick] Stop renderStaff test timing out | https://github.com/pepperhorn/drumlet/pull/41 | 2026-11-28 (779b351) | auto-merged (39 code lines, test-only) |
| 0006 | [quick] Notation beat counts restart each bar | https://github.com/pepperhorn/drumlet/pull/39 | 2026-11-27 (1fd5e11) | auto-merged (48 code lines, approve, no checks); main verify ✓ 197 tests |
| 0005 | [quick] Notation Retry without page reload | https://github.com/pepperhorn/drumlet/pull/35 | 2026-11-27 (d9291cc) | 2 review rounds (opus); owner OK |
| 0001-t6 | Endless notation | https://github.com/pepperhorn/drumlet/pull/36 | 2026-11-27 (23c53b9) | 1 review round (opus); owner OK |
| 0003 | Mobile notation: load feedback, fit to width, onset durations, toggle icon | https://github.com/pepperhorn/drumlet/pull/33 | 2026-11-27 (e480679) | 1 review round (opus; 98 grooves × 1,536 renders); owner OK |
| 0004 | [quick] Auto-follow: ignore vertical wheel | https://github.com/pepperhorn/drumlet/pull/34 | 2026-11-27 (7f31818) | 1 review round (opus); owner OK |
| 0001-t5 | Endless grid + auto-follow | https://github.com/pepperhorn/drumlet/pull/32 | 2026-11-27 (6a6cac0) | 2 review rounds (opus); worst 1.2 ms/step on 1024 pads |
| 0001-t3 | Groove input resolver | https://github.com/pepperhorn/drumlet/pull/31 | 2026-11-27 (21803c6) | 1 review round (opus); nits → S9 |
| 0001-t4 | Transport play-through, loop, seek, global step | https://github.com/pepperhorn/drumlet/pull/30 | 2026-11-27 (aa29ff2) | 2 review rounds (opus); playhead now audio-clock timed |
| 0001-t2 | Share codec v4 — all pages | https://github.com/pepperhorn/drumlet/pull/29 | 2026-11-27 (b45025e) | 2 review rounds (opus); format decided by lead (shared track table) |
| 0001-t1 | Test harness, re-encoded kit, format-aware kit loader | https://github.com/pepperhorn/drumlet/pull/28 | 2026-11-27 (f8c05d6) | 2 review rounds (opus); plan KIT_FALLBACKS amended |
| 0002 | [pr] Hardware look + glowing silicone step pads | https://github.com/pepperhorn/drumlet/pull/27 | 2026-11-27 (3384c8f) | 4 review rounds (codex gpt-6.2-sol); fixes by claude-sonnet-5-5 |

## Suggestions

> Lead-curated ideas: next steps, improvements, code efficiencies, stack changes, risks. Each needs evidence (file:line, a measurement, or a link). Status: `new` · `accepted → NNNN` · `declined: <why>` · `done`. Keep declined rows so they aren't suggested again. A PR mentioned here isn't tracked: only the PR column of Active or Done rows counts.

| S | Kind | Suggestion | Evidence | Effort (S/M/L) | Value | Source | Status |
|---|---|---|---|---|---|---|---|
| S1 | improvement | Raise Steps/Split selector labels to ≥12px desktop | PageTabs.tsx Steps/Split options 10px at md (pre-existing) | S | DESIGN.md min sizes | 0002 return handoff | new |
| S2 | improvement | Raise mobile MPC pad label to ≥14px | MpcPads.tsx `mpc-pad-label` text-[10px] | S | readability on phones | 0002 return handoff | new |
| S3 | next step | Restyle mobile transport + header buttons as keycaps | App.tsx mobile-transport, drumlet-header buttons still flat Tailwind | M | consistent hardware look | PR #27 body | new |
| S4 | improvement | Cache a failed audio format per session so a broken format isn't re-downloaded for every sample | PR #28 review r2 suggestion; src/audio/customKits.ts retry path | S | fewer wasted fetches on broken decoders | 0001-t1 review r2 | new |
| S5 | efficiency | Share one in-flight fetch when the same kit sample is requested twice concurrently | PR #28 review r2 suggestion | S | avoids duplicate downloads on load | 0001-t1 review r2 | new |
| S6 | efficiency | Add Page reuses existing track ids so the v4 encoder can drop position+metadata matching | PR #29 review r2 suggestion; src/state/sequencerReducer.ts ADD_PAGE | S | simpler codec, fewer edge cases | 0001-t2 review r2 | new |
| S7 | improvement | Carry per-track colour in share codes (lost today, pre-existing) | PR #29 review r2; shareCodec decode assigns palette colours by index | S | shared grooves keep their look | 0001-t2 review r2 | new |
| S8 | improvement | Groove mode, loop off: deleting the last page during its final step plays one extra bar before stopping | PR #30 review r2 (non-blocking) | S | correct stop | 0001-t4 review r2 | new |
| S9 | improvement | resolveGroove: accept `&s=` later in the hash (app does), clearer error for sync stock lookup before catalog load, report catalog fetch failure as a load error not `invalid` | PR #31 review r1 nits; src/player/resolveGroove.ts | S | fewer confusing player errors | 0001-t3 review r1 | new |
| S10 | improvement | useAutoFollow: pause only on horizontal wheel, not vertical — scrolling the page past an embedded player currently stops it following | PR #32 review r2; src/components/useAutoFollow.ts wheel handler | S | embedded player keeps following while the host page scrolls | 0001-t5 review r2 | accepted → 0004 |
| S11 | improvement | Step pads need screen-reader names (track, step, velocity) — read as the velocity letter or nothing today (paged grid too) | PR #32 review r2; src/components/Cell.tsx | S | accessibility | 0001-t5 review r2 | accepted → 0008 |
| S12 | improvement | Notation "Still loading" Retry reloads the whole page — on slow phones it throws away the half-done 2.3 MB download and the undo history; retry the import in place instead | PR #33 review r1 | S | better slow-connection UX | 0003 review r1 | accepted → 0005 |
| S13 | improvement | loadNotation caches a failed import, so a failed background prefetch sends the first tap straight to the error card | PR #33 review r1 | S | resilience | 0003 review r1 | accepted → 0005 |
| S14 | improvement | 2/2 with 16th steps: 5- or 7-sixteenth gaps become note + 16th rest (spec-allowed; no stock groove hits it) | PR #33 review r1; src/notation/beatToEvents.ts | S | notation correctness for user patterns | 0003 review r1 | new |
| S15 | risk | `src/notation/renderStaff.test.ts` occasionally times out at the 5 s default under parallel load (seen by implementer and reviewer; passes on rerun) — raise its timeout or share the verovio toolkit across tests | PR #35 review r1 | S | stops flaky verify runs | 0005 review r1 | accepted → 0007 |
| S16 | improvement | Add a `vite:preloadError` listener that reloads only when a deploy has removed a lazy chunk (old tabs after a release) | PR #35 review r1 | S | no dead tabs after deploys | 0005 review r1 | new |
| S17 | improvement | Endless notation >~222 bars: 64-bar chunks show a ~70 px staff break and repeat clef/time sig/bar no. at each join; clip later chunks' opening margin so barlines meet | PR #36 review r1 | S | seamless very long scores (rare) | 0001-t6 review r1 | new |
| S18 | improvement | Notation beat counts never restart per bar (bar 2 counts from "5"; long strips reach 3-digit counts) | PR #36 review r1 (pre-existing on main) | S | readable counts | 0001-t6 review r1 | accepted → 0006 |
| S19 | next step | Shared AudioContext per page → plan Task 8b (after t8; gates t10/t12) | PR #38 review r1: 8 players left 8 running contexts | M | avoids browser context caps on lesson pages | 0001-t8 review r1 | accepted → 0001-t8b |
| S20 | improvement | Paged grid pad names count bars within the page (page 3 says "bar 1") — pass the page offset from App.tsx; after 0001-t7 merges | PR #40 review r1 | S | correct screen-reader bar numbers | 0008 review r1 | accepted → 0009 |
| S21 | improvement | Split-pad master toggles open/closed → `aria-expanded` instead of `aria-pressed` | PR #40 review r1 | S | accurate a11y semantics | 0008 review r1 | accepted → 0009 |
| S22 | efficiency | Move spoken velocity names next to the on-screen labels in velocityConfig.ts | PR #40 review r1; src/components/Cell.tsx | S | one source of truth | 0008 review r1 | new |
| S23 | improvement | When Steps changes (e.g. 32), stock page-tab names ("Bar 2") no longer match the bars they hold — derive tab labels from bar range or rename on step change | PR #42 review r1 | S | tabs and pad names agree | 0009 review r1 | new |
| S24 | efficiency | Share the "first bar of page" formula between Grid and EndlessGrid in one helper | PR #42 review r1 | S | no drift | 0009 review r1 | new |
| S25 | risk | useAudioEngine: a call after release silently re-acquires the shared context and never releases it — guard or throw after dispose (all callers guarded today) | PR #43 review r1 | S | hardening | 0001-t8b review r1 | new |
| S26 | improvement | Dark theme: notation title, clef and time signature render black on the dark card (pre-existing on main) | PR #44 review r1 | S | readable notation in Dark Studio | 0001-t9 review r1 | accepted → 0013 |
| S27 | improvement | Let hosts recolour the player via documented CSS variables — today the player's token blocks and [data-theme] rules beat host overrides | PR #44 review r2 | M | host theming beyond light/dark | 0001-t9 review r2 | new |
| S28 | efficiency | `!important` px widths in src/player/styles/base.css duplicate constants in EndlessGrid.tsx — derive one from the other | PR #44 review r2 | S | no drift | 0001-t9 review r2 | new |
| S29 | efficiency | App is now a lazy chunk (t11) → one extra request hop on normal loads (~8 ms FCP on simulated 40 ms RTT); add a modulepreload for the App chunk in the Vite build once t10 (vite.config.js) merges | PR #45 fix r2 return handoff | S | restore startup parity | 0001-t11 | accepted → folded into 0001-t11 fix r3 (after t10) |
| S30 | efficiency | Defer the 7.9 MB notation prefetch on `/` until after the app is interactive (or until a user gesture) — on slow links it competes with the App chunk; Chromium "Fast 3G" emulation doesn't set navigator.connection, so the 3g skip rule doesn't catch it | PR #45 review r2 | S | faster mobile startup | 0001-t11 review r2 | accepted → 0011 |
| S31 | risk | pack-smoke stale-dist check scans only src/player|audio|components (.ts/.tsx/.css); the player also bundles src/state, notation, plugins, util and .json — scan all of src/ minus tests/App/main/demo | PR #46 review r2; scripts/pack-smoke.mjs:108 | S | release gate can't pass on a stale build | 0001-t10 review r2 | accepted → fold into 0001-t12 |
| S32 | risk | Add `prepublishOnly` (build:lib + verify:lib) to packages/drumlet-player so a manual publish can't ship a missing/stale dist | PR #47 review r1 | S | safe first publish | 0001-t12 review r1 | accepted → 0010 |
| S33 | efficiency | Share the Chromium setup step between ci.yml and release-player.yml (composite action) | PR #47 review r1 | S | less duplication | 0001-t12 review r1 | new |
| S34 | risk | Pin actions to commit SHAs in the publish job; protect `player-v*` tags (ruleset) | PR #47 review r1 | S | supply-chain hardening | 0001-t12 review r1 | accepted → 0012 |
| S35 | improvement | Add .github/dependabot.yml for github-actions so pinned SHAs get update PRs | PR #49 review r1 | S | pins don't go stale | 0012 review r1 | new |
| S36 | efficiency | Notation export ink colour hard-coded in src/notation/notationExport.ts:50 — use a named constant tied to the light theme | PR #50 review r1 | S | no drift | 0013 review r1 | new |
| S37 | improvement | Exported SVG/PNG render title and labels in a serif fallback font (pre-existing) — embed or specify the UI fonts | PR #50 review r1 | S | exports match the app | 0013 review r1 | new |

Last health scan: never

## Log
<!-- One line per status change, newest first: YYYY-MM-DD NNNN old→new — note -->
2026-11-28 0015 delegated → codex gpt-6.2-sol (high), base f496c0d; thread thread:delegated-task:command%3Amcp%3A5c89244e-eee6-45e4-938a-c591ea37cb03%3Adelegate-task%3A0015-impl-r1
2026-11-28 0014 merged (#52; auto-merge, 38 code lines; main ✓ 267 tests). Pre-existing bug from its review (endless "Dru…" title fragment) → quick 0015
2026-11-28 0011 merged (#51; owner OK). 0014 PR #52 head 841284d (259 tests, 24 Chromium snapshots); review r1 claudeAgent claude-opus-5-5
2026-11-28 0011 review r1 (opus) approved @ 635e655 (14 rounds + A/A control: time-to-app −6 ms median, inside noise; nothing loads later); 166 code lines → owner OK
2026-11-28 0014 delegated → codex gpt-6.2-sol (high), base 9d88c9c; thread thread:delegated-task:command%3Amcp%3Ae3d8cfda-6b63-42ac-b7ca-0b3225c8a8f6%3Adelegate-task%3A0014-impl-r1
2026-11-28 0013 merged (#50; auto-merge, 47 code lines). Pre-existing bug from its review (Paged→Endless notation leaves stale score) → quick 0014. S36 S37 logged
2026-11-28 0011 dispatched→in-review — PR #51 head 635e655 (264 tests; order/delay OK; startup +92 ms median but A/A noise up to 540 ms → reviewer to measure with A/A control); review r1 claudeAgent claude-opus-5-5
2026-11-28 0013 dispatched→in-review — PR #50 head 2d3dcee (258 tests; exports dark-on-white); review r1 claudeAgent claude-opus-5-5
2026-11-28 0012 merged (#49; owner OK) — S34 complete (tag ruleset + pinned actions)
2026-11-28 0012 review r1 (opus) approved @ 8256e28 (SHAs verified = same versions as @v7; persist-credentials already false); CI files → owner OK. S35 logged
2026-11-28 0012 dispatched→in-review — PR #49 head 8256e28 (4 uses pinned, actionlint clean); review r1 claudeAgent claude-opus-5-5
2026-11-28 owner reports npm trusted publishing enabled for @pepperhorn/drumlet-player (pepperhorn/drumlet, release-player.yml); not independently verified (npm trust list needs OTP) — first tag-driven release will confirm
2026-11-28 0011/0012/0013 delegated in parallel → codex gpt-6.2-sol (high), base b4780a1; threads thread:delegated-task:command%3Amcp%3A687e6560-ecc2-4e70-99ed-ac8603b1642f%3Adelegate-task%3A001{1,2,3}-impl-r1
2026-11-28 owner accepted S30, S34, S26 → quick 0011, 0012, 0013 (parallel, disjoint). S34 tag half done by lead: ruleset "Protect release tags" (refs/tags/player-v*: creation/update/deletion/non-ff; admin bypass)
2026-11-28 @pepperhorn/drumlet-player@0.1.0 published by owner (npm latest=0.1.0, MIT, 73 files, 1.6 MB unpacked); jsDelivr serves dist/kits/acoustic1 and style.css. Next: owner enables npm trusted publishing for pepperhorn/drumlet release-player.yml
2026-11-28 0010 merged (#48; auto-merge). First npm publish of @pepperhorn/drumlet-player 0.1.0 handed to owner (npm login first, then publish)
2026-11-28 0010 dispatched→in-review — PR #48 head 9cc6ba7 (dry-runs match 73-file baseline; forced verify failure aborts); review r1 claudeAgent claude-opus-5-5
2026-11-28 0010 implementer run failed on Codex usage limit after drafting the prepublishOnly line (uncommitted); owner reports Codex reset → resumed same thread
2026-11-28 0010 delegated → codex gpt-6.2-sol (high), base 4f55157; thread thread:delegated-task:command%3Amcp%3A2a4b1bf1-6db4-47cc-b101-c4c3a37c34a1%3Adelegate-task%3A0010-impl-r1
2026-11-28 0001 t12 merged (#47, ee8fe16; owner OK; CI green on main) — 0001 COMPLETE. Owner accepted S32 → quick 0010 (prepublishOnly guard) before first manual publish
2026-11-28 0001 t12 review r1 (opus) approved @ af46a1b (actionlint clean; gate + CI Chromium step verified; S31 works; README snippets run); merge needs owner OK (CI). S32–S34 logged
2026-11-28 0001 t12 PR #47 head af46a1b (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-420fb1e2-9927d595c24fc71b; full gate passes; 73-file dry-run tarball); review r1 claudeAgent claude-opus-5-5
2026-11-28 0001 t12 delegated → codex gpt-6.2-sol (high), base 1c69350; thread thread:delegated-task:command%3Amcp%3A3c805740-8753-423f-9fcb-16e06213eda6%3Adelegate-task%3A0001-t12-impl-r1
2026-11-28 0001 t11 merged (#45, c0a37de; owner OK; main verify ✓ 256 tests + lib checks). t12 handoff written (release + CI workflows with full gate, S31, docs)
2026-11-28 0001 t11 review r3 (opus) approved @ 1ee4f31 (Fast-3G `/` −50 ms vs main; embed 2.5 s vs 6.6 s; empty/garbage embeds → player error); merge needs owner OK
2026-11-28 0001 t11 fix r3 pushed @ 1ee4f31 (rebased; conditional App preload: Fast-3G time-to-App 6.42 s vs main 6.49 s; empty embeds → player error; 256 tests, route + packed checks pass); review r3 claudeAgent claude-opus-5-5
2026-11-28 0001 t10 merged (#46, f1dfd50; owner OK; main verify ✓ 250 tests + lib checks). t11 fix r3 sent: Owns +vite.config.js/index.html for App-chunk preload (startup parity on Fast 3G) + empty embed → player error
2026-11-28 0001 t10 review r2 (opus) approved @ 27a1881 (prod dist byte-identical; labelled failures; concurrent runs OK); low finding S31 folded into t12; merge needs owner OK
2026-11-28 0001 t10 fix r2 pushed @ 27a1881 (demo dev-only; 42 prod files byte-identical to main; labelled gate failures); review r2 claudeAgent claude-opus-5-5
2026-11-28 0001 t10 review r1 (opus) approved @ 1d9c1fd (all 8 mutations caught). Lead wants before merge: production build unchanged (demo behind --mode demo), labelled gate failures, stale-dist/port/install robustness → fix r2 sent
2026-11-28 0001 t11 review r2 (opus) @ bc74c6d: r1 fixed; startup +~550 ms on Fast 3G (one extra hop) → blocking. Lead: t11 waits for t10 (vite.config.js) to merge, then fix r3 adds App modulepreload + empty-embed → player error. S30 logged
2026-11-28 0001 t11 fix r2 pushed @ bc74c6d (bad codes → player error; shared parser; README-exact snippet; 256 tests + 7 route checks). Startup +~8 ms accepted as follow-up S29. Review r2 claudeAgent claude-opus-5-5
2026-11-28 0001 t11 in-review→changes-requested — opus r1 @ 8adc044: undecodable/unknown-version embed codes open the full app. Fix r2 sent: route fix + 6th route check; snippet matches README exactly; reuse shareCodec regex; no extra round-trip on normal app load (measure vs main)
2026-11-28 0001 t10 PR #46 head 1d9c1fd (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-b8282c4d-05b6df5822805713; smoke + embed checks pass, deliberate regression fails as expected); review r1 claudeAgent claude-opus-5-5
2026-11-28 0001 t11 PR #45 head 8adc044 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-3f7aa9be-0fbe799fa197d659; 255 tests + 6 Chromium route checks); review r1 claudeAgent claude-opus-5-5
2026-11-28 0001 t10 + t11 delegated in parallel → codex gpt-6.2-sol (high), base 1c1a370; threads thread:delegated-task:command%3Amcp%3Ace969c85-e60d-4b98-b6a5-94bd64b9bac7%3Adelegate-task%3A0001-t10-impl-r1 / …%3A0001-t11-impl-r1
2026-11-28 0001 t9 merged (#44, f2cfd53; owner OK; main verify ✓ 250 tests + build:lib/verify:lib). t10 + t11 handoffs written for parallel dispatch (amended: unlayered hostile sheets, checks on packed tarball, legacy-route check moved to t11, t8b 1-context gate in t10, EmbedPage omits assetBaseUrl)
2026-11-28 0001 t9 review r3 (opus) approved @ 2d65806 — merge needs owner OK (dependencies, licence headers, size)
2026-11-28 0001 t9 fix r3 pushed @ 2d65806 (:where root reset; className styles apply; hostile cases unchanged); review r3 claudeAgent claude-opus-5-5
2026-11-28 0001 t9 review r2 (opus) @ a60dffc: r1 blocker fixed, no leak onto host; new blocker — root `all:revert` wipes host className styles. Lead: take tested `:where(.drumlet-player)` root fix (round 3)
2026-11-28 0001 t9 fix r2 pushed @ a60dffc (unlayered scoped CSS; 36×36 pads / 44×44 play under 3 hostile hosts; app build byte-identical); review r2 claudeAgent claude-opus-5-5
2026-11-28 0001 t9 in-review→changes-requested — opus r1 @ 0ef5cec: layered package CSS loses to unlayered host CSS (pads shrink/vanish). Lead: emit unlayered scoped CSS (spec anti-goal), verify-dist bans @layer, hostile-host repro required; take verify:lib→SSR test and @source coverage check. Fix r2 sent
2026-11-28 0001 t9 PR #44 head 0ef5cec (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-a9583e5d-098e33c18423e92f; 250 tests; tarball 1,175,293 B; fresh Vite host verified); review r1 claudeAgent claude-opus-5-5
2026-11-28 0001 t9 delegated → codex gpt-6.2-sol (high), base c390fa1; thread thread:delegated-task:command%3Amcp%3A3bf9f6de-6d3e-4ea2-a4a0-e91337ca0f18%3Adelegate-task%3A0001-t9-impl-r1
2026-11-28 0009 merged (#42, fed6ddd) + 0001-t8b merged (#43, 6408ec8); owner OK; main verify ✓ 250 tests. t9 handoff written (t8b nit folded in)
2026-11-28 0009 review r1 (opus) approved @ 045257e; 63 code lines → owner OK needed; S23 S24 added
2026-11-28 0001 t8b PR #43 head a823c32 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-923c1466-b5e9140f861de063; 249 tests; 8 players → 1 context in Chromium); review r1 claudeAgent claude-opus-5-5
2026-11-28 0009 dispatched→in-review — PR #42 head 045257e (244 tests); review r1 claudeAgent claude-opus-5-5
2026-11-28 0001-t8b + 0009 delegated in parallel → codex gpt-6.2-sol (high), base d9f23f2; threads thread:delegated-task:command%3Amcp%3A5f979163-48e8-4f4f-bdcf-db9a107dc8df%3Adelegate-task%3A0001-t8b-impl-r1 / …%3A0009-impl-r1
2026-11-28 merged #41 (0007, auto), #40 (0008), #37 (t7), #38 (t8) — owner OK; main verify ✓ 243 tests at default timeout. t8b + quick 0009 (S20+S21) handoffs written for parallel dispatch
2026-11-28 session restart. 0001 t7 r2 (opus) approved @ d00ffcf; t8 r2 (opus) approved @ dc7ba43 — both await owner OK. 0007 PR #41 head 4b26baa (10/10 runs at load ~55); review r1 claudeAgent claude-opus-5-5
2026-11-27 0008 review r1 (opus) approved @ de77cdd; 163 code lines → owner OK needed; S20–S22 added
2026-11-27 0001 t7 fix r2 pushed @ d00ffcf (desktop bar 54/50 px = main; endless bar tabs scroll + select; 199 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0006 merged (#39, 1fd5e11; auto-merge ≤50 code lines). 0007 blocked: other suites (NotationBoundary, EndlessGrid) time out under host load ~55/12 CPUs; lead widened Owns to vitest.config.ts (global testTimeout 15000) + NotationBoundary.test.tsx, resumed. 0001-t8 fix r2 pushed @ dc7ba43 (220 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0008 dispatched→in-review — PR #40 head de77cdd (209 tests w/ longer timeout; EndlessGrid 64/64 single commits); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t7 in-review→changes-requested — opus r1 @ 79cd9c0: desktop page-tabs bar wraps to 2 rows (+42 px). Lead: keep one row at md+ as on main, wrap only below md; take "bar tab scrolls endless strip" suggestion. Fix r2 sent
2026-11-27 0001 t8 in-review→changes-requested — opus r1 @ d0388ed: inline groove object resets player on host re-render (blocking). Fix r2 sent: value-keyed groove, suspend context on finish, lead decision chrome="none"+display="notation" shows static notation. Plan Task 8b added (shared AudioContext; after t8, gates t10/t12)
2026-11-27 0006 dispatched→in-review — PR #39 head b806e77 (197 tests, with 30 s CLI timeout due to known flake S15/0007); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t8 PR #38 head d0388ed (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-420cbbfc-51ed2bd0b49a27aa; 213 tests; one AudioContext per player instance — reviewer asked to judge vs spec "single shared AudioContext"); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t7 PR #37 head 79cd9c0 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-4cbaa03a-006b175ef1b3a193; 198 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0008 implementer blocked on scope: lead approved one-prop Grid.tsx change (beat size → TrackRow) and limiting sub-step tests to the paged grid
2026-11-27 0006/0007/0008 delegated in parallel → codex gpt-6.2-sol (high), base 3939539; threads thread:delegated-task:command%3Amcp%3Ab2ebda65-81ee-4554-a7a1-2b8cd4f6186d%3Adelegate-task%3A000{6,7,8}-impl-r1
2026-11-27 owner accepted S18, S15, S11 → quick items 0006, 0007, 0008 (disjoint Owns with each other and with t7/t8)
2026-11-27 0001 t7 + t8 delegated in parallel → codex gpt-6.2-sol (high), base 9024a38; threads thread:delegated-task:command%3Amcp%3Afbebc0a5-420a-44e6-ae7f-c62cd135f281%3Adelegate-task%3A0001-t7-impl-r1 / …%3A0001-t8-impl-r1
2026-11-27 0001 t6 merged (#36, 23c53b9) + 0005 merged (#35, d9291cc); owner OK; main verify ✓ 194 tests. t7 + t8 handoffs written for parallel dispatch (disjoint Owns)
2026-11-27 0001 t6 review r1 (opus) approved @ 29fd580 (wrapped identical on all 98 grooves; spikes are host noise, not t6); merge needs owner OK. Plan Task 7 note: pass currentGlobalStep -1 when stopped
2026-11-27 0005 fix r2 pushed @ 3fda96a (single module-level lazy loader; 192 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0005 review r1 (opus) approved @ 2f066fe with a minor regression (engine-phase flash on reopen); lead sent fix r2 before merge
2026-11-27 0001 t6 PR #36 head 29fd580 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-69c401c9-856a968687d76c84; 190 tests; p95 0.3–0.4 ms, max 16.5/9.7 ms); review r1 claudeAgent claude-opus-5-5
2026-11-27 0005 dispatched→in-review — PR #35 head 2f066fe (191 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001-t6 + 0005 delegated in parallel → codex gpt-6.2-sol (high), base 9e28762; threads thread:delegated-task:command%3Amcp%3A4fbff63f-c2e0-4e51-b5f0-bfe4e576facd%3Adelegate-task%3A0001-t6-impl-r1 / …%3A0005-impl-r1
2026-11-27 0003 merged (#33, e480679; owner OK; main verify ✓ 188 tests). 0001-t6 + quick 0005 (S12+S13) handoffs written for parallel dispatch (disjoint files)
2026-11-27 0004 merged (#34, 7f31818; owner OK; main verify ✓ 157 tests). Owner: auto-merge line count excludes docs/** (AGENTS.md addendum). 0003 review r1 (opus) approved @ 2ed0f53 — merge needs owner OK
2026-11-27 0004 dispatched→in-review — PR #34 head 83688eb (157 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0003 dispatched→in-review — PR #33 head 2ed0f53 (168 tests); review r1 claudeAgent claude-opus-5-5
2026-11-27 0004 implementer asked to update EndlessGrid.test.tsx wheel fixture (zero-delta wheel expected to pause); lead granted, Owns extended
2026-11-27 0004 delegated → codex gpt-6.2-sol (high), base 4e16d74; thread thread:delegated-task:command%3Amcp%3Abfd96476-0150-4947-8267-ccd972872757%3Adelegate-task%3A0004-impl-r1
2026-11-27 0001 t5 merged (#32, 6a6cac0; owner OK; main verify ✓ 151 tests). Owner: arrow keys keep pausing auto-follow. 0004 quick (S10 vertical wheel) dispatched
2026-11-27 0001 t5 review r2 (opus) approved @ 1234f91 (re-measured 1 commit/step, worst 1.2 ms); merge needs owner OK
2026-11-27 0001 t5 fix r2 pushed @ 1234f91 (1 commit/step, worst 6.4 ms on 1024 cells; taps keep follow; roving tabindex; 141 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0003 scope change (owner): onset-based note durations replace upright-rest fix; spec/plan/handoff amended d077bf2; steered running implementer
2026-11-27 0003 delegated → codex gpt-6.2-sol (high), base 3b1e73c (added upright rests from owner screenshot); thread thread:delegated-task:command%3Amcp%3A787164b5-6ca8-42b7-a411-c88e199bf534%3Adelegate-task%3A0003-impl-r1
2026-11-27 0003 →dispatched — owner bug report (phone): notation "freeze" = 7.9 MB chunk (2.26 MB compressed) with no feedback; score overflows phone; toggle icon glyph from unloaded font. Must merge before 0001-t6 (same files)
2026-11-27 0001 t3 merged (#31, 21803c6; owner OK; main verify ✓ 137 tests). t5 in-review→changes-requested — opus r1 @ 13fb3f3: 68–189 ms render per playhead step on 8×8 (memo defeated, 3 commits/step); tap pauses auto-follow against spec. Fix r2 sent (target ≤1 commit, ≤10 ms/step). Plan notes added to Task 6 (reuse pattern) and Task 9 (Cell viewport breakpoints)
2026-11-27 0001 t3 review r1 (opus) approved @ 5a77841; merge needs owner OK
2026-11-27 0001 t5 PR #32 head 13fb3f3 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-39830e8f-8bfb427f8dedb40a); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t3 PR #31 head 5a77841 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-530fb0b0-98c68d0755ed593d); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t3 + t5 delegated in parallel → codex gpt-6.2-sol (high), base 95c8916; threads thread:delegated-task:command%3Amcp%3A3b15e043-5d66-4160-ba33-951ceee08f1a%3Adelegate-task%3A0001-t3-impl-r1 / …%3A0001-t5-impl-r1
2026-11-27 0001 t4 merged (#30, aa29ff2; owner OK; main verify ✓ 127 tests) — t3 + t5 handoffs written for parallel dispatch
2026-11-27 0001 t2 merged (#29, b45025e; owner OK; main verify ✓ 104 tests). t4 review r2 (opus) approved @ 5c2eb60 — merge needs owner OK. Review notes for t7/t8: hide stray playhead via currentPlayPage; extract mode-switch/page-removal rules into a tested helper
2026-11-27 0001 t2 review r2 (opus) approved @ 071f014; merge needs owner OK (share format is public, >50 lines)
2026-11-27 0001 t4 fix r2 pushed @ 5c2eb60 (mode-switch sync, cursor clamp/stop, unified audio-clock playhead; 115 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0001 t2 fix r2 pushed @ 071f014 (shared track table; 4-bar URL median 900 / max 1,515; 8-bar max 2,262); review r2 claudeAgent claude-opus-5-5
2026-11-27 0001 t4 in-review→changes-requested — opus r1 @ 8bbe9d6: groove→paged switch plays wrong page; removed page under cursor stalls playback. Lead: view follows audio on mode switch; clamp cursor, stop+onEnded at zero pages. Fix r2 sent
2026-11-27 0001 t2 in-review→changes-requested — opus r1 @ 4756f09: per-page track ids break engine cache (blocking); lead decision: v4 uses shared track table + per-page step strings (plan Task 2 amended), chainMode on for multi-page; fix r2 sent
2026-11-27 0001 t4 PR #30 head 8bbe9d6 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-eeb54834-d9f137a9d21066a6); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t2 PR #29 head 4756f09 (codex gpt-6.2-sol; worktree /home/shaun/.t3/worktrees/drumlet/t3-34002d3d-f46d07781c04ab9f); review r1 claudeAgent claude-opus-5-5. t4 still implementing
2026-11-27 0001 t2 + t4 delegated in parallel → codex gpt-6.2-sol (high), base a947869; threads thread:delegated-task:command%3Amcp%3A066d5e40-7895-4940-a3bb-f3084117f784%3Adelegate-task%3A0001-t2-impl-r1 / …%3A0001-t4-impl-r1
2026-11-27 0001 t1 merged (#28, f8c05d6; owner OK; main verify ✓ 92 tests) — t2 + t4 handoffs written for parallel dispatch
2026-11-27 0001 in-review→ready — t1 review r2 (opus) approved @ 5e09ee8; merge needs owner OK (dev deps, size)
2026-11-27 0001 changes-requested→in-review — t1 fix pushed @ 5e09ee8 (12-rule fallback, 92 tests); review r2 claudeAgent claude-opus-5-5
2026-11-27 0001 in-review→changes-requested — t1 review r1 (opus) @ 2aeae39: kit fallback maps app hihat-* groups to kick (plan table was wrong; plan Task 1 KIT_FALLBACKS amended); fix r2 sent to implementer thread
2026-11-27 0001 dispatched→in-review — t1 PR #28 head 2aeae39 (codex gpt-6.2-sol); review r1 claudeAgent claude-opus-5-5
2026-11-27 0001 t1 delegated → codex gpt-6.2-sol (reasoningEffort high), base c585c5e
2026-11-27 0001 planned→dispatched — t1 handoff written (base 3384c8f)
2026-11-27 0002 in-review→merged→closed — codex r4 approved @ 570581f1; squash-merged 3384c8f; main verify typecheck/lint/build ✓
2026-11-27 0002 changes-requested→in-review — fix r2 pushed at 570581f1 (::after markers, label sizes); review r4 codex gpt-6.2-sol
2026-11-27 0002 in-review→changes-requested — codex r3 @ 0080528: r2 findings verified fixed; new 1×P2 (split-master focus hidden by marker outline) + 1×P3 (Notation/TAP/CLEAR/Page tab sizes); fix r2 sent to same implementer thread
2026-11-27 0002 changes-requested→in-review — fix r1 pushed at 00805286 (all 5 findings + body rule); review r3 codex gpt-6.2-sol
2026-11-27 0002 fix r1 dispatched → claudeAgent claude-sonnet-5-5 (effort high)
2026-11-27 0002 in-review→changes-requested — codex r2: 4×P2 (knob→BPM shortcut leak, hidden selection/split rings, hidden focus rings, theme-extension contract) + 1×P3 (label sizes); fix handoff docs/handoffs/2026-11-27-0002-review-fixes--lead-to-claude.md
2026-11-27 0002 review r1 ended unreviewed (child hit a setup prompt: worktree came from a pre-#26 checkout); r2 launched from main
2026-11-27 0002 →in-review — adopted PR #27 (pre-orch, Claude-authored); review r1 codex gpt-6.2-sol at 5535f51
2026-11-27 — PR #26 merged (ph-orch setup + 0001 spec/plan); main ruleset now has admin-role bypass for lead docs pushes
2026-11-27 0001 proposed→planned — spec approved by owner; plan approved; prerequisites: PR #26 (ph-orch setup), PR #27 (hardware pads)
