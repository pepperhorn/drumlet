/// <reference types="node" />
import { readFile } from 'node:fs/promises';
import { expect, it, vi } from 'vitest';
import { fitStaffToWidth, pickBarsPerLine, renderDrumStaff, type MergedTrack } from './renderStaff.js';

it('chooses the largest number of full bars that fits at the selected size', () => {
  expect(pickBarsPerLine(360, 280, 85)).toEqual({ bars: 1, scale: 360 / 365 });
  expect(pickBarsPerLine(925, 280, 85)).toEqual({ bars: 3, scale: 1 });
  expect(pickBarsPerLine(1280, 280, 85)).toEqual({ bars: 4, scale: 1 });
  expect(pickBarsPerLine(200, 600, 85)).toEqual({ bars: 1, scale: 0.6 });
  expect(fitStaffToWidth(310, 16, 45)).toEqual({ bars: 1, scale: 34 });
});

it('engraves onsets, keeps split tuplets, and interpolates skipped grid steps', async () => {
  const font = await readFile('public/fonts/Petaluma.zip');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array(font))));
  // jsdom has no layout engine. Derive the horizontal position from Verovio's
  // note transforms and supply a fixed right boundary for the last span.
  Object.defineProperty(SVGElement.prototype, 'getBBox', {
    configurable: true,
    value(this: SVGElement) {
      const use = this.querySelector('use')?.getAttribute('transform') ?? '';
      const x = Number(/translate\((\d+)/.exec(use)?.[1] ?? 0);
      return { x, y: 0, width: this.tagName === 'path' ? 8200 : 10, height: 10 };
    },
  });

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
});
