import { createInitialState } from './sequencerReducer.js';
import type { SequencerState, Track, Step, MultiStep, SplitCount, VelMode } from './sequencerReducer.js';

/**
 * Normalize a raw (possibly-stale or partial) state shape into a full
 * SequencerState. Returns null if the input is unrecognizable.
 */
export function normalizeSequencerState(rawState: unknown): SequencerState | null {
  if (!rawState || typeof rawState !== 'object') return null;
  const raw = rawState as Record<string, unknown>;
  const rawPages = raw.pages;
  if (!Array.isArray(rawPages) || rawPages.length === 0) return null;

  const fallbackState = createInitialState();
  const parsed = structuredClone(raw) as Record<string, unknown> & { pages: unknown[] };

  if (!parsed.stepsPerPage || !isFinite(parsed.stepsPerPage as number)) {
    const firstTrackLength =
      ((parsed.pages[0] as { tracks?: { steps?: unknown[] }[] } | undefined)?.tracks?.[0]?.steps?.length);
    parsed.stepsPerPage = firstTrackLength && isFinite(firstTrackLength)
      ? firstTrackLength
      : fallbackState.stepsPerPage;
  }
  const stepsPerPage = parsed.stepsPerPage as number;

  if (parsed.currentPageIndex == null || !isFinite(parsed.currentPageIndex as number)) parsed.currentPageIndex = 0;
  parsed.currentPageIndex = Math.max(0, Math.min(parsed.currentPageIndex as number, parsed.pages.length - 1));

  if (parsed.bpm == null || !isFinite(parsed.bpm as number)) parsed.bpm = fallbackState.bpm;
  if (!parsed.noteValue) parsed.noteValue = fallbackState.noteValue;
  if (parsed.beatsPerBar == null || !isFinite(parsed.beatsPerBar as number)) parsed.beatsPerBar = fallbackState.beatsPerBar;
  if (!parsed.stepValue) parsed.stepValue = parsed.noteValue || fallbackState.stepValue;
  if (parsed.swing == null || !isFinite(parsed.swing as number)) parsed.swing = fallbackState.swing;
  if (!parsed.swingTarget) parsed.swingTarget = fallbackState.swingTarget;
  if (parsed.humanize == null || !isFinite(parsed.humanize as number)) parsed.humanize = fallbackState.humanize;
  if (parsed.chainMode == null) parsed.chainMode = fallbackState.chainMode;
  if (parsed.activeCell === undefined) parsed.activeCell = null;
  if (parsed.pendingSplit === undefined) parsed.pendingSplit = null;
  // Drop legacy top-level splitMode if present — replaced by per-cell active.
  delete parsed.splitMode;

  const globalVel = parsed.velocityLevels as VelMode | undefined;
  delete parsed.velocityLevels;

  const pages = parsed.pages as Record<string, unknown>[];
  for (const page of pages) {
    if (!page.id) page.id = crypto.randomUUID();
    if (!page.name) page.name = 'Page';
    if (!Array.isArray(page.sectionHeadings)) page.sectionHeadings = [];
    if (!Array.isArray(page.tracks)) page.tracks = [];

    const tracks = page.tracks as Record<string, unknown>[];
    for (const track of tracks) {
      if (!track.id) track.id = crypto.randomUUID();
      if (!track.name) track.name = 'Track';
      if (track.velMode == null) track.velMode = globalVel ?? 3;
      if (track.volume == null || !isFinite(track.volume as number)) track.volume = 80;
      if (track.reverb == null || !isFinite(track.reverb as number)) track.reverb = 20;
      if (!track.sourceType) track.sourceType = 'drumMachine';
      if (!track.instrument && track.sourceType === 'drumMachine') track.instrument = 'TR-808';
      if (!track.group && track.sourceType === 'drumMachine') track.group = 'kick';
      if (track.soundfontName == null) track.soundfontName = null;
      if (track.customSampleName == null) track.customSampleName = null;
      if (track.kitId == null) track.kitId = null;
      if (track.kitSample == null) track.kitSample = null;
      if (!track._stashedSteps || typeof track._stashedSteps !== 'object') track._stashedSteps = {};
      if (track.mute == null) track.mute = false;
      if (track.solo == null) track.solo = false;
      if (!Array.isArray(track.steps)) track.steps = new Array<Step>(stepsPerPage).fill(0);
      const stepsArr = track.steps as Step[];
      if (stepsArr.length < stepsPerPage) {
        track.steps = [...stepsArr, ...new Array<Step>(stepsPerPage - stepsArr.length).fill(0)];
      }
      // Migrate legacy array split steps into the per-cell multi format.
      track.steps = (track.steps as Step[]).map((step): Step => {
        if (Array.isArray(step)) {
          const count = step.length as SplitCount;
          const v = Math.max(...step, 0);
          return { v, active: count, s: { [count]: [...step] } } satisfies MultiStep;
        }
        if (step !== null && typeof step === 'object') {
          const m = step as MultiStep;
          if (m.active == null) {
            const keys = Object.keys(m.s ?? {}).map(Number).filter((n): n is SplitCount => n === 2 || n === 3 || n === 4);
            m.active = keys[0] ?? 2;
            if (!m.s?.[m.active]) {
              m.s = m.s ?? {};
              const bank = new Array<number>(m.active).fill(0);
              bank[0] = m.v ?? 0;
              m.s[m.active] = bank;
            }
          }
          return m;
        }
        return step;
      });
    }
  }

  return parsed as unknown as SequencerState;
}
