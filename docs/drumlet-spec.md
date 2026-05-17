# Drumlet File Format — Specification

Status: **stable** — format version `5`.

A `.drumlet` file is the portable representation of a Drumlet project: tempo,
time signature, instrument voices, and the step grid. It is also what the
**Export** button downloads and what **Import** reads.

- **MIME type:** `application/dottl+json`
- **Extension:** `.drumlet` (importer also accepts `.dottl`, `.json`)
- **Encoding:** UTF-8 JSON, pretty-printed (2-space indent)
- **Canonical implementation:** `src/state/projectSerializer.ts`
- **JSON Schema:** `DRUMLET_JSON_SCHEMA` in `src/state/drumletSchema.ts`

## Design

A `.drumlet` file is a **dottl-spec v5** document (the cross-tool interchange
format shared with [griddl](https://github.com/pepperhorn/griddl)) plus a
`drumlet` **extension block**.

| Region | Purpose | Consumers |
|---|---|---|
| Top-level dottl-spec fields (`layers`, `sections`, `timeSignature`, …) | Portable, lossy projection of the pattern as positioned notes | Any dottl-aware tool, generic importers |
| `extensions.drumlet` | Loss-free Drumlet state (raw grid, pages, sources) | Drumlet itself |

**Import precedence:** if `extensions.drumlet` is present it is authoritative
and the dottl layers are ignored. Without it, the importer reconstructs a
best-effort grid from `layers[].notes` (drum layers only).

This dual representation is why exporting and re-importing in Drumlet is
loss-free, while exporting *to* another dottl tool degrades gracefully to
positioned notes.

## Top-level object

| Field | Type | Notes |
|---|---|---|
| `version` | integer | dottl-spec version. Drumlet writes `5`. |
| `projectName` | string | Display name. Drumlet writes `"Drumlet Project"`; the download filename is its slug. |
| `bpm` | number | Tempo, beats per minute. |
| `divisor` | integer | Beat-subdivision hint. Drumlet writes `4`. |
| `timeSignature` | object | `{ numerator: int, denominator: NoteValueKey }`. |
| `transposition` | integer | Semitone transposition. `0` for drums. |
| `difficulty` | null | Reserved. |
| `layers` | Layer[] | One entry per voice (see below). |
| `markers` | array | Reserved. Drumlet writes `[]`. |
| `sections` | Section[] | Page boundaries. |
| `chords` | array | Reserved. Drumlet writes `[]`. |
| `extensions.drumlet` | object | The Drumlet extension block. |

### `NoteValueKey`

One of: `"1/32"`, `"1/16"`, `"1/8"`, `"1/4"`, `"d1/4"`, `"1/2"`.
`"d1/4"` is a dotted quarter.

### Layer

A single instrument voice. `id` matches the Drumlet track id, so a track that
appears on multiple pages is **one** layer whose notes span all pages.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Track id. |
| `name` | string | Track name. |
| `color` | string | Hex color. |
| `instrumentCategory` | string | Drumlet writes `"Drums"`. |
| `smplrLibrary` | enum | `"DrumMachine"` \| `"Soundfont"` \| `"Sampler"`. |
| `smplrPatch` | string | Instrument / soundfont / sample name. |
| `volume` | number | |
| `reverb` | number | |
| `notes` | Note[] | Sounded cells (silent cells are omitted). |
| `lines` | array | Reserved. Drumlet writes `[]`. |

### Note

A sounded cell projected to a **1-based global column** (`col`), i.e. the
per-page column plus `pageIndex * stepsPerPage`. Drums use pitch `name: "C"`,
`octave: 4`. Split cells emit one note per active sub-step carrying `subCol`
(0-based) and `subCount`.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `name` | string | Pitch name (`"C"` for drums). |
| `col` | integer ≥ 1 | Global column. |
| `subCol` | integer ≥ 0 | Optional. Sub-step index in a split cell. |
| `subCount` | integer ≥ 2 | Optional. Sub-steps in the split cell. |
| `row`, `octave` | integer | `0` / `4` for drums. |
| `isRoot`, `isStartNote` | boolean | `false` for drums. |
| `sustainCells` | integer ≥ 0 | `0` for drums. |
| `velocity` | number | Drumlet velocity model (`1` / `2` / `3` …). |

### Section

One per page, anchored to the page's first global column.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Page id. |
| `col` | integer ≥ 1 | `pageIndex * stepsPerPage + 1`. |
| `name` | string | Page name. |

## `extensions.drumlet`

The loss-free state. **This is what Drumlet reads on import.**

| Field | Type | Notes |
|---|---|---|
| `stepsPerPage` | integer | Columns per page (e.g. `16`). |
| `stepValue` | NoteValueKey | Grid resolution. |
| `beatsPerBar` | integer | |
| `noteValue` | NoteValueKey | Beat unit. |
| `swingTarget` | enum | `"8th"` \| `"16th"`. |
| `chainMode` | boolean | |
| `rawPageSteps` | object | `pageId → (trackId → Step[])`. The authoritative grid. |
| `pages` | `{id, name}[]` | Page order and names. |
| `trackSources` | TrackSource[] | Page-independent sound bindings. |

### Step

A single grid cell. Three forms:

- **number** — primitive velocity; `0` means the cell is off.
- **number[]** — legacy split bank (one velocity per sub-division).
- **MultiStep** — split cell with per-division banks:

```jsonc
{
  "v": 2,                 // primitive velocity when not split
  "active": 3,            // active split count: 2 | 3 | 4
  "s": {                  // velocity banks keyed by split count
    "3": [2, 0, 2]
  }
}
```

### TrackSource

| Field | Type | Notes |
|---|---|---|
| `id` | string | Matches a layer / track id. |
| `sourceType` | enum | `"drumMachine"` \| `"soundfont"` \| `"kit"` \| `"custom"`. |
| `instrument` | string \| null | Drum-machine model (e.g. `"TR-808"`). |
| `group` | string \| null | Drum group (e.g. `"kick"`). |
| `soundfontName` | string \| null | |
| `customSampleName` | string \| null | |
| `color` | string | Hex color. |
| `mute`, `solo` | boolean | |

> Custom-sample audio buffers are **not** embedded; only the sample name is
> stored. Re-importing a project that used a dropped sample will need the
> sample re-supplied.

## Transport channels

The same payload travels through three channels:

| Channel | Form | Entry point |
|---|---|---|
| File | `.drumlet` JSON download/upload | `exportToFile` / `importFromFile` |
| `#dottl=` hash | base64url of the raw dottl JSON | `loadDottlFromHash` |
| Share link | encoded shared payload (may wrap plugin meta) | `loadSharedPayload` |

On load, `#dottl=` takes precedence over a share payload; both are normalized
through `normalizeSequencerState`.

## Minimal example

```json
{
  "version": 5,
  "projectName": "Drumlet Project",
  "bpm": 120,
  "divisor": 4,
  "timeSignature": { "numerator": 4, "denominator": "1/4" },
  "transposition": 0,
  "difficulty": null,
  "layers": [
    {
      "id": "trk-kick",
      "name": "Kick",
      "color": "#5BC0EB",
      "instrumentCategory": "Drums",
      "smplrLibrary": "DrumMachine",
      "smplrPatch": "TR-808",
      "volume": 80,
      "reverb": 20,
      "notes": [
        { "id": "trk-kick-p0-n0", "name": "C", "col": 1, "row": 0, "octave": 4,
          "isRoot": false, "isStartNote": false, "sustainCells": 0, "velocity": 2 }
      ],
      "lines": []
    }
  ],
  "markers": [],
  "sections": [{ "id": "pg-1", "col": 1, "name": "Page 1" }],
  "chords": [],
  "extensions": {
    "drumlet": {
      "stepsPerPage": 16,
      "stepValue": "1/16",
      "beatsPerBar": 4,
      "noteValue": "1/4",
      "swingTarget": "8th",
      "chainMode": false,
      "rawPageSteps": {
        "pg-1": { "trk-kick": [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
      },
      "pages": [{ "id": "pg-1", "name": "Page 1" }],
      "trackSources": [
        { "id": "trk-kick", "sourceType": "drumMachine", "instrument": "TR-808",
          "group": "kick", "soundfontName": null, "customSampleName": null,
          "color": "#5BC0EB", "mute": false, "solo": false }
      ]
    }
  }
}
```

## Versioning

`version: 5` is the current dottl-spec level Drumlet emits. Importers must
tolerate unknown top-level and extension fields (forward-compatible). New
optional fields should not break older readers; breaking changes bump
`version`.
