import { memo, useCallback } from 'react';
import TrackIcon from './TrackIcon.jsx';

function MpcPads({ tracks, onTrigger }) {
  return (
    <div className="mpc-pads fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-2 py-2 safe-area-bottom">
      <div className="mpc-pads-grid grid gap-1.5" style={{
        gridTemplateColumns: `repeat(${Math.min(tracks.length, 4)}, 1fr)`,
      }}>
        {tracks.map((track, i) => (
          <MpcPad key={track.id} track={track} index={i} onTrigger={onTrigger} />
        ))}
      </div>
    </div>
  );
}

function MpcPad({ track, index, onTrigger }) {
  return (
    <button
      className="mpc-pad rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer select-none
        active:scale-95 transition-transform touch-manipulation"
      style={{
        backgroundColor: track.color,
        opacity: track.mute ? 0.3 : 0.85,
        minHeight: '64px',
      }}
      onPointerDown={() => onTrigger(track)}
    >
      <TrackIcon track={track} className="text-white/80" />
      <span className="mpc-pad-label text-[10px] font-semibold text-white/90 truncate max-w-full px-1">
        {track.name}
      </span>
    </button>
  );
}

export default memo(MpcPads);
