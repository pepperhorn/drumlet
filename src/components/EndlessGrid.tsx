// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { toGlobalStep } from '../audio/playPosition.js';
import { NOTE_VALUES, type NoteValueKey, type Page } from '../state/sequencerReducer.js';
import { effectiveStep, isSplit, masterVelocity } from '../util/stepHelpers.js';
import Cell from './Cell.js';
import { useAutoFollow } from './useAutoFollow.js';

const STICKY_LABEL = 'sticky left-0 z-10 w-[min(7rem,25cqw)] bg-card';

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
  const [targetCell, setTargetCell] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<{ x: number; margin: number } | null>(null);
  const { resume } = useAutoFollow(scrollEl, targetCell ? target?.x ?? null : null, {
    isPlaying,
    margin: target?.margin,
  });

  useEffect(() => {
    if (!scrollEl || !targetCell) return;

    const label = scrollEl.querySelector('.endless-track-label');
    const measure = () => {
      const cell = targetCell.getBoundingClientRect();
      const viewport = scrollEl.getBoundingClientRect();
      const labelWidth = label?.getBoundingClientRect().width ?? 0;
      setTarget({
        x: cell.left + cell.width / 2 - viewport.left - scrollEl.clientLeft + scrollEl.scrollLeft,
        margin: Math.max(scrollEl.clientWidth / 4, labelWidth + cell.width / 2),
      });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(scrollEl);
    observer.observe(targetCell);
    if (label) observer.observe(label);
    if (scrollEl.firstElementChild) observer.observe(scrollEl.firstElementChild);
    return () => observer.disconnect();
  }, [scrollEl, targetCell]);

  const tracks = pages[0]?.tracks ?? [];
  if (!tracks.length) return null;

  const beat = NOTE_VALUES.find(value => value.key === noteValue) ?? NOTE_VALUES[3];
  const step = NOTE_VALUES.find(value => value.key === stepValue) ?? beat;
  const stepsPerBeat = Math.max(1, Math.round(beat.beatsPerStep / step.beatsPerStep));
  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const steps = Array.from({ length: stepsPerPage }, (_, index) => index);

  return (
    <div
      ref={setScrollEl}
      className="endless-grid grid-scroll @container w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"
    >
      <div
        className="endless-grid-strip grid w-max py-2"
        style={{ gridTemplateColumns: `max-content repeat(${pages.length}, max-content)` }}
      >
        <div className={`endless-label-spacer ${STICKY_LABEL}`} aria-hidden="true" />
        {pages.map((page, index) => {
          const label = page.sectionHeadings?.find(heading => heading.step === 0)?.label || page.name;
          return (
            <div
              key={page.id}
              className={`endless-page-heading relative h-7 ${index > 0 ? 'endless-page-join' : ''}`}
            >
              <span className="endless-page-name absolute inset-x-2 top-0 truncate text-sm font-legend font-semibold text-text" title={label}>
                {label}
              </span>
            </div>
          );
        })}
        {tracks.map((track, trackIndex) => (
          <div className="endless-track-row contents" key={track.id}>
            <div
              className={`endless-track-label ${STICKY_LABEL} flex items-center border-l-[3px] px-2 text-sm font-display font-semibold text-text`}
              style={{ borderLeftColor: track.color }}
              title={track.name}
            >
              <span className="endless-track-name truncate">{track.name}</span>
            </div>
            {pages.map((page, pageIndex) => {
              const pageTrack = page.tracks[trackIndex];
              return (
                <div
                  key={page.id}
                  className={`endless-track-page flex px-2 py-1 ${pageIndex > 0 ? 'endless-track-page-join' : ''}`}
                >
                  {pageTrack && steps.map(stepIndex => {
                    const globalStep = toGlobalStep(pageIndex, stepIndex, stepsPerPage);
                    const data = effectiveStep(pageTrack.steps[stepIndex] ?? 0);
                    const isPlayhead = globalStep === currentGlobalStep;
                    return (
                      <div
                        className="endless-step shrink-0"
                        key={stepIndex}
                        data-global-step={globalStep}
                        ref={trackIndex === 0 && isPlayhead ? setTargetCell : undefined}
                      >
                        <Cell
                          velocity={masterVelocity(data)}
                          velMode={pageTrack.velMode || 3}
                          color={pageTrack.color}
                          isPlayhead={isPlayhead}
                          isBeatStart={stepIndex > 0 && stepIndex % stepsPerBeat === 0}
                          isBarStart={stepIndex > 0 && stepIndex % stepsPerBar === 0}
                          splitData={isSplit(data) ? data : null}
                          onClick={() => {
                            if (isPlayhead) resume();
                            if (editable) onToggleStep?.(pageIndex, trackIndex, stepIndex);
                            else onSeek?.(globalStep);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
