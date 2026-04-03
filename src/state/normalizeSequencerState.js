import { createInitialState } from './sequencerReducer.js';

export function normalizeSequencerState(rawState) {
  if (!rawState?.pages?.length) return null;

  const fallbackState = createInitialState();
  const parsed = structuredClone(rawState);

  if (!parsed.stepsPerPage || !isFinite(parsed.stepsPerPage)) {
    const firstTrackLength = parsed.pages[0]?.tracks?.[0]?.steps?.length;
    parsed.stepsPerPage = firstTrackLength && isFinite(firstTrackLength)
      ? firstTrackLength
      : fallbackState.stepsPerPage;
  }

  if (parsed.currentPageIndex == null || !isFinite(parsed.currentPageIndex)) parsed.currentPageIndex = 0;
  parsed.currentPageIndex = Math.max(0, Math.min(parsed.currentPageIndex, parsed.pages.length - 1));

  if (parsed.bpm == null || !isFinite(parsed.bpm)) parsed.bpm = fallbackState.bpm;
  if (!parsed.noteValue) parsed.noteValue = fallbackState.noteValue;
  if (parsed.beatsPerBar == null || !isFinite(parsed.beatsPerBar)) parsed.beatsPerBar = fallbackState.beatsPerBar;
  if (!parsed.stepValue) parsed.stepValue = parsed.noteValue || fallbackState.stepValue;
  if (parsed.swing == null || !isFinite(parsed.swing)) parsed.swing = fallbackState.swing;
  if (!parsed.swingTarget) parsed.swingTarget = fallbackState.swingTarget;
  if (parsed.humanize == null || !isFinite(parsed.humanize)) parsed.humanize = fallbackState.humanize;
  if (parsed.chainMode == null) parsed.chainMode = fallbackState.chainMode;

  const globalVel = parsed.velocityLevels;
  delete parsed.velocityLevels;

  for (const page of parsed.pages) {
    if (!page.id) page.id = crypto.randomUUID();
    if (!page.name) page.name = 'Page';
    if (!Array.isArray(page.sectionHeadings)) page.sectionHeadings = [];
    if (!Array.isArray(page.tracks)) page.tracks = [];

    for (const track of page.tracks) {
      if (!track.id) track.id = crypto.randomUUID();
      if (!track.name) track.name = 'Track';
      if (track.velMode == null) track.velMode = globalVel || 3;
      if (track.volume == null || !isFinite(track.volume)) track.volume = 80;
      if (track.reverb == null || !isFinite(track.reverb)) track.reverb = 20;
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
      if (!Array.isArray(track.steps)) track.steps = new Array(parsed.stepsPerPage).fill(0);
      if (track.steps.length < parsed.stepsPerPage) {
        track.steps = [...track.steps, ...new Array(parsed.stepsPerPage - track.steps.length).fill(0)];
      }
    }
  }

  return parsed;
}
