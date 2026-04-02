import { memo, useRef, useState, useEffect } from 'react';
import { getVelocityLabel, getVelocityOpacity } from '../audio/velocityConfig.js';

function Cell({ velocity, velMode, color, isPlayhead, isBeatStart, onClick, onRightClick }) {
  const label = getVelocityLabel(velocity, velMode);
  const opacity = getVelocityOpacity(velocity, velMode);
  const prevVelRef = useRef(velocity);
  const [spin, setSpin] = useState(null); // { from, to, direction }

  useEffect(() => {
    const prev = prevVelRef.current;
    prevVelRef.current = velocity;
    if (prev === velocity) return;

    // Determine spin direction: up when increasing, down when going to 0
    const direction = velocity === 0 ? 'down' : 'up';
    setSpin({ from: getVelocityLabel(prev, velMode), to: label, direction });

    const timer = setTimeout(() => setSpin(null), 200);
    return () => clearTimeout(timer);
  }, [velocity, velMode, label]);

  return (
    <button
      className={`step-cell cell-hit relative w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-md border cursor-pointer
        flex items-center justify-center text-[10px] md:text-xs lg:text-sm font-mono font-semibold select-none overflow-hidden
        ${velocity === 0 ? 'bg-white border-border hover:bg-gray-50' : 'border-transparent'}
        ${isPlayhead ? 'playhead-active ring-2 ring-sky/50' : ''}
        ${isBeatStart ? 'ml-1.5' : 'ml-0.5'}
      `}
      style={velocity > 0 ? {
        backgroundColor: color,
        opacity,
      } : undefined}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick?.();
      }}
    >
      {spin ? (
        <span className="step-cell-spin absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Old label spinning out */}
          <span
            className="step-cell-label text-white drop-shadow-sm absolute cell-spin-out"
            style={{ animationDirection: spin.direction === 'up' ? 'normal' : 'reverse' }}
          >
            {spin.from || '\u00A0'}
          </span>
          {/* New label spinning in */}
          <span
            className="step-cell-label text-white drop-shadow-sm absolute cell-spin-in"
            style={{
              opacity: Math.max(0.7, opacity),
              animationDirection: spin.direction === 'up' ? 'normal' : 'reverse',
            }}
          >
            {spin.to || '\u00A0'}
          </span>
        </span>
      ) : velocity > 0 ? (
        <span className="step-cell-label text-white drop-shadow-sm" style={{ opacity: Math.max(0.7, opacity) }}>
          {label}
        </span>
      ) : null}
    </button>
  );
}

export default memo(Cell);
