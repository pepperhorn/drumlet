import { memo, useState } from 'react';
import { PRESET_CATEGORIES } from '../state/presets.js';

const COVER_COLORS = ['#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB', '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1'];

/** Drummer categories get "In the style of" treatment — their presets are based on recordings */
const DRUMMER_CATEGORIES = new Set([
  'Clyde Stubblefield',
  'Bernard Purdie',
  'Zigaboo Modeliste',
  'James Gadson',
  'Tony Allen',
  'Stevie Wonder',
]);

function CoverImage({ preset, index }) {
  const [failed, setFailed] = useState(false);
  const color = COVER_COLORS[index % COVER_COLORS.length];
  const initials = preset.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!preset.cover || failed) {
    return (
      <div
        className="preset-cover-fallback w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-display font-bold text-sm"
        style={{ backgroundColor: color, opacity: 0.8 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={preset.cover}
      alt={preset.name}
      className="preset-cover w-12 h-12 rounded-xl shrink-0 object-cover overflow-hidden"
      onError={() => setFailed(true)}
    />
  );
}

function PresetCard({ preset, index, isStyleOf, onLoad }) {
  return (
    <button
      className="preset-card w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all hover:bg-sky/6 group"
      onClick={() => onLoad(preset)}
    >
      <CoverImage preset={preset} index={index} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isStyleOf ? (
            <span className="preset-name text-sm font-medium text-text group-hover:text-sky transition-colors">
              In the style of <span className="font-semibold">({preset.name})</span>
            </span>
          ) : (
            <span className="preset-name text-sm font-medium text-text group-hover:text-sky transition-colors truncate">
              {preset.name}
            </span>
          )}
          {/* Reference links */}
          {preset.links?.wikipedia && (
            <a href={preset.links.wikipedia} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Wikipedia" className="preset-link shrink-0 opacity-40 hover:opacity-100 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-muted"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM4.6 5h1.2l1.5 3.8L8.8 5H10l-2.5 6H6.3L4.6 5z"/></svg>
            </a>
          )}
          {preset.links?.spotify && (
            <a href={preset.links.spotify} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Spotify" className="preset-link shrink-0 opacity-40 hover:opacity-100 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#1DB954"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.67 11.56a.5.5 0 01-.68.16c-1.87-1.14-4.22-1.4-6.99-.77a.5.5 0 01-.22-.97c3.03-.69 5.63-.39 7.73.9a.5.5 0 01.16.68zm.98-2.18a.62.62 0 01-.85.2c-2.14-1.31-5.4-1.69-7.93-.93a.62.62 0 01-.36-1.18c2.9-.88 6.5-.45 8.94 1.06a.62.62 0 01.2.85zm.08-2.27C10.5 5.6 6.1 5.46 3.56 6.25a.74.74 0 11-.43-1.42C6.02 3.9 10.9 4.06 13.4 5.82a.74.74 0 01-.77 1.29z"/></svg>
            </a>
          )}
          {preset.links?.youtube && (
            <a href={preset.links.youtube} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="YouTube" className="preset-link shrink-0 opacity-40 hover:opacity-100 transition-opacity">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="#FF0000"><path d="M14.6 4.3a1.9 1.9 0 00-1.3-1.3C12.2 2.7 8 2.7 8 2.7s-4.2 0-5.3.3A1.9 1.9 0 001.4 4.3 19.6 19.6 0 001 8c0 1.3.1 2.5.4 3.7a1.9 1.9 0 001.3 1.3c1.1.3 5.3.3 5.3.3s4.2 0 5.3-.3a1.9 1.9 0 001.3-1.3c.3-1.2.4-2.4.4-3.7s-.1-2.5-.4-3.7zM6.5 10.2V5.8L10.4 8l-3.9 2.2z"/></svg>
            </a>
          )}
        </div>
        <div className="preset-meta text-[11px] text-muted mt-0.5">
          {preset.bpm} BPM{preset.swing ? ` · swing ${preset.swing}` : ''}
          {preset.credit && (
            <>
              {' · '}
              {preset.creditUrl ? (
                <a
                  href={preset.creditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="preset-credit-link text-sky/70 hover:text-sky underline decoration-sky/30 hover:decoration-sky transition-colors"
                >
                  {preset.credit}
                </a>
              ) : preset.credit}
            </>
          )}
        </div>
      </div>
      {/* Mini step preview */}
      <div className="preset-preview flex gap-px shrink-0">
        {preset.tracks[0]?.steps.map((v, i) => (
          <div
            key={i}
            className="w-1 h-4 rounded-sm"
            style={{
              backgroundColor: v > 0 ? preset.tracks[0].color : '#E2E8F0',
              opacity: v > 0 ? 0.4 + v * 0.2 : 1,
            }}
          />
        ))}
      </div>
    </button>
  );
}

function Library({ isOpen, onClose, onLoadPreset }) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="library-backdrop fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Full-width slideout */}
      <div
        className={`library-panel fixed inset-0 z-50 flex flex-col bg-card
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Header */}
        <div className="library-header flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-xl font-display font-bold text-text">Library</h2>
          <button
            className="library-close-btn w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-muted hover:text-text cursor-pointer transition-colors"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="library-content flex-1 overflow-y-auto px-6 py-6">
          <div className="library-grid max-w-5xl mx-auto">
            {/* Preset categories in a multi-column layout */}
            <div className="library-categories columns-1 md:columns-2 lg:columns-3 gap-6">
              {PRESET_CATEGORIES.map((category) => {
                const isStyleOf = DRUMMER_CATEGORIES.has(category.name);
                return (
                  <div key={category.name} className="library-category break-inside-avoid mb-6">
                    {/* Category heading */}
                    <div className="category-heading px-3 mb-2">
                      {isStyleOf ? (
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          {category.name}
                        </h3>
                      ) : (
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                          {category.name}
                        </h3>
                      )}
                    </div>

                    {/* Preset list */}
                    <div className="category-presets bg-white rounded-2xl border border-border shadow-sm">
                      {category.presets.map((preset, i) => (
                        <div key={preset.name} className={i > 0 ? 'border-t border-border/50' : ''}>
                          <PresetCard
                            preset={preset}
                            index={i}
                            isStyleOf={isStyleOf}
                            onLoad={onLoadPreset}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(Library);
