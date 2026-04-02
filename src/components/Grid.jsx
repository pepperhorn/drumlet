import { memo } from 'react';
import TrackRow from './TrackRow.jsx';

function Grid({
  tracks,
  currentStep,
  stepsPerPage,
  onToggleCell,
  onChangeProp,
  onChangeSource,
  onChangeVelMode,
  onRemoveTrack,
  onAddTrack,
  onPreview,
  onDrop,
}) {
  return (
    <div className="sequencer-grid bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll">
      {/* Step numbers header */}
      <div className="step-numbers flex items-center gap-0 mb-1">
        {/* Spacer for track controls */}
        <div className="min-w-[180px] lg:min-w-[220px] shrink-0" />
        <div className="flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => (
            <div
              key={i}
              className={`step-number w-9 sm:w-10 lg:w-11 text-center text-[9px] lg:text-[11px] font-mono text-muted select-none
                ${i > 0 && i % 4 === 0 ? 'ml-1.5' : 'ml-0.5'}
                ${currentStep === i ? 'text-sky font-bold' : ''}
              `}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Beat group markers */}
      <div className="beat-markers flex items-center mb-2">
        <div className="min-w-[180px] lg:min-w-[220px] shrink-0" />
        <div className="flex items-center">
          {Array.from({ length: Math.ceil(stepsPerPage / 4) }, (_, i) => (
            <div
              key={i}
              className={`beat-marker h-0.5 rounded-full ${i > 0 ? 'ml-1.5' : 'ml-0.5'}`}
              style={{
                width: `calc(${4} * (2rem + 2px) + ${3} * 2px)`,
                backgroundColor: currentStep >= i * 4 && currentStep < (i + 1) * 4
                  ? '#5BC0EB'
                  : '#E2E8F0',
              }}
            />
          ))}
        </div>
      </div>

      {/* Track rows */}
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          trackIndex={i}
          currentStep={currentStep}
          onToggleCell={onToggleCell}
          onChangeProp={onChangeProp}
          onChangeSource={onChangeSource}
          onChangeVelMode={onChangeVelMode}
          onRemoveTrack={onRemoveTrack}
          onPreview={onPreview}
          onDrop={onDrop}
        />
      ))}

      {/* Add track button */}
      <div className="add-track flex items-center mt-2">
        <div className="min-w-[180px] lg:min-w-[220px] shrink-0" />
        <button
          className="add-track-btn px-4 py-1.5 rounded-lg bg-gray-50 text-muted text-sm hover:bg-gray-100 hover:text-text transition-colors cursor-pointer border border-dashed border-border"
          onClick={onAddTrack}
        >
          + Add Track
        </button>
      </div>
    </div>
  );
}

export default memo(Grid);
