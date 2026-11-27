import { memo, useRef, useCallback, useState, useEffect, type CSSProperties, type KeyboardEvent } from 'react';
import { TIME_SIGNATURES } from '../state/sequencerReducer.js';
import type { NoteValueKey } from '../state/sequencerReducer.js';

import VexFlow from 'vexflow';
import Knob from './Knob.js';
VexFlow.setFonts('Petaluma', 'Petaluma Script');

interface BpmInputProps {
  bpm: number;
  onSetBpm: (bpm: number) => void;
  compact?: boolean;
  /** Large borderless readout used inside the mobile tempo control. */
  large?: boolean;
}

const BPM_MIN = 20;
const BPM_MAX = 300;
const clampBpm = (v: number) => Math.max(BPM_MIN, Math.min(BPM_MAX, v));

export function BpmInput({ bpm, onSetBpm, compact, large }: BpmInputProps) {
  const [text, setText] = useState<string | null>(null);
  const commit = useCallback((raw: string | null) => {
    const v = parseInt(raw ?? '', 10);
    setText(null);
    if (!isNaN(v)) onSetBpm(clampBpm(v));
  }, [onSetBpm]);

  const className = large
    ? 'bpm-input bpm-input-large w-full min-w-0 h-8 p-0 bg-transparent border-none text-center font-mono font-bold text-[28px] leading-none text-text outline-none focus:text-sky'
    : compact
      ? 'bpm-input w-12 h-8 px-1 rounded-lg bg-bg border border-border text-center font-mono font-semibold text-xs outline-none focus:border-sky transition-colors'
      : 'bpm-input w-16 h-8 lg:w-20 lg:h-9 px-2 rounded-lg bg-bg border border-border text-center font-mono font-semibold text-sm lg:text-base outline-none focus:border-sky transition-colors';

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label="Tempo (BPM)"
      className={className}
      value={text !== null ? text : bpm}
      onFocus={(e) => { setText(String(bpm)); e.currentTarget.select(); }}
      onBlur={() => commit(text)}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { commit(text); e.currentTarget.blur(); }
        if (e.key === 'Escape') { setText(null); e.currentTarget.blur(); }
      }}
    />
  );
}

interface TempoStepButtonProps {
  delta: number;
  bpm: number;
  onSetBpm: (bpm: number) => void;
}

/** −/+ tempo button with press-and-hold auto-repeat (touch friendly). */
function TempoStepButton({ delta, bpm, onSetBpm }: TempoStepButtonProps) {
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  const timerRef = useRef<number | null>(null);
  const stop = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  useEffect(() => stop, [stop]);
  const step = useCallback(() => {
    const next = clampBpm(bpmRef.current + delta);
    bpmRef.current = next;
    onSetBpm(next);
  }, [delta, onSetBpm]);
  const start = useCallback(() => {
    stop();
    step();
    const repeat = (delay: number) => {
      timerRef.current = window.setTimeout(() => { step(); repeat(Math.max(40, delay * 0.8)); }, delay);
    };
    repeat(400);
  }, [step, stop]);

  const label = delta < 0 ? 'Decrease tempo' : 'Increase tempo';
  return (
    <button
      type="button"
      className={`tempo-step-btn ${delta < 0 ? 'tempo-step-down' : 'tempo-step-up'} w-12 h-full shrink-0 flex items-center justify-center text-sky active:bg-sky/15 cursor-pointer select-none touch-manipulation transition-colors ${delta < 0 ? 'rounded-l-xl' : 'rounded-r-xl'}`}
      onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); start(); }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(); } }}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label}
      title={label}
    >
      <svg className="tempo-step-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M4 10h12" />
        {delta > 0 && <path d="M10 4v12" />}
      </svg>
    </button>
  );
}

interface MobileTempoControlProps {
  bpm: number;
  onSetBpm: (bpm: number) => void;
}

/** Prominent tempo control for portrait mobile: big readout with −/+ steppers. */
export const MobileTempoControl = memo(function MobileTempoControl({ bpm, onSetBpm }: MobileTempoControlProps) {
  return (
    <div className="mobile-tempo flex items-stretch h-14 flex-1 min-w-0 rounded-xl bg-bg border border-border shadow-[inset_0_1px_2px_rgba(26,26,46,0.04)]">
      <TempoStepButton delta={-1} bpm={bpm} onSetBpm={onSetBpm} />
      <div className="mobile-tempo-readout flex-1 min-w-0 flex flex-col items-center justify-center border-x border-border/70">
        <BpmInput bpm={bpm} onSetBpm={onSetBpm} large />
        <span className="mobile-tempo-label text-sm font-display font-semibold text-muted leading-none mt-0.5">BPM</span>
      </div>
      <TempoStepButton delta={1} bpm={bpm} onSetBpm={onSetBpm} />
    </div>
  );
});

const STEP_OPTIONS: { key: NoteValueKey; label: string; glyph: string }[] = [
  { key: '1/16', label: '16th',    glyph: '\uE1D9' },
  { key: '1/8',  label: '8th',     glyph: '\uE1D7' },
  { key: '1/4',  label: 'Quarter', glyph: '\uE1D5' },
  { key: '1/2',  label: 'Half',    glyph: '\uE1D3' },
];

interface DialProps {
  label: string;
  value?: number;
  onChange: (value: number) => void;
  /** CSS colour for the value arc, e.g. `var(--color-amber)`. */
  color?: string;
  className?: string;
}

/** 0–100 transport knob (Swing / Human). Double-click resets to 0. */
function Dial({ label, value = 0, onChange, color = 'var(--color-sky)', className = '' }: DialProps) {
  const safeValue = Number(value) || 0;
  return (
    <Knob
      className={`transport-dial ${className}`}
      label={label}
      value={safeValue}
      min={0}
      max={100}
      step={1}
      defaultValue={0}
      color={color}
      size={44}
      labelPosition="top"
      title={`${label}: ${safeValue}`}
      onChange={onChange}
    />
  );
}

function SaveIcon() {
  return (
    <svg className="save-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2.5h8l2.5 2.5v8A1.5 1.5 0 0 1 12 14.5H4A1.5 1.5 0 0 1 2.5 13V4A1.5 1.5 0 0 1 4 2.5z" />
      <path d="M5 2.5v4h5v-4" />
      <path d="M5 11h6" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg className="transport-loop-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6.5h7.5a3 3 0 0 1 0 6H6.5M5 4.5L3 6.5l2 2M11 14.5l2-2l-2-2" />
    </svg>
  );
}

export function GrooveLoopButton({ loop, onToggle }: { loop: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`transport-groove-loop-btn hw-btn relative w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer
        ${loop ? 'text-amber' : 'text-muted hover:text-text'}`}
      onClick={onToggle}
      title={loop ? 'Repeat the whole groove' : 'Stop at the end of the groove'}
      aria-label="Loop groove"
      aria-pressed={loop}
    >
      <span
        className={`transport-groove-loop-led hw-led absolute top-1.5 right-1.5 ${loop ? 'hw-led-on' : ''}`}
        style={{ color: 'var(--color-amber)' }}
        aria-hidden="true"
      />
      <LoopIcon />
    </button>
  );
}

interface TransportProps {
  bpm: number;
  noteValue: NoteValueKey;
  beatsPerBar: number;
  stepValue: NoteValueKey;
  swing: number;
  swingTarget?: '8th' | '16th';
  humanize: number;
  isPlaying: boolean;
  previewMode: boolean;
  isDirty: boolean;
  hasSaveId: boolean;
  chainMode: boolean;
  grooveLoop?: { enabled: boolean; onToggle: () => void };
  onSave: () => void;
  onTogglePlay: () => void;
  onToggleChainMode: () => void;
  onSetBpm: (bpm: number) => void;
  onSetTimeSig: (beatsPerBar: number, noteValue: NoteValueKey) => void;
  onSetStepValue: (stepValue: NoteValueKey) => void;
  onSetSwing: (swing: number) => void;
  onSetSwingTarget: (target: '8th' | '16th') => void;
  onSetHumanize: (humanize: number) => void;
  onTogglePreview: () => void;
}

function Transport({
  bpm,
  noteValue,
  beatsPerBar,
  stepValue,
  swing,
  swingTarget = '8th',
  humanize,
  isPlaying,
  previewMode,
  isDirty,
  hasSaveId,
  chainMode,
  grooveLoop,
  onSave,
  onTogglePlay,
  onToggleChainMode,
  onSetBpm,
  onSetTimeSig,
  onSetStepValue,
  onSetSwing,
  onSetSwingTarget,
  onSetHumanize,
  onTogglePreview,
}: TransportProps) {
  const tapTimesRef = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > 5) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const times = tapTimesRef.current;
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i]! - times[i - 1]!);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tapBpm = Math.round(60000 / avgMs);
      if (tapBpm >= 20 && tapBpm <= 300) {
        onSetBpm(tapBpm);
      }
    }

    setTimeout(() => {
      const last = tapTimesRef.current[tapTimesRef.current.length - 1];
      if (last && performance.now() - last > 2000) {
        tapTimesRef.current = [];
      }
    }, 2100);
  }, [onSetBpm]);

  return (
    <div className="transport-bar flex items-center gap-4 bg-card rounded-2xl shadow-sm border border-border px-5 py-3 flex-wrap">
      <button
        className={`transport-save-btn hw-btn relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer
          ${isDirty ? 'text-sky' : 'text-muted hover:text-text'}`}
        onClick={onSave}
        title={hasSaveId ? (isDirty ? 'Save changes' : 'Saved') : 'Save to your library'}
      >
        <SaveIcon />
        <span
          className={`transport-save-dot hw-led absolute top-1.5 right-1.5 ${isDirty ? 'hw-led-on' : ''}`}
          style={{ color: 'var(--color-coral)' }}
          aria-hidden="true"
        />
      </button>

      <button
        className="transport-play-btn hw-btn hw-btn-accent relative w-11 h-11 rounded-xl flex items-center justify-center text-lg cursor-pointer"
        style={{ '--hw-accent': isPlaying ? 'var(--color-stop)' : 'var(--color-play)' } as CSSProperties}
        onClick={onTogglePlay}
        title={isPlaying ? 'Stop' : 'Play'}
        aria-label={isPlaying ? 'Stop' : 'Play'}
      >
        <span
          className={`transport-play-led hw-led absolute top-1.5 right-1.5 ${isPlaying ? 'hw-led-on' : ''}`}
          style={{ color: 'var(--color-play)' }}
          aria-hidden="true"
        />
        {isPlaying ? (
          <svg className="transport-stop-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" rx="1" />
          </svg>
        ) : (
          <svg className="transport-play-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2 L14 8 L4 14 Z" />
          </svg>
        )}
      </button>

      {grooveLoop
        ? <GrooveLoopButton loop={grooveLoop.enabled} onToggle={grooveLoop.onToggle} />
        : (
          <button
            className={`transport-chain-btn hw-btn relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer
              ${chainMode ? 'text-amber' : 'text-muted hover:text-text'}`}
            onClick={onToggleChainMode}
            title={chainMode
              ? 'Chain mode: advance through pages on each loop (click to switch to Loop)'
              : 'Loop mode: repeat the current page (click to switch to Chain)'}
            aria-label={chainMode ? 'Chain mode' : 'Loop mode'}
          >
            <span
              className={`transport-chain-led hw-led absolute top-1.5 right-1.5 ${chainMode ? 'hw-led-on' : ''}`}
              style={{ color: 'var(--color-amber)' }}
              aria-hidden="true"
            />
            {chainMode ? (
              <svg className="transport-chain-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 8h8" />
                <path d="M7.5 4.5l3 3.5l-3 3.5" />
                <path d="M13 3v10" />
              </svg>
            ) : <LoopIcon />}
          </button>
        )}

      <div className="transport-bpm flex items-center gap-2">
        <span className="transport-bpm-label legend">BPM</span>
        <BpmInput bpm={bpm} onSetBpm={onSetBpm} />
        <input
          type="range"
          className="transport-bpm-slider w-28 h-1 cursor-pointer"
          style={{ accentColor: 'var(--color-sky)' }}
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => onSetBpm(Number(e.target.value))}
        />
      </div>

      <button
        className="transport-tap-btn hw-btn font-legend font-semibold uppercase tracking-[0.12em] text-sm md:text-xs lg:text-sm text-muted px-3 h-8 rounded-lg hover:text-text cursor-pointer"
        onClick={handleTap}
      >
        TAP
      </button>

      <div className="transport-divider w-px h-8 bg-border" />

      <div className="transport-controls flex items-start gap-4">
        <div className="transport-time-sig flex flex-col items-center gap-1">
          <span className="transport-time-sig-label legend leading-none">Time</span>
          <select
            className="transport-time-sig-select hw-well h-10 lg:h-12 px-2 rounded-lg text-xs lg:text-sm font-mono font-semibold text-text cursor-pointer"
            value={`${beatsPerBar}/${TIME_SIGNATURES.find(ts => ts.num === beatsPerBar && ts.noteValue === noteValue)?.denom ?? 4}`}
            onChange={(e) => {
              const ts = TIME_SIGNATURES.find((t) => t.label === e.target.value);
              if (ts) onSetTimeSig(ts.num, ts.noteValue as NoteValueKey);
            }}
          >
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.label} value={ts.label}>{ts.label}</option>
            ))}
          </select>
        </div>

        <div className="transport-step-div flex flex-col items-center gap-1">
          <span className="transport-step-div-label legend leading-none">Step Div</span>
          <div className="transport-step-btns hw-well flex items-center gap-0.5 h-10 lg:h-12 rounded-lg p-1">
            {STEP_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`step-option-btn w-7 lg:w-8 h-full flex items-center justify-center cursor-pointer rounded-md transition-colors
                  ${stepValue === opt.key ? 'hw-btn text-sky' : 'border border-transparent text-muted hover:text-text'}`}
                onClick={() => onSetStepValue(opt.key)}
                title={opt.label}
                aria-pressed={stepValue === opt.key}
              >
                <span className="step-option-glyph block" style={{ fontFamily: 'Petaluma', fontSize: '22px', lineHeight: 0 }}>{opt.glyph}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="transport-preview flex flex-col items-center gap-1">
          <span className="transport-preview-label legend leading-none">Preview</span>
          <button
            className={`transport-preview-btn hw-btn relative w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center cursor-pointer
              ${previewMode ? 'text-sky' : 'text-muted hover:text-text'}`}
            onClick={onTogglePreview}
            title={previewMode ? 'Preview on: hear sounds when clicking cells' : 'Preview off'}
            aria-pressed={previewMode}
          >
            <span
              className={`transport-preview-led hw-led absolute top-1 right-1 ${previewMode ? 'hw-led-on' : ''}`}
              style={{ color: 'var(--color-sky)' }}
              aria-hidden="true"
            />
            <svg className="transport-preview-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8 A6 6 0 0 1 16 8" />
              <rect x="3" y="8" width="3.5" height="5.5" rx="1" />
              <rect x="13.5" y="8" width="3.5" height="5.5" rx="1" />
              <line x1="10" y1="2" x2="10" y2="5" />
            </svg>
          </button>
        </div>

        <div className="transport-swing flex items-end gap-1.5">
          <Dial label="Swing" value={swing} onChange={onSetSwing} color="var(--color-amber)" className="transport-swing-knob" />
          <div className="swing-target-toggle flex flex-col items-center gap-0.5 pb-0.5">
            {(['8th', '16th'] as const).map((t) => (
              <button
                key={t}
                className={`swing-target-btn hw-btn flex items-center gap-1 px-1.5 py-0.5 rounded text-sm md:text-xs font-mono font-semibold cursor-pointer leading-tight
                  ${swingTarget === t ? 'text-amber' : 'text-muted hover:text-text'}`}
                onClick={() => onSetSwingTarget(t)}
                title={t === '8th' ? 'Swing 8th notes and below' : 'Swing 16th notes and below only'}
                aria-pressed={swingTarget === t}
              >
                <span
                  className={`swing-target-led hw-led ${swingTarget === t ? 'hw-led-on' : ''}`}
                  style={{ color: 'var(--color-amber)', width: 4, height: 4 }}
                  aria-hidden="true"
                />
                <span className="swing-target-text">{t}</span>
              </button>
            ))}
          </div>
        </div>

        <Dial label="Human" value={humanize} onChange={onSetHumanize} color="var(--color-lavender)" className="transport-human-knob" />
      </div>

      {isPlaying && (
        <div className="transport-indicator flex items-center gap-1.5 ml-auto">
          <div className="transport-indicator-dot w-2 h-2 rounded-full bg-play pulse-play" />
          <span className="transport-indicator-label legend" style={{ color: 'var(--color-play)' }}>Playing</span>
        </div>
      )}
    </div>
  );
}

export default memo(Transport);
