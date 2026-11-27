/// <reference types="node" />
import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it, vi } from 'vitest';
import { fitStaffToWidth, pickBarsPerLine, renderDrumStaff, type MergedTrack } from './renderStaff.js';

it('chooses the largest number of full bars that fits at the selected size', () => {
  expect(pickBarsPerLine(360, 280, 85)).toEqual({ bars: 1, scale: 360 / 365 });
  expect(pickBarsPerLine(925, 280, 85)).toEqual({ bars: 3, scale: 1 });
  expect(pickBarsPerLine(1280, 280, 85)).toEqual({ bars: 4, scale: 1 });
  expect(pickBarsPerLine(200, 600, 85)).toEqual({ bars: 1, scale: 0.6 });
  expect(fitStaffToWidth(310, 16, 45)).toEqual({ bars: 1, scale: 34 });
});

function stubVerovioGeometry() {
  // jsdom has no layout engine. Derive the horizontal position from Verovio's
  // note/rest transforms and staff paths.
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value(this: SVGElement) {
      const use = this.querySelector('use')?.getAttribute('transform') ?? '';
      const span = /^M(\d+) \d+ L(\d+) /.exec(this.getAttribute('d') ?? '');
      const x = Number(span?.[1] ?? /translate\((\d+)/.exec(use)?.[1] ?? 0);
      return { x, y: 0, width: span ? Number(span[2]) - x : 10, height: 10 };
    },
  });
}

beforeAll(async () => {
  const font = await readFile('public/fonts/Petaluma.zip');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array(font))));
  stubVerovioGeometry();
  try {
    // Warm the renderer's cached toolkit and font with one empty bar.
    const score = document.createElement('div');
    score.className = 'drumlet-notation-test-score';
    await renderDrumStaff(score, {
      mergedTracks: [], totalSteps: 16, noteValueKey: '1/16', beatNoteValue: '1/4',
      stepsPerBeat: 4, numStaffLines: 1,
    });
  } finally {
    Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
    vi.unstubAllGlobals();
  }
}, 30_000);

it('engraves onsets, keeps split tuplets, and interpolates skipped grid steps', async () => {
  stubVerovioGeometry();

  const score = document.createElement('div');
  const track = {
    id: 'hat', name: 'Hi-hat', group: 'hihat', color: '#A8E06C',
    steps: [3, 0, 3, 0, 0, 3, 0, 0, [3, 3, 3], 0, 3, 0, 0, 0, 0, 0],
  } as MergedTrack;
  try {
    const result = await renderDrumStaff(score, {
      mergedTracks: [track], totalSteps: 16, noteValueKey: '1/16', beatNoteValue: '1/4',
      stepsPerBeat: 4, useColor: false, numStaffLines: 1,
    });
    expect(score.querySelector('#step-0')).toBeTruthy();
    expect(score.querySelector('#step-2')).toBeTruthy();
    expect(score.querySelector('#step-1, #step-3')).toBeNull();
    expect(score.querySelector('#step-4.rest')).toBeTruthy();
    expect(score.querySelector('#step-5 .dots')).toBeTruthy();
    expect(score.querySelector('g.tuplet #step-8-sub-2')).toBeTruthy();
    expect(score.querySelector('#step-12.rest')).toBeTruthy();
    expect(score.querySelector('.drumlet-rest-stemlet')).toBeNull();
    expect(score.querySelector('g.beam g.rest')).toBeNull();
    expect(result.stepPositions.filter(Boolean)).toHaveLength(16);
    expect(result.stepPositions[1]!.x).toBeCloseTo((result.stepPositions[0]!.x + result.stepPositions[2]!.x) / 2);
    expect(result.stepPositions[15]!.x).toBeGreaterThan(result.stepPositions[12]!.x);
  } finally {
    Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
  }
}, 15_000);

it.each([
  { bars: 8, systems: 1 },
  { bars: 225, systems: 4 },
])('places $bars bars in $systems horizontal systems with global step positions', async ({ bars, systems }) => {
  stubVerovioGeometry();
  const score = document.createElement('div');
  const totalSteps = bars * 16;
  const track = {
    id: 'kick', name: 'Kick', group: 'kick', color: '#A8E06C',
    steps: Array.from({ length: totalSteps }, (_, step) => step % 4 === 0 ? 3 : 0),
  } as MergedTrack;

  try {
    const result = await renderDrumStaff(score, {
      layout: 'endless', mergedTracks: [track], totalSteps, noteValueKey: '1/16',
      beatNoteValue: '1/4', stepsPerBeat: 4, useColor: false, numStaffLines: 1,
    });
    const svg = score.firstElementChild!;
    const groups = Array.from(svg.querySelectorAll('g.system'));
    expect(groups).toHaveLength(systems);
    expect(svg.querySelectorAll('g.measure')).toHaveLength(bars);
    expect(groups.every(group => group.querySelectorAll('g.measure').length <= 64)).toBe(true);
    expect(svg.querySelectorAll('#bar-1')).toHaveLength(1);
    expect(svg.querySelector(`#bar-${bars}`)).not.toBeNull();
    expect(result.stepPositions.filter(Boolean)).toHaveLength(totalSteps);
    expect(new Set(result.stepPositions.map(pos => pos.y)).size).toBe(1);
    expect(result.stepPositions.every((pos, step, all) => step === 0 || pos.x > all[step - 1]!.x)).toBe(true);
  } finally {
    Reflect.deleteProperty(SVGElement.prototype, 'getBBox');
  }
}, 30_000);
