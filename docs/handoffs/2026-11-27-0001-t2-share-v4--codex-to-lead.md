# Handoff: 0001-t2 — Share codec v4 (codex → lead)

- Date: 2026-11-27
- Type: return, review round 2
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Amended Task 2 plan](https://github.com/pepperhorn/drumlet/blob/7c2728b/docs/plans/0001-drumlet-player.md#task-2-share-codec-v4--all-pages)
- Branch: `orch/0001-t2-share-v4`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-34002d3d-f46d07781c04ab9f`
- Base: `f8c05d6` (v3 encoder) · `a947869` (dispatch)
- PR: [#29](https://github.com/pepperhorn/drumlet/pull/29) · [Round 1 review](https://github.com/pepperhorn/drumlet/pull/29#pullrequestreview-6082980235)
- Port: 5212 (stopped)
- Status: ready for re-review

## Goal and scope

Share every page, its steps, and its section headings while retaining v1–v3 decoding. The [dispatch handoff](2026-11-27-0001-t2-share-v4--lead-to-codex.md) limits changes to the codec, its tests, and the task handoffs. No app, transport, embed routing, or ledger files changed.

## Review fixes

- v4 now stores a shared track table in `t` and per-page step rows in `pg[].s`. The table starts in page 1 order and appends tracks found only on later pages. It matches shared IDs first. A page-local ID from Add Page can reuse an unclaimed slot when its position and metadata match. Missing tracks and plain rest rows use `0`. Explicit split cells retain their structure.
- The decoder allocates one ID per track table slot and reuses it across pages. The audio engine can reuse loaded sounds at bar joins. Multi-page shares open in chain mode.
- Default page names and the default track values for velocity mode, volume, and reverb are omitted on the wire and restored on decode. Custom labels, non-default values, non-ASCII text, and plugin metadata still round-trip.
- v1–v3 codes still decode as one page, including the frozen v3 fixture from `f8c05d6` with Latin-1 text and a split step. The prior, unreleased v4 format is not supported.

## Acceptance and evidence

The amended tests first reproduced four failures on the reviewed head, including different track IDs and a 4,614-character Cuban Cha-Cha link. Tests now cover shared IDs, chain mode, mixed drum-machine/soundfont/kit sources, velocity modes 1/3/7, split cells, reordered and missing tracks, malformed input, and v1–v3 compatibility.

All 98 stock grooves restored identical step grids, with matching track IDs on the first and last pages. Lengths are for full `buildShareUrl` URLs.

| Bars | Grooves | Median | Maximum |
| --- | ---: | ---: | ---: |
| 4 | 86 | 900 | 1,515 (Cuban Cha-Cha) |
| 8 | 12 | 1,446.5 | 2,262 (Cuban Salsa Cascara) |

In Chromium, the revised v4 link restored three tabs, their pads, and the Unicode Chorus heading. The Share modal emitted matching share and embed payloads. Playback advanced from Intro to Verse and scheduled the Verse downbeat and next sixteenth at the expected intervals. The v3 embed still scheduled local kit audio. The smoke check blocked external requests and found no uncaught page errors. It did not measure physical audio output.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run dev -- --host 0.0.0.0 --port 5212
```

After orch-deslop removed duplicate drum-machine defaults, the full verification passed.

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.99s
 Test Files  2 passed (2)
      Tests  104 passed (104)
```

The two lint warnings are in `AuthModal.tsx`. The Vite/Verovio build warnings and npm audit report remain.

## Decisions and follow-ups

- v4 escapes Unicode in JSON without changing legacy Latin-1 decoding. It checks step row lengths and caps grid expansion from compact rest markers. Zero-page and zero-track groove handling belongs to Task 3.
- GBrain: `projects/drumlet` confirms the protected-main workflow. The amended plan governs the share format.
- Open questions: none. Task 3 can use `decodePayload`. Task 11 owns the later embed routing change.
