import { memo, useRef, useCallback, useState } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';

function Dial({ label, value = 0, onChange, color = 'sky' }) {
  const safeValue = Number(value) || 0;
  return (
    <div className="transport-dial flex flex-col items-center gap-1">
      <span className="text-[9px] lg:text-[11px] text-muted font-semibold uppercase tracking-wide">{label}</span>
      <div className="relative w-10 h-10 lg:w-12 lg:h-12">
        {/* Background ring */}
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="#E2E8F0"
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
        {/* Value label */}
        <span className="absolute inset-0 flex items-center justify-center text-[10px] lg:text-xs font-mono font-semibold text-text">
          {safeValue}
        </span>
        {/* Invisible range input overlay */}
        <input
          type="range"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function Transport({ bpm, noteValue, swing, humanize, isPlaying, previewMode, onTogglePlay, onSetBpm, onSetNoteValue, onSetSwing, onSetHumanize, onTogglePreview }) {
  const tapTimesRef = useRef([]);
  const [bpmText, setBpmText] = useState(null); // null = not editing

  const handleTap = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > 5) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const times = tapTimesRef.current;
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
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
      {/* Play / Stop */}
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

      {/* BPM */}
      <div className="transport-bpm flex items-center gap-2">
        <span className="text-xs lg:text-sm text-muted font-semibold uppercase tracking-wide">BPM</span>
        <input
          type="number"
          className="transport-bpm-input w-16 h-8 lg:w-20 lg:h-9 px-2 rounded-lg bg-bg border border-border text-center font-mono font-semibold text-sm lg:text-base outline-none focus:border-sky transition-colors"
          value={bpmText !== null ? bpmText : bpm}
          onFocus={() => setBpmText(String(bpm))}
          onBlur={() => {
            const v = parseInt(bpmText, 10);
            setBpmText(null);
            onSetBpm(isNaN(v) ? bpm : v);
          }}
          onChange={(e) => {
            setBpmText(e.target.value);
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onSetBpm(v);
          }}
        />
        <input
          type="range"
          className="transport-bpm-slider w-28 h-1 accent-sky cursor-pointer"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => onSetBpm(Number(e.target.value))}
        />
      </div>

      {/* Tap Tempo */}
      <button
        className="transport-tap-btn px-3 py-1.5 rounded-lg bg-gray-100 text-xs lg:text-sm font-semibold text-muted hover:bg-gray-200 hover:text-text transition-colors cursor-pointer active:scale-95"
        onClick={handleTap}
      >
        TAP
      </button>

      {/* Divider */}
      <div className="w-px h-8 bg-border" />

      {/* Labeled controls — aligned tops */}
      <div className="transport-controls flex items-start gap-4">
        {/* Note value (step divisor) */}
        <div className="transport-divisor flex flex-col items-center gap-1">
          <span className="text-[9px] lg:text-[11px] text-muted font-semibold uppercase tracking-wide">Tick</span>
          <select
            className="transport-note-value-select h-10 lg:h-12 px-2 rounded-lg bg-gray-100 text-xs lg:text-sm font-semibold text-muted hover:bg-gray-200 hover:text-text transition-colors cursor-pointer border-none outline-none"
            value={noteValue}
            onChange={(e) => onSetNoteValue(e.target.value)}
          >
            {NOTE_VALUES.map((nv) => (
              <option key={nv.key} value={nv.key}>{nv.label}</option>
            ))}
          </select>
        </div>

        {/* Preview / Audition toggle */}
        <div className="transport-preview flex flex-col items-center gap-1">
          <span className="text-[9px] lg:text-[11px] text-muted font-semibold uppercase tracking-wide">Preview</span>
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

        {/* Swing dial */}
        <Dial label="Swing" value={swing} onChange={onSetSwing} color="amber" />

        {/* Humanize dial */}
        <Dial label="Human" value={humanize} onChange={onSetHumanize} color="lavender" />
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div className="transport-indicator flex items-center gap-1.5 ml-auto">
          <div className="w-2 h-2 rounded-full bg-play pulse-play" />
          <span className="text-xs text-play font-medium">Playing</span>
        </div>
      )}
    </div>
  );
}

export default memo(Transport);
