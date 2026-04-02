/**
 * VexFlow drum notation renderer.
 *
 * Pure function — takes track data + a DOM container, renders VexFlow SVG into it.
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
  Fraction,
  Stem,
  Dot,
} from 'vexflow';

import { getNotation, toVexKey, stemDirection as getStemDir } from './drumMap.js';
import { getVelocityOpacity } from '../audio/velocityConfig.js';

// Use Petaluma font for professional hand-engraved look
VexFlow.setFonts('Petaluma', 'Petaluma Script');

/**
 * Convert a hex color (#RRGGBB) + opacity (0–1) to an rgba() string.
 */
function hexToRGBA(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

/**
 * Map noteValue key → VexFlow duration string.
 */
const DURATION_MAP = {
  '1/32': '32',
  '1/16': '16',
  '1/8':  '8',
  '1/4':  'q',
  'd1/4': 'q',   // dotted quarter — add Dot modifier
  '1/2':  'h',
};

/**
 * Whether a noteValue key represents a dotted duration.
 */
function isDotted(noteValueKey) {
  return noteValueKey.startsWith('d');
}

/**
 * Determine beam groups based on note value.
 * Returns an array of Fraction objects for Beam.generateBeams config.
 */
function beamGroups(noteValueKey) {
  switch (noteValueKey) {
    case '1/32': return [new Fraction(1, 8)];   // group 4 thirty-seconds per eighth
    case '1/16': return [new Fraction(1, 4)];   // group 4 sixteenths per beat
    case '1/8':  return [new Fraction(1, 2)];   // group 2 eighths per beat
    default:     return [];                       // quarter notes and longer don't beam
  }
}

/**
 * Render a drum notation staff into a container element.
 *
 * @param {HTMLElement} container — empty div to render into
 * @param {Object} opts
 * @param {Array} opts.tracks — track objects with steps, color, velMode, etc.
 * @param {number} opts.stepsPerPage — 16, 24, or 32
 * @param {string} opts.noteValueKey — key from NOTE_VALUES (e.g. '1/4', '1/8')
 * @param {number} opts.stepsPerBeat — how many steps make one beat
 * @returns {{ noteXPositions: number[], svgWidth: number, svgHeight: number }}
 */
export function renderDrumStaff(container, { tracks, stepsPerPage, noteValueKey, stepsPerBeat }) {
  const duration = DURATION_MAP[noteValueKey] || 'q';
  const dotted = isDotted(noteValueKey);

  // Layout geometry
  const stepWidth = 28;
  const leftMargin = 50;   // room for percussion clef
  const rightMargin = 20;
  const staveWidth = stepsPerPage * stepWidth;
  const svgWidth = leftMargin + staveWidth + rightMargin;
  const svgHeight = 120;

  // Create renderer
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(svgWidth, svgHeight);
  const context = renderer.getContext();

  // Create stave with percussion clef
  const stave = new Stave(leftMargin, 10, staveWidth);
  stave.addClef('percussion');
  stave.setContext(context).draw();

  // Build notes for each step
  const notes = [];
  for (let step = 0; step < stepsPerPage; step++) {
    // Collect active tracks at this step
    const active = [];
    for (const track of tracks) {
      const vel = track.steps[step];
      if (vel > 0) {
        active.push({ track, vel });
      }
    }

    if (active.length === 0) {
      // Ghost note — invisible placeholder to maintain spacing
      const ghost = new GhostNote({ duration, clef: 'percussion' });
      if (dotted) {
        Dot.buildAndAttach([ghost], { all: true });
      }
      notes.push(ghost);
    } else {
      // Build chord keys, sorted by position (lowest first for VexFlow)
      const entries = active.map(({ track, vel }) => {
        const notation = getNotation(track);
        return { track, vel, notation, key: toVexKey(notation) };
      });
      // Sort by position ascending (lowest note first)
      entries.sort((a, b) => a.notation.pos - b.notation.pos);

      const keys = entries.map(e => e.key);

      // Determine stem direction from the lowest note
      const lowestPos = entries[0].notation.pos;
      const highestPos = entries[entries.length - 1].notation.pos;
      // If there are notes both above and below middle, stems up (convention)
      const stemDir = highestPos > 2.5 && lowestPos <= 2.5
        ? Stem.UP
        : getStemDir(lowestPos) === 1 ? Stem.UP : Stem.DOWN;

      const note = new StaveNote({
        clef: 'percussion',
        keys,
        duration,
        stemDirection: stemDir,
      });

      // Add dot for dotted durations
      if (dotted) {
        Dot.buildAndAttach([note], { all: true });
      }

      // Apply per-key styling (color + velocity opacity)
      entries.forEach((entry, i) => {
        const opacity = getVelocityOpacity(entry.vel, entry.track.velMode || 3);
        const color = hexToRGBA(entry.track.color, opacity);
        note.setKeyStyle(i, { fillStyle: color, strokeStyle: color });
      });

      // Set stem + flag color to the first (lowest) note's color
      const primaryOpacity = getVelocityOpacity(entries[0].vel, entries[0].track.velMode || 3);
      const primaryColor = hexToRGBA(entries[0].track.color, primaryOpacity);
      note.setStemStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });
      note.setFlagStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });

      notes.push(note);
    }
  }

  // Create voice in SOFT mode (no strict beat counting)
  const voice = new Voice({ numBeats: stepsPerPage, beatValue: 4 });
  voice.setMode(VoiceMode.SOFT);
  voice.addTickables(notes);

  // Format
  new Formatter().joinVoices([voice]).format([voice], staveWidth - 10);

  // Generate beams for sub-quarter durations
  const groups = beamGroups(noteValueKey);
  let beams = [];
  if (groups.length > 0) {
    try {
      beams = Beam.generateBeams(notes, {
        groups,
        maintainStemDirections: true,
      });
    } catch (e) {
      // Beaming can fail with unusual note patterns; gracefully degrade
      console.warn('VexFlow beaming error:', e.message);
    }
  }

  // Draw
  voice.draw(context, stave);
  beams.forEach(beam => {
    beam.setContext(context).draw();
  });

  // Extract X positions for each step's note
  const noteXPositions = notes.map(n => n.getAbsoluteX());

  // Draw beat group barlines manually (thin lines between beats)
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
