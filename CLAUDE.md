<!-- ph-orch:begin v6 — managed by orch-init -->
@AGENTS.md

## Claude-specific notes

- **As lead**, use the `orch-dispatch` and `orch-sweep` skills. Ask the human questions with AskUserQuestion, but only decisions that are theirs. Do read-only research (repos, packages, GBrain, docs) without asking first (AGENTS.md §5a). Dispatch through T3 `delegate_task`, not the native Agent tool, because native subagents can't target Codex or apply T3 model options. Native subagents are fine for read-only research. Never use them to edit code in the main checkout.
- **Hooks** guard the lead's checkout: `lead-guard` denies edits outside docs and the ledger (and pushes of code commits), `lead-post` flags code that a shell command changed or committed, and `lead-stop` blocks ending the turn while ledger rows or open PRs need you. A block means act on what it lists (dispatch, review, merge, close, or set Waiting on to `human: <why>`). Don't argue with it or work around it.
- **As implementer or reviewer**, your brief is the handoff doc whose path you were given, not this conversation. The `.claude/agents/orch-implementer.md` and `orch-reviewer.md` definitions encode the same rules for native use.
- Don't poll async tasks. The completion notification wakes this thread.
<!-- ph-orch:end -->

# Drumlet

Browser-based rhythm education game / step sequencer. Build patterns, play them live for accuracy scoring, share challenges with friends.

## Naming

This project is called **Drumlet**. Any references to "jamee" or "jammee" (old codename) are stale — rename them to "drumlet" / "Drumlet" when encountered, in code, comments, docs, identifiers, file/folder names, and UI strings.

## Stack

- React 19 + Vite 8 + Tailwind 4
- smplr for drum machine samples (TR-808, LM-2, CR-8000, etc.)
- Single shared AudioContext for all audio
- Directus 11.17.1 backend at apps.pepperhorn.com (OTP auth, user profiles)
- Challenge data encoded in URL hash fragment

## Architecture

- `src/audio/` — audio engine (useAudioEngine, useTransport), drum groups, velocity config, custom kits
- `src/components/` — UI components (Grid, Cell, TrackRow, Transport, Library, PageTabs, TrackControls)
- `src/state/` — state management (SequencerContext, sequencerReducer, presets, projectSerializer, midiExport)

## Dev Server

```bash
npm run dev -- --host 0.0.0.0
```

## Related Repos

- [griddl](https://github.com/pepperhorn/griddl) — sister project with play-along system (ComparisonEngine, scoring, count-in overlay) to port into Drumlet

## CSS Class Naming

Every HTML/JSX element MUST have a contextual class name as its first class, before any Tailwind utilities. These semantic names make elements identifiable in DevTools and provide hooks for testing/styling overrides.

- Use kebab-case: `transport-bar`, `track-row`, `cell-label`
- Name should describe the element's role, not its appearance
- Nest naming with parent context: `transport-bpm-input`, `track-mute-btn`
- Apply to ALL elements — divs, buttons, spans, inputs, wrappers, icons, everything

Example:
```jsx
<div className="transport-bar flex items-center gap-2">
  <button className="transport-play-btn px-4 py-2 rounded-full">
  <span className="transport-bpm-label text-sm text-muted">
```

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
