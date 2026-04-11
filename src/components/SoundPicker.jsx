import { memo, useState, useEffect, useCallback } from 'react';
import { MACHINE_GROUPS } from '../audio/drumGroups.js';
import { CUSTOM_KIT_IDS, loadKitManifest, getKitSampleNames } from '../audio/customKits.js';

const DRUM_MACHINES = Object.keys(MACHINE_GROUPS);
const SOUNDFONTS = [
  'taiko_drum', 'timpani', 'woodblock', 'steel_drums', 'synth_drum',
  'melodic_tom', 'agogo', 'tinkle_bell', 'xylophone', 'vibraphone',
  'glockenspiel', 'marimba',
];

/** Build a key string for a source config to compare selections */
function sourceKey(cfg) {
  if (!cfg) return '';
  if (cfg.sourceType === 'drumMachine') return `dm:${cfg.instrument}:${cfg.group}`;
  if (cfg.sourceType === 'soundfont') return `sf:${cfg.soundfontName}`;
  if (cfg.sourceType === 'kit') return `kit:${cfg.kitId}:${cfg.kitSample}`;
  return '';
}

function SoundPicker({
  isOpen,
  onClose,
  track,
  trackIndex,
  onChangeSource,
  onChangeProp,
  onPreview,
  onCancelPreview,
  onRemove,
}) {
  const [customKits, setCustomKits] = useState([]);
  const [pendingSelection, setPendingSelection] = useState(null);

  useEffect(() => {
    if (!isOpen || customKits.length > 0) return;
    Promise.all(
      CUSTOM_KIT_IDS.map(async (id) => {
        try {
          const manifest = await loadKitManifest(id);
          return { id, manifest };
        } catch { return null; }
      })
    ).then((results) => setCustomKits(results.filter(Boolean)));
  }, [isOpen, customKits.length]);

  // Clear pending selection when picker opens/closes
  useEffect(() => {
    if (!isOpen) setPendingSelection(null);
  }, [isOpen]);

  const handlePreview = useCallback((cfg) => {
    setPendingSelection(cfg);
    onPreview?.(cfg);
  }, [onPreview]);

  const handleConfirm = useCallback(() => {
    if (!pendingSelection) return;
    onChangeSource(trackIndex, pendingSelection);
    setPendingSelection(null);
    onClose();
  }, [onChangeSource, onClose, pendingSelection, trackIndex]);

  const handleCancel = useCallback(() => {
    setPendingSelection(null);
    onCancelPreview?.();
    onClose();
  }, [onCancelPreview, onClose]);

  if (!isOpen || !track) return null;

  const currentKey = sourceKey(track);
  const pendingKey = sourceKey(pendingSelection);

  /** Get style for a sound option button */
  const optionClass = (cfg, activeColor) => {
    const key = sourceKey(cfg);
    const isCurrent = key === currentKey;
    const isPreviewing = key === pendingKey;
    if (isPreviewing) return `ring-2 ring-${activeColor} bg-${activeColor}/15 text-${activeColor} shadow-sm`;
    if (isCurrent && !pendingSelection) return `bg-${activeColor} text-white shadow-sm`;
    if (isCurrent) return `bg-${activeColor}/30 text-${activeColor}`;
    return 'bg-gray-50 text-text hover:bg-gray-100';
  };

  return (
    <>
      <div
        className="sound-picker-backdrop fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={handleCancel}
      />

      <div
        className={`sound-picker-panel fixed inset-0 z-50 flex flex-col bg-card transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="sound-picker-header flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="sound-picker-heading">
            <h2 className="sound-picker-title text-xl font-display font-bold text-text">Sound Source</h2>
            <p className="sound-picker-subtitle text-sm text-muted">
              {track.name} — {track.sourceType === 'drumMachine' ? `${track.instrument} / ${track.group}` : track.sourceType === 'soundfont' ? track.soundfontName?.replace(/_/g, ' ') : track.sourceType === 'kit' ? `${track.kitId} / ${track.kitSample}` : track.sourceType === 'custom' ? track.customSampleName : 'Select a sound'}
            </p>
          </div>
          <button
            className="sound-picker-close-btn w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-muted hover:text-text cursor-pointer transition-colors"
            onClick={handleCancel}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        <div className={`sound-picker-content flex-1 overflow-y-auto px-6 py-6 ${pendingSelection ? 'pb-24' : ''}`}>
          <div className="sound-picker-grid max-w-5xl mx-auto">

            {/* Drum Machines */}
            <div className="sound-picker-section mb-8">
              <h3 className="sound-picker-section-heading text-sm font-display font-bold uppercase tracking-wider text-muted px-1 mb-3">
                Drum Machines
              </h3>
              <div className="sound-picker-machines columns-1 md:columns-2 lg:columns-3 gap-6">
                {DRUM_MACHINES.map((dm) => (
                  <div key={dm} className="sound-machine-card break-inside-avoid mb-4">
                    <div className="sound-machine-header px-1 mb-1.5">
                      <h4 className="sound-machine-name text-xs font-semibold uppercase tracking-wider text-muted">{dm}</h4>
                    </div>
                    <div className="sound-machine-groups bg-white rounded-2xl border border-border shadow-sm p-3">
                      <div className="sound-machine-options flex flex-wrap gap-1.5">
                        {MACHINE_GROUPS[dm].map((g) => {
                          const cfg = { sourceType: 'drumMachine', instrument: dm, group: g, name: g };
                          return (
                            <button
                              key={`${dm}-${g}`}
                              className={`sound-option px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${optionClass(cfg, 'sky')}`}
                              onClick={() => handlePreview(cfg)}
                            >
                              {g}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Soundfonts */}
            <div className="sound-picker-section mb-8">
              <h3 className="sound-picker-section-heading text-sm font-display font-bold uppercase tracking-wider text-muted px-1 mb-3">
                Soundfonts
              </h3>
              <div className="sound-picker-soundfonts bg-white rounded-2xl border border-border shadow-sm p-3">
                <div className="sound-soundfont-options flex flex-wrap gap-1.5">
                  {SOUNDFONTS.map((sf) => {
                    const cfg = { sourceType: 'soundfont', soundfontName: sf, name: sf.replace(/_/g, ' ') };
                    return (
                      <button
                        key={sf}
                        className={`sound-option px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${optionClass(cfg, 'lavender')}`}
                        onClick={() => handlePreview(cfg)}
                      >
                        {sf.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sample Kits */}
            {customKits.length > 0 && (
              <div className="sound-picker-section mb-8">
                <h3 className="sound-picker-section-heading text-sm font-display font-bold uppercase tracking-wider text-muted px-1 mb-3">
                  Sample Kits
                </h3>
                <div className="sound-picker-kits columns-1 md:columns-2 gap-6">
                  {customKits.map(({ id, manifest }) => (
                    <div key={id} className="sound-kit-card break-inside-avoid mb-4">
                      <div className="sound-kit-header px-1 mb-1.5">
                        <h4 className="sound-kit-name text-xs font-semibold uppercase tracking-wider text-muted">{manifest.name}</h4>
                        {manifest.description && (
                          <p className="sound-kit-description text-xs text-muted/70 mt-0.5">{manifest.description}</p>
                        )}
                      </div>
                      <div className="sound-kit-samples bg-white rounded-2xl border border-border shadow-sm p-3">
                        <div className="sound-kit-options flex flex-wrap gap-1.5">
                          {getKitSampleNames(manifest).map(({ key, label }) => {
                            const cfg = { sourceType: 'kit', kitId: id, kitSample: key, name: label };
                            return (
                              <button
                                key={`${id}-${key}`}
                                className={`sound-option px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${optionClass(cfg, 'mint')}`}
                                onClick={() => handlePreview(cfg)}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Track settings */}
            <div className="sound-picker-section mb-8">
              <h3 className="sound-picker-section-heading text-sm font-display font-bold uppercase tracking-wider text-muted px-1 mb-3">
                Track Settings
              </h3>
              <div className="sound-picker-settings bg-white rounded-2xl border border-border shadow-sm p-4">
                {/* Reverb */}
                <div className="sound-picker-reverb mb-4">
                  <div className="sound-picker-reverb-header flex items-center justify-between mb-2">
                    <span className="sound-picker-reverb-label text-xs font-semibold uppercase tracking-wide text-muted">Reverb Send</span>
                    <span className="sound-picker-reverb-value text-xs font-mono text-muted">{track.reverb}%</span>
                  </div>
                  <input
                    type="range"
                    className="sound-picker-reverb-slider w-full max-w-xs h-1.5 accent-lavender cursor-pointer"
                    min={0}
                    max={100}
                    value={track.reverb}
                    onChange={(e) => onChangeProp(trackIndex, 'reverb', Number(e.target.value))}
                  />
                </div>

                {/* Drop hint */}
                <div className="sound-drop-hint text-xs text-muted italic">
                  Drag & drop a .wav/.mp3/.ogg file onto the track name to load a custom sample.
                </div>

                {/* Remove track */}
                <button
                  className="sound-picker-remove-btn mt-4 text-xs text-stop hover:underline cursor-pointer"
                  onClick={() => {
                    onRemove(trackIndex);
                    onClose();
                  }}
                >
                  Remove track
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky confirm bar */}
        {pendingSelection && (
          <div className="sound-picker-confirm-bar fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg px-6 py-4">
            <div className="sound-picker-confirm-inner max-w-5xl mx-auto flex items-center gap-3">
              <div className="sound-picker-confirm-info flex-1 min-w-0">
                <span className="sound-picker-confirm-label text-xs text-muted uppercase tracking-wide">Preview:</span>
                <span className="sound-picker-confirm-name text-sm font-medium text-text ml-2 truncate">
                  {pendingSelection.name || pendingSelection.group || pendingSelection.soundfontName || pendingSelection.kitSample || 'Selected'}
                </span>
              </div>
              <button
                className="sound-picker-confirm-btn h-10 px-6 rounded-xl bg-sky text-sm font-semibold text-white cursor-pointer hover:bg-sky/90 transition-colors"
                onClick={handleConfirm}
              >
                Confirm
              </button>
              <button
                className="sound-picker-cancel-btn h-10 px-4 rounded-xl bg-gray-100 text-sm font-semibold text-muted cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => {
                  setPendingSelection(null);
                  onCancelPreview?.();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default memo(SoundPicker);
