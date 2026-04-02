/**
 * VexFlow drum notation renderer.
 *
 * Single voice, all stems up. Every hit uses the tick duration (16ths etc).
 * VexFlow draws notes with stems + flags. We then overlay manual flat beam
 * rects for beat groups and hide the flags on beamed notes.
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
  GhostNote,
  Stem,
  Dot,
} from 'vexflow';

import { getNotation, toVexKey } from './drumMap.js';
import { getVelocityOpacity } from '../audio/velocityConfig.js';

VexFlow.setFonts('Petaluma', 'Petaluma Script');

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

function beamGroupSize(noteValueKey) {
  switch (noteValueKey) {
    case '1/32': return 4;
    case '1/16': return 4;
    case '1/8':  return 2;
    default:     return 0;
  }
}

/**
 * After VexFlow renders notes with stems + flags, draw flat beam bars
 * as SVG rects and hide flags on beamed notes.
 */
function drawManualBeams(svg, notes, noteValueKey) {
  const groupSize = beamGroupSize(noteValueKey);
  if (groupSize === 0) return;

  const beamHeight = 3.5;
  const beamCount = noteValueKey === '1/32' ? 3 : noteValueKey === '1/16' ? 2 : 1;
  const beamGap = 3;
  // Total vertical space the beam stack occupies
  const beamStackHeight = beamCount * beamHeight + (beamCount - 1) * beamGap;

  // Collect all beamed note X ranges so we can hide their VexFlow stems + flags
  const beamedRanges = [];

  for (let i = 0; i < notes.length; i += groupSize) {
    const group = notes.slice(i, i + groupSize);
    const staveNotes = group.filter(n => n instanceof StaveNote);
    if (staveNotes.length < 2) continue;

    // Read each note's stem base (where it leaves the notehead)
    const stemPositions = [];
    for (const note of staveNotes) {
      const ext = note.getStem().getExtents();
      stemPositions.push({ x: note.getStemX(), baseY: ext.baseY, tipY: ext.topY });
    }

    // The beam bottom edge aligns with the highest stem tip (smallest Y)
    const highestTipY = Math.min(...stemPositions.map(s => s.tipY));
    // Bottom of beam stack = where stems meet the beam
    const beamBottomY = highestTipY;

    const firstX = stemPositions[0].x;
    const lastX = stemPositions[stemPositions.length - 1].x;
    // Wide range to catch flags that extend right of the last stem
    beamedRanges.push({ x1: firstX - 5, x2: lastX + 20 });

    // Draw beam bars — stack upward from beamBottomY
    for (let b = 0; b < beamCount; b++) {
      const y = beamBottomY - b * (beamHeight + beamGap);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(firstX - 0.6));
      rect.setAttribute('y', String(y - beamHeight));
      rect.setAttribute('width', String(lastX - firstX + 1.2));
      rect.setAttribute('height', String(beamHeight));
      rect.setAttribute('fill', '#1A1A2E');
      rect.setAttribute('class', 'manual-beam');
      svg.appendChild(rect);
    }

    // Draw stems from each notehead up through the beam stack (to the top)
    const beamTopY = beamBottomY - beamStackHeight;
    for (const sp of stemPositions) {
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('x1', String(sp.x));
      stem.setAttribute('y1', String(sp.baseY));
      stem.setAttribute('x2', String(sp.x));
      stem.setAttribute('y2', String(beamTopY));
      stem.setAttribute('stroke', '#1A1A2E');
      stem.setAttribute('stroke-width', '1.3');
      stem.setAttribute('class', 'manual-beam-stem');
      svg.appendChild(stem);
    }
  }

  // Hide VexFlow's own stems and flags for beamed notes
  // so our manual stems + beams are the only ones visible
  svg.querySelectorAll('.vf-stem, .vf-flag').forEach(el => {
    const bbox = el.getBBox?.();
    if (!bbox) return;
    const cx = bbox.x + bbox.width / 2;
    for (const range of beamedRanges) {
      if (cx >= range.x1 && cx <= range.x2) {
        el.setAttribute('display', 'none');
        break;
      }
    }
  });
}

/**
 * Render a drum notation staff into a container element.
 */
export function renderDrumStaff(container, { tracks, stepsPerPage, noteValueKey, stepsPerBeat, useColor = true }) {
  const duration = DURATION_MAP[noteValueKey] || 'q';
  const dotted = isDotted(noteValueKey);

  const stepWidth = 28;
  const leftMargin = 50;
  const rightMargin = 20;
  const staveWidth = stepsPerPage * stepWidth;
  const svgWidth = leftMargin + staveWidth + rightMargin;
  const staveY = 20;
  const svgHeight = staveY + 65;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(svgWidth, svgHeight);
  const context = renderer.getContext();

  const stave = new Stave(leftMargin, staveY, staveWidth);
  stave.addClef('percussion');
  stave.setContext(context).draw();

  // Build notes — single voice, all stems up
  const notes = [];
  for (let step = 0; step < stepsPerPage; step++) {
    const active = [];
    for (const track of tracks) {
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
        stemDirection: Stem.UP,
      });

      if (dotted) Dot.buildAndAttach([note], { all: true });

      if (useColor) {
        entries.forEach((entry, i) => {
          const opacity = getVelocityOpacity(entry.vel, entry.track.velMode || 3);
          const color = hexToRGBA(entry.track.color, opacity);
          note.setKeyStyle(i, { fillStyle: color, strokeStyle: color });
        });

        const topEntry = entries[entries.length - 1];
        const primaryColor = hexToRGBA(topEntry.track.color, getVelocityOpacity(topEntry.vel, topEntry.track.velMode || 3));
        note.setStemStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });
        note.setFlagStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });
      }

      notes.push(note);
    }
  }

  const voice = new Voice({ numBeats: stepsPerPage, beatValue: 4 });
  voice.setMode(VoiceMode.SOFT);
  voice.addTickables(notes);

  new Formatter().joinVoices([voice]).format([voice], staveWidth - 10);

  // Draw notes with VexFlow stems + flags (no Beam objects)
  voice.draw(context, stave);

  // Overlay manual flat beams, hide flags on beamed notes
  drawManualBeams(context.svg, notes, noteValueKey);

  const noteXPositions = notes.map(n => n.getAbsoluteX());

  // Beat-group barlines
  const svg = context.svg;
  const staveLineTop = stave.getYForLine(0);
  const staveBottom = stave.getYForLine(4);
  for (let i = 1; i < Math.ceil(stepsPerPage / stepsPerBeat); i++) {
    const stepIdx = i * stepsPerBeat;
    if (stepIdx < stepsPerPage && noteXPositions[stepIdx] && noteXPositions[stepIdx - 1]) {
      const x = (noteXPositions[stepIdx - 1] + noteXPositions[stepIdx]) / 2;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x));
      line.setAttribute('y1', String(staveLineTop - 2));
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(staveBottom + 2));
      line.setAttribute('stroke', '#E2E8F0');
      line.setAttribute('stroke-width', '0.5');
      svg.appendChild(line);
    }
  }

  return { noteXPositions, svgWidth, svgHeight };
}
