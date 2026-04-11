# drumlet

A browser-based rhythm education game and step sequencer. Build patterns, play them live for accuracy scoring, and share challenges with friends.

![drumlet screenshot](docs/screenshot.png)

## What it does

- **Step sequencer** with multi-page patterns, time signature changes, swing, humanize, and per-step velocities
- **Real drum machine samples** (TR-808, LM-2, CR-8000 and more) via [smplr](https://github.com/danigb/smplr)
- **Notation view** powered by VexFlow alongside the grid
- **Play-along modes** for practice, scored challenges, and "Telephone" rhythm chains
- **Library + plugin runtime** so factory grooves, lessons, and (later) third-party content all share the same UI surface
- **URL-encoded sharing** — challenges are encoded into the hash fragment, no backend required to send a pattern

## Quick start

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open http://localhost:5173 (or the port Vite picks).

## Stack

- React 19 + Vite 8 + Tailwind 4
- [smplr](https://github.com/danigb/smplr) for drum samples, single shared `AudioContext`
- [VexFlow](https://www.vexflow.com/) for notation rendering
- Optional `apps.pepperhorn.com` backend for OTP-based user accounts and library content — the app runs fully without it

## Project layout

```
src/
  audio/         audio engine, transport, drum groups, velocity config
  components/    Grid, Cell, TrackRow, Transport, Library, etc.
  plugins/       plugin runtime + built-in library/mode plugins
  state/         SequencerContext, reducer, presets, share codec, auth
```

See `CLAUDE.md` for project conventions and `DESIGN.md` for the design system.

## License

[GNU AGPL v3](LICENSE). If you host a modified version of drumlet as a network service, you must offer the source of your changes to users of that service.

Proprietary plugins that talk to drumlet through its plugin runtime are a separate work and are not covered by the AGPL.
