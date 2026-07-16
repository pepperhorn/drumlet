/**
 * Verovio drum notation renderer.
 *
 * The rest of the app consumes the small RenderDrumStaffResult contract below:
 * SVG in the supplied container plus per-step x/y positions for overlays.
 */
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

import { getNotation, toMeiPitch } from './drumMap.js';
import { getVelocityOpacity } from '../audio/velocityConfig.js';
import type { Track, Step } from '../state/sequencerReducer.js';

const TEXT_COLOR = '#1A1A2E';
const FIRST_SYSTEM_LEFT_MARGIN = 125;
const DRUM_KEY_STAVE_GAP = 20; // Verovio units; about 2 rendered px at the current scale.

const DURATION_MAP: Record<string, string> = {
  '1/32': '32',
  '1/16': '16',
  '1/8': '8',
  '1/4': '4',
  'd1/4': '4',
  '1/2': '2',
};

const BEAT_VALUE_MAP: Record<string, number> = {
  '32': 32,
  '16': 16,
  '8': 8,
  '4': 4,
  '2': 2,
};

const DURATION_DENOMINATOR: Record<string, number> = {
  '32': 32,
  '16': 16,
  '8': 8,
  '4': 4,
  '2': 2,
};

function isDotted(noteValueKey: string): boolean {
  return noteValueKey.startsWith('d');
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hexToRGBA(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity.toFixed(2)})`;
}

/**
 * MergedTrack is a Track with `steps` flattened across all pages and
 * (where needed) effective-form arrays substituted in for split cells.
 */
export interface MergedTrack extends Omit<Track, 'steps'> {
  steps: (number | number[] | Step)[];
}

export interface RenderDrumStaffOptions {
  mergedTracks: MergedTrack[];
  totalSteps: number;
  sectionHeadings?: SectionHeadingForRender[];
  noteValueKey: string;
  beatNoteValue: string;
  stepsPerBeat: number;
  beatsPerBar?: number;
  barsPerLine?: number;
  useColor?: boolean;
  numStaffLines?: number;
  scale?: number;
}

interface SectionHeadingForRender {
  id: string;
  step: number;
  label: string;
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
  topPadding: number;
}

interface ToolkitShape {
  setOptions(options: Record<string, unknown>): void;
  loadData(data: string): number | boolean;
  renderToSVG(pageNo?: number, xmlDeclaration?: boolean): string;
  getLog?(): string;
}

let toolkitPromise: Promise<ToolkitShape> | null = null;
let petalumaFontPromise: Promise<string> | null = null;

async function getToolkit(): Promise<ToolkitShape> {
  toolkitPromise ??= createVerovioModule().then((verovioModule: unknown) => new VerovioToolkit(verovioModule as never) as ToolkitShape);
  return toolkitPromise;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getPetalumaFontZipBase64(): Promise<string> {
  petalumaFontPromise ??= fetch('/fonts/Petaluma.zip')
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load Petaluma.zip (${response.status})`);
      return response.arrayBuffer();
    })
    .then(arrayBufferToBase64);
  return petalumaFontPromise;
}

function beamGroupSize(noteValueKey: string): number {
  switch (noteValueKey) {
    case '1/32': return 4;
    case '1/16': return 4;
    case '1/8': return 2;
    default: return 0;
  }
}

function getStepValues(raw: number | number[] | Step | undefined): number[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'number') return [raw];
  return [0];
}

function getSplitCountAtStep(mergedTracks: MergedTrack[], step: number): number {
  return Math.max(1, ...mergedTracks.map((track) => {
    const raw = track.steps[step];
    return Array.isArray(raw) ? raw.length : 1;
  }));
}

function splitDuration(duration: string, splitCount: number): string {
  const denominator = DURATION_DENOMINATOR[duration] ?? 4;
  if (splitCount === 3) return String(denominator * 2);
  return String(denominator * splitCount);
}

function buildStepEvent(mergedTracks: MergedTrack[], step: number, duration: string, dotted: boolean, useColor: boolean, subIndex = 0, splitCount = 1): string {
  const active: { track: MergedTrack; trackIdx: number; vel: number }[] = [];
  for (let trackIdx = 0; trackIdx < mergedTracks.length; trackIdx++) {
    const mt = mergedTracks[trackIdx]!;
    const values = getStepValues(mt.steps[step]);
    const vel = values.length > 1 ? (values[subIndex] ?? 0) : (subIndex === 0 ? (values[0] ?? 0) : 0);
    if (vel > 0) active.push({ track: mt, trackIdx, vel });
  }

  const eventDuration = splitCount > 1 ? splitDuration(duration, splitCount) : duration;
  const dotAttr = dotted && splitCount === 1 ? ' dots="1"' : '';
  const eventId = subIndex === 0 ? `step-${step}` : `step-${step}-sub-${subIndex}`;
  if (active.length === 0) {
    return `<rest xml:id="${eventId}" dur="${eventDuration}"${dotAttr}/>`;
  }

  const entries = active.map(({ track, trackIdx, vel }) => ({ track, trackIdx, vel, notation: getNotation(track) }));
  entries.sort((a, b) => a.notation.pos - b.notation.pos);

  const notes = entries.map((entry) => {
    const pitch = toMeiPitch(entry.notation);
    const color = useColor ? ` color="${escapeXml(entry.track.color)}"` : '';
    const head = entry.notation.head === 'filled' ? '' : ` head.shape="${entry.notation.head}"`;
    return `<note xml:id="${eventId}-note-${entry.trackIdx}" pname="${pitch.pname}" oct="${pitch.oct}"${head}${color}/>`;
  }).join('');

  if (entries.length === 1) {
    const entry = entries[0]!;
    const pitch = toMeiPitch(entry.notation);
    const color = useColor ? ` color="${escapeXml(entry.track.color)}"` : '';
    const head = entry.notation.head === 'filled' ? '' : ` head.shape="${entry.notation.head}"`;
    return `<note xml:id="${eventId}" dur="${eventDuration}" pname="${pitch.pname}" oct="${pitch.oct}" stem.dir="up"${head}${color}${dotAttr}/>`;
  }

  return `<chord xml:id="${eventId}" dur="${eventDuration}" stem.dir="up"${dotAttr}>${notes}</chord>`;
}

function restEvent(step: number, duration: string, dotted = false): string {
  const dotAttr = dotted ? ' dots="1"' : '';
  return `<rest xml:id="step-${step}" dur="${duration}"${dotAttr}/>`;
}

function mergedRestDuration(noteValueKey: string, groupSize: number): string | null {
  if (noteValueKey === '1/8' && groupSize === 2) return '4';
  if (noteValueKey === '1/16' && groupSize === 4) return '4';
  if (noteValueKey === '1/32' && groupSize === 4) return '8';
  return null;
}

interface NotationEvent {
  step: number;
  beamStep: number;
  markup: string;
}

function wrapSplitEvents(events: string[], splitCount: number, step: number): string {
  const body = events.join('');
  if (splitCount === 3) return `<tuplet num="3" numbase="2"><beam xml:id="beam-${step}">${body}</beam></tuplet>`;
  return `<beam xml:id="beam-${step}">${body}</beam>`;
}

function buildMeasure(mergedTracks: MergedTrack[], measureNo: number, startStep: number, stepsThisMeasure: number, duration: string, dotted: boolean, useColor: boolean, noteValueKey: string): string {
  const events: NotationEvent[] = [];
  const groupSize = beamGroupSize(noteValueKey);
  for (let i = 0; i < stepsThisMeasure; i++) {
    const step = startStep + i;
    const splitCount = getSplitCountAtStep(mergedTracks, step);
    if (splitCount > 1) {
      const splitEvents = Array.from({ length: splitCount }, (_, subIdx) => (
        buildStepEvent(mergedTracks, step, duration, dotted, useColor, subIdx, splitCount)
      ));
      const hasVisibleNote = splitEvents.some((event) => event.includes('<note') || event.includes('<chord'));
      events.push({
        step,
        beamStep: step,
        markup: hasVisibleNote ? wrapSplitEvents(splitEvents, splitCount, step) : splitEvents.join(''),
      });
    } else {
      events.push({
        step,
        beamStep: step,
        markup: buildStepEvent(mergedTracks, step, duration, dotted, useColor),
      });
    }
  }
  const beamedEvents = groupSize > 0 ? events.flatMap((_, idx) => {
    if (idx % groupSize !== 0) return [];
    const group = events.slice(idx, idx + groupSize);
    const hasVisibleNote = group.some((event) => event.markup.includes('<note') || event.markup.includes('<chord'));
    if (!hasVisibleNote) {
      const mergedDuration = mergedRestDuration(noteValueKey, group.length);
      return mergedDuration ? [restEvent(group[0]?.step ?? startStep + idx, mergedDuration)] : group.map((event) => event.markup);
    }
    const containsNestedBeam = group.some((event) => event.markup.includes('<beam>') || event.markup.includes('<beam '));
    const body = group.map((event) => event.markup).join('');
    return containsNestedBeam ? [body] : [`<beam xml:id="beam-${group[0]?.beamStep ?? startStep + idx}">${body}</beam>`];
  }) : events.map((event) => event.markup);
  return `<measure n="${measureNo}"><staff n="1"><layer n="1">${beamedEvents.join('')}</layer></staff></measure>`;
}

function buildMei({
  mergedTracks,
  totalSteps,
  noteValueKey,
  beatNoteValue,
  stepsPerBeat,
  beatsPerBar = 4,
  barsPerLine = 4,
  useColor = true,
  numStaffLines = 5,
}: RenderDrumStaffOptions): string {
  const duration = DURATION_MAP[noteValueKey] ?? '4';
  const dotted = isDotted(noteValueKey);
  const beatDuration = DURATION_MAP[beatNoteValue] ?? DURATION_MAP[noteValueKey] ?? '4';
  const timeSigDenom = BEAT_VALUE_MAP[beatDuration] ?? 4;
  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const totalBars = Math.ceil(totalSteps / stepsPerBar);
  const measures: string[] = [];

  for (let bar = 0; bar < totalBars; bar++) {
    if (bar > 0 && barsPerLine > 0 && bar % barsPerLine === 0) measures.push('<sb/>');
    const startStep = bar * stepsPerBar;
    const stepsThisMeasure = Math.min(stepsPerBar, totalSteps - startStep);
    measures.push(buildMeasure(mergedTracks, bar + 1, startStep, stepsThisMeasure, duration, dotted, useColor, noteValueKey));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0">
  <meiHead>
    <fileDesc>
      <titleStmt><title>Drumlet notation</title></titleStmt>
      <pubStmt/>
    </fileDesc>
  </meiHead>
  <music>
    <body>
      <mdiv>
        <score>
          <scoreDef meter.count="${beatsPerBar}" meter.unit="${timeSigDenom}">
            <staffGrp>
              <staffDef n="1" lines="${numStaffLines}" clef.shape="perc" clef.line="${numStaffLines <= 2 ? 1 : 3}"/>
            </staffGrp>
          </scoreDef>
          <section>${measures.join('')}</section>
        </score>
      </mdiv>
    </body>
  </music>
</mei>`;
}

function numberFromSvgLength(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPrimaryStepColor(mergedTracks: MergedTrack[], step: number): string | null {
  const active: { track: MergedTrack; vel: number; pos: number }[] = [];
  for (const track of mergedTracks) {
    const raw = track.steps[step];
    const vel = Array.isArray(raw) ? Math.max(...raw) : (typeof raw === 'number' ? raw : 0);
    if (vel > 0) active.push({ track, vel, pos: getNotation(track).pos });
  }
  if (active.length === 0) return null;
  active.sort((a, b) => a.pos - b.pos);
  const top = active[active.length - 1]!;
  return hexToRGBA(top.track.color, getVelocityOpacity(top.vel, top.track.velMode || 3));
}

function getDominantBeamColor(mergedTracks: MergedTrack[], startStep: number, groupSize: number, totalSteps: number): string | null {
  const colorCounts = new Map<string, number>();
  for (let step = startStep; step < Math.min(startStep + groupSize, totalSteps); step++) {
    const color = getPrimaryStepColor(mergedTracks, step);
    if (!color) continue;
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  }
  const [dominant] = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  return dominant ?? null;
}

function applyScoreTitleFont(svg: SVGSVGElement): void {
  svg.querySelectorAll<SVGTitleElement>('title.labelAttr').forEach((label) => {
    if (label.textContent !== 'title') return;
    const titleText = label.parentElement;
    if (!titleText) return;
    titleText.setAttribute('font-family', 'var(--font-display)');
    titleText.setAttribute('font-weight', '700');
  });
}

function parseTranslateY(transform: string | null): number {
  const match = transform?.match(/translate\(([-\d.]+)[ ,]([-\d.]+)\)/);
  return match ? Number.parseFloat(match[2]!) : 0;
}

function pitchStep(pname: string, oct: number): number {
  const steps: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
  return oct * 7 + (steps[pname] ?? 0);
}

function pitchToStaffY(pitch: ReturnType<typeof toMeiPitch>, topLineY: number, staffSpace: number): number {
  const topLinePitch = pitchStep('g', 4);
  return topLineY + (topLinePitch - pitchStep(pitch.pname, pitch.oct)) * staffSpace * 0.5;
}

function labelForTrack(track: MergedTrack): string {
  if (track.group?.startsWith('hihat') || track.group?.startsWith('hh')) return 'Hi-hat';
  if (track.group?.startsWith('snare')) return 'Snare';
  if (track.group?.startsWith('kick')) return 'Kick';
  return track.name;
}

function applyFirstSystemDrumKey(svg: SVGSVGElement, mergedTracks: MergedTrack[], useColor: boolean): void {
  const firstSystem = svg.querySelector<SVGGElement>('g.system');
  const staff = firstSystem?.querySelector<SVGGElement>('g.staff');
  if (!firstSystem || !staff) return;

  const staffLineYs = Array.from(staff.querySelectorAll<SVGPathElement>(':scope > path'))
    .map((path) => path.getAttribute('d')?.match(/^M[-\d.]+ ([-\d.]+) L/))
    .map((match) => match ? Number.parseFloat(match[1]!) : Number.NaN)
    .filter((value) => Number.isFinite(value))
    .slice(0, 5);
  if (staffLineYs.length < 2) return;

  const topLineY = Math.min(...staffLineYs);
  const sortedLineYs = [...staffLineYs].sort((a, b) => a - b);
  const staffSpace = Math.abs(sortedLineYs[1]! - sortedLineYs[0]!);
  const fontSize = Math.max(90, staffSpace * 0.78);
  const keyGroups = new Map<string, { label: string; color: string; y: number; pos: number }>();

  for (const track of mergedTracks) {
    const notation = getNotation(track);
    const pitch = toMeiPitch(notation);
    const y = pitchToStaffY(pitch, topLineY, staffSpace);
    const key = y.toFixed(1);
    const label = labelForTrack(track);
    const existing = keyGroups.get(key);
    keyGroups.set(key, {
      label: existing ? `${existing.label} / ${label}` : label,
      color: existing?.color ?? track.color,
      y,
      pos: notation.pos,
    });
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'drumlet-notation-key');
  firstSystem.insertBefore(group, firstSystem.firstChild);

  Array.from(keyGroups.values())
    .sort((a, b) => b.pos - a.pos)
    .forEach((entry) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(-DRUM_KEY_STAVE_GAP));
      text.setAttribute('y', String(entry.y + fontSize * 0.32));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-family', 'var(--font-display)');
      text.setAttribute('font-size', String(fontSize));
      text.setAttribute('font-weight', '700');
      text.setAttribute('fill', useColor ? entry.color : TEXT_COLOR);
      text.textContent = entry.label;
      group.appendChild(text);
    });
}

function getSystemStaffTopByLine(svg: SVGSVGElement): number[] {
  return Array.from(svg.querySelectorAll<SVGGElement>('g.system')).map((system) => {
    const staff = system.querySelector<SVGGElement>('g.staff');
    const staffLineYs = staff ? Array.from(staff.querySelectorAll<SVGPathElement>(':scope > path'))
      .map((path) => path.getAttribute('d')?.match(/^M[-\d.]+ ([-\d.]+) L/))
      .map((match) => match ? Number.parseFloat(match[1]!) : Number.NaN)
      .filter((value) => Number.isFinite(value))
      .slice(0, 5) : [];
    return staffLineYs.length > 0 ? Math.min(...staffLineYs) : parseTranslateY(system.getAttribute('transform'));
  });
}

function fillMissingStepPositions(stepPositions: StepPosition[], totalSteps: number): void {
  for (let step = 0; step < totalSteps; step++) {
    if (stepPositions[step]) continue;

    let prevIdx = step - 1;
    while (prevIdx >= 0 && !stepPositions[prevIdx]) prevIdx--;

    let nextIdx = step + 1;
    while (nextIdx < totalSteps && !stepPositions[nextIdx]) nextIdx++;

    const prev = prevIdx >= 0 ? stepPositions[prevIdx] : null;
    const next = nextIdx < totalSteps ? stepPositions[nextIdx] : null;

    if (prev && next && prev.line === next.line) {
      const ratio = (step - prevIdx) / (nextIdx - prevIdx);
      stepPositions[step] = {
        x: prev.x + (next.x - prev.x) * ratio,
        y: prev.y,
        line: prev.line,
      };
    } else if (prev) {
      stepPositions[step] = { ...prev };
    } else if (next) {
      stepPositions[step] = { ...next };
    }
  }
}

function applySectionHeadings(svg: SVGSVGElement, sectionHeadings: SectionHeadingForRender[], stepPositions: StepPosition[]): void {
  if (sectionHeadings.length === 0) return;
  const staffTops = getSystemStaffTopByLine(svg);
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'drumlet-section-headings');
  svg.appendChild(group);

  for (const heading of sectionHeadings) {
    const pos = stepPositions[heading.step];
    if (!pos) continue;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(pos.x));
    text.setAttribute('y', String((staffTops[pos.line] ?? pos.y) - 52));
    text.setAttribute('font-family', 'var(--font-display)');
    text.setAttribute('font-size', '92');
    text.setAttribute('font-weight', '700');
    text.setAttribute('fill', TEXT_COLOR);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = heading.label;
    group.appendChild(text);
  }
}

function applyRestStemlets(svg: SVGSVGElement): void {
  svg.querySelectorAll<SVGGElement>('g.beam').forEach((beam) => {
    const beamShape = beam.querySelector<SVGGraphicsElement>(':scope > polygon, :scope > path');
    if (!beamShape) return;
    const beamBox = beamShape.getBBox();
    if (!beamBox) return;
    const beamColor = beamShape.getAttribute('fill') || beamShape.getAttribute('stroke') || TEXT_COLOR;

    beam.querySelectorAll<SVGGraphicsElement>('g.rest').forEach((rest) => {
      const restBox = rest.getBBox();
      const x = restBox.x + restBox.width / 2;
      const y1 = beamBox.y + beamBox.height;
      const y2 = restBox.y + restBox.height * 0.25;
      if (y2 <= y1 + 8) return;
      const stemlet = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stemlet.setAttribute('x1', String(x));
      stemlet.setAttribute('x2', String(x));
      stemlet.setAttribute('y1', String(y1));
      stemlet.setAttribute('y2', String(y2));
      stemlet.setAttribute('stroke', beamColor);
      stemlet.setAttribute('stroke-width', '18');
      stemlet.setAttribute('stroke-linecap', 'butt');
      stemlet.setAttribute('class', 'drumlet-rest-stemlet');
      beam.insertBefore(stemlet, rest);
    });
  });
}

function patchSvgForApp(svg: SVGSVGElement, mergedTracks: MergedTrack[], totalSteps: number, useColor: boolean, sectionHeadings: SectionHeadingForRender[]): StepPosition[] {
  const stepPositions: StepPosition[] = [];
  applyScoreTitleFont(svg);
  applyFirstSystemDrumKey(svg, mergedTracks, useColor);
  const systemTops = Array.from(svg.querySelectorAll<SVGGElement>('g.system')).map((system) => {
    return parseTranslateY(system.getAttribute('transform'));
  }).filter((value) => Number.isFinite(value));

  for (let step = 0; step < totalSteps; step++) {
    const el = svg.querySelector<SVGGraphicsElement>(`#step-${step}`);
    if (!el) continue;
    const bbox = el.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const top = bbox.y;
    let line = 0;
    for (let i = 0; i < systemTops.length; i++) {
      if (top >= systemTops[i]! - 20) line = i;
    }
    stepPositions[step] = { x: centerX, y: systemTops[line] ?? Math.max(0, top - 40), line };
  }
  fillMissingStepPositions(stepPositions, totalSteps);
  applySectionHeadings(svg, sectionHeadings, stepPositions);

  if (!useColor) return stepPositions;

  for (let step = 0; step < totalSteps; step++) {
    for (let trackIdx = 0; trackIdx < mergedTracks.length; trackIdx++) {
      const track = mergedTracks[trackIdx]!;
      const raw = track.steps[step];
      const vel = Array.isArray(raw) ? Math.max(...raw) : (typeof raw === 'number' ? raw : 0);
      if (vel <= 0) continue;
      const opacity = getVelocityOpacity(vel, track.velMode || 3);
      const color = hexToRGBA(track.color, opacity);
      const noteNodes = [
        ...Array.from(svg.querySelectorAll<SVGElement>(`#step-${step}-note-${trackIdx}`)),
        ...Array.from(svg.querySelectorAll<SVGElement>(`[id^="step-${step}-sub-"][id$="-note-${trackIdx}"]`)),
      ];
      const nodes = noteNodes.length > 0 ? noteNodes : Array.from(svg.querySelectorAll<SVGElement>(`#step-${step}`));
      nodes.forEach((node) => {
        node.querySelectorAll<SVGElement>('path, use, line, polygon, polyline').forEach((child) => {
          child.setAttribute('fill', color);
          child.setAttribute('stroke', color);
        });
      });
    }
  }

  const groupSize = beamGroupSize(svg.dataset.drumletNoteValue ?? '');
  if (groupSize > 0) {
    for (let startStep = 0; startStep < totalSteps; startStep += groupSize) {
      const color = getDominantBeamColor(mergedTracks, startStep, groupSize, totalSteps);
      const beam = svg.querySelector<SVGElement>(`#beam-${startStep}`);
      if (!color || !beam) continue;
      beam.querySelectorAll<SVGElement>(':scope > polygon, :scope > path, :scope > line, g.stem path, g.stem line').forEach((child) => {
        child.setAttribute('fill', color);
        child.setAttribute('stroke', color);
      });
    }
  }
  applyRestStemlets(svg);

  return stepPositions;
}

export async function renderDrumStaff(container: HTMLElement, options: RenderDrumStaffOptions): Promise<RenderDrumStaffResult> {
  const stepsPerBar = (options.beatsPerBar ?? 4) * options.stepsPerBeat;
  const totalBars = Math.ceil(options.totalSteps / stepsPerBar);
  const barsPerLine = options.barsPerLine ?? 4;
  const maxStepsPerLine = Math.min((barsPerLine || totalBars) * stepsPerBar, options.totalSteps);
  const stepWidth = 28;
  const pageWidth = Math.max(900, FIRST_SYSTEM_LEFT_MARGIN + 130 + maxStepsPerLine * stepWidth);
  const estimatedLines = Math.ceil(totalBars / (barsPerLine || totalBars));
  const pageHeight = Math.max(280, 170 + estimatedLines * 145);
  const mei = buildMei(options);
  const [toolkit, petalumaFont] = await Promise.all([getToolkit(), getPetalumaFontZipBase64()]);

  toolkit.setOptions({
    inputFrom: 'mei',
    breaks: 'encoded',
    adjustPageHeight: true,
    adjustPageWidth: false,
    pageWidth,
    pageHeight,
    pageMarginTop: 30,
    pageMarginBottom: 30,
    pageMarginLeft: FIRST_SYSTEM_LEFT_MARGIN,
    pageMarginRight: 30,
    scale: options.scale ?? 45,
    font: 'Petaluma',
    fontAddCustom: [petalumaFont],
    fontFallback: 'Bravura',
    smuflTextFont: 'embedded',
  });

  const loaded = toolkit.loadData(mei);
  if (!loaded) {
    throw new Error(`Verovio failed to load MEI data: ${toolkit.getLog?.() ?? 'no log available'}`);
  }

  const svgMarkup = toolkit.renderToSVG(1, false);
  container.innerHTML = svgMarkup;
  const svg = container.querySelector<SVGSVGElement>('svg');
  if (!svg) throw new Error('Verovio did not produce an SVG');

  svg.style.display = 'block';
  svg.style.color = TEXT_COLOR;
  svg.dataset.drumletNoteValue = options.noteValueKey;
  const svgWidth = numberFromSvgLength(svg.getAttribute('width'), pageWidth);
  const svgHeight = numberFromSvgLength(svg.getAttribute('height'), pageHeight);
  const stepPositions = patchSvgForApp(svg, options.mergedTracks, options.totalSteps, options.useColor ?? true, options.sectionHeadings ?? []);
  const systemTops = Array.from(svg.querySelectorAll<SVGGElement>('g.system')).map((system) => {
    return parseTranslateY(system.getAttribute('transform'));
  }).filter((value) => Number.isFinite(value));
  const numLines = Math.max(1, systemTops.length);
  const lineGap = numLines > 1 ? Math.max(18, systemTops[1]! - systemTops[0]! - 100) : 18;
  const lineHeight = numLines > 1 ? Math.max(90, systemTops[1]! - systemTops[0]! - lineGap) : Math.max(90, svgHeight - 70);
  const topPadding = systemTops[0] ?? 48;

  return { stepPositions, svgWidth, svgHeight, stepWidth, numLines, lineHeight, lineGap, topPadding };
}
