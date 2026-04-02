import { memo } from 'react';
import Cell from './Cell.jsx';
import TrackControls from './TrackControls.jsx';

function TrackRow({
  track,
  trackIndex,
  currentStep,
  onToggleCell,
  onChangeProp,
  onChangeSource,
  onChangeVelMode,
  onRemoveTrack,
  onPreview,
  onDrop,
}) {
  return (
    <div className={`track-row flex items-center gap-3 py-1.5 relative ${track.mute ? 'opacity-40' : ''}`}>
      <TrackControls
        track={track}
        trackIndex={trackIndex}
        onChangeProp={onChangeProp}
        onChangeSource={onChangeSource}
        onChangeVelMode={onChangeVelMode}
        onRemove={onRemoveTrack}
        onPreview={onPreview}
        onDrop={onDrop}
      />

      <div className="track-steps flex items-center">
        {track.steps.map((vel, stepIdx) => (
          <Cell
            key={stepIdx}
            velocity={vel}
            velMode={track.velMode || 3}
            color={track.color}
            isPlayhead={currentStep === stepIdx}
            isBeatStart={stepIdx > 0 && stepIdx % 4 === 0}
            onClick={() => onToggleCell(trackIndex, stepIdx)}
            onRightClick={() => onToggleCell(trackIndex, stepIdx, true)}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(TrackRow);
