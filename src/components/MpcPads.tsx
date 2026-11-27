import { memo, type CSSProperties } from 'react';
import TrackIcon from './TrackIcon.js';
import type { Track } from '../state/sequencerReducer.js';

interface MpcPadsProps {
  tracks: Track[];
  onTrigger: (track: Track) => void;
  keyMap?: Record<string, string>;
  activeTrackIds?: Set<string>;
}

function MpcPads({ tracks, onTrigger, keyMap = {}, activeTrackIds = new Set() }: MpcPadsProps) {
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
            keyHint={keyMap[track.id] ?? ''}
            active={activeTrackIds.has(track.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface MpcPadProps {
  track: Track;
  onTrigger: (track: Track) => void;
  keyHint: string;
  active: boolean;
}

function MpcPad({ track, onTrigger, keyHint, active }: MpcPadProps) {
  return (
    <button
      className={`mpc-pad pad ${active ? 'pad-on' : 'pad-on mpc-pad-idle'} relative rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer select-none touch-manipulation`}
      style={{
        '--pad-color': track.color,
        '--pad-mix': track.mute ? '30%' : active ? '100%' : '72%',
        '--pad-glow': active ? '1.4' : '0.5',
        minHeight: '64px',
      } as CSSProperties}
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
