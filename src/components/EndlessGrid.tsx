// SPDX-License-Identifier: MIT
import { memo, useCallback, useLayoutEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { fromGlobalStep, toGlobalStep } from '../audio/playPosition.js';
import { NOTE_VALUES, type NoteValueKey, type Page, type Step, type Track } from '../state/sequencerReducer.js';
import { effectiveStep, isSplit, masterVelocity } from '../util/stepHelpers.js';
import Cell from './Cell.js';
import { useMeasuredAutoFollow } from './useAutoFollow.js';

const LABEL_WIDTH = 'min(7rem,25cqw)';
const STICKY_LABEL = 'sticky left-0 z-10 bg-card';

interface EndlessGridProps {
  pages: Page[];
  stepsPerPage: number;
  beatsPerBar: number;
  noteValue: NoteValueKey;
  stepValue: NoteValueKey;
  currentGlobalStep: number;
  isPlaying: boolean;
  editable: boolean;
  onToggleStep?(page: number, track: number, step: number): void;
  onSeek?(globalStep: number): void;
}

const EndlessStep = memo(function EndlessStep({
  data, color, velMode, globalStep, isPlayhead, isBeatStart, isBarStart,
}: Pick<Track, 'color' | 'velMode'> & {
  data: Step | undefined;
  globalStep: number;
  isPlayhead: boolean;
  isBeatStart: boolean;
  isBarStart: boolean;
}) {
  const effective = effectiveStep(data ?? 0);
  return (
    <div className="endless-step shrink-0" data-global-step={globalStep}>
      <Cell
        velocity={masterVelocity(effective)}
        velMode={velMode || 3}
        color={color}
        isPlayhead={isPlayhead}
        isBeatStart={isBeatStart}
        isBarStart={isBarStart}
        splitData={isSplit(effective) ? effective : null}
      />
    </div>
  );
});

const EndlessTrackPage = memo(function EndlessTrackPage({
  track, pageIndex, stepsPerPage, stepsPerBeat, stepsPerBar, playheadStep,
}: {
  track: Track | undefined;
  pageIndex: number;
  stepsPerPage: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  playheadStep: number;
}) {
  return (
    <div className={`endless-track-page flex px-2 py-1 ${pageIndex > 0 ? 'endless-track-page-join' : ''}`}>
      {track && Array.from({ length: stepsPerPage }, (_, step) => (
        <EndlessStep
          key={step}
          data={track.steps[step]}
          color={track.color}
          velMode={track.velMode}
          globalStep={toGlobalStep(pageIndex, step, stepsPerPage)}
          isPlayhead={step === playheadStep}
          isBeatStart={step > 0 && step % stepsPerBeat === 0}
          isBarStart={step > 0 && step % stepsPerBar === 0}
        />
      ))}
    </div>
  );
});

function getPad(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLButtonElement>('button.step-cell') : null;
}

function getRow(pad: HTMLButtonElement | null) {
  return pad?.closest<HTMLDivElement>('.endless-track-row');
}

function activatePad(row: HTMLDivElement, pad: HTMLButtonElement) {
  const step = pad.closest<HTMLElement>('.endless-step')?.dataset.globalStep;
  if (step === undefined) return;
  const previous = row.querySelector<HTMLButtonElement>('.step-cell[tabindex="0"]');
  if (previous && previous !== pad) previous.tabIndex = -1;
  pad.tabIndex = 0;
  row.dataset.focusStep = step;
}

function movePadFocus(event: KeyboardEvent<HTMLDivElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const pad = getPad(event.target);
  const row = getRow(pad);
  if (!row || !pad) return;
  const pads = Array.from(row.querySelectorAll<HTMLButtonElement>('.step-cell'));
  const index = pads.indexOf(pad);
  let next: number;
  switch (event.key) {
    case 'ArrowLeft': next = index - 1; break;
    case 'ArrowRight': next = index + 1; break;
    case 'Home': next = 0; break;
    case 'End': next = pads.length - 1; break;
    default: return;
  }
  event.preventDefault();
  const target = pads[next];
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

export default function EndlessGrid({
  pages,
  stepsPerPage,
  beatsPerBar,
  noteValue,
  stepValue,
  currentGlobalStep,
  isPlaying,
  editable,
  onToggleStep,
  onSeek,
}: EndlessGridProps) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  function getTarget(element: HTMLElement) {
    if (currentGlobalStep < 0) return null;
    const cell = element.querySelector(`[data-global-step="${currentGlobalStep}"]`);
    if (!cell) return null;

    const { left, width } = cell.getBoundingClientRect();
    const viewportLeft = element.getBoundingClientRect().left + element.clientLeft;
    const labelWidth = element.querySelector('.endless-track-label')?.getBoundingClientRect().width ?? 0;
    return {
      x: left + width / 2 - viewportLeft + element.scrollLeft,
      margin: Math.max(element.clientWidth / 4, labelWidth + width / 2),
    };
  }
  const { resume, isTap } = useMeasuredAutoFollow(scrollEl, isPlaying, getTarget);

  // Cell owns the buttons. Update tab stops only when the groove can change the DOM.
  useLayoutEffect(() => {
    for (const row of scrollEl?.querySelectorAll<HTMLDivElement>('.endless-track-row') ?? []) {
      const pads = row.querySelectorAll<HTMLButtonElement>('.step-cell');
      const selected = row.querySelector<HTMLButtonElement>(`[data-global-step="${row.dataset.focusStep}"] .step-cell`) ?? pads[0];
      for (const pad of pads) pad.tabIndex = pad === selected ? 0 : -1;
    }
  }, [scrollEl, pages, stepsPerPage]);

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const pad = getPad(event.target);
    const row = getRow(pad);
    if (!row || !pad || !isTap(event.detail)) return;
    const globalStep = Number(pad.closest<HTMLElement>('.endless-step')?.dataset.globalStep);
    if (pad.classList.contains('playhead-active')) resume();
    if (!editable) {
      onSeek?.(globalStep);
      return;
    }
    const { page, step } = fromGlobalStep(globalStep, stepsPerPage);
    onToggleStep?.(page, Number(row.dataset.trackIndex), step);
  }, [editable, isTap, onSeek, onToggleStep, resume, stepsPerPage]);

  const tracks = pages[0]?.tracks ?? [];
  if (!tracks.length) return null;
  const beat = NOTE_VALUES.find(value => value.key === noteValue) ?? NOTE_VALUES[3];
  const step = NOTE_VALUES.find(value => value.key === stepValue) ?? beat;
  const stepsPerBeat = Math.max(1, Math.round(beat.beatsPerStep / step.beatsPerStep));
  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const playhead = fromGlobalStep(currentGlobalStep, stepsPerPage);

  return (
    <div
      ref={setScrollEl}
      className="endless-grid grid-scroll @container w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"
      style={{ scrollPaddingLeft: 'min(7rem,25%)' }}
      onClick={handleClick}
      onKeyDown={movePadFocus}
      onFocus={event => {
        const pad = getPad(event.target);
        const row = getRow(pad);
        if (row && pad) activatePad(row, pad);
      }}
    >
      <div
        className="endless-grid-strip grid w-max py-2"
        style={{ gridTemplateColumns: `max-content repeat(${pages.length}, max-content)` }}
      >
        <div className={`endless-label-spacer ${STICKY_LABEL}`} style={{ width: LABEL_WIDTH }} aria-hidden="true" />
        {pages.map((page, index) => {
          const label = page.sectionHeadings?.find(heading => heading.step === 0)?.label || page.name;
          return (
            <div key={page.id} className={`endless-page-heading relative h-7 ${index > 0 ? 'endless-page-join' : ''}`}>
              <span className="endless-page-name absolute inset-x-2 top-0 truncate text-sm font-legend font-semibold text-text" title={label}>
                {label}
              </span>
            </div>
          );
        })}
        {tracks.map((track, trackIndex) => (
          <div className="endless-track-row contents" data-track-index={trackIndex} key={track.id}>
            <div
              className={`endless-track-label ${STICKY_LABEL} flex items-center border-l-[3px] px-2 text-sm font-display font-semibold text-text`}
              style={{ width: LABEL_WIDTH, borderLeftColor: track.color }}
              title={track.name}
            >
              <span className="endless-track-name truncate">{track.name}</span>
            </div>
            {pages.map((page, pageIndex) => (
              <EndlessTrackPage
                key={page.id}
                track={page.tracks[trackIndex]}
                pageIndex={pageIndex}
                stepsPerPage={stepsPerPage}
                stepsPerBeat={stepsPerBeat}
                stepsPerBar={stepsPerBar}
                playheadStep={pageIndex === playhead.page ? playhead.step : -1}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
