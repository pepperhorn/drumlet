import { memo, useRef, useState, useEffect, type CSSProperties } from 'react';
import { getVelocityLabel, getVelocityOpacity } from '../audio/velocityConfig.js';
import type { VelMode } from '../state/sequencerReducer.js';

const BAR_LINE_STYLE: CSSProperties = {
  borderLeftWidth: 2,
  borderLeftStyle: 'dashed',
  borderLeftColor: 'color-mix(in srgb, var(--color-sky) 30%, transparent)',
};

const VELOCITY_NAMES: Record<string, string> = {
  '': 'empty', '●': 'on', S: 'soft', M: 'medium', H: 'hard',
  pp: 'very soft', p: 'soft', mp: 'moderately soft', mf: 'moderately loud', f: 'loud', ff: 'very loud',
};

/** Inline vars that drive the `.pad-on` LED lighting (see styles/hardware.css). */
function padVars(color: string, level: number): CSSProperties {
  return {
    '--pad-color': color,
    '--pad-mix': `${Math.round(level * 100)}%`,
    '--pad-glow': level.toFixed(2),
  } as CSSProperties;
}

interface CellProps {
  trackName: string;
  bar: number;
  beat: number;
  stepNumber: number;
  velocity: number;
  velMode: VelMode;
  color: string;
  isPlayhead: boolean;
  isBeatStart: boolean;
  isBarStart: boolean;
  onClick?: () => void;
  onRightClick?: () => void;
  splitData: number[] | null;
  isActive?: boolean;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  onToggleSubStep?: (i: number) => void;
  onClearSubStep?: (i: number) => void;
}

interface SpinState {
  from: string;
  to: string;
  direction: 'up' | 'down';
}

function Cell({
  trackName,
  bar,
  beat,
  stepNumber,
  velocity,
  velMode,
  color,
  isPlayhead,
  isBeatStart,
  isBarStart,
  onClick,
  onRightClick,
  splitData,
  isActive,
  isExpanded,
  onExpandToggle,
  onToggleSubStep,
  onClearSubStep,
}: CellProps) {
  const position = `${trackName}, bar ${bar} beat ${beat}, step ${stepNumber}`;
  const activeSubSteps = splitData?.reduce((count, subVel) => count + (subVel > 0 ? 1 : 0), 0) ?? 0;
  const splitName = splitData
    ? `${position}, split into ${splitData.length}, ${activeSubSteps ? `${activeSubSteps} active` : 'empty'}`
    : undefined;
  const label = getVelocityLabel(velocity, velMode);
  const opacity = getVelocityOpacity(velocity, velMode);
  const prevVelRef = useRef(velocity);
  const [spin, setSpin] = useState<SpinState | null>(null);

  useEffect(() => {
    const prev = prevVelRef.current;
    prevVelRef.current = velocity;
    if (prev === velocity) return;

    const direction: 'up' | 'down' = velocity === 0 ? 'down' : 'up';
    setSpin({ from: getVelocityLabel(prev, velMode), to: label, direction });

    const timer = setTimeout(() => setSpin(null), 200);
    return () => clearTimeout(timer);
  }, [velocity, velMode, label]);

  // Split cell — collapsed view: show color-coded segments
  if (splitData && !isExpanded) {
    return (
      <div className={`step-cell-split-wrap ${isBeatStart ? 'ml-1 md:ml-1.5' : 'ml-0.5'}`} style={isBarStart ? BAR_LINE_STYLE : undefined}>
        <button
          className={`step-cell step-cell-split relative w-[var(--cell-w,2.25rem)] h-[var(--cell-w,2.25rem)] md:w-10 md:h-10 lg:w-11 lg:h-11 pad pad-off cursor-pointer
            flex items-stretch gap-px overflow-hidden select-none
            ${isActive ? 'cell-active' : ''}
            ${isPlayhead ? 'playhead-active' : ''}
          `}
          onClick={() => { onClick?.(); onExpandToggle?.(); }}
          onContextMenu={(e) => {
            e.preventDefault();
            onRightClick?.();
          }}
          aria-label={splitName}
          aria-pressed={activeSubSteps > 0}
          title={`Split ${splitData.length} — click to edit`}
        >
          {splitData.map((subVel, i) => {
            const subOpacity = getVelocityOpacity(subVel, velMode);
            return (
              <div
                key={i}
                className={`split-segment flex-1 ${subVel > 0 ? 'split-segment-on' : 'split-segment-off'}`}
                style={subVel > 0 ? padVars(color, subOpacity) : undefined}
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
      <div className={`step-cell-expanded-wrap ${isBeatStart ? 'ml-1 md:ml-1.5' : 'ml-0.5'}`} style={isBarStart ? BAR_LINE_STYLE : undefined}>
        <button
          className={`step-cell step-cell-split-master relative w-[var(--cell-w,2.25rem)] h-[var(--cell-w,2.25rem)] md:w-10 md:h-10 lg:w-11 lg:h-11 pad pad-off cursor-pointer
            flex items-stretch gap-px overflow-hidden select-none
            ${isPlayhead ? 'playhead-active' : ''}
          `}
          onClick={onExpandToggle}
          aria-label={splitName}
          aria-pressed={activeSubSteps > 0}
          title="Click to collapse"
        >
          {splitData.map((subVel, i) => {
            const subOpacity = getVelocityOpacity(subVel, velMode);
            return (
              <div
                key={i}
                className={`split-segment flex-1 ${subVel > 0 ? 'split-segment-on' : 'split-segment-off'}`}
                style={subVel > 0 ? padVars(color, subOpacity) : undefined}
              />
            );
          })}
        </button>
        <div className="split-subcells flex flex-col gap-0.5 mt-0.5">
          {splitData.map((subVel, i) => {
            const subLabel = getVelocityLabel(subVel, velMode);
            const subOpacity = getVelocityOpacity(subVel, velMode);
            return (
              <button
                key={i}
                className={`step-subcell w-[var(--cell-w,2.25rem)] h-7 md:w-10 md:h-8 lg:w-11 lg:h-9 pad cursor-pointer
                  flex items-center justify-center text-xs md:text-[10px] lg:text-xs font-mono font-semibold select-none
                  ${subVel === 0 ? 'pad-off' : 'pad-on'}`}
                style={subVel > 0 ? padVars(color, subOpacity) : undefined}
                onClick={() => onToggleSubStep?.(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onClearSubStep?.(i);
                }}
                aria-label={`${position}, sub-step ${i + 1} of ${splitData.length}, ${VELOCITY_NAMES[subLabel]}`}
                aria-pressed={subVel > 0}
                title={`Sub-step ${i + 1}`}
              >
                {subVel > 0 && (
                  <span className="step-subcell-label step-cell-label">
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
  return (
    <button
      className={`step-cell pad relative w-[var(--cell-w,2.25rem)] h-[var(--cell-w,2.25rem)] md:w-10 md:h-10 lg:w-11 lg:h-11 cursor-pointer
        flex items-center justify-center text-sm md:text-xs lg:text-sm font-mono font-semibold select-none overflow-hidden
        ${velocity === 0 ? 'pad-off' : 'pad-on'}
        ${isActive ? 'cell-active' : ''}
        ${isPlayhead ? 'playhead-active' : ''}
        ${isBeatStart ? 'ml-1 md:ml-1.5' : 'ml-0.5'}
      `}
      style={{
        ...(velocity > 0 ? padVars(color, opacity) : {}),
        ...(isBarStart ? BAR_LINE_STYLE : {}),
      }}
      onClick={onClick}
      aria-label={`${position}, ${VELOCITY_NAMES[label]}`}
      aria-pressed={velocity > 0}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick?.();
      }}
    >
      {spin ? (
        <span className="step-cell-spin absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="step-cell-label absolute cell-spin-out"
            style={{ animationDirection: spin.direction === 'up' ? 'normal' : 'reverse' }}
          >
            {spin.from || '\u00A0'}
          </span>
          <span
            className="step-cell-label absolute cell-spin-in"
            style={{
              animationDirection: spin.direction === 'up' ? 'normal' : 'reverse',
            }}
          >
            {spin.to || '\u00A0'}
          </span>
        </span>
      ) : velocity > 0 ? (
        <span className="step-cell-label">
          {label}
        </span>
      ) : null}
    </button>
  );
}

export default memo(Cell);
