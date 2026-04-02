# Drumlet

Browser-based rhythm education game / step sequencer. Build patterns, play them live for accuracy scoring, share challenges with friends.

## Stack

- React 19 + Vite 8 + Tailwind 4
- smplr for drum machine samples (TR-808, LM-2, CR-8000, etc.)
- Single shared AudioContext for all audio
- No backend — challenge data encoded in URL hash fragment

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
