# Stock Rhythms — authoring format

Source files: `scripts/stock-rhythms/grooves/*.mjs`, each `export default [ ...grooves ]`.
Build: `npm run build:rhythms` → validates + writes `src/data/stockRhythms.json`
(the portable manifest consumed by the Library panel and embeddable hosts like becreative).

## Groove shape

```js
{
  id: 'rock-basic-8ths',          // kebab-case, globally unique
  name: 'Basic 8th-Note Rock',
  genre: 'Rock',                  // see GENRES in build script
  level: 'beginner',              // 'beginner' | 'intermediate'
  meter: '4/4',                   // see METERS below
  kit: 'acoustic',                // optional: 'acoustic' (default) | 'TR-808' | 'LM-2' — use a drum machine for electronic styles
  tempo: 100,                     // felt pulse (quarter, or dotted quarter in 6/8 & 12/8)
  swing: 0,                       // optional, 0-100. On swing8/swing3 it swings 8ths (67 ≈ triplet);
                                  // on 4/4 & 2/2 it swings 16ths (e.g. 15–35 for hip-hop / neo-soul lilt)
  form: 'AAAB',                   // 4–8 chars; each char = one bar, picks a section below
  sections: {
    A: { hh: 'x-x-x-x-x-x-x-x-', sn: '----X-------X---', bd: 'X-------X-x-----' },
    B: { hh: 'x-x-x-x-x-x-x-x-', sn: '----X-------X-xx', bd: 'X-------X-x-----', ft: '-------------x--' },
  },
  description: 'One or two sentences: what it is, where you hear it.',
  tip: 'One practical practice tip.',
  tags: ['backbeat', '8ths'],     // optional
}
```

Every voice used in ANY section appears as a track; sections that omit a voice get silence for it.
Track order in the grid = first-seen order across sections, so list cymbals first, kick last.

## Step strings

One char per step. Length must equal the meter's steps-per-bar.
- `-` rest
- `g` ghost (velocity 1)
- `x` normal (velocity 2)
- `X` accent (velocity 3)

## Meters

| meter    | steps/bar | grid        | notes |
|----------|-----------|-------------|-------|
| `4/4`    | 16        | 16ths       | default straight feel |
| `swing8` | 8         | swung 8ths  | 4/4, set `swing` (~60–67). Shuffle, jazz, swing |
| `swing3` | 6         | swung 8ths  | 3/4 jazz waltz, set `swing` |
| `12/8`   | 12        | 8ths        | 4 dotted-quarter beats; tempo = dotted-quarter pulse |
| `6/8`    | 6         | 8ths        | 2 dotted-quarter beats |
| `3/4`    | 12        | 16ths       | waltz etc. |
| `2/2`    | 16        | 16ths       | cut-time (samba, 2-beat, polka) — 16th grid, tempo = half-note pulse |

## Voices

Sources below are for the default `acoustic` kit; `TR-808` and `LM-2` map every voice to that machine's nearest sound (see KITS in the build script).

Kit (Acoustic Kit 1): `bd` kick, `sn` snare, `xs` cross-stick, `hh` closed hat, `ho` open hat,
`hf` hat foot, `rd` ride, `rb` ride bell, `cr` crash, `t1` high tom, `ft` floor tom.

Percussion (TR-808): `cb` cowbell, `cl` clave, `ch` conga high, `cm` conga mid, `cg` conga low,
`sh` shaker/maraca, `cp` clap, `ts` timbale shell / cascara (rimshot).
