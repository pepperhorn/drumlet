import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Cell from './Cell.jsx';
import TrackControls from './TrackControls.jsx';
import { isSplit, masterVelocity } from '../util/stepHelpers.js';

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
  splitMode,
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
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled: !sortableEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`track-row flex items-start gap-3 py-1.5 relative ${track.mute ? 'opacity-40' : ''} ${isDragging ? 'track-row-dragging' : ''}`}
    >
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

      <div className="track-steps flex items-start mt-0.5">
        {track.steps.slice(0, stepsPerPage).map((stepData, stepIdx) => {
          const split = isSplit(stepData);
          const isThisExpanded = expandedSplitCell?.trackIndex === trackIndex && expandedSplitCell?.stepIndex === stepIdx;
          const vel = split ? masterVelocity(stepData) : stepData;

          return (
            <Cell
              key={stepIdx}
              velocity={vel}
              velMode={track.velMode || 3}
              color={track.color}
              isPlayhead={currentStep === stepIdx}
              isBeatStart={stepIdx > 0 && stepIdx % stepsPerBeat === 0}
              isBarStart={stepsPerBar ? stepIdx > 0 && stepIdx % stepsPerBar === 0 : false}
              splitData={split ? stepData : null}
              splitMode={splitMode}
              isExpanded={isThisExpanded}
              onExpandToggle={() => onExpandSplitCell(trackIndex, stepIdx)}
              onToggleSubStep={(subIdx) => onToggleSubStep(trackIndex, stepIdx, subIdx)}
              onClearSubStep={(subIdx) => onClearSubStep(trackIndex, stepIdx, subIdx)}
              onClick={() => onToggleCell(trackIndex, stepIdx)}
              onRightClick={() => onToggleCell(trackIndex, stepIdx, true)}
            />
          );
        })}
      </div>
    </div>
  );
}

export default memo(TrackRow);
