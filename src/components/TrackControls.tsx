import { memo, useState, useRef, type DragEvent, type HTMLAttributes } from 'react';
import type { Track, VelMode } from '../state/sequencerReducer.js';
import { shortTrackLabel } from '../util/trackLabel.js';

interface TrackControlsProps {
  track: Track;
  trackIndex: number;
  expanded: boolean;
  onToggleExpand: () => void;
  colWidth: string;
  onChangeProp: (trackIndex: number, prop: keyof Track, value: unknown) => void;
  onChangeVelMode: (trackIndex: number, mode: VelMode) => void;
  onOpenSoundPicker: (trackIndex: number) => void;
  onDrop: (file: File, trackIndex: number) => void;
  dragHandleProps: HTMLAttributes<HTMLButtonElement> | null;
}

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
}: TrackControlsProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = [...e.dataTransfer.files].filter((f) =>
      f.type.startsWith('audio/') || /\.(wav|ogg|mp3|flac)$/i.test(f.name)
    );
    if (files.length > 0 && files[0]) {
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
      <div className="track-controls-row1 flex items-center gap-0.5 md:gap-1 min-h-[var(--cell-w,2.25rem)] md:min-h-0">
        {dragHandleProps && (
          <button
            type="button"
            className="track-drag-handle hidden md:flex w-4 h-5 items-center justify-center text-muted/60 hover:text-text cursor-grab active:cursor-grabbing shrink-0 touch-none"
            title="Drag to reorder track"
            aria-label="Drag to reorder track"
            {...dragHandleProps}
          >
            <svg className="track-drag-handle-icon" width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
              <circle cx="3" cy="2" r="1.1" /><circle cx="7" cy="2" r="1.1" />
              <circle cx="3" cy="7" r="1.1" /><circle cx="7" cy="7" r="1.1" />
              <circle cx="3" cy="12" r="1.1" /><circle cx="7" cy="12" r="1.1" />
            </svg>
          </button>
        )}
        <button
          className={`track-expand-btn lg:hidden order-last md:order-none w-6 h-8 md:w-5 md:h-5 rounded hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${expanded ? 'bg-sky/15 md:bg-sky/15 text-sky' : 'md:bg-gray-100 text-muted'}`}
          onClick={onToggleExpand}
          title={expanded ? 'Collapse controls' : 'Expand controls'}
          aria-label={expanded ? 'Collapse track controls' : 'Expand track controls'}
          aria-expanded={expanded}
        >
          <svg className="track-expand-icon w-3.5 h-3.5 md:w-2.5 md:h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {expanded
              ? <path d="M2 6.5 L5 3.5 L8 6.5" />
              : <path d="M2 3.5 L5 6.5 L8 3.5" />
            }
          </svg>
        </button>

        <button
          className="track-name-btn flex flex-1 md:flex-initial items-center gap-1.5 pl-1.5 pr-0.5 md:px-1 py-0.5 rounded-md hover:bg-gray-100 transition-colors text-sm lg:text-base font-medium cursor-pointer min-w-0 border-l-[3px] md:border-l-0 rounded-l-sm md:rounded-l-md"
          style={{ borderLeftColor: track.color }}
          onClick={() => onOpenSoundPicker(trackIndex)}
          title={track.name}
        >
          <span
            className="track-color-dot hidden md:block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: track.color }}
          />
          <span className="track-name-text-mobile md:hidden font-display font-semibold text-left leading-tight line-clamp-2 break-words min-w-0">
            {shortTrackLabel(track.name)}
          </span>
          <span className="track-name-text hidden md:inline truncate">{track.name}</span>
        </button>

        <div className="track-controls-spacer hidden md:block flex-1" />

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
              const next: VelMode = cur === 1 ? 3 : cur === 3 ? 7 : 1;
              onChangeVelMode(trackIndex, next);
            }}
            title={`Velocity: ${track.velMode || 3} levels (click to cycle)`}
          >
            {track.velMode || 3}
          </button>
        </div>
      </div>

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
    </div>
  );
}

interface TrackMobilePanelProps {
  track: Track;
  trackIndex: number;
  onChangeProp: (trackIndex: number, prop: keyof Track, value: unknown) => void;
  onChangeVelMode: (trackIndex: number, mode: VelMode) => void;
  dragHandleProps: HTMLAttributes<HTMLButtonElement> | null;
}

/**
 * Expanded per-track controls for < lg screens. Rendered by TrackRow as a
 * full-width strip under the step cells so expanding a track doesn't widen
 * the label column (which would shrink every cell on portrait mobile).
 */
export const TrackMobilePanel = memo(function TrackMobilePanel({
  track,
  trackIndex,
  onChangeProp,
  onChangeVelMode,
  dragHandleProps,
}: TrackMobilePanelProps) {
  return (
    <div className="track-mobile-panel lg:hidden w-full flex items-center gap-1.5 mt-1 px-1.5 py-1.5 rounded-lg bg-gray-50 border border-border/60">
      {dragHandleProps && (
        <button
          type="button"
          className="track-mobile-drag-handle w-9 h-9 rounded-lg bg-gray-100 text-muted flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Drag to reorder track"
          aria-label="Drag to reorder track"
          {...dragHandleProps}
        >
          <svg className="track-mobile-drag-icon" width="12" height="18" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="2" r="1.1" /><circle cx="7" cy="2" r="1.1" />
            <circle cx="3" cy="7" r="1.1" /><circle cx="7" cy="7" r="1.1" />
            <circle cx="3" cy="12" r="1.1" /><circle cx="7" cy="12" r="1.1" />
          </svg>
        </button>
      )}
      <button
        className={`track-mute-btn w-9 h-9 rounded-lg text-sm font-bold cursor-pointer transition-colors shrink-0
          ${track.mute ? 'bg-red-100 text-stop' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
        onClick={() => onChangeProp(trackIndex, 'mute', !track.mute)}
        title="Mute"
        aria-pressed={track.mute}
      >
        M
      </button>
      <button
        className={`track-solo-btn w-9 h-9 rounded-lg text-sm font-bold cursor-pointer transition-colors shrink-0
          ${track.solo ? 'bg-amber/20 text-amber' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
        onClick={() => onChangeProp(trackIndex, 'solo', !track.solo)}
        title="Solo"
        aria-pressed={track.solo}
      >
        S
      </button>
      <button
        className={`track-vel-btn w-9 h-9 rounded-lg text-sm font-mono font-bold cursor-pointer transition-colors shrink-0
          ${(track.velMode || 3) > 1 ? 'bg-lavender/20 text-lavender' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
        onClick={() => {
          const cur = track.velMode || 3;
          const next: VelMode = cur === 1 ? 3 : cur === 3 ? 7 : 1;
          onChangeVelMode(trackIndex, next);
        }}
        title={`Velocity: ${track.velMode || 3} levels`}
      >
        {track.velMode || 3}
      </button>
      <span className="track-mobile-volume-label text-sm text-muted font-semibold shrink-0 ml-1">Vol</span>
      <input
        type="range"
        className="track-volume-slider flex-1 w-0 min-w-0 h-1 accent-sky cursor-pointer"
        min={0}
        max={100}
        value={track.volume}
        onChange={(e) => onChangeProp(trackIndex, 'volume', Number(e.target.value))}
        title={`Volume: ${track.volume}`}
      />
      <span className="track-mobile-volume-value text-sm font-mono text-muted w-8 text-right shrink-0">{track.volume}</span>
    </div>
  );
});

export default memo(TrackControls);
