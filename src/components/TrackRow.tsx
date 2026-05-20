import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Cell from './Cell.js';
import TrackControls from './TrackControls.js';
import { isSplit, masterVelocity, effectiveStep } from '../util/stepHelpers.js';
import type { Track, CellRef, VelMode } from '../state/sequencerReducer.js';

interface ExpandedSplitCell {
  trackIndex: number;
  stepIndex: number;
}

interface TrackRowProps {
  track: Track;
  trackIndex: number;
  currentStep: number;
  stepsPerPage: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  expanded: boolean;
  onToggleExpand: () => void;
  colWidth: string;
  activeCell: CellRef | null;
  expandedSplitCell: ExpandedSplitCell | null;
  onExpandSplitCell: (trackIndex: number, stepIndex: number) => void;
  onToggleCell: (trackIndex: number, stepIndex: number, isRightClick?: boolean) => void;
  onToggleSubStep: (trackIndex: number, stepIndex: number, subIndex: number) => void;
  onClearSubStep: (trackIndex: number, stepIndex: number, subIndex: number) => void;
  onChangeProp: (trackIndex: number, prop: keyof Track, value: unknown) => void;
  onChangeVelMode: (trackIndex: number, mode: VelMode) => void;
  onOpenSoundPicker: (trackIndex: number) => void;
  onDrop: (file: File, trackIndex: number) => void;
  sortableEnabled: boolean;
  deleteMode?: boolean;
  onPickForDelete?: () => void;
  /** Step range to render. Defaults to the full page (0 .. stepsPerPage). */
  stepStart?: number;
  stepCount?: number;
  /** Slim mode: render a thin track-title strip on the left instead of the full TrackControls. */
  slimControls?: boolean;
}

function TrackRow({
  track,
  trackIndex,
  currentStep,
  stepsPerPage,
  stepsPerBeat,
  stepsPerBar,
  expanded,
  onToggleExpand,
  colWidth,
  activeCell,
  expandedSplitCell,
  onExpandSplitCell,
  onToggleCell,
  onToggleSubStep,
  onClearSubStep,
  onChangeProp,
  onChangeVelMode,
  onOpenSoundPicker,
  onDrop,
  sortableEnabled,
  deleteMode = false,
  onPickForDelete,
  stepStart = 0,
  stepCount,
  slimControls = false,
}: TrackRowProps) {
  // In slim mode we still call useSortable (rules of hooks), but with a
  // synthetic id so multiple wrap-systems don't collide on track.id, and
  // sorting is forcibly disabled.
  const sortableId = slimControls ? `${track.id}-slim-${stepStart}` : track.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: slimControls || !sortableEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.6 : undefined,
  };

  const count = stepCount ?? (stepsPerPage - stepStart);
  const sliceEnd = stepStart + count;
  const slice = track.steps.slice(stepStart, sliceEnd);

  return (
    <div
      ref={slimControls ? undefined : setNodeRef}
      style={slimControls ? undefined : style}
      className={`track-row flex items-start gap-3 py-1.5 relative ${track.mute ? 'opacity-40' : ''} ${isDragging ? 'track-row-dragging' : ''} ${deleteMode ? 'track-row-delete-mode' : ''}`}
    >
      {deleteMode && onPickForDelete && (
        <button
          className="track-row-delete-overlay absolute inset-0 z-20 rounded-lg border-2 border-coral/60 bg-coral/10 hover:bg-coral/20 cursor-pointer transition-colors flex items-center justify-center gap-2 text-coral font-semibold text-xs lg:text-sm"
          onClick={onPickForDelete}
          title={`Delete "${track.name}" from all pages`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4h11" />
            <path d="M6 4V2.5h4V4" />
            <path d="M3.5 4l.7 9a1 1 0 0 0 1 1h5.6a1 1 0 0 0 1-1l.7-9" />
          </svg>
          Delete "{track.name}"
        </button>
      )}
      {slimControls ? (
        <div className={`track-slim-title ${colWidth} flex items-center gap-2 pl-2 pr-1`}>
          <span
            className="track-slim-dot w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: track.color }}
          />
          <span className="track-slim-name text-xs lg:text-sm font-medium text-text truncate">
            {track.name}
          </span>
        </div>
      ) : (
        <TrackControls
          track={track}
          trackIndex={trackIndex}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          colWidth={colWidth}
          onChangeProp={onChangeProp}
          onChangeVelMode={onChangeVelMode}
          onOpenSoundPicker={onOpenSoundPicker}
          onDrop={onDrop}
          dragHandleProps={sortableEnabled ? { ...attributes, ...listeners } : null}
        />
      )}

      <div className="track-steps flex items-start mt-0.5">
        {slice.map((stepData, localIdx) => {
          const globalStepIdx = stepStart + localIdx;
          const effective = effectiveStep(stepData);
          const split = isSplit(effective);
          const isThisExpanded = expandedSplitCell?.trackIndex === trackIndex && expandedSplitCell?.stepIndex === globalStepIdx;
          const isActive = activeCell?.trackIndex === trackIndex && activeCell?.stepIndex === globalStepIdx;
          const vel = split ? masterVelocity(effective) : (typeof effective === 'number' ? effective : 0);

          return (
            <Cell
              key={globalStepIdx}
              velocity={vel}
              velMode={track.velMode || 3}
              color={track.color}
              isPlayhead={currentStep === globalStepIdx}
              isBeatStart={localIdx > 0 && globalStepIdx % stepsPerBeat === 0}
              isBarStart={stepsPerBar ? localIdx > 0 && globalStepIdx % stepsPerBar === 0 : false}
              splitData={split ? (effective as number[]) : null}
              isActive={isActive}
              isExpanded={isThisExpanded}
              onExpandToggle={() => onExpandSplitCell(trackIndex, globalStepIdx)}
              onToggleSubStep={(subIdx) => onToggleSubStep(trackIndex, globalStepIdx, subIdx)}
              onClearSubStep={(subIdx) => onClearSubStep(trackIndex, globalStepIdx, subIdx)}
              onClick={() => onToggleCell(trackIndex, globalStepIdx)}
              onRightClick={() => onToggleCell(trackIndex, globalStepIdx, true)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default memo(TrackRow);
