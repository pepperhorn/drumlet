# Rhythm Challenge App — Claude Code Implementation Plan

## Overview
A browser-based rhythm game where users build patterns on a 16-step sequencer, then perform them live (keyboard or MIDI) for accuracy scoring. Users share rhythms to challenge friends.

**Stack:** Single-file React artifact (.jsx) with Tailwind, smplr (DrumMachine), Web Audio API, Web MIDI API
**Target:** Desktop browser (Chrome/Edge for best Web Audio support)

---

## Sound Engine: smplr

### Why smplr
- Zero-setup sample library — all samples hosted on GitHub Pages CDN, no server needed
- Built on native Web Audio API `AudioContext` — no conflicts, no wrapper overhead
- `DrumMachine` class provides real drum machine samples with grouped instruments and variations
- Accepts `time` parameter on `.start()` tied to `AudioContext.currentTime` — enables sample-accurate scheduled playback
- MIT licensed, ~386KB, actively maintained

### Available Drum Machines (via `getDrumMachineNames()`)
| Kit | Character | Good For |
|-----|-----------|----------|
| **TR-808** | Deep boomy kick, analog hats, iconic | Hip-hop, trap, classic |
| **Casio-RZ1** | Crunchy 12-bit, lo-fi digital | Retro, lo-fi beats |
| **LM-2** | LinnDrum — tight, punchy, 80s studio | Pop, new wave, funk |
| **MFB-512** | Gritty analog, raw European | Techno, industrial |
| **Roland CR-8000** | Vintage preset rhythms, warm | Disco, italo, retro |

### Key API Surface
```javascript
import { DrumMachine, getDrumMachineNames } from "smplr";

// Shared AudioContext — one context for everything
const context = new AudioContext();

// Load a kit (samples fetch from CDN automatically)
const drums = new DrumMachine(context, { instrument: "TR-808" });
await drums.load; // wait for all samples

// Discover available sounds
drums.getGroupNames();       // => ['kick', 'snare', 'hihat', 'clap', ...]
drums.getSampleNames();      // => ['kick-1', 'kick-2', 'snare-1', ...]
drums.getVariations("kick"); // => ['kick-1', 'kick-2']

// Trigger immediately
drums.start({ note: "kick" });

// Schedule precisely (for sequencer)
drums.start({ note: "snare", time: context.currentTime + 0.5 });

// Volume & effects
drums.output.setVolume(100);
// drums.output.addEffect("reverb", new Reverb(context), 0.2);
```

### Why NOT Tone.js
- Tone.js creates its own `AudioContext` — reconciling with smplr's context adds complexity
- Tone.js Transport scheduler is convenient but overkill; the Chris Wilson look-ahead pattern is ~30 lines
- Tone.js adds 150KB+ for features we won't use (synths, effects, signal routing)
- Neither Tone.js nor smplr help with mic onset detection — that's raw Web Audio API regardless
- smplr's `.start({ time })` already gives us precise scheduling without Tone

### What smplr Does NOT Cover (raw Web Audio API needed)
- **Transport/Scheduler** — the sequencer clock (look-ahead scheduler pattern)
- **Mic input** — `getUserMedia()` + `AudioWorkletProcessor` for onset detection
- **FFT analysis** — `AnalyserNode` for spectral classification of live drum hits
- **Metronome click** — simple oscillator beep for count-in (trivial to build)

---

## Phase 1 — Sequencer Engine & Playback

### 1.1 Audio Engine (`useAudioEngine` hook)
- Create a shared `AudioContext` (lazy-init on first user gesture via `context.resume()`)
- Initialize `DrumMachine` from smplr with default kit (TR-808)
- Await `drums.load` before enabling playback
- On kit change: create new `DrumMachine` instance with selected instrument, await load
- Expose loaded state, current kit name, available group names
- Expose `bpm` state (default 100, range 60–180)

### 1.2 Kit & Sound Selection
- Kit selector dropdown: TR-808, Casio-RZ1, LM-2, MFB-512, Roland CR-8000
- When kit loads, dynamically read `drums.getGroupNames()` to populate available sounds
- Each row gets a sound selector dropdown populated from current kit's groups
- Support sample variations: if user picks "kick", randomly select from variations on each trigger for humanization (optional toggle)
- Show loading spinner while kit samples fetch from CDN

### 1.3 Sequencer State
- Grid data structure: `Map<rowId, boolean[16]>` — each row is one instrument, 16 steps
- Provide `toggleStep(rowId, stepIndex)` to flip cells
- Rows are ordered; each row has: `{ id, label, groupName, color }`
- `groupName` maps directly to smplr group (e.g., "kick", "snare", "hihat")
- Start with 3 rows (Kick, Snare, HH). Allow adding rows up to 6.
- Store active step index for playhead animation

### 1.4 Transport & Scheduling
- Use the "look-ahead scheduler" pattern (Chris Wilson / WAA timing):
  - `setInterval` at 25ms checks if next step's audio time falls within a 100ms look-ahead window
  - Schedule via `drums.start({ note: groupName, time: exactTime })` for sample-accurate timing
  - Update `currentStep` state via `requestAnimationFrame` for visual sync (decoupled from audio)
- Transport controls: Play / Stop / BPM slider
- Loop playback (steps 1–16 repeat)
- Scheduler state stored in `useRef` (not React state) to avoid re-render jitter

### 1.5 Sequencer UI
- Grid layout: rows × 16 columns
- Each cell is a toggle button, lit in the row's accent color when active
- Beat grouping: subtle visual separator every 4 steps (groups of 4)
- Playhead: highlight current column during playback
- Row headers show instrument name + assigned key badge
- Add/remove row controls
- Sound selector dropdown per row (populated from `drums.getGroupNames()`)
- Kit selector (top-level, changes all available sounds)
- BPM control with tap-tempo button
- Loading indicator while smplr fetches samples

**Deliverable:** A working step sequencer with real drum machine samples and kit switching.

---

## Phase 2 — Keyboard Input & Performance Mode

### 2.1 Key Mapping System
- Default mapping: each row assigns a keyboard key (e.g., row 0 = `D`, row 1 = `F`, row 2 = `J`)
- Show key binding badge on each row header
- Allow rebinding via click-to-assign flow
- `useKeyboardInput` hook: listen `keydown`/`keyup`, debounce rapid repeats, emit `{ rowId, timestamp }`
- On keydown: also trigger `drums.start({ note: groupName })` for immediate audible feedback

### 2.2 MIDI Input (Progressive Enhancement)
- `useMIDIInput` hook: request `navigator.requestMIDIAccess()`
- Listen for `midimessage` events (noteOn, velocity > 0)
- MIDI learn mode: user taps a pad → app captures that note number → maps to row
- On MIDI hit: trigger `drums.start({ note: groupName, velocity: midiVelocity })` — smplr supports velocity
- Fall back gracefully if Web MIDI unavailable (just hide the option)

### 2.3 Performance Mode UI
- Switch from "Edit" to "Play" mode
- Show a simplified grid with the playhead advancing
- Upcoming steps highlighted (1–2 steps ahead as visual cue)
- When user hits a key at the right time, flash the cell green
- Misses flash red; extra hits flash orange
- Count-in: 1 bar (4 beats) metronome click before recording starts
  - Metronome: simple `OscillatorNode` (1kHz sine, 30ms) scheduled via `AudioContext.currentTime`
- Performance duration: configurable 1, 2, or 4 loops

**Deliverable:** Users can play along with their pattern using keyboard or MIDI controller.

---

## Phase 3 — Accuracy Scoring Engine

### 3.1 Hit Detection & Matching
- Collect all user input events as `{ rowId, timestampMs }` (using `performance.now()`)
- Collect all expected events from the grid as `{ rowId, expectedTimeMs }` based on BPM and step position
- After performance ends (configurable loops), run matching algorithm:

```
For each expected hit:
  Find closest user hit on same row within ±window
  If found within ±25ms  → PERFECT (100 pts)
  If found within ±50ms  → GREAT (75 pts)
  If found within ±100ms → OK (50 pts)
  If found within ±150ms → LATE/EARLY (25 pts)
  Else                   → MISS (0 pts)
For remaining unmatched user hits → EXTRA (-10 pts each)
```

- Prevent double-matching (greedy nearest-first, then remove matched pairs)

### 3.2 Score Breakdown
- Total score = sum of all hit scores - extra hit penalties
- Max possible score = 100 × number of expected hits
- Percentage accuracy = total / max × 100
- Per-row accuracy breakdown (so user sees "your kick timing is great but hi-hat needs work")
- Timing histogram: distribution of early/late offsets

### 3.3 Score Display
- Results screen after performance completes
- Big accuracy percentage with letter grade (S/A/B/C/D)
- Per-instrument breakdown bars
- Timing scatter plot (x = expected time, y = offset in ms, color = row)
- "Try Again" and "Share Challenge" buttons

**Deliverable:** Complete scoring pipeline with detailed feedback.

---

## Phase 4 — Audio Input Mode (Mic Classification)

### 4.1 Mic Calibration Flow
- Request `getUserMedia({ audio: true })`
- Connect mic stream to the same `AudioContext` used by smplr (critical — one context)
- Step user through calibration: "Hit your KICK drum 3 times"
- For each calibration hit:
  - Detect onset (energy threshold on `AnalyserNode` getFloatTimeDomainData)
  - Capture 50ms window post-onset
  - Run FFT (2048-point) on the window → store magnitude spectrum as reference template
- Average the 3 hits per instrument → `referenceSpectrum[rowId]`
- Repeat for each row (Snare, HH, etc.)
- Show confidence meter during calibration ("good separation" vs "these sound too similar")

### 4.2 Real-Time Onset Detection
- `AudioWorkletProcessor` running at 128-sample blocks (created via Blob URL — no external files):
  - Compute RMS energy per block
  - Detect rising edge: current RMS > threshold AND previous RMS < threshold
  - Apply minimum inter-onset interval (50ms) to avoid retriggering
  - On onset detected: capture next 50ms of audio into ring buffer
  - Post message to main thread with onset timestamp + audio snippet
- **Important:** The AudioWorklet uses the same `AudioContext` as smplr — this works because `getUserMedia` stream connects as a `MediaStreamSourceNode` into the shared context

### 4.3 Instrument Classification
- On main thread, receive onset + audio snippet
- Run 2048-point FFT on the snippet via an `AnalyserNode`
- Compute cosine similarity against each `referenceSpectrum[rowId]`
- Classify as the row with highest similarity (with minimum confidence threshold)
- If below confidence threshold → mark as "unrecognized" (don't penalize or reward)
- Emit `{ classifiedRowId, timestampMs, confidence }` into the same scoring pipeline from Phase 3

### 4.4 Audio Mode UI
- Calibration wizard (step-by-step, one instrument at a time)
- Live input visualizer: real-time waveform + frequency display
- During performance: show detected hits with instrument label + confidence badge
- Classification confidence meter per hit (green = high, yellow = medium)

**Deliverable:** Users can play a real drum kit into a mic and get scored.

---

## Phase 5 — Challenge Sharing System

### 5.1 Challenge Encoding
- Serialize pattern to compact format:
  ```json
  {
    "v": 1,
    "bpm": 120,
    "kit": "TR-808",
    "rows": [
      { "sound": "kick", "steps": "1001000010010000" },
      { "sound": "snare", "steps": "0000100000001000" },
      { "sound": "hihat", "steps": "1010101010101010" }
    ],
    "score": 8750,
    "creator": "Shaun"
  }
  ```
- `sound` field maps directly to smplr group name — receiver loads same kit + sounds
- Encode to base64 → append to URL as hash fragment: `#challenge=eyJ2Ijo...`
- URL is fully self-contained (no backend needed)

### 5.2 Challenge Flow
- On load, check `window.location.hash` for challenge data
- If found: decode → load specified kit via smplr → populate grid → show "Shaun challenges you to beat 8750!"
- User plays → compare score → show win/lose result
- "Create Your Own Challenge" → build pattern, play for score, generate share link

### 5.3 Share UI
- After scoring, show "Challenge a Friend" button
- Generate shareable URL
- Copy-to-clipboard button
- Optional: Web Share API for mobile native share sheet

**Deliverable:** Viral loop — build, play, share, compete.

---

## Phase 6 — Polish & Design

### 6.1 Visual Design Direction
- **Aesthetic:** Dark, hardware-inspired — think Teenage Engineering OP-1 meets arcade cabinet
- Monospace display font for BPM/score readouts
- Neon accent colors per instrument row on dark matte background
- Pixel-grid or dot-matrix texture on the sequencer
- Glow effects on active steps and playhead
- Kit selector styled as hardware switch/knob
- Satisfying micro-animations: cell toggles, hit feedback flashes, score counter roll-up

### 6.2 Audio Polish
- Metronome click sound for count-in (OscillatorNode, not smplr — keeps it distinct)
- Subtle UI sounds: toggle click, mode switch whoosh (tiny OscillatorNode blips)
- smplr handles volume envelopes on samples natively — no click prevention needed

### 6.3 Responsive Considerations
- Primary target: desktop (keyboard input requires it)
- Sequencer grid should be touch-friendly for mobile editing
- Audio input mode works on mobile (good mic access)

---

## Implementation Order for Claude Code

Execute phases sequentially. Each phase should produce a working artifact that builds on the previous.

```
PHASE 1 → sequencer-engine.jsx
  - smplr DrumMachine init, kit selection, grid state, look-ahead scheduler, sequencer UI
  - TEST: Can build and hear a drum pattern with TR-808, switch to LM-2, hear different sounds

PHASE 2 → + keyboard/MIDI input layer
  - Key mapping, performance mode, hit collection, audible feedback via smplr
  - TEST: Can play along with keyboard and see visual feedback + hear the hit sounds

PHASE 3 → + scoring engine
  - Hit matching algorithm, score calculation, results display
  - TEST: Play a pattern, see accuracy breakdown

PHASE 4 → + audio input pipeline
  - Mic calibration, onset detection worklet (Blob URL), spectral classifier
  - All mic audio routed through same AudioContext as smplr
  - TEST: Calibrate 3 drums, play live, see classified hits scored

PHASE 5 → + challenge sharing
  - URL encoding/decoding with kit name, challenge flow, share UI
  - TEST: Create challenge URL, open in new tab, loads correct kit, play and compare

PHASE 6 → + visual/audio polish pass
  - Design system, animations, sound design, responsive
  - TEST: Full flow feels polished and fun
```

### Key Technical Notes for Implementation

1. **Single shared `AudioContext`** — smplr, the scheduler, metronome, and mic input all share one context. Create it once on first user gesture.
2. **smplr import:** `import { DrumMachine, getDrumMachineNames } from "smplr"` — available in the artifact environment. Samples auto-fetch from `smpldsnds.github.io`.
3. **All audio scheduling must use `AudioContext.currentTime`** via `drums.start({ note, time })` — never `setTimeout` for audio timing.
4. **AudioWorklet for onset detection** (Phase 4 only) — `ScriptProcessorNode` is deprecated and higher latency. Create worklet processor via Blob URL since artifact is single-file.
5. **Single file constraint** — all logic, UI, and audio code lives in one .jsx artifact.
6. **State management** — `useReducer` for the sequencer grid, `useRef` for audio timing state that shouldn't trigger re-renders.
7. **The scoring algorithm must run post-performance**, not in real-time, to avoid timing interference.
8. **Kit switching** — when user changes kit, create new `DrumMachine` instance, await `.load`, then update group names in row selectors. Old instance can be discarded (GC handles cleanup).
9. **No Tone.js** — the look-ahead scheduler is simple (~30 lines), and smplr's `.start({ time })` provides all the precision we need.

### smplr Integration Checklist
- [ ] `getDrumMachineNames()` → populate kit selector
- [ ] `new DrumMachine(context, { instrument })` → init on kit select
- [ ] `await drums.load` → show loading state
- [ ] `drums.getGroupNames()` → populate per-row sound selectors
- [ ] `drums.start({ note: groupName, time })` → sequencer playback
- [ ] `drums.start({ note: groupName })` → immediate trigger on keyboard/MIDI hit
- [ ] `drums.start({ note: groupName, velocity })` → MIDI velocity support
- [ ] `drums.output.setVolume(n)` → master volume control
- [ ] `drums.getVariations(group)` → optional humanization (random variation per trigger)
