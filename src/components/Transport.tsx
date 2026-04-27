import { memo, useRef, useCallback, useState, type KeyboardEvent } from 'react';
import { TIME_SIGNATURES } from '../state/sequencerReducer.js';
import type { NoteValueKey } from '../state/sequencerReducer.js';

import VexFlow from 'vexflow';
VexFlow.setFonts('Petaluma', 'Petaluma Script');

interface BpmInputProps {
  bpm: number;
  onSetBpm: (bpm: number) => void;
  compact?: boolean;
}

export function BpmInput({ bpm, onSetBpm, compact }: BpmInputProps) {
  const [text, setText] = useState<string | null>(null);
  const commit = useCallback((raw: string | null) => {
    const v = parseInt(raw ?? '', 10);
    setText(null);
    if (!isNaN(v)) onSetBpm(Math.max(20, Math.min(300, v)));
  }, [onSetBpm]);

  return (
    <input
      type="text"
      inputMode="numeric"
      className={compact
        ? 'bpm-input w-12 h-8 px-1 rounded-lg bg-bg border border-border text-center font-mono font-semibold text-xs outline-none focus:border-sky transition-colors'
        : 'bpm-input w-16 h-8 lg:w-20 lg:h-9 px-2 rounded-lg bg-bg border border-border text-center font-mono font-semibold text-sm lg:text-base outline-none focus:border-sky transition-colors'
      }
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
  color?: string;
}

function Dial({ label, value = 0, onChange, color = 'sky' }: DialProps) {
  const safeValue = Number(value) || 0;
  return (
    <div className="transport-dial flex flex-col items-center gap-1">
      <span className="dial-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide">{label}</span>
      <div className="dial-ring relative w-10 h-10 lg:w-12 lg:h-12">
        <svg viewBox="0 0 40 40" className="dial-ring-svg w-full h-full">
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="3"
            strokeDasharray="75.4"
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(135 20 20)"
          />
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="currentColor"
            className={`text-${color}`}
            strokeWidth="3"
            strokeDasharray="75.4"
            strokeDashoffset={75.4 - (safeValue / 100) * 75.4}
            strokeLinecap="round"
            transform="rotate(135 20 20)"
          />
        </svg>
        <span className="dial-value absolute inset-0 flex items-center justify-center text-[10px] lg:text-xs font-mono font-semibold text-text">
          {safeValue}
        </span>
        <input
          type="range"
          className="dial-input absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2.5h8l2.5 2.5v8A1.5 1.5 0 0 1 12 14.5H4A1.5 1.5 0 0 1 2.5 13V4A1.5 1.5 0 0 1 4 2.5z" />
      <path d="M5 2.5v4h5v-4" />
      <path d="M5 11h6" />
    </svg>
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
        className={`transport-save-btn relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border
          ${isDirty
            ? 'bg-sky/10 text-sky border-sky/30 hover:bg-sky/15'
            : 'bg-gray-50 text-muted border-border hover:bg-gray-100 hover:text-text'}`}
        onClick={onSave}
        title={hasSaveId ? (isDirty ? 'Save changes' : 'Saved') : 'Save to your library'}
      >
        <SaveIcon />
        {isDirty && <span className="transport-save-dot absolute top-2 right-2 w-2 h-2 rounded-full bg-coral" />}
      </button>

      <button
        className={`transport-play-btn w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg cursor-pointer transition-all active:scale-95
          ${isPlaying ? 'bg-stop hover:bg-red-500' : 'bg-play hover:bg-green-600'}`}
        onClick={onTogglePlay}
        title={isPlaying ? 'Stop' : 'Play'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2 L14 8 L4 14 Z" />
          </svg>
        )}
      </button>

      <button
        className={`transport-chain-btn w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border
          ${chainMode
            ? 'bg-amber/15 text-amber border-amber/30 hover:bg-amber/25'
            : 'bg-gray-50 text-muted border-border hover:bg-gray-100 hover:text-text'}`}
        onClick={onToggleChainMode}
        title={chainMode
          ? 'Chain mode: advance through pages on each loop (click to switch to Loop)'
          : 'Loop mode: repeat the current page (click to switch to Chain)'}
        aria-label={chainMode ? 'Chain mode' : 'Loop mode'}
      >
        {chainMode ? (
          <svg className="transport-chain-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 8h8" />
            <path d="M7.5 4.5l3 3.5l-3 3.5" />
            <path d="M13 3v10" />
          </svg>
        ) : (
          <svg className="transport-loop-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6.5h7.5a3 3 0 0 1 0 6H6.5" />
            <path d="M5 4.5L3 6.5l2 2" />
            <path d="M11 14.5l2-2l-2-2" />
          </svg>
        )}
      </button>

      <div className="transport-bpm flex items-center gap-2">
        <span className="transport-bpm-label text-xs lg:text-sm text-muted font-semibold uppercase tracking-wide">BPM</span>
        <BpmInput bpm={bpm} onSetBpm={onSetBpm} />
        <input
          type="range"
          className="transport-bpm-slider w-28 h-1 accent-sky cursor-pointer"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => onSetBpm(Number(e.target.value))}
        />
      </div>

      <button
        className="transport-tap-btn px-3 py-1.5 rounded-lg bg-gray-100 text-xs lg:text-sm font-semibold text-muted hover:bg-gray-200 hover:text-text transition-colors cursor-pointer active:scale-95"
        onClick={handleTap}
      >
        TAP
      </button>

      <div className="transport-divider w-px h-8 bg-border" />

      <div className="transport-controls flex items-start gap-4">
        <div className="transport-time-sig flex flex-col items-center gap-1">
          <span className="transport-time-sig-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide">Time</span>
          <select
            className="transport-time-sig-select h-10 lg:h-12 px-2 rounded-lg bg-gray-100 text-xs lg:text-sm font-mono font-semibold text-muted hover:bg-gray-200 hover:text-text transition-colors cursor-pointer border-none outline-none"
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
          <span className="transport-step-div-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide">Step Div</span>
          <div className="transport-step-btns flex items-center h-10 lg:h-12 rounded-lg bg-gray-100 px-0.5">
            {STEP_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`step-option-btn w-7 lg:w-8 h-full flex items-center justify-center cursor-pointer rounded transition-colors
                  ${stepValue === opt.key ? 'bg-sky/15 text-sky' : 'text-muted hover:text-text'}`}
                onClick={() => onSetStepValue(opt.key)}
                title={opt.label}
              >
                <span className="step-option-glyph block" style={{ fontFamily: 'Petaluma', fontSize: '22px', lineHeight: 0 }}>{opt.glyph}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="transport-preview flex flex-col items-center gap-1">
          <span className="transport-preview-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide">Preview</span>
          <button
            className={`transport-preview-btn w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95
              ${previewMode
                ? 'bg-sky/15 text-sky border border-sky/30'
                : 'bg-gray-100 text-muted hover:bg-gray-200 hover:text-text border border-transparent'
              }`}
            onClick={onTogglePreview}
            title={previewMode ? 'Preview on: hear sounds when clicking cells' : 'Preview off'}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8 A6 6 0 0 1 16 8" />
              <rect x="3" y="8" width="3.5" height="5.5" rx="1" />
              <rect x="13.5" y="8" width="3.5" height="5.5" rx="1" />
              <line x1="10" y1="2" x2="10" y2="5" />
            </svg>
          </button>
        </div>

        <div className="transport-swing flex items-end gap-1.5">
          <Dial label="Swing" value={swing} onChange={onSetSwing} color="amber" />
          <div className="swing-target-toggle flex flex-col items-center gap-0.5 pb-0.5">
            {(['8th', '16th'] as const).map((t) => (
              <button
                key={t}
                className={`swing-target-btn px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono font-semibold cursor-pointer transition-colors leading-tight
                  ${swingTarget === t
                    ? 'bg-amber/15 text-amber'
                    : 'text-muted/50 hover:text-muted'
                  }`}
                onClick={() => onSetSwingTarget(t)}
                title={t === '8th' ? 'Swing 8th notes and below' : 'Swing 16th notes and below only'}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <Dial label="Human" value={humanize} onChange={onSetHumanize} color="lavender" />
      </div>

      {isPlaying && (
        <div className="transport-indicator flex items-center gap-1.5 ml-auto">
          <div className="transport-indicator-dot w-2 h-2 rounded-full bg-play pulse-play" />
          <span className="transport-indicator-label text-xs text-play font-medium">Playing</span>
        </div>
      )}
    </div>
  );
}

export default memo(Transport);
