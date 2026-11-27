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
import { loadPetaluma } from '../components/notationPrefetch.js';
import { beatToEvents } from './beatToEvents.js';
import type { Track, Step, NoteValueKey } from '../state/sequencerReducer.js';

const TEXT_COLOR = '#1A1A2E';
const FIRST_SYSTEM_LEFT_MARGIN = 125;
const PAGE_TOP_MARGIN = 30;
const STEP_WIDTH = 28;
const PAGE_MARGIN_WIDTH = FIRST_SYSTEM_LEFT_MARGIN + 130;
const MIN_PAGE_WIDTH = 900;
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
  noteValueKey: NoteValueKey;
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

let toolkitPromise: Promise<VerovioToolkit> | null = null;

function getToolkit(): Promise<VerovioToolkit> {
  return toolkitPromise ??= createVerovioModule()
    .then((module: unknown) => new VerovioToolkit(module))
    .catch((error) => {
      toolkitPromise = null;
      throw error;
    });
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

function hasOnset(tracks: MergedTrack[], step: number): boolean {
  return tracks.some((track) => getStepValues(track.steps[step]).some((value) => value > 0));
}

function buildMeasure(
  tracks: MergedTrack[], measureNo: number, startStep: number, stepsThisMeasure: number,
  stepsPerNotationBeat: number, stepValue: NoteValueKey, useColor: boolean,
): string {
  const markup: string[] = [];
  for (let offset = 0; offset < stepsThisMeasure; offset += stepsPerNotationBeat) {
    const start = startStep + offset;
    const count = Math.min(stepsPerNotationBeat, stepsThisMeasure - offset);
    const onsets = Array.from({ length: count }, (_, i) => hasOnset(tracks, start + i));
    let beam: string[] = [];

    function flushBeam() {
      markup.push(beam.length > 1 ? `<beam>${beam.join('')}</beam>` : beam.join(''));
      beam = [];
    }

    // An active split uses its existing subdivision for that cell. Resume
    // beat-relative duration calculation after the split, without tying over it.
    let segmentStart = 0;
    for (let i = 0; i <= count; i++) {
      const step = start + i;
      const split = i < count && onsets[i] ? getSplitCountAtStep(tracks, step) : 1;
      if (i < count && split === 1) continue;

      const events = beatToEvents(onsets.slice(segmentStart, i), i - segmentStart, stepValue);
      for (const event of events) {
        const eventStep = start + segmentStart + event.startStep;
        const dotted = event.dots === 1;
        if (event.kind === 'note' && Number(event.dur) >= 8) {
          beam.push(buildStepEvent(tracks, eventStep, event.dur, dotted, useColor));
        } else {
          flushBeam();
          markup.push(event.kind === 'rest'
            ? restEvent(eventStep, event.dur, dotted)
            : buildStepEvent(tracks, eventStep, event.dur, dotted, useColor));
        }
      }
      flushBeam();

      if (split > 1) {
        const duration = DURATION_MAP[stepValue] ?? '4';
        const body = Array.from({ length: split }, (_, sub) => (
          buildStepEvent(tracks, step, duration, false, useColor, sub, split)
        )).join('');
        const splitBeam = `<beam>${body}</beam>`;
        markup.push(split === 3 ? `<tuplet num="3" numbase="2">${splitBeam}</tuplet>` : splitBeam);
      }
      segmentStart = i + 1;
    }
  }
  return `<measure xml:id="bar-${measureNo}" n="${measureNo}"><staff n="1"><layer n="1">${markup.join('')}</layer></staff></measure>`;
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
  const beatDuration = DURATION_MAP[beatNoteValue] ?? DURATION_MAP[noteValueKey] ?? '4';
  const timeSigDenom = BEAT_VALUE_MAP[beatDuration] ?? 4;
  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const totalBars = Math.ceil(totalSteps / stepsPerBar);
  const compound = beatNoteValue === '1/8' && (beatsPerBar === 6 || beatsPerBar === 12);
  const stepsPerNotationBeat = stepsPerBeat * (compound ? 3 : 1);
  const measures: string[] = [];

  for (let bar = 0; bar < totalBars; bar++) {
    if (bar > 0 && barsPerLine > 0 && bar % barsPerLine === 0) measures.push('<sb/>');
    const startStep = bar * stepsPerBar;
    const stepsThisMeasure = Math.min(stepsPerBar, totalSteps - startStep);
    measures.push(buildMeasure(mergedTracks, bar + 1, startStep, stepsThisMeasure, stepsPerNotationBeat, noteValueKey, useColor));
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

function getPrimaryStepColor(mergedTracks: MergedTrack[], step: number, sub: number): string | null {
  const active: { track: MergedTrack; vel: number; pos: number }[] = [];
  for (const track of mergedTracks) {
    const vel = getStepValues(track.steps[step])[sub] ?? 0;
    if (vel > 0) active.push({ track, vel, pos: getNotation(track).pos });
  }
  if (active.length === 0) return null;
  active.sort((a, b) => a.pos - b.pos);
  const top = active[active.length - 1]!;
  return hexToRGBA(top.track.color, getVelocityOpacity(top.vel, top.track.velMode || 3));
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

function getStepPositions(svg: SVGSVGElement, totalSteps: number, stepsPerBar: number): StepPosition[] {
  const positions: StepPosition[] = [];
  const systems = Array.from(svg.querySelectorAll<SVGGElement>('g.system'));
  const staffTops = getSystemStaffTopByLine(svg);
  const measures = svg.querySelectorAll<SVGGElement>('g.measure[id^="bar-"]');

  measures.forEach((measure, index) => {
    const start = (Number(measure.id.slice(4)) - 1) * stepsPerBar;
    const end = Math.min(start + stepsPerBar, totalSteps);
    const system = measure.closest<SVGGElement>('g.system');
    const line = system ? systems.indexOf(system) : 0;
    const y = staffTops[line] ?? 0;
    const staffLine = measure.querySelector<SVGPathElement>('g.staff > path')?.getBBox();
    const bounds = staffLine ?? measure.getBBox();
    const next = measures[index + 1];
    const nextEvent = next?.closest('g.system') === system
      ? next?.querySelector<SVGGraphicsElement>(`#step-${end}`)
      : null;

    let lastStep = start;
    let lastX = bounds.x;
    for (let step = start; step <= end; step++) {
      const event = step === end ? nextEvent : measure.querySelector<SVGGraphicsElement>(`#step-${step}`);
      if (!event && step !== end) continue;
      const box = event?.getBBox();
      const x = box ? box.x + box.width / 2 : bounds.x + bounds.width;
      for (let gapStep = lastStep + 1; gapStep < step; gapStep++) {
        positions[gapStep] = { x: lastX + (x - lastX) * (gapStep - lastStep) / (step - lastStep), y, line };
      }
      if (step < end) positions[step] = { x, y, line };
      lastStep = step;
      lastX = x;
    }
  });

  return positions;
}

function applySectionHeadings(svg: SVGSVGElement, sectionHeadings: SectionHeadingForRender[], stepPositions: StepPosition[]): void {
  if (sectionHeadings.length === 0) return;
  const staffTops = getSystemStaffTopByLine(svg);
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('class', 'drumlet-section-headings');
  svg.querySelector('g.page-margin')?.appendChild(group);

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

function patchSvgForApp(svg: SVGSVGElement, mergedTracks: MergedTrack[], totalSteps: number, stepsPerBar: number, useColor: boolean, sectionHeadings: SectionHeadingForRender[]): StepPosition[] {
  applyScoreTitleFont(svg);
  applyFirstSystemDrumKey(svg, mergedTracks, useColor);
  const stepPositions = getStepPositions(svg, totalSteps, stepsPerBar);
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

  svg.querySelectorAll<SVGGElement>('g.beam').forEach((beam) => {
    const counts = new Map<string, number>();
    beam.querySelectorAll<SVGGElement>('g.note, g.chord').forEach((event) => {
      const match = /^step-(\d+)(?:-sub-(\d+))?$/.exec(event.id);
      if (!match) return;
      const color = getPrimaryStepColor(mergedTracks, Number(match[1]), Number(match[2] ?? 0));
      if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
    });
    const dominant = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!dominant) return;
    beam.querySelectorAll<SVGElement>(':scope > polygon, :scope > path, :scope > line, g.stem path, g.stem line').forEach((child) => {
      child.setAttribute('fill', dominant);
      child.setAttribute('stroke', dominant);
    });
  });

  return stepPositions;
}

export function pickBarsPerLine(containerWidth: number, barWidthPx: number, leftMarginPx: number): { bars: 1 | 2 | 3 | 4; scale: number } {
  for (const bars of [4, 3, 2, 1] as const) {
    if (leftMarginPx + bars * barWidthPx <= containerWidth) return { bars, scale: 1 };
  }
  return { bars: 1, scale: Math.max(0.6, containerWidth / (leftMarginPx + barWidthPx)) };
}

export function fitStaffToWidth(containerWidth: number, stepsPerBar: number, scale: number) {
  const px = scale / 100;
  const minWidth = MIN_PAGE_WIDTH * px;
  const fit = pickBarsPerLine(containerWidth, stepsPerBar * STEP_WIDTH * px, PAGE_MARGIN_WIDTH * px);
  return {
    bars: containerWidth < minWidth ? 1 : fit.bars,
    scale: Math.max(Math.ceil(scale * 0.6), Math.floor(scale * Math.min(fit.scale, containerWidth / minWidth))),
  };
}

export async function renderDrumStaff(container: HTMLElement, options: RenderDrumStaffOptions, signal?: AbortSignal): Promise<RenderDrumStaffResult> {
  const stepsPerBar = (options.beatsPerBar ?? 4) * options.stepsPerBeat;
  const totalBars = Math.ceil(options.totalSteps / stepsPerBar);
  const barsPerLine = options.barsPerLine ?? 4;
  const maxStepsPerLine = Math.min((barsPerLine || totalBars) * stepsPerBar, options.totalSteps);
  const pageWidth = Math.max(MIN_PAGE_WIDTH, PAGE_MARGIN_WIDTH + maxStepsPerLine * STEP_WIDTH);
  const estimatedLines = Math.ceil(totalBars / (barsPerLine || totalBars));
  const singleLine = estimatedLines === 1;
  const pageHeight = Math.min(60000, 280 + estimatedLines * 190);
  const mei = buildMei(options);
  const [toolkit, petalumaFont] = await Promise.all([getToolkit(), loadPetaluma()]);

  signal?.throwIfAborted();

  toolkit.setOptions({
    inputFrom: 'mei',
    breaks: singleLine ? 'none' : 'encoded',
    adjustPageHeight: true,
    adjustPageWidth: singleLine,
    pageWidth,
    pageHeight,
    pageMarginTop: PAGE_TOP_MARGIN,
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
    throw new Error(`Verovio failed to load MEI data: ${toolkit.getLog()}`);
  }

  const svgMarkup = toolkit.renderToSVG(1, false);
  container.innerHTML = svgMarkup;
  const svg = container.querySelector<SVGSVGElement>('svg');
  if (!svg) throw new Error('Verovio did not produce an SVG');

  svg.style.display = 'block';
  svg.style.color = TEXT_COLOR;
  const svgWidth = numberFromSvgLength(svg.getAttribute('width'), pageWidth);
  const svgHeight = numberFromSvgLength(svg.getAttribute('height'), pageHeight);
  const rawPositions = patchSvgForApp(svg, options.mergedTracks, options.totalSteps, stepsPerBar, options.useColor ?? true, options.sectionHeadings ?? []);
  // Verovio puts the staff inside a nested viewBox. App overlays use CSS pixels.
  const viewBox = svg.querySelector('svg.definition-scale')?.getAttribute('viewBox')?.split(/\s+/);
  const unit = svgWidth / Number(viewBox?.[2] ?? pageWidth * 10);
  const stepPositions = rawPositions.map(({ x, y, line }) => ({
    x: (x + FIRST_SYSTEM_LEFT_MARGIN * 10) * unit,
    y: (y + PAGE_TOP_MARGIN * 10) * unit,
    line,
  }));
  const staffTops = getSystemStaffTopByLine(svg);
  const lineHeight = ((options.numStaffLines ?? 5) * 180 + 180) * unit;
  const lineGap = staffTops.length > 1 ? (staffTops[1]! - staffTops[0]!) * unit - lineHeight : 0;
  const topPadding = ((staffTops[0] ?? 0) + PAGE_TOP_MARGIN * 10) * unit;

  return {
    stepPositions, svgWidth, svgHeight, stepWidth: STEP_WIDTH * unit * 10,
    numLines: staffTops.length, lineHeight, lineGap, topPadding,
  };
}
