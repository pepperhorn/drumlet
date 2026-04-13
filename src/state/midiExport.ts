import MidiWriter from 'midi-writer-js';
import { getMidiVelocity } from '../audio/velocityConfig.js';
import { effectiveStep } from '../util/stepHelpers.js';
import type { SequencerState, Step, Track } from './sequencerReducer.js';

const getMidiVelocityFn = getMidiVelocity as (vel: number, mode: number) => number;
const effectiveStepFn = effectiveStep as (s: Step) => number | number[];

const GM_DRUM_MAP: Record<string, number> = {
  'kick': 36,
  'kick-alt': 36,
  'snare': 38,
  'snare-h': 38,
  'snare-m': 38,
  'snare-l': 38,
  'hihat-close': 42,
  'hihat-closed': 42,
  'hhclosed': 42,
  'hhclosed-long': 42,
  'hhclosed-short': 42,
  'hihat-open': 46,
  'hhopen': 46,
  'clap': 39,
  'tom-hi': 50,
  'tom-high': 50,
  'tom-hh': 50,
  'tom-1': 50,
  'mid-tom': 47,
  'tom-mid': 47,
  'tom-2': 47,
  'tom-m': 47,
  'tom-low': 43,
  'tom-l': 43,
  'tom-ll': 41,
  'tom-3': 43,
  'cowbell': 56,
  'cymbal': 49,
  'cymball': 49,
  'crash': 49,
  'ride': 51,
  'rimshot': 37,
  'rim': 37,
  'clave': 75,
  'conga-hi': 63,
  'conga-high': 63,
  'conga-hh': 63,
  'conga-h': 63,
  'conga-mid': 62,
  'conga-m': 62,
  'conga-low': 64,
  'conga-l': 64,
  'conga-ll': 64,
  'conga-lll': 64,
  'maraca': 70,
  'cabasa': 69,
  'tambourine': 54,
  'stick-h': 31,
  'stick-m': 31,
  'stick-l': 31,
  'agogo': 67,
  'tinkle_bell': 72,
  'woodblock': 76,
  'taiko_drum': 36,
  'timpani': 47,
  'steel_drums': 36,
  'synth_drum': 36,
  'melodic_tom': 47,
  'xylophone': 36,
  'vibraphone': 36,
  'glockenspiel': 36,
  'marimba': 36,
};

function getGMNote(track: Track): number {
  const group = track.group || track.soundfontName || track.name;
  return (group ? GM_DRUM_MAP[group] : undefined)
    ?? (group ? GM_DRUM_MAP[group.toLowerCase()] : undefined)
    ?? 36;
}

// midi-writer-js has no bundled types — use shallow declarations.
interface MidiTrack {
  _trackId?: string;
  addTrackName: (name: string) => void;
  addEvent: (event: unknown) => void;
  setTempo: (bpm: number) => void;
}

/**
 * Export the current sequencer state as a MIDI file.
 * All tracks go on channel 10 (GM percussion).
 */
export function exportMidi(state: SequencerState): void {
  const tracks: MidiTrack[] = [];

  for (const page of state.pages) {
    for (const track of page.tracks) {
      if (track.mute) continue;

      let midiTrack = tracks.find((t) => t._trackId === track.id);
      if (!midiTrack) {
        midiTrack = new MidiWriter.Track() as MidiTrack;
        midiTrack._trackId = track.id;
        midiTrack.addTrackName(track.name);
        tracks.push(midiTrack);
      }

      const gmNote = getGMNote(track);

      for (const rawStep of track.steps.slice(0, state.stepsPerPage)) {
        const stepData = effectiveStepFn(rawStep);
        if (Array.isArray(stepData)) {
          const subDuration = stepData.length === 2 ? '32' : stepData.length === 3 ? '32t' : '64';
          for (const subVel of stepData) {
            const midiVelocity = subVel > 0 ? getMidiVelocityFn(subVel, track.velMode || 3) : 0;
            midiTrack.addEvent(
              new MidiWriter.NoteEvent({
                pitch: [gmNote],
                duration: subDuration,
                velocity: midiVelocity,
                channel: 10,
              })
            );
          }
        } else if (stepData > 0) {
          const midiVelocity = getMidiVelocityFn(stepData, track.velMode || 3);
          midiTrack.addEvent(
            new MidiWriter.NoteEvent({
              pitch: [gmNote],
              duration: '16',
              velocity: midiVelocity,
              channel: 10,
            })
          );
        } else {
          midiTrack.addEvent(
            new MidiWriter.NoteEvent({
              pitch: [gmNote],
              duration: '16',
              velocity: 0,
              channel: 10,
            })
          );
        }
      }
    }
  }

  if (tracks.length === 0) return;

  const writer = new MidiWriter.Writer(tracks as never);

  if (tracks[0]) {
    tracks[0].setTempo(state.bpm);
  }

  const blob = new Blob([writer.buildFile()], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drumlet-export.mid';
  a.click();
  URL.revokeObjectURL(url);
}
