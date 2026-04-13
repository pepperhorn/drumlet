import { memo } from 'react';
import { TELEPHONE_PLUGIN_ID } from '../plugins/modePlugins.js';
import type { ModePlugin } from '../plugins/runtime.js';

interface PluginResult {
  accuracy: number;
  totalScore: number;
  maxScore: number;
  matches: unknown[];
  misses: unknown[];
  extras: unknown[];
}

interface PluginModalProps {
  isOpen: boolean;
  onClose: () => void;
  modePlugins: ModePlugin[];
  selectedModeId: string;
  onSelectMode: (id: string) => void;
  inputMode: string;
  onSetInputMode: (mode: string) => void;
  loops: number;
  onSetLoops: (loops: number) => void;
  targetScore: number;
  onSetTargetScore: (score: number) => void;
  performerName: string;
  onSetPerformerName: (name: string) => void;
  turnLengthSteps: number;
  onSetTurnLengthSteps: (steps: number) => void;
  status: string;
  countdown: number;
  result: PluginResult | null;
  sourceLabel?: string;
  onStart: () => void;
  onRetry: () => void;
  shareUrl?: string;
  audioDisclaimer?: string;
}

function PluginModal({
  isOpen,
  onClose,
  modePlugins,
  selectedModeId,
  onSelectMode,
  inputMode,
  onSetInputMode,
  loops,
  onSetLoops,
  targetScore,
  onSetTargetScore,
  performerName,
  onSetPerformerName,
  turnLengthSteps,
  onSetTurnLengthSteps,
  status,
  countdown,
  result,
  sourceLabel,
  onStart,
  onRetry,
  shareUrl,
  audioDisclaimer,
}: PluginModalProps) {
  if (!isOpen) return null;

  const selectedMode = modePlugins.find((plugin) => plugin.manifest.id === selectedModeId) ?? modePlugins[0];
  const isTelephone = selectedMode?.manifest.id === TELEPHONE_PLUGIN_ID;
  const isRunning = status === 'countdown' || status === 'running';

  return (
    <>
      <div className="plugin-modal-backdrop fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <div className="plugin-modal fixed top-1/2 left-1/2 z-50 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="plugin-modal-header flex items-center justify-between mb-5">
          <div className="plugin-modal-heading">
            <h3 className="plugin-modal-title text-xl font-display font-bold text-text">Plugins</h3>
            <p className="plugin-modal-subtitle text-sm text-muted">
              {sourceLabel ? `Source: ${sourceLabel}` : 'Use the current pattern or a library item as the source.'}
            </p>
          </div>
          <button
            className="plugin-modal-close w-9 h-9 rounded-xl bg-gray-100 text-muted hover:bg-gray-200 hover:text-text cursor-pointer transition-colors"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        <div className="plugin-mode-grid grid gap-2 md:grid-cols-3 mb-5">
          {modePlugins.map((plugin) => (
            <button
              key={plugin.manifest.id}
              className={`plugin-mode-card rounded-2xl border px-4 py-3 text-left cursor-pointer transition-colors
                ${selectedModeId === plugin.manifest.id
                  ? 'border-sky bg-sky/10 text-text'
                  : 'border-border bg-white hover:bg-gray-50 text-text'}`}
              onClick={() => onSelectMode(plugin.manifest.id)}
            >
              <div className="plugin-mode-name text-sm font-display font-bold">{plugin.manifest.name}</div>
              <div className="plugin-mode-description text-xs text-muted mt-1">{plugin.description}</div>
            </button>
          ))}
        </div>

        {!isRunning && (
          <div className="plugin-modal-config space-y-4">
            <div className="plugin-config-row">
              <label className="plugin-config-label block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Input</label>
              <div className="plugin-input-toggle flex gap-2">
                {['pads', 'audio'].map((mode) => (
                  <button
                    key={mode}
                    className={`plugin-input-btn px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors
                      ${inputMode === mode ? 'bg-sky text-white' : 'bg-gray-100 text-muted hover:bg-gray-200 hover:text-text'}`}
                    onClick={() => onSetInputMode(mode)}
                  >
                    {mode === 'pads' ? 'Pads / Keyboard' : 'Audio'}
                  </button>
                ))}
              </div>
              {inputMode === 'audio' && (
                <p className="plugin-audio-hint text-xs text-muted mt-2">{audioDisclaimer}</p>
              )}
            </div>

            <div className="plugin-config-row grid grid-cols-2 gap-3">
              <label className="plugin-number-field flex flex-col gap-1">
                <span className="plugin-config-label text-xs font-semibold uppercase tracking-wide text-muted">Loops</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={loops}
                  onChange={(e) => onSetLoops(Number(e.target.value))}
                  className="plugin-config-input h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-sky"
                />
              </label>

              {selectedModeId !== 'practice-follow' && !isTelephone && (
                <label className="plugin-number-field flex flex-col gap-1">
                  <span className="plugin-config-label text-xs font-semibold uppercase tracking-wide text-muted">Target Score</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={targetScore}
                    onChange={(e) => onSetTargetScore(Number(e.target.value))}
                    className="plugin-config-input h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-sky"
                  />
                </label>
              )}

              {isTelephone && (
                <>
                  <label className="plugin-number-field flex flex-col gap-1">
                    <span className="plugin-config-label text-xs font-semibold uppercase tracking-wide text-muted">Performer</span>
                    <input
                      type="text"
                      value={performerName}
                      onChange={(e) => onSetPerformerName(e.target.value)}
                      className="plugin-config-input h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-sky"
                      placeholder="Player A"
                    />
                  </label>
                  <label className="plugin-number-field flex flex-col gap-1">
                    <span className="plugin-config-label text-xs font-semibold uppercase tracking-wide text-muted">Turn Steps</span>
                    <input
                      type="number"
                      min={16}
                      step={16}
                      value={turnLengthSteps}
                      onChange={(e) => onSetTurnLengthSteps(Number(e.target.value))}
                      className="plugin-config-input h-10 rounded-xl border border-border bg-bg px-3 text-sm outline-none focus:border-sky"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="plugin-modal-actions flex items-center gap-3 pt-1">
              <button
                className="plugin-start-btn h-11 rounded-xl bg-sky px-5 text-sm font-semibold text-white cursor-pointer hover:bg-sky/90 transition-colors"
                onClick={onStart}
              >
                Start {selectedMode?.manifest.name}
              </button>
              <button
                className="plugin-cancel-btn h-11 rounded-xl bg-gray-100 px-5 text-sm font-semibold text-muted cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {status === 'countdown' && (
          <div className="plugin-countdown text-center py-10">
            <div className="plugin-countdown-label text-xs uppercase tracking-wide text-muted mb-2">Count In</div>
            <div className="plugin-countdown-value text-6xl font-mono font-bold text-text">{countdown}</div>
          </div>
        )}

        {status === 'running' && (
          <div className="plugin-running text-center py-10">
            <div className="plugin-running-label text-xs uppercase tracking-wide text-muted mb-2">Running</div>
            <div className="plugin-running-value text-lg font-display font-bold text-text">{selectedMode?.manifest.name}</div>
            <div className="plugin-running-hint text-sm text-muted mt-2">
              {inputMode === 'pads' ? 'Play the pads or use the keyboard mapping.' : 'Follow the pulse and let the mic capture your hits.'}
            </div>
          </div>
        )}

        {status === 'results' && result && (
          <div className="plugin-results py-2">
            <div className="plugin-results-header flex items-end justify-between mb-4">
              <div>
                <div className="plugin-results-label text-xs uppercase tracking-wide text-muted">Results</div>
                <div className="plugin-results-score text-4xl font-mono font-bold text-text">{result.accuracy}%</div>
              </div>
              <div className="plugin-results-meta text-right text-xs text-muted">
                <div>Score {result.totalScore} / {result.maxScore}</div>
                <div>{result.matches.length} matched · {result.misses.length} misses · {result.extras.length} extras</div>
              </div>
            </div>

            {shareUrl && (
              <div className="plugin-share-box rounded-2xl border border-border bg-bg px-4 py-3 mb-4">
                <div className="plugin-share-label text-xs uppercase tracking-wide text-muted mb-1">Share Link</div>
                <div className="plugin-share-url text-xs font-mono text-text break-all">{shareUrl}</div>
              </div>
            )}

            <div className="plugin-modal-actions flex items-center gap-3">
              <button
                className="plugin-retry-btn h-11 rounded-xl bg-sky px-5 text-sm font-semibold text-white cursor-pointer hover:bg-sky/90 transition-colors"
                onClick={onRetry}
              >
                Retry
              </button>
              <button
                className="plugin-cancel-btn h-11 rounded-xl bg-gray-100 px-5 text-sm font-semibold text-muted cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(PluginModal);
