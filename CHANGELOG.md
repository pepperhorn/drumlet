# Changelog

All notable changes to Drumlet are documented here.

## [0.1.0.0] - 2026-04-02

### Added
- **VexFlow notation view** — toggle between step grid and standard music notation for any pattern. Uses VexFlow 5 to render note values from the current page's tracks.
- **MPC pad mode** — full-screen touch pads for playing tracks live in challenge/performance mode. Accessible via a dedicated toggle in the header.
- **Mobile transport** — compact inline transport bar on small screens (play, BPM, mode toggle, overflow menu) so the sequencer is fully usable on phones without scrolling.
- **Full-width library slideout** — library now opens as a full-screen overlay sliding up from the bottom, with a responsive multi-column card layout (1→2→3 columns).
- **"In the style of" preset labeling** — drummer-category presets (Clyde Stubblefield, Bernard Purdie, Zigaboo Modeliste, James Gadson, Tony Allen, Stevie Wonder) now show each song as *"In the style of (Song Name)"* to make the educational intent explicit.
- **Note value control** — transport now exposes a note value selector (8th, 16th, triplet, etc.) for groove variation.

### Changed
- Play button now routes through `handlePlay` which ensures the AudioContext is running and all instruments are loaded before the sequencer starts — eliminates silent-on-first-play bugs.
- Cell preview sounds now schedule 10ms ahead (`currentTime + 0.01`) to avoid audio glitches on rapid tap.
- Instrument loading guard on cell toggle — preview sound only fires if the instrument is already cached, preventing errors on unloaded tracks.
- Source changes while playing no longer stop playback — instruments load in the background and come in silently once ready.

### Fixed
- AudioContext suspended state on iOS/mobile — `ensureRunning()` now correctly resumes the context after a user gesture.
- NaN audio scheduling errors eliminated by the instrument-ready guard before playback starts.
