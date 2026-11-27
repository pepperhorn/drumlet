import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Any CSS colour string, e.g. `var(--color-amber)` or a track hex. */
  color?: string;
  size?: number;
  /** Discrete position names shown instead of a number. */
  labels?: string[];
  defaultValue?: number;
  disabled?: boolean;
  /** Hide the silkscreen label under the knob (aria-label is kept). */
  hideLabel?: boolean;
  /** Where the silkscreen label sits relative to the knob. */
  labelPosition?: 'top' | 'bottom';
  /** Always show the value readout instead of the label. */
  alwaysShowValue?: boolean;
  /** Extra contextual class name for the knob wrapper. */
  className?: string;
  title?: string;
  onChange: (value: number) => void;
}

function formatValue(
  value: number,
  step: number,
  unit: string | undefined,
  labels: string[] | undefined,
): string {
  if (labels) return labels[Math.round(value)] ?? String(value);
  return value.toFixed(step < 1 ? 2 : 0) + (unit ?? '');
}

/**
 * A skeuomorphic pot: coloured value arc, skirt collar and domed cap. Drag
 * up/down or scroll to turn (shift = fine), arrow keys step it, double-click
 * returns it to its default.
 */
export function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  color = 'var(--color-sky)',
  size = 48,
  labels,
  defaultValue,
  disabled = false,
  hideLabel = false,
  labelPosition = 'bottom',
  alwaysShowValue = false,
  className = '',
  title,
  onChange,
}: KnobProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startValue: number } | null>(null);
  const [showValue, setShowValue] = useState(false);

  const safeValue = Number.isFinite(value) ? value : min;
  const range = max - min;
  const fraction = range === 0 ? 0 : Math.max(0, Math.min(1, (safeValue - min) / range));
  const pct = fraction * 100;
  const angle = -135 + fraction * 270;

  // Layered geometry: coloured arc (full), skirt collar (inset), domed cap
  // (more inset). Bands scale with the knob so small knobs stay legible.
  const skirtInset = Math.max(3, Math.round(size * 0.1));
  const capInset = Math.max(6, Math.round(size * 0.19));
  const capD = size - capInset * 2;

  const commit = useCallback(
    (next: number) => {
      const snapped = Math.max(min, Math.min(max, Math.round(next / step) * step));
      // Rounding to `step` can leave float noise; compare on rendered
      // precision so a no-op drag does not spam dispatches.
      if (Math.abs(snapped - safeValue) >= step / 2) onChange(snapped);
    },
    [min, max, step, safeValue, onChange],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // noop
      }
      e.currentTarget.focus();
      dragRef.current = { startY: e.clientY, startValue: safeValue };
      setShowValue(true);
    },
    [disabled, safeValue],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = drag.startY - e.clientY;
      const sensitivity = e.shiftKey ? 0.0005 : 0.005;
      commit(drag.startValue + dy * sensitivity * range);
    },
    [commit, range],
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
    setShowValue(false);
  }, []);

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.stopPropagation();
      onChange(defaultValue ?? min);
    },
    [disabled, defaultValue, min, onChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        commit(safeValue + step);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        commit(safeValue - step);
      } else if (e.key === 'Home') {
        e.preventDefault();
        commit(min);
      } else if (e.key === 'End') {
        e.preventDefault();
        commit(max);
      }
    },
    [disabled, commit, safeValue, step, min, max],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const incr = e.shiftKey ? step : Math.max(step, range * 0.02);
      commit(safeValue + dir * incr);
    },
    [disabled, step, range, safeValue, commit],
  );

  // React registers `wheel` as a PASSIVE listener on its root, so
  // preventDefault() in an onWheel prop is ignored and turning a knob would
  // also scroll the page. Attach our own non-passive listener instead.
  const wheelRef = useRef(onWheel);
  useEffect(() => {
    wheelRef.current = onWheel;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const readout = formatValue(safeValue, step, unit, labels);
  const display = labels || alwaysShowValue || showValue ? readout : label;
  const labelEl = hideLabel ? null : (
    <div className="knob-label legend leading-none" style={{ minHeight: 12 }}>
      {display}
    </div>
  );

  return (
    <div
      className={`knob ${className} flex flex-col items-center gap-1 select-none`}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {labelPosition === 'top' && labelEl}
      <div
        ref={ref}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safeValue}
        aria-valuetext={readout}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        title={title}
        className="knob-body relative shrink-0 touch-none"
        style={{ width: size, height: size, cursor: disabled ? 'default' : 'ns-resize' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        {/* coloured value arc on the outer rim (gap at the bottom) */}
        <div
          className="knob-arc absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from -135deg, ${color} 0%, ${color} ${pct * 0.75}%, var(--knob-track) ${pct * 0.75}%, var(--knob-track) 75%, transparent 75%)`,
          }}
        />
        {/* skirt collar: casts the knob's drop shadow */}
        <div
          className="knob-skirt absolute rounded-full"
          style={{
            inset: skirtInset,
            background: 'var(--knob-skirt-bg)',
            boxShadow: 'var(--knob-skirt-shadow)',
          }}
        />
        {/* domed cap + neutral pointer line */}
        <div
          className="knob-cap absolute rounded-full"
          style={{
            inset: capInset,
            background: 'var(--knob-bg)',
            boxShadow: 'var(--knob-shadow)',
          }}
        >
          <div
            className="knob-indicator absolute left-1/2 rounded-full"
            style={{
              top: Math.round(capD * 0.11),
              width: Math.max(2, Math.round(size * 0.055)),
              height: Math.round(capD * 0.36),
              background: 'var(--knob-pointer)',
              transformOrigin: `50% ${capD / 2 - Math.round(capD * 0.11)}px`,
              transform: `translateX(-50%) rotate(${angle}deg)`,
            }}
          />
        </div>
      </div>
      {labelPosition === 'bottom' && labelEl}
    </div>
  );
}

export default Knob;
