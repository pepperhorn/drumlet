# Changelog

All notable changes to Drumlet are documented here.

## [0.1.3.0] - 2026-05-26

### Added
- **Pattern name + credit survive export/import** — `.drumlet` files now embed the song title and "by …" credit, so re-importing a file restores the header inputs instead of dropping them.

### Changed
- **Default track order is now Hihat → Snare → Kick** (top to bottom on the grid and stave) for both fresh patterns and the New pattern button. Hihat keeps its green, snare its orange, kick its red regardless of position.

### Fixed
- **Notation stave cutoff** — the clef and time signature on the first line were eating space inside the stave, so the last beat of a bar was rendered past the final barline. The VexFlow formatter now sizes against the stave's actual note area, keeping every note inside the bar.

## [0.1.2.0] - 2026-05-20

### Added
- **Add to Drumlet** button (signed-in users only) — saves the current pattern into your shared Drumlet library via the ph-apps Directus flows, scoped to your account server-side.
- **+ New pattern** button (desktop + mobile header) — clears the workspace and gives you a fresh 3-track kit (kick, snare, hihat, all TR-808) so you can start a beat without first deleting the default tracks.
- **Song "by" line in the header** — when a preset is loaded or you save to the library, the song name and credit ("by …" or "in the style of …") show inline next to the drumlet logo, with the credit link clickable.
- **Delete-track flow** — a trash icon next to the notation toggle arms delete mode. Pick any track to open a confirmation modal with a "Save first" shortcut (saves to your library if signed in, exports otherwise), a destructive "Delete track" confirm, and Cancel. Removes the track from all pages of the pattern.

### Changed
- **Notation toggle icon** — replaced the busy custom glyph with a simple note icon, swapping to a grid icon while notation view is active so the button always shows what you'll switch *to*.

## [0.1.1.0] - 2026-05-19

### Fixed
- Sign-in no longer surfaces the raw backend "An unexpected error occurred." message. Auth errors now show actionable text by failure type: a 500 reads "Something went wrong on our end. Please try again in a moment.", a rate-limited request reads "Too many attempts. Wait a minute and try again.", and an offline/unreachable server reads "Can't reach the server. Check your connection and try again."
- A transient server error or network blip while restoring a session no longer logs you out — the saved session is kept and re-checked on the next request instead of being discarded on the first hiccup.

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
