import { memo, useRef, useState, useEffect } from 'react';
import { getVelocityLabel, getVelocityOpacity } from '../audio/velocityConfig.js';

function Cell({ velocity, velMode, color, isPlayhead, isBeatStart, onClick, onRightClick,
                splitData, splitMode, isExpanded, onExpandToggle, onToggleSubStep, onClearSubStep }) {
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

  // Split cell — collapsed view: show color-coded segments
  if (splitData && !isExpanded) {
    return (
      <div className={`step-cell-split-wrap ${isBeatStart ? 'ml-1.5' : 'ml-0.5'}`}>
        <button
          className={`step-cell step-cell-split relative w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-md border cursor-pointer
            flex items-stretch overflow-hidden select-none
            border-violet/40
            ${isPlayhead ? 'playhead-active ring-2 ring-sky' : ''}
          `}
          onClick={onExpandToggle}
          onContextMenu={(e) => {
            e.preventDefault();
            onRightClick?.();
          }}
          title={`Split ${splitData.length} — click to edit`}
        >
          {splitData.map((subVel, i) => {
            const subOpacity = getVelocityOpacity(subVel, velMode);
            return (
              <div
                key={i}
                className="split-segment flex-1"
                style={subVel > 0 ? {
                  backgroundColor: color,
                  opacity: subOpacity,
                } : {
                  backgroundColor: '#f9fafb',
                }}
              />
            );
          })}
        </button>
      </div>
    );
  }

  // Split cell — expanded view: full-size sub-cells
  if (splitData && isExpanded) {
    return (
      <div className={`step-cell-expanded-wrap ${isBeatStart ? 'ml-1.5' : 'ml-0.5'}`}>
        {/* Master cell — click to collapse */}
        <button
          className={`step-cell step-cell-split-master relative w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-md border cursor-pointer
            flex items-stretch overflow-hidden select-none
            border-violet ring-1 ring-violet/30
            ${isPlayhead ? 'playhead-active ring-2 ring-sky' : ''}
          `}
          onClick={onExpandToggle}
          title="Click to collapse"
        >
          {splitData.map((subVel, i) => {
            const subOpacity = getVelocityOpacity(subVel, velMode);
            return (
              <div
                key={i}
                className="split-segment flex-1"
                style={subVel > 0 ? {
                  backgroundColor: color,
                  opacity: subOpacity,
                } : {
                  backgroundColor: '#f9fafb',
                }}
              />
            );
          })}
        </button>
        {/* Sub-cells below */}
        <div className="split-subcells flex flex-col gap-0.5 mt-0.5">
          {splitData.map((subVel, i) => {
            const subLabel = getVelocityLabel(subVel, velMode);
            const subOpacity = getVelocityOpacity(subVel, velMode);
            return (
              <button
                key={i}
                className={`step-subcell w-9 h-7 md:w-10 md:h-8 lg:w-11 lg:h-9 rounded-sm border cursor-pointer
                  flex items-center justify-center text-[9px] md:text-[10px] lg:text-xs font-mono font-semibold select-none
                  ${subVel === 0 ? 'bg-white border-border hover:bg-gray-50' : 'border-transparent'}`}
                style={subVel > 0 ? {
                  backgroundColor: color,
                  opacity: subOpacity,
                } : undefined}
                onClick={() => onToggleSubStep?.(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onClearSubStep?.(i);
                }}
                title={`Sub-step ${i + 1}`}
              >
                {subVel > 0 && (
                  <span className="text-white drop-shadow-sm" style={{ opacity: Math.max(0.7, subOpacity) }}>
                    {subLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Normal cell (non-split)
  // Show a subtle indicator when splitMode is active
  const splitModeIndicator = splitMode && velocity === 0;

  return (
    <button
      className={`step-cell cell-hit relative w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-md border cursor-pointer
        flex items-center justify-center text-[10px] md:text-xs lg:text-sm font-mono font-semibold select-none overflow-hidden
        ${velocity === 0
          ? `bg-white border-border hover:bg-gray-50 ${splitModeIndicator ? 'border-dashed border-violet/30' : ''}`
          : `border-transparent ${splitMode ? 'hover:ring-1 hover:ring-violet/40' : ''}`
        }
        ${isPlayhead ? 'playhead-active ring-2 ring-sky' : ''}
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
