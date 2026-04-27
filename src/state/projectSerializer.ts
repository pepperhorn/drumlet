import { v4 as uuid } from 'uuid';
import { effectiveStep } from '../util/stepHelpers.js';
import type { SequencerState, Step, Track, NoteValueKey } from './sequencerReducer.js';

const effectiveStepFn = effectiveStep as (s: Step) => number | number[];

interface DottlNote {
  id: string;
  name: string;
  col: number;
  subCol?: number;
  subCount?: number;
  row: number;
  octave: number;
  isRoot: boolean;
  isStartNote: boolean;
  sustainCells: number;
  velocity: number;
}

interface DottlLayer {
  id: string;
  name: string;
  color: string;
  instrumentCategory: string;
  smplrLibrary: 'DrumMachine' | 'Soundfont' | 'Sampler';
  smplrPatch: string;
  volume: number;
  reverb: number;
  notes: DottlNote[];
  lines: unknown[];
}

interface DottlSection {
  id: string;
  col: number;
  name: string;
}

export interface DottlProject {
  version: number;
  projectName: string;
  bpm: number;
  divisor: number;
  timeSignature: { numerator: number; denominator: string };
  transposition: number;
  difficulty: null;
  layers: DottlLayer[];
  markers: unknown[];
  sections: DottlSection[];
  chords: unknown[];
  extensions: {
    drumlet: {
      stepsPerPage: number;
      stepValue: string;
      beatsPerBar: number;
      noteValue: string;
      swingTarget: string;
      chainMode: boolean;
      rawPageSteps: Record<string, Record<string, Step[]>>;
      pages: { id: string; name: string }[];
      trackSources: TrackSource[];
    };
  };
}

interface TrackSource {
  id: string;
  sourceType: string;
  instrument: string | null;
  group: string | null;
  soundfontName: string | null;
  customSampleName: string | null;
  color: string;
  mute: boolean;
  solo: boolean;
}

export function serializeProject(state: SequencerState): DottlProject {
  const layers: DottlLayer[] = [];

  for (const page of state.pages) {
    for (const track of page.tracks) {
      let layer = layers.find((l) => l.id === track.id);
      if (!layer) {
        layer = {
          id: track.id,
          name: track.name,
          color: track.color,
          instrumentCategory: 'Drums',
          smplrLibrary: track.sourceType === 'drumMachine' ? 'DrumMachine'
            : track.sourceType === 'soundfont' ? 'Soundfont'
            : 'Sampler',
          smplrPatch: track.instrument || track.soundfontName || track.name,
          volume: track.volume,
          reverb: track.reverb,
          notes: [],
          lines: [],
        };
        layers.push(layer);
      }
    }
  }

  state.pages.forEach((page, pageIdx) => {
    const pageOffset = pageIdx * state.stepsPerPage;
    for (const track of page.tracks) {
      const layer = layers.find((l) => l.id === track.id);
      if (!layer) continue;

      track.steps.slice(0, state.stepsPerPage).forEach((rawStep, col) => {
        const stepData = effectiveStepFn(rawStep);
        if (Array.isArray(stepData)) {
          stepData.forEach((subVel, subIdx) => {
            if (subVel > 0) {
              layer.notes.push({
                id: `${track.id}-p${pageIdx}-n${col}-s${subIdx}`,
                name: 'C',
                col: pageOffset + col,
                subCol: subIdx,
                subCount: stepData.length,
                row: 0,
                octave: 0,
                isRoot: false,
                isStartNote: false,
                sustainCells: 0,
                velocity: subVel,
              });
            }
          });
        } else if (stepData > 0) {
          layer.notes.push({
            id: `${track.id}-p${pageIdx}-n${col}`,
            name: 'C',
            col: pageOffset + col,
            row: 0,
            octave: 0,
            isRoot: false,
            isStartNote: false,
            sustainCells: 0,
            velocity: stepData,
          });
        }
      });
    }
  });

  const sections: DottlSection[] = state.pages.map((page, i) => ({
    id: page.id,
    col: i * state.stepsPerPage,
    name: page.name,
  }));

  return {
    version: 5,
    projectName: 'Drumlet Project',
    bpm: state.bpm,
    divisor: 4,
    timeSignature: { numerator: state.beatsPerBar || 4, denominator: state.noteValue || '1/4' },
    transposition: 0,
    difficulty: null,
    layers,
    markers: [],
    sections,
    chords: [],
    extensions: {
      drumlet: {
        stepsPerPage: state.stepsPerPage,
        stepValue: state.stepValue || '1/16',
        beatsPerBar: state.beatsPerBar || 4,
        noteValue: state.noteValue || '1/4',
        swingTarget: state.swingTarget || '8th',
        chainMode: state.chainMode,
        rawPageSteps: Object.fromEntries(
          state.pages.map((p) => [
            p.id,
            Object.fromEntries(p.tracks.map((t) => [t.id, t.steps])),
          ])
        ),
        pages: state.pages.map((p) => ({
          id: p.id,
          name: p.name,
        })),
        trackSources: state.pages[0]?.tracks.map((t): TrackSource => ({
          id: t.id,
          sourceType: t.sourceType,
          instrument: t.instrument,
          group: t.group,
          soundfontName: t.soundfontName,
          customSampleName: t.customSampleName,
          color: t.color,
          mute: t.mute,
          solo: t.solo,
        })) ?? [],
      },
    },
  };
}

export function deserializeProject(json: DottlProject): Partial<SequencerState> {
  const ext = json.extensions?.drumlet;

  if (ext) {
    const stepsPerPage = ext.stepsPerPage || 16;
    const pages = ext.pages.map((pageRef, pageIdx) => {
      const pageOffset = pageIdx * stepsPerPage;
      const tracks = ext.trackSources.map((src): Partial<Track> & { id: string; name: string; steps: Step[] } => {
        const layer = json.layers.find((l) => l.id === src.id);
        const rawSteps = ext.rawPageSteps?.[pageRef.id]?.[src.id];
        let steps: Step[];
        if (Array.isArray(rawSteps)) {
          steps = rawSteps.slice(0, stepsPerPage);
          while (steps.length < stepsPerPage) steps.push(0);
        } else {
          steps = new Array<Step>(stepsPerPage).fill(0);
          if (layer) {
            for (const note of layer.notes) {
              const localCol = note.col - pageOffset;
              if (localCol >= 0 && localCol < stepsPerPage) {
                if ((note.subCount ?? 0) > 0 && note.subCol != null) {
                  const cur = steps[localCol];
                  if (!Array.isArray(cur)) {
                    steps[localCol] = new Array<number>(note.subCount!).fill(0);
                  }
                  (steps[localCol] as number[])[note.subCol] = note.velocity || 2;
                } else {
                  steps[localCol] = note.velocity || 2;
                }
              }
            }
          }
        }

        return {
          id: src.id,
          name: layer?.name || src.group || 'Track',
          color: src.color || layer?.color || '#5BC0EB',
          sourceType: src.sourceType,
          instrument: src.instrument,
          group: src.group,
          soundfontName: src.soundfontName,
          customSampleName: src.customSampleName,
          volume: layer?.volume ?? 80,
          reverb: layer?.reverb ?? 20,
          mute: src.mute || false,
          solo: src.solo || false,
          steps,
        };
      });

      return { id: pageRef.id, name: pageRef.name, tracks };
    });

    return {
      pages: pages as unknown as SequencerState['pages'],
      currentPageIndex: 0,
      stepsPerPage,
      bpm: json.bpm || 120,
      beatsPerBar: ext.beatsPerBar || 4,
      noteValue: (ext.noteValue || '1/4') as NoteValueKey,
      stepValue: (ext.stepValue || '1/16') as NoteValueKey,
      swing: 0,
      swingTarget: (ext.swingTarget === '16th' ? '16th' : '8th'),
      humanize: 0,
      chainMode: ext.chainMode || false,
    };
  }

  // Generic dottl-spec v5 import (best effort for drum layers)
  const stepsPerPage = json.divisor === 4 ? 16 : json.divisor === 3 ? 12 : 16;
  const maxCol = Math.max(0, ...json.layers.flatMap((l) => l.notes.map((n) => n.col)));
  const numPages = Math.max(1, Math.ceil((maxCol + 1) / stepsPerPage));

  const pages = Array.from({ length: numPages }, (_, pageIdx) => {
    const pageOffset = pageIdx * stepsPerPage;
    const tracks = json.layers
      .filter((l) => l.instrumentCategory === 'Drums' || !l.instrumentCategory)
      .map((layer, i) => {
        const steps = new Array<Step>(stepsPerPage).fill(0);
        for (const note of layer.notes) {
          const localCol = note.col - pageOffset;
          if (localCol >= 0 && localCol < stepsPerPage) {
            steps[localCol] = note.velocity || 2;
          }
        }
        return {
          id: layer.id || uuid(),
          name: layer.name || `Track ${i + 1}`,
          color: layer.color || '#5BC0EB',
          sourceType: layer.smplrLibrary === 'DrumMachine' ? 'drumMachine'
            : layer.smplrLibrary === 'Soundfont' ? 'soundfont' : 'drumMachine',
          instrument: layer.smplrPatch || 'TR-808',
          group: layer.smplrPatch?.toLowerCase() || 'kick',
          soundfontName: layer.smplrLibrary === 'Soundfont' ? layer.smplrPatch : null,
          customSampleName: null,
          volume: layer.volume ?? 80,
          reverb: layer.reverb ?? 20,
          mute: false,
          solo: false,
          steps,
        };
      });

    return {
      id: json.sections?.[pageIdx]?.id || uuid(),
      name: json.sections?.[pageIdx]?.name || `Page ${pageIdx + 1}`,
      tracks,
    };
  });

  return {
    pages: pages as unknown as SequencerState['pages'],
    currentPageIndex: 0,
    stepsPerPage,
    bpm: json.bpm || 120,
    beatsPerBar: json.timeSignature?.numerator || 4,
    noteValue: (json.timeSignature?.denominator || '1/4') as NoteValueKey,
    stepValue: (stepsPerPage === 16 ? '1/16' : '1/8') as NoteValueKey,
    swing: 0,
    humanize: 0,
    chainMode: false,
  };
}

export function exportToFile(state: SequencerState): void {
  const data = serializeProject(state);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drumlet-project.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(): Promise<Partial<SequencerState> | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      try {
        const json = JSON.parse(text) as DottlProject;
        resolve(deserializeProject(json));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
