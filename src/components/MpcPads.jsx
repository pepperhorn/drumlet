import { memo } from 'react';
import TrackIcon from './TrackIcon.jsx';

function MpcPads({ tracks, onTrigger, keyMap = {}, activeTrackIds = new Set() }) {
  return (
    <div className="mpc-pads fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-2 py-2 safe-area-bottom">
      <div className="mpc-pads-grid grid gap-1.5" style={{
        gridTemplateColumns: `repeat(${Math.min(tracks.length, 4)}, 1fr)`,
      }}>
        {tracks.map((track) => (
          <MpcPad
            key={track.id}
            track={track}
            onTrigger={onTrigger}
            keyHint={keyMap[track.id] || ''}
            active={activeTrackIds.has(track.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MpcPad({ track, onTrigger, keyHint, active }) {
  return (
    <button
      className="mpc-pad relative rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer select-none
        active:scale-95 transition-transform touch-manipulation"
      style={{
        backgroundColor: track.color,
        opacity: track.mute ? 0.3 : active ? 1 : 0.85,
        minHeight: '64px',
        boxShadow: active ? '0 0 0 2px rgba(255,255,255,0.75) inset, 0 8px 18px rgba(26,26,46,0.18)' : undefined,
      }}
      onPointerDown={() => onTrigger(track)}
    >
      {keyHint && (
        <span className="mpc-pad-key absolute top-1 right-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-white">
          {keyHint}
        </span>
      )}
      <TrackIcon track={track} className="text-white/80" />
      <span className="mpc-pad-label text-[10px] font-semibold text-white/90 truncate max-w-full px-1">
        {track.name}
      </span>
    </button>
  );
}

export default memo(MpcPads);
