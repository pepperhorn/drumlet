/**
 * VexFlow drum notation renderer.
 *
 * Two-voice approach: upper voice (cymbals, stems up) and lower voice
 * (kick/snare/toms, stems down) — each beamed independently with flat beams.
 *
 * Returns noteXPositions for the playhead overlay.
 */
import VexFlow, {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  VoiceMode,
  Formatter,
  Beam,
  GhostNote,
  Stem,
  Dot,
} from 'vexflow';

import { getNotation, toVexKey } from './drumMap.js';
import { getVelocityOpacity } from '../audio/velocityConfig.js';

VexFlow.setFonts('Petaluma', 'Petaluma Script');

/** pos > 2.5 → upper voice (stems up): hi-hat, cymbals, ride */
const UPPER_THRESHOLD = 2.5;

function hexToRGBA(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

const DURATION_MAP = {
  '1/32': '32',
  '1/16': '16',
  '1/8':  '8',
  '1/4':  'q',
  'd1/4': 'q',
  '1/2':  'h',
};

function isDotted(noteValueKey) {
  return noteValueKey.startsWith('d');
}

/**
 * Steps per beam group (quarter-note beat grouping).
 */
function beamGroupSize(noteValueKey) {
  switch (noteValueKey) {
    case '1/32': return 4;
    case '1/16': return 4;
    case '1/8':  return 2;
    default:     return 0;
  }
}

/**
 * Build flat Beam objects by slicing notes into fixed-size beat groups.
 * GhostNotes are skipped — only StaveNotes get beamed.
 */
function buildBeams(notes, noteValueKey) {
  const groupSize = beamGroupSize(noteValueKey);
  if (groupSize === 0) return [];

  const beams = [];
  for (let i = 0; i < notes.length; i += groupSize) {
    const group = notes.slice(i, i + groupSize);
    const beamable = group.filter(n => n instanceof StaveNote);
    if (beamable.length >= 2) {
      try {
        const beam = new Beam(beamable);
        beam.render_options.flat_beams = true;
        beam.render_options.flat_beam_offset = 15;
        beam.render_options.min_flat_beam_offset = 12;
        beams.push(beam);
      } catch (e) {
        // gracefully skip un-beamable groups
      }
    }
  }
  return beams;
}

/**
 * Build a voice's note array from a subset of tracks.
 */
function buildVoiceNotes(voiceTracks, stepsPerPage, duration, dotted, stemDir) {
  const notes = [];
  for (let step = 0; step < stepsPerPage; step++) {
    const active = [];
    for (const track of voiceTracks) {
      const vel = track.steps[step];
      if (vel > 0) active.push({ track, vel });
    }

    if (active.length === 0) {
      const ghost = new GhostNote({ duration, clef: 'percussion' });
      if (dotted) Dot.buildAndAttach([ghost], { all: true });
      notes.push(ghost);
    } else {
      const entries = active.map(({ track, vel }) => {
        const notation = getNotation(track);
        return { track, vel, notation, key: toVexKey(notation) };
      });
      entries.sort((a, b) => a.notation.pos - b.notation.pos);

      const note = new StaveNote({
        clef: 'percussion',
        keys: entries.map(e => e.key),
        duration,
        stemDirection: stemDir,
      });

      if (dotted) Dot.buildAndAttach([note], { all: true });

      // Per-key color + velocity opacity
      entries.forEach((entry, i) => {
        const opacity = getVelocityOpacity(entry.vel, entry.track.velMode || 3);
        const color = hexToRGBA(entry.track.color, opacity);
        note.setKeyStyle(i, { fillStyle: color, strokeStyle: color });
      });

      // Stem + flag color from the primary note
      const pe = stemDir === Stem.UP ? entries[entries.length - 1] : entries[0];
      const primaryColor = hexToRGBA(pe.track.color, getVelocityOpacity(pe.vel, pe.track.velMode || 3));
      note.setStemStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });
      note.setFlagStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });

      notes.push(note);
    }
  }
  return notes;
}

/**
 * Render a drum notation staff into a container element.
 */
export function renderDrumStaff(container, { tracks, stepsPerPage, noteValueKey, stepsPerBeat }) {
  const duration = DURATION_MAP[noteValueKey] || 'q';
  const dotted = isDotted(noteValueKey);

  // Layout
  const stepWidth = 28;
  const leftMargin = 50;
  const rightMargin = 20;
  const staveWidth = stepsPerPage * stepWidth;
  const svgWidth = leftMargin + staveWidth + rightMargin;
  const svgHeight = 150;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(svgWidth, svgHeight);
  const context = renderer.getContext();

  const stave = new Stave(leftMargin, 30, staveWidth);
  stave.addClef('percussion');
  stave.setContext(context).draw();

  // Split tracks into upper voice (stems up) and lower voice (stems down)
  const upperTracks = tracks.filter(t => getNotation(t).pos > UPPER_THRESHOLD);
  const lowerTracks = tracks.filter(t => getNotation(t).pos <= UPPER_THRESHOLD);

  const voices = [];
  let upperNotes = null;
  let lowerNotes = null;

  if (upperTracks.length > 0) {
    upperNotes = buildVoiceNotes(upperTracks, stepsPerPage, duration, dotted, Stem.UP);
    const v = new Voice({ numBeats: stepsPerPage, beatValue: 4 });
    v.setMode(VoiceMode.SOFT);
    v.addTickables(upperNotes);
    voices.push(v);
  }

  if (lowerTracks.length > 0) {
    lowerNotes = buildVoiceNotes(lowerTracks, stepsPerPage, duration, dotted, Stem.DOWN);
    const v = new Voice({ numBeats: stepsPerPage, beatValue: 4 });
    v.setMode(VoiceMode.SOFT);
    v.addTickables(lowerNotes);
    voices.push(v);
  }

  // Edge case: no active tracks at all
  if (voices.length === 0) {
    return { noteXPositions: [], svgWidth, svgHeight };
  }

  // Format — join each voice independently, then format together for shared X positions
  const formatter = new Formatter();
  voices.forEach(v => formatter.joinVoices([v]));
  formatter.format(voices, staveWidth - 10);

  // Build beams per voice
  const allBeams = [];
  if (upperNotes) allBeams.push(...buildBeams(upperNotes, noteValueKey));
  if (lowerNotes) allBeams.push(...buildBeams(lowerNotes, noteValueKey));

  // Draw voices then beams
  voices.forEach(v => v.draw(context, stave));
  allBeams.forEach(beam => beam.setContext(context).draw());

  // Extract X positions from whichever voice has the most StaveNotes
  const primaryNotes = upperNotes || lowerNotes;
  const noteXPositions = primaryNotes.map(n => n.getAbsoluteX());

  // Beat-group barlines
  const svg = context.svg;
  const staveY = stave.getYForLine(0);
  const staveBottom = stave.getYForLine(4);
  for (let i = 1; i < Math.ceil(stepsPerPage / stepsPerBeat); i++) {
    const stepIdx = i * stepsPerBeat;
    if (stepIdx < stepsPerPage && noteXPositions[stepIdx] && noteXPositions[stepIdx - 1]) {
      const x = (noteXPositions[stepIdx - 1] + noteXPositions[stepIdx]) / 2;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('y1', String(staveY - 2));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(staveBottom + 2));
      line.setAttribute('stroke', '#E2E8F0');
      line.setAttribute('stroke-width', '0.5');
      svg.appendChild(line);
    }
  }

  return { noteXPositions, svgWidth, svgHeight };
}
