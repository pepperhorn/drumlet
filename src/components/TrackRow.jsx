import { memo } from 'react';
import Cell from './Cell.jsx';
import TrackControls from './TrackControls.jsx';
import { isSplit, masterVelocity } from '../util/stepHelpers.js';

function TrackRow({
  track,
  trackIndex,
  currentStep,
  stepsPerPage,
  stepsPerBeat,
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
  onChangeSource,
  onChangeVelMode,
  onRemoveTrack,
  onPreview,
  onDrop,
}) {
  return (
    <div className={`track-row flex items-start gap-3 py-1.5 relative ${track.mute ? 'opacity-40' : ''}`}>
      <TrackControls
        track={track}
        trackIndex={trackIndex}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        colWidth={colWidth}
        onChangeProp={onChangeProp}
        onChangeSource={onChangeSource}
        onChangeVelMode={onChangeVelMode}
        onRemove={onRemoveTrack}
        onPreview={onPreview}
        onDrop={onDrop}
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
