import { memo, useState, useRef, useEffect } from 'react';
import { MACHINE_GROUPS } from '../audio/drumGroups.js';
import { CUSTOM_KIT_IDS, loadKitManifest, getKitSampleNames } from '../audio/customKits.js';
import TrackIcon from './TrackIcon.jsx';

const DRUM_MACHINES = Object.keys(MACHINE_GROUPS);
const SOUNDFONTS = [
  'taiko_drum', 'timpani', 'woodblock', 'steel_drums', 'synth_drum',
  'melodic_tom', 'agogo', 'tinkle_bell', 'xylophone', 'vibraphone',
  'glockenspiel', 'marimba',
];

const VEL_MODES = [1, 3, 7];

function TrackControls({
  track,
  trackIndex,
  onChangeProp,
  onChangeSource,
  onChangeVelMode,
  onRemove,
  onPreview,
  onDrop,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [customKits, setCustomKits] = useState([]); // [{ id, manifest }]
  const dropRef = useRef(null);

  // Load custom kit manifests when picker opens
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
  }, [isOpen]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = [...e.dataTransfer.files].filter((f) =>
      f.type.startsWith('audio/') || /\.(wav|ogg|mp3|flac)$/i.test(f.name)
    );
    if (files.length > 0) {
      onDrop(files[0], trackIndex);
    }
  };

  return (
    <div
      ref={dropRef}
      className={`track-controls flex flex-col gap-0.5 min-w-[180px] lg:min-w-[220px] shrink-0 ${isDragOver ? 'drop-target rounded-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Row 1: Icon + name ... mute/solo right-aligned */}
      <div className="track-controls-row1 flex items-center gap-1.5">
        <button
          className="track-name-btn flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-gray-100 transition-colors text-sm lg:text-base font-medium cursor-pointer min-w-0"
          onClick={() => setIsOpen(!isOpen)}
          title={track.name}
        >
          <TrackIcon track={track} className="text-muted" />
          <span
            className="track-color-dot w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: track.color }}
          />
          <span className="truncate max-w-[80px] lg:max-w-[100px]">{track.name}</span>
        </button>

        <div className="flex-1" />

        <button
          className={`track-mute-btn w-5 h-5 lg:w-6 lg:h-6 rounded text-[9px] lg:text-[11px] font-bold cursor-pointer transition-colors shrink-0
            ${track.mute ? 'bg-red-100 text-stop' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
          onClick={() => onChangeProp(trackIndex, 'mute', !track.mute)}
          title="Mute"
        >
          M
        </button>

        <button
          className={`track-solo-btn w-5 h-5 lg:w-6 lg:h-6 rounded text-[9px] lg:text-[11px] font-bold cursor-pointer transition-colors shrink-0
            ${track.solo ? 'bg-amber/20 text-amber' : 'bg-gray-100 text-muted hover:bg-gray-200'}`}
          onClick={() => onChangeProp(trackIndex, 'solo', !track.solo)}
          title="Solo"
        >
          S
        </button>
      </div>

      {/* Row 2: Volume slider + velocity mode */}
      <div className="track-controls-row2 flex items-center gap-1.5 pl-1.5">
        <span className="text-[8px] lg:text-[10px] text-muted font-semibold uppercase w-5 shrink-0">Vol</span>
        <input
          type="range"
          className="track-volume-slider w-16 h-1 accent-sky cursor-pointer"
          min={0}
          max={100}
          value={track.volume}
          onChange={(e) => onChangeProp(trackIndex, 'volume', Number(e.target.value))}
          title={`Volume: ${track.volume}`}
        />
        <span className="text-[9px] lg:text-[11px] font-mono text-muted w-5 text-right shrink-0">{track.volume}</span>

        <div className="flex-1" />

        {/* Velocity mode — cycles 1→3→7→1 on click */}
        <button
          className="track-vel-toggle flex items-center gap-0.5 px-1.5 py-px rounded border border-border hover:border-lavender/40 cursor-pointer transition-colors"
          onClick={() => {
            const cur = track.velMode || 3;
            const next = cur === 1 ? 3 : cur === 3 ? 7 : 1;
            onChangeVelMode(trackIndex, next);
          }}
          title={`Velocity: ${track.velMode || 3} levels (click to cycle)`}
        >
          <span className="text-[8px] lg:text-[10px] text-muted font-semibold">V:</span>
          <span className="text-[9px] lg:text-[11px] font-mono font-bold text-lavender">{track.velMode || 3}</span>
        </button>
      </div>

      {/* Sound selector popover */}
      {isOpen && (
        <div className="track-sound-picker absolute left-0 top-10 z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-72 max-h-80 overflow-y-auto">
          <div className="track-sound-picker-header flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Sound Source</span>
            <button className="text-xs text-muted hover:text-text cursor-pointer" onClick={() => setIsOpen(false)}>Close</button>
          </div>

          {/* Drum machines */}
          <div className="mb-2">
            <div className="text-[10px] text-muted font-semibold uppercase mb-1">Drum Machines</div>
            {DRUM_MACHINES.map((dm) => (
              <div key={dm} className="mb-1">
                <div className="text-xs font-medium text-text/70 pl-1">{dm}</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {MACHINE_GROUPS[dm].map((g) => (
                    <button
                      key={`${dm}-${g}`}
                      className={`sound-option px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors
                        ${track.sourceType === 'drumMachine' && track.instrument === dm && track.group === g
                          ? 'bg-sky text-white'
                          : 'bg-gray-100 text-text hover:bg-gray-200'
                        }`}
                      onClick={() => {
                        onChangeSource(trackIndex, {
                          sourceType: 'drumMachine',
                          instrument: dm,
                          group: g,
                          name: g,
                        });
                        setIsOpen(false);
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Soundfonts */}
          <div className="mb-2">
            <div className="text-[10px] text-muted font-semibold uppercase mb-1">Soundfonts</div>
            <div className="flex flex-wrap gap-1">
              {SOUNDFONTS.map((sf) => (
                <button
                  key={sf}
                  className={`sound-option px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors
                    ${track.sourceType === 'soundfont' && track.soundfontName === sf
                      ? 'bg-lavender text-white'
                      : 'bg-gray-100 text-text hover:bg-gray-200'
                    }`}
                  onClick={() => {
                    onChangeSource(trackIndex, {
                      sourceType: 'soundfont',
                      soundfontName: sf,
                      name: sf.replace(/_/g, ' '),
                    });
                    setIsOpen(false);
                  }}
                >
                  {sf.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Custom sample kits */}
          {customKits.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-muted font-semibold uppercase mb-1">Sample Kits</div>
              {customKits.map(({ id, manifest }) => (
                <div key={id} className="mb-1">
                  <div className="text-xs font-medium text-text/70 pl-1">{manifest.name}</div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {getKitSampleNames(manifest).map(({ key, label }) => (
                      <button
                        key={`${id}-${key}`}
                        className={`sound-option px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors
                          ${track.sourceType === 'kit' && track.kitId === id && track.kitSample === key
                            ? 'bg-mint text-white'
                            : 'bg-gray-100 text-text hover:bg-gray-200'
                          }`}
                        onClick={() => {
                          onChangeSource(trackIndex, {
                            sourceType: 'kit',
                            kitId: id,
                            kitSample: key,
                            name: label,
                          });
                          setIsOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom sample hint */}
          <div className="text-[10px] text-muted italic mt-2">
            Drag & drop a .wav/.mp3/.ogg file onto the track name to load a custom sample
          </div>

          {/* Reverb slider */}
          <div className="mt-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted font-semibold uppercase">Reverb Send</span>
              <span className="text-[10px] font-mono text-muted">{track.reverb}%</span>
            </div>
            <input
              type="range"
              className="track-reverb-slider w-full h-1 accent-lavender cursor-pointer"
              min={0}
              max={100}
              value={track.reverb}
              onChange={(e) => onChangeProp(trackIndex, 'reverb', Number(e.target.value))}
            />
          </div>

          {/* Remove track */}
          <button
            className="track-remove-btn mt-2 text-[10px] text-stop hover:underline cursor-pointer"
            onClick={() => {
              onRemove(trackIndex);
              setIsOpen(false);
            }}
          >
            Remove track
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(TrackControls);
