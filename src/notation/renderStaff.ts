/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * VexFlow drum notation renderer.
 *
 * Per migration brief: VexFlow is escape-hatch territory. Type around it,
 * not into it. Internals stay any-typed; the public renderDrumStaff
 * surface is properly typed.
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
import type { Track, Step } from '../state/sequencerReducer.js';

VexFlow.setFonts('Petaluma', 'Petaluma Script');

const TEXT_COLOR = '#1A1A2E';

function hexToRGBA(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

const DURATION_MAP: Record<string, string> = {
  '1/32': '32',
  '1/16': '16',
  '1/8':  '8',
  '1/4':  'q',
  'd1/4': 'q',
  '1/2':  'h',
};

const BEAT_VALUE_MAP: Record<string, number> = {
  '32': 32,
  '16': 16,
  '8':  8,
  'q':  4,
  'h':  2,
};

function isDotted(noteValueKey: string): boolean {
  return noteValueKey.startsWith('d');
}

function beamGroupSize(noteValueKey: string): number {
  switch (noteValueKey) {
    case '1/32': return 4;
    case '1/16': return 4;
    case '1/8':  return 2;
    default:     return 0;
  }
}

/**
 * MergedTrack is a Track with `steps` flattened across all pages and
 * (where needed) effective-form arrays substituted in for split cells.
 */
export interface MergedTrack extends Omit<Track, 'steps'> {
  steps: (number | number[] | Step)[];
}

function drawManualBeams(svg: SVGElement, notes: any[], noteValueKey: string, useColor: boolean): void {
  const groupSize = beamGroupSize(noteValueKey);
  if (groupSize === 0) return;

  const beamHeight = 3.5;
  const beamCount = noteValueKey === '1/32' ? 3 : noteValueKey === '1/16' ? 2 : 1;
  const beamGap = 3;
  const beamStackHeight = beamCount * beamHeight + (beamCount - 1) * beamGap;

  const beamedRanges: { x1: number; x2: number }[] = [];

  for (let i = 0; i < notes.length; i += groupSize) {
    const group = notes.slice(i, i + groupSize);
    const staveNotes = group.filter((n: any) => n instanceof StaveNote);
    if (staveNotes.length < 2) continue;

    const stemPositions: { x: number; baseY: number; tipY: number }[] = [];
    for (const note of staveNotes) {
      const ext = note.getStem().getExtents();
      stemPositions.push({ x: note.getStemX(), baseY: ext.baseY, tipY: ext.topY });
    }

    const highestTipY = Math.min(...stemPositions.map((s) => s.tipY));
    const beamBottomY = highestTipY;

    const firstX = stemPositions[0]!.x;
    const lastX = stemPositions[stemPositions.length - 1]!.x;
    beamedRanges.push({ x1: firstX - 5, x2: lastX + 20 });

    let beamColor = TEXT_COLOR;
    if (useColor) {
      const colorCounts: Record<string, number> = {};
      for (const note of staveNotes) {
        const fill = (note as any)._primaryColor || TEXT_COLOR;
        colorCounts[fill] = (colorCounts[fill] || 0) + 1;
      }
      const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0 && sorted[0]) beamColor = sorted[0][0];
    }

    for (let b = 0; b < beamCount; b++) {
      const y = beamBottomY - b * (beamHeight + beamGap);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(firstX - 0.6));
      rect.setAttribute('y', String(y - beamHeight));
      rect.setAttribute('width', String(lastX - firstX + 1.2));
      rect.setAttribute('height', String(beamHeight));
      rect.setAttribute('fill', beamColor);
      rect.setAttribute('class', 'manual-beam');
      svg.appendChild(rect);
    }

    const beamTopY = beamBottomY - beamStackHeight;
    for (const sp of stemPositions) {
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('x1', String(sp.x));
      stem.setAttribute('y1', String(sp.baseY));
      stem.setAttribute('x2', String(sp.x));
      stem.setAttribute('y2', String(beamTopY));
      stem.setAttribute('stroke', beamColor);
      stem.setAttribute('stroke-width', '1.3');
      stem.setAttribute('class', 'manual-beam-stem');
      svg.appendChild(stem);
    }
  }

  // NOTE: `.vf-stem` and `.vf-flag` are VexFlow 5.x class names —
  // verify these still exist if upgrading VexFlow.
  svg.querySelectorAll('.vf-stem, .vf-flag').forEach((el) => {
    const bbox = (el as SVGGraphicsElement).getBBox?.();
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

function buildNotes(mergedTracks: MergedTrack[], startStep: number, count: number, duration: string, dotted: boolean, useColor: boolean): any[] {
  const notes: any[] = [];
  for (let i = 0; i < count; i++) {
    const step = startStep + i;
    const active: { track: MergedTrack; vel: number }[] = [];
    for (const mt of mergedTracks) {
      const raw = mt.steps[step];
      const vel = Array.isArray(raw) ? Math.max(...raw) : (typeof raw === 'number' ? raw : 0);
      if (vel > 0) active.push({ track: mt, vel });
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
        keys: entries.map((e) => e.key),
        duration,
        stemDirection: Stem.UP,
      });

      if (dotted) Dot.buildAndAttach([note], { all: true });

      if (useColor) {
        entries.forEach((entry, idx) => {
          const opacity = getVelocityOpacity(entry.vel, entry.track.velMode || 3);
          const color = hexToRGBA(entry.track.color, opacity);
          note.setKeyStyle(idx, { fillStyle: color, strokeStyle: color });
        });
        const topEntry = entries[entries.length - 1]!;
        const primaryColor = hexToRGBA(topEntry.track.color, getVelocityOpacity(topEntry.vel, topEntry.track.velMode || 3));
        note.setStemStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });
        note.setFlagStyle({ fillStyle: primaryColor, strokeStyle: primaryColor });
        (note as any)._primaryColor = primaryColor;
      }

      notes.push(note);
    }
  }
  return notes;
}

export interface RenderDrumStaffOptions {
  mergedTracks: MergedTrack[];
  totalSteps: number;
  noteValueKey: string;
  beatNoteValue: string;
  stepsPerBeat: number;
  beatsPerBar?: number;
  barsPerLine?: number;
  useColor?: boolean;
  numStaffLines?: number;
}

export interface StepPosition {
  x: number;
  y: number;
  line: number;
}

export interface RenderDrumStaffResult {
  stepPositions: StepPosition[];
  svgWidth: number;
  svgHeight: number;
  stepWidth: number;
  numLines: number;
  lineHeight: number;
  lineGap: number;
}

export function renderDrumStaff(container: HTMLElement, {
  mergedTracks,
  totalSteps,
  noteValueKey,
  beatNoteValue,
  stepsPerBeat,
  beatsPerBar = 4,
  barsPerLine = 4,
  useColor = true,
  numStaffLines = 5,
}: RenderDrumStaffOptions): RenderDrumStaffResult {
  const duration = DURATION_MAP[noteValueKey] ?? 'q';
  const dotted = isDotted(noteValueKey);
  const beatDuration = DURATION_MAP[beatNoteValue] ?? DURATION_MAP[noteValueKey] ?? 'q';
  const timeSigDenom = BEAT_VALUE_MAP[beatDuration] ?? 4;
  const stepBeatValue = BEAT_VALUE_MAP[duration] ?? 4;

  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const totalBars = Math.ceil(totalSteps / stepsPerBar);
  const numLines = Math.ceil(totalBars / barsPerLine);

  const stepWidth = 28;
  const leftMarginFirst = 80;
  const leftMarginRest = 50;
  const rightMargin = 20;
  const hasHighNotes = mergedTracks.some((t) => getNotation(t).pos >= 5);
  const baseLineHeight = numStaffLines <= 2 ? 70 : (hasHighNotes ? 105 : 90);
  const lineHeight = baseLineHeight;
  const lineGap = 10;

  const maxStepsPerLine = Math.min(barsPerLine * stepsPerBar, totalSteps);
  const svgWidth = leftMarginFirst + maxStepsPerLine * stepWidth + rightMargin;
  const svgHeight = numLines * lineHeight + (numLines - 1) * lineGap + 20;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(svgWidth, svgHeight);
  const context = renderer.getContext();

  const stepPositions: StepPosition[] = [];

  let stepOffset = 0;
  for (let line = 0; line < numLines; line++) {
    const isFirst = line === 0;
    const leftMargin = isFirst ? leftMarginFirst : leftMarginRest;
    const barsThisLine = Math.min(barsPerLine, totalBars - line * barsPerLine);
    const stepsThisLine = Math.min(barsThisLine * stepsPerBar, totalSteps - stepOffset);
    const staveWidth = stepsThisLine * stepWidth;
    const staveY = line * (lineHeight + lineGap) + 10;

    const stave = new Stave(leftMargin, staveY, staveWidth);
    if (numStaffLines !== 5) {
      stave.setNumLines(numStaffLines);
    }
    stave.addClef('percussion');
    if (isFirst) {
      stave.addTimeSignature(`${beatsPerBar}/${timeSigDenom}`);
    }
    stave.setContext(context).draw();

    const notes = buildNotes(mergedTracks, stepOffset, stepsThisLine, duration, dotted, useColor);

    const voice = new Voice({ numBeats: stepsThisLine, beatValue: stepBeatValue });
    voice.setMode(VoiceMode.SOFT);
    voice.addTickables(notes);

    new Formatter().joinVoices([voice]).format([voice], staveWidth - 10);
    voice.draw(context, stave);

    drawManualBeams(context.svg, notes, noteValueKey, useColor);

    for (let i = 0; i < notes.length; i++) {
      stepPositions.push({
        x: notes[i].getAbsoluteX(),
        y: staveY,
        line,
      });
    }

    const staveLineTop = stave.getYForLine(0);
    const staveBottom = stave.getYForLine(4);
    for (let i = 1; i < Math.ceil(stepsThisLine / stepsPerBeat); i++) {
      const stepIdx = i * stepsPerBeat;
      if (stepIdx < stepsThisLine) {
        const xPrev = notes[stepIdx - 1]?.getAbsoluteX();
        const xNext = notes[stepIdx]?.getAbsoluteX();
        if (xPrev && xNext) {
          const x = (xPrev + xNext) / 2;
          const globalStep = stepOffset + stepIdx;
          const isBarline = stepsPerBar > 0 && globalStep % stepsPerBar === 0;
          const svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          svgLine.setAttribute('x1', String(x));
          svgLine.setAttribute('y1', String(staveLineTop - 2));
          svgLine.setAttribute('x2', String(x));
          svgLine.setAttribute('y2', String(staveBottom + 2));
          svgLine.setAttribute('stroke', isBarline ? '#94A3B8' : '#E2E8F0');
          svgLine.setAttribute('stroke-width', isBarline ? '1.2' : '0.5');
          context.svg.appendChild(svgLine);
        }
      }
    }

    stepOffset += stepsThisLine;
  }

  return { stepPositions, svgWidth, svgHeight, stepWidth, numLines, lineHeight, lineGap };
}
