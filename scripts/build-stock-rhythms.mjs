#!/usr/bin/env node
/**
 * Build the Stock Rhythms manifest.
 *
 * Reads compact groove sources from scripts/stock-rhythms/grooves/*.mjs,
 * validates them, expands each `form` into per-bar step strings, and writes
 * src/data/stockRhythms.json — a framework-free manifest that Drumlet's
 * Library (and embedding hosts) hydrate into sequencer state.
 *
 * See scripts/stock-rhythms/README.md for the authoring format.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'scripts/stock-rhythms/grooves');
const OUT_FILE = join(ROOT, 'src/data/stockRhythms.json');

/** Display order for genres in the Library. */
export const GENRES = [
  'Rock',
  'Pop',
  'Metal & Punk',
  'Country & Folk',
  'Blues & Shuffle',
  'Jazz',
  'Funk',
  'Soul & R&B',
  'Hip-Hop',
  'Disco & Dance',
  'Gospel & New Orleans',
  'Reggae & Ska',
  'Afro-Cuban',
  'Latin Ballroom',
  'Brazilian',
  'Caribbean',
  'African',
];

const LEVELS = ['beginner', 'intermediate'];

/** meter → sequencer timing fields. bpmFactor converts felt pulse → engine bpm. */
const METERS = {
  '4/4':    { label: '4/4',  stepsPerBar: 16, beatsPerBar: 4,  noteValue: '1/4', stepValue: '1/16', bpmFactor: 1 },
  'swing8': { label: '4/4',  stepsPerBar: 8,  beatsPerBar: 4,  noteValue: '1/4', stepValue: '1/8',  bpmFactor: 1 },
  'swing3': { label: '3/4',  stepsPerBar: 6,  beatsPerBar: 3,  noteValue: '1/4', stepValue: '1/8',  bpmFactor: 1 },
  '12/8':   { label: '12/8', stepsPerBar: 12, beatsPerBar: 12, noteValue: '1/8', stepValue: '1/8',  bpmFactor: 3 },
  '6/8':    { label: '6/8',  stepsPerBar: 6,  beatsPerBar: 6,  noteValue: '1/8', stepValue: '1/8',  bpmFactor: 3 },
  '3/4':    { label: '3/4',  stepsPerBar: 12, beatsPerBar: 3,  noteValue: '1/4', stepValue: '1/16', bpmFactor: 1 },
  '2/2':    { label: '2/2',  stepsPerBar: 16, beatsPerBar: 2,  noteValue: '1/2', stepValue: '1/16', bpmFactor: 1 },
};

const KIT = (sample) => ({ sourceType: 'kit', kitId: 'acoustic1', kitSample: sample, instrument: null, group: sample });
const MACHINE = (instrument, group) => ({ sourceType: 'drumMachine', kitId: null, kitSample: null, instrument, group });
const TR808 = (group) => MACHINE('TR-808', group);
const LM2 = (group) => MACHINE('LM-2', group);

const VOICE_NAMES = {
  hh: 'Hi-hat', ho: 'Open Hat', hf: 'Hat Foot', rd: 'Ride', rb: 'Ride Bell', cr: 'Crash',
  sn: 'Snare', xs: 'Cross-stick', t1: 'High Tom', ft: 'Floor Tom', bd: 'Kick',
  cb: 'Cowbell', cl: 'Clave', ts: 'Cascara', ch: 'Conga Hi', cm: 'Conga Mid', cg: 'Conga Low',
  sh: 'Shaker', cp: 'Clap',
};

/** Auxiliary percussion has no acoustic samples, so the acoustic kit borrows the 808's. */
const PERCUSSION_808 = {
  cb: TR808('cowbell'), cl: TR808('clave'), ts: TR808('rimshot'),
  ch: TR808('conga-hi'), cm: TR808('conga-mid'), cg: TR808('conga-low'),
  sh: TR808('maraca'), cp: TR808('clap'),
};

/**
 * Kit → voice key → sound source. Acoustic is the default; electronic styles
 * (synth-pop, house, techno, trap, dembow…) opt into a drum machine via `kit`.
 */
const KITS = {
  acoustic: {
    label: 'Acoustic Kit',
    voices: {
      hh: KIT('hh-closed1'), ho: KIT('hh-open'), hf: KIT('hh-foot'),
      rd: KIT('ride'), rb: KIT('ride-bell'), cr: KIT('crash'),
      sn: KIT('snare-on1'), xs: KIT('crossstick'),
      t1: KIT('hi-tom'), ft: KIT('floor-tom'), bd: KIT('kick'),
      ...PERCUSSION_808,
    },
  },
  'TR-808': {
    label: 'TR-808',
    voices: {
      hh: TR808('hihat-close'), ho: TR808('hihat-open'), hf: TR808('hihat-close'),
      rd: TR808('cymbal'), rb: TR808('cymbal'), cr: TR808('cymbal'),
      sn: TR808('snare'), xs: TR808('rimshot'),
      t1: TR808('tom-hi'), ft: TR808('tom-low'), bd: TR808('kick'),
      ...PERCUSSION_808,
    },
  },
  'LM-2': {
    label: 'LM-2',
    voices: {
      hh: LM2('hhclosed'), ho: LM2('hhopen'), hf: LM2('hhclosed-short'),
      rd: LM2('ride'), rb: LM2('ride'), cr: LM2('crash'),
      sn: LM2('snare-m'), xs: LM2('stick-m'),
      t1: LM2('tom-h'), ft: LM2('tom-l'), bd: LM2('kick'),
      cb: LM2('cowbell'), cl: LM2('stick-h'), ts: LM2('stick-l'),
      ch: LM2('conga-h'), cm: LM2('conga-m'), cg: LM2('conga-l'),
      sh: LM2('cabasa'), cp: LM2('clap'),
    },
  },
};

const CHAR_TO_VEL = { '-': '0', g: '1', x: '2', X: '3' };

function fail(id, msg) {
  throw new Error(`[${id}] ${msg}`);
}

function buildGroove(src, seenIds) {
  const id = src.id;
  if (!id || !/^[a-z0-9-]+$/.test(id)) fail(id ?? '?', 'id must be kebab-case');
  if (seenIds.has(id)) fail(id, 'duplicate id');
  seenIds.add(id);
  if (!src.name) fail(id, 'missing name');
  if (!GENRES.includes(src.genre)) fail(id, `unknown genre "${src.genre}"`);
  if (!LEVELS.includes(src.level)) fail(id, `level must be one of ${LEVELS.join(', ')}`);
  const meter = METERS[src.meter];
  if (!meter) fail(id, `unknown meter "${src.meter}"`);
  if (!Number.isFinite(src.tempo) || src.tempo <= 0) fail(id, 'tempo must be a positive number');
  const bpm = Math.round(src.tempo * meter.bpmFactor);
  if (bpm < 20 || bpm > 300) fail(id, `engine bpm ${bpm} out of range 20–300 (tempo ${src.tempo} × ${meter.bpmFactor})`);
  if (!src.description || !src.tip) fail(id, 'description and tip are required');

  const form = src.form ?? '';
  if (form.length < 4 || form.length > 8) fail(id, `form "${form}" must be 4–8 bars`);
  const sections = src.sections ?? {};
  for (const key of form) if (!sections[key]) fail(id, `form references missing section "${key}"`);

  // Voice order = first-seen across sections in form order.
  const voiceOrder = [];
  for (const key of [...new Set(form)]) {
    for (const [voice, steps] of Object.entries(sections[key])) {
      if (!VOICE_NAMES[voice]) fail(id, `unknown voice "${voice}" in section ${key}`);
      if (typeof steps !== 'string' || steps.length !== meter.stepsPerBar) {
        fail(id, `section ${key}.${voice} must be ${meter.stepsPerBar} steps (got ${steps?.length})`);
      }
      if (!/^[-gxX]+$/.test(steps)) fail(id, `section ${key}.${voice} has invalid chars: "${steps}"`);
      if (!voiceOrder.includes(voice)) voiceOrder.push(voice);
    }
  }
  if (voiceOrder.length === 0) fail(id, 'no voices');

  const kitKey = src.kit ?? 'acoustic';
  const kit = KITS[kitKey];
  if (!kit) fail(id, `unknown kit "${kitKey}" (expected ${Object.keys(KITS).join(', ')})`);

  const rest = '-'.repeat(meter.stepsPerBar);
  const tracks = voiceOrder.map((voice) => ({
    voice,
    name: VOICE_NAMES[voice],
    source: kit.voices[voice],
    velMode: 3,
    bars: [...form].map((key) =>
      [...(sections[key][voice] ?? rest)].map((c) => CHAR_TO_VEL[c]).join('')),
  }));

  return {
    id,
    name: src.name,
    genre: src.genre,
    level: src.level,
    timeSignature: meter.label,
    tempo: src.tempo,
    bpm,
    beatsPerBar: meter.beatsPerBar,
    noteValue: meter.noteValue,
    stepValue: meter.stepValue,
    stepsPerBar: meter.stepsPerBar,
    kit: kitKey,
    kitLabel: kit.label,
    swing: src.swing ?? 0,
    swingTarget: '8th',
    barCount: form.length,
    form,
    description: src.description,
    tip: src.tip,
    tags: src.tags ?? [],
    tracks,
  };
}

async function main() {
  const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.mjs')).sort();
  const seenIds = new Set();
  const rhythms = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(join(SOURCE_DIR, file)).href);
    for (const src of mod.default) rhythms.push(buildGroove(src, seenIds));
  }

  const levelRank = (l) => LEVELS.indexOf(l);
  rhythms.sort((a, b) =>
    GENRES.indexOf(a.genre) - GENRES.indexOf(b.genre)
    || levelRank(a.level) - levelRank(b.level)
    || a.name.localeCompare(b.name));

  const manifest = {
    _format: 'drumlet-stock-rhythms-v1',
    _note: 'Generated by scripts/build-stock-rhythms.mjs — do not edit by hand. Each track has one step string per bar (velocity 0-3); bars load as chained pages. bpm is engine bpm (eighth-note pulse for 6/8 and 12/8); tempo is the felt pulse.',
    genres: GENRES.filter((g) => rhythms.some((r) => r.genre === g)),
    rhythms,
  };
  writeFileSync(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`);

  const byGenre = manifest.genres.map((g) => `${g}: ${rhythms.filter((r) => r.genre === g).length}`);
  console.log(`Wrote ${rhythms.length} rhythms → ${OUT_FILE}\n  ${byGenre.join('\n  ')}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
