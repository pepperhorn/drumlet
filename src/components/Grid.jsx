import { memo, useState, useSyncExternalStore } from 'react';
import TrackRow from './TrackRow.jsx';
import { NOTE_VALUES } from '../state/sequencerReducer.js';

const lgQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;
function subscribeToLg(cb) { lgQuery?.addEventListener('change', cb); return () => lgQuery?.removeEventListener('change', cb); }
function getIsLg() { return lgQuery?.matches ?? false; }

/** Beat subdivision labels per step within a beat */
const BEAT_LABELS = {
  1: [''],
  2: ['', '&'],
  3: ['', '&', 'a'],
  4: ['', 'e', '&', 'a'],
  6: ['', 'ta', 'ta', '&', 'ta', 'ta'],
  8: ['', 'e', '&', 'a', 'e', '&', 'a', 'e'],
};

function buildDivisorLabels(stepsPerPage, stepsPerBeat) {
  const labels = [];
  const subLabels = BEAT_LABELS[stepsPerBeat] || BEAT_LABELS[1];
  for (let i = 0; i < stepsPerPage; i++) {
    const beatNum = Math.floor(i / stepsPerBeat) + 1;
    const subIdx = i % stepsPerBeat;
    labels.push(subIdx === 0 ? String(beatNum) : subLabels[subIdx] || '');
  }
  return labels;
}

const SIZE_CYCLE = ['sm', 'md', 'lg'];
const SIZE_LABELS = { sm: 'S', md: 'M', lg: 'L' };
// [mobile, desktop] font sizes in px
const SIZE_PX = {
  sm: [9, 11],
  md: [11, 13],
  lg: [13, 15],
};

function Grid({
  tracks,
  currentStep,
  stepsPerPage,
  noteValue,
  onToggleCell,
  onChangeProp,
  onChangeSource,
  onChangeVelMode,
  onRemoveTrack,
  onAddTrack,
  onPreview,
  onDrop,
}) {
  const [countMode, setCountMode] = useState('step'); // 'step' | 'beat'
  const [countSize, setCountSize] = useState('sm');
  const isLg = useSyncExternalStore(subscribeToLg, getIsLg);
  const fontSize = SIZE_PX[countSize][isLg ? 1 : 0];

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;
  const divisorLabels = buildDivisorLabels(stepsPerPage, stepsPerBeat);

  return (
    <div className="sequencer-grid bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll">
      {/* Step numbers header */}
      <div className="step-numbers flex items-center gap-3 mb-1">
        {/* Spacer for track controls + count mode toggle */}
        <div className="grid-count-toggle w-[180px] lg:w-[220px] shrink-0 flex justify-end gap-1">
          <button
            className="count-mode-btn px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono font-medium cursor-pointer transition-colors bg-gray-100 text-muted hover:bg-gray-200"
            onClick={() => setCountMode(m => m === 'step' ? 'beat' : 'step')}
            title={countMode === 'step' ? 'Switch to beat count' : 'Switch to step count'}
          >
            {countMode === 'step' ? 'Steps' : 'Count'}
          </button>
          <button
            className="count-size-btn px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono font-medium cursor-pointer transition-colors bg-gray-100 text-muted hover:bg-gray-200"
            onClick={() => setCountSize(s => SIZE_CYCLE[(SIZE_CYCLE.indexOf(s) + 1) % SIZE_CYCLE.length])}
            title={`Count size: ${countSize}`}
          >
            {SIZE_LABELS[countSize]}
          </button>
        </div>
        <div className="flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => {
            const label = countMode === 'step' ? i + 1 : divisorLabels[i];
            const isBeatStart = i % stepsPerBeat === 0;
            return (
              <div
                key={i}
                className={`step-number w-9 md:w-10 lg:w-11 text-center font-mono select-none
                  ${i > 0 && i % 4 === 0 ? 'ml-1.5' : 'ml-0.5'}
                  ${currentStep === i ? 'text-sky font-bold' : ''}
                  ${countMode === 'beat' && isBeatStart ? 'font-semibold text-text' : 'text-muted'}
                `}
                style={{ fontSize }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Beat group markers */}
      <div className="beat-markers flex items-center gap-3 mb-2">
        <div className="w-[180px] lg:w-[220px] shrink-0" />
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
      {onAddTrack && (
        <div className="add-track mt-2">
          <button
            className="add-track-btn w-[180px] lg:w-[220px] px-4 py-1.5 rounded-lg bg-gray-50 text-muted text-sm hover:bg-gray-100 hover:text-text transition-colors cursor-pointer border border-dashed border-border"
            onClick={onAddTrack}
          >
            + Add Track
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(Grid);
