import { memo, useState, useRef } from 'react';

function TrackControls({
  track,
  trackIndex,
  expanded,
  onToggleExpand,
  colWidth,
  onChangeProp,
  onChangeVelMode,
  onOpenSoundPicker,
  onDrop,
  dragHandleProps,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = [...e.dataTransfer.files].filter((f) =>
      f.type.startsWith('audio/') || /\.(wav|ogg|mp3|flac)$/i.test(f.name)
    );
    if (files.length > 0) {
      onDrop(files[0], trackIndex);
    }
  };

  return (
    <div
      ref={dropRef}
      className={`track-controls flex flex-col gap-0.5 ${colWidth} ${isDragOver ? 'drop-target rounded-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Row 1: chevron + name on left, M/S/Vel on right (desktop only) */}
      <div className="track-controls-row1 flex items-center gap-1">
        {/* Drag handle — reorder tracks */}
        {dragHandleProps && (
          <button
            type="button"
            className="track-drag-handle w-4 h-5 flex items-center justify-center text-muted/60 hover:text-text cursor-grab active:cursor-grabbing shrink-0 touch-none"
            title="Drag to reorder track"
            aria-label="Drag to reorder track"
            {...dragHandleProps}
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
              <circle cx="3" cy="2" r="1.1" /><circle cx="7" cy="2" r="1.1" />
              <circle cx="3" cy="7" r="1.1" /><circle cx="7" cy="7" r="1.1" />
              <circle cx="3" cy="12" r="1.1" /><circle cx="7" cy="12" r="1.1" />
            </svg>
          </button>
        )}
        {/* Expand chevron — mobile only, left-aligned next to name */}
        <button
          className="track-expand-btn lg:hidden w-5 h-5 rounded bg-gray-100 text-muted hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          onClick={onToggleExpand}
          title={expanded ? 'Collapse controls' : 'Expand controls'}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {expanded
              ? <path d="M2 6.5 L5 3.5 L8 6.5" />
              : <path d="M2 3.5 L5 6.5 L8 3.5" />
            }
          </svg>
        </button>

        <button
          className="track-name-btn flex items-center gap-1.5 px-1 py-0.5 rounded-md hover:bg-gray-100 transition-colors text-sm lg:text-base font-medium cursor-pointer min-w-0"
          onClick={() => onOpenSoundPicker(trackIndex)}
          title={track.name}
        >
          <span
            className="track-color-dot w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: track.color }}
          />
          <span className="track-name-text truncate">{track.name}</span>
        </button>

        <div className="track-controls-spacer flex-1" />

        {/* M/S/Vel — always visible on lg */}
        <div className="track-msvl hidden lg:flex items-center gap-1">
          <button
            className={`track-mute-btn w-6 h-6 rounded text-xs font-bold cursor-pointer transition-colors shrink-0
              ${track.mute ? 'bg-red-100 text-stop' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
            onClick={() => onChangeProp(trackIndex, 'mute', !track.mute)}
            title="Mute"
          >
            M
          </button>

          <button
            className={`track-solo-btn w-6 h-6 rounded text-xs font-bold cursor-pointer transition-colors shrink-0
              ${track.solo ? 'bg-amber/20 text-amber' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
            onClick={() => onChangeProp(trackIndex, 'solo', !track.solo)}
            title="Solo"
          >
            S
          </button>

          <button
            className={`track-vel-btn w-6 h-6 rounded text-xs font-mono font-bold cursor-pointer transition-colors shrink-0
              ${(track.velMode || 3) > 1 ? 'bg-lavender/20 text-lavender' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
            onClick={() => {
              const cur = track.velMode || 3;
              const next = cur === 1 ? 3 : cur === 3 ? 7 : 1;
              onChangeVelMode(trackIndex, next);
            }}
            title={`Velocity: ${track.velMode || 3} levels (click to cycle)`}
          >
            {track.velMode || 3}
          </button>
        </div>
      </div>

      {/* Row 2 (desktop): Volume slider — always visible on lg */}
      <div className="track-controls-row2 hidden lg:flex items-center gap-1.5 pl-1.5">
        <span className="track-volume-label text-xs text-muted font-semibold uppercase w-5 shrink-0">Vol</span>
        <input
          type="range"
          className="track-volume-slider w-16 h-1 accent-sky cursor-pointer"
          min={0}
          max={100}
          value={track.volume}
          onChange={(e) => onChangeProp(trackIndex, 'volume', Number(e.target.value))}
          title={`Volume: ${track.volume}`}
        />
        <span className="track-volume-value text-xs font-mono text-muted w-5 text-right shrink-0">{track.volume}</span>
      </div>

      {/* Mobile expanded panel — drops down below name */}
      {expanded && (
        <div className="track-mobile-panel lg:hidden flex flex-col gap-1 pt-1 border-t border-border/50">
          {/* M/S/Vel row */}
          <div className="track-mobile-msvl flex items-center gap-1">
            <button
              className={`track-mute-btn w-6 h-6 rounded text-xs font-bold cursor-pointer transition-colors shrink-0
                ${track.mute ? 'bg-red-100 text-stop' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
              onClick={() => onChangeProp(trackIndex, 'mute', !track.mute)}
              title="Mute"
            >
              M
            </button>
            <button
              className={`track-solo-btn w-6 h-6 rounded text-xs font-bold cursor-pointer transition-colors shrink-0
                ${track.solo ? 'bg-amber/20 text-amber' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
              onClick={() => onChangeProp(trackIndex, 'solo', !track.solo)}
              title="Solo"
            >
              S
            </button>
            <button
              className={`track-vel-btn w-6 h-6 rounded text-xs font-mono font-bold cursor-pointer transition-colors shrink-0
                ${(track.velMode || 3) > 1 ? 'bg-lavender/20 text-lavender' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
              onClick={() => {
                const cur = track.velMode || 3;
                const next = cur === 1 ? 3 : cur === 3 ? 7 : 1;
                onChangeVelMode(trackIndex, next);
              }}
              title={`Velocity: ${track.velMode || 3} levels`}
            >
              {track.velMode || 3}
            </button>
            <div className="track-mobile-spacer flex-1" />
            <span className="track-mobile-volume-value text-xs font-mono text-muted">{track.volume}</span>
          </div>
          {/* Volume slider */}
          <div className="track-mobile-volume flex items-center gap-1.5">
            <span className="track-mobile-volume-label text-xs text-muted font-semibold uppercase shrink-0">Vol</span>
            <input
              type="range"
              className="track-volume-slider flex-1 h-1 accent-sky cursor-pointer"
              min={0}
              max={100}
              value={track.volume}
              onChange={(e) => onChangeProp(trackIndex, 'volume', Number(e.target.value))}
              title={`Volume: ${track.volume}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TrackControls);
