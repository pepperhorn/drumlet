import { memo, useState, useCallback } from 'react';
import { PRESET_CATEGORIES } from '../state/presets.js';

const COVER_COLORS = ['#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB', '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1'];

function CoverImage({ preset, index }) {
  const [failed, setFailed] = useState(false);
  const color = COVER_COLORS[index % COVER_COLORS.length];
  const initials = preset.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (!preset.cover || failed) {
    return (
      <div
        className="preset-cover-fallback w-10 h-10 lg:w-12 lg:h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-display font-bold text-sm lg:text-base"
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
      className="preset-cover w-10 h-10 lg:w-12 lg:h-12 rounded-xl shrink-0 object-cover overflow-hidden"
      onError={() => setFailed(true)}
    />
  );
}

function Library({ isOpen, onClose, onLoadPreset }) {
  const [expandedCategory, setExpandedCategory] = useState(null);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="library-backdrop fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`library-sidebar fixed top-0 left-0 h-full w-80 lg:w-96 bg-card border-r border-border shadow-2xl z-50
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="library-header flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg lg:text-xl font-display font-bold text-text">Library</h2>
          <button
            className="library-close-btn w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-muted hover:text-text cursor-pointer transition-colors"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="library-content overflow-y-auto h-[calc(100%-60px)]">
          {/* Preset categories */}
          <div className="library-presets px-3 py-3">
            <div className="text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wider px-2 mb-2">
              Preset Rhythms
            </div>

            {PRESET_CATEGORIES.map((category) => (
              <div key={category.name} className="library-category mb-1">
                <button
                  className={`library-category-btn w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm lg:text-base font-medium cursor-pointer transition-colors
                    ${expandedCategory === category.name
                      ? 'bg-sky/8 text-sky'
                      : 'text-text hover:bg-gray-50'
                    }`}
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.name ? null : category.name
                  )}
                >
                  <span>{category.name}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round"
                    className={`transition-transform duration-200 ${expandedCategory === category.name ? 'rotate-90' : ''}`}
                  >
                    <polyline points="4,2 8,6 4,10" />
                  </svg>
                </button>

                {expandedCategory === category.name && (
                  <div className="library-preset-list pl-3 pr-1 pb-1">
                    {category.presets.map((preset) => (
                      <button
                        key={preset.name}
                        className="library-preset-btn w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors hover:bg-gray-50 group"
                        onClick={() => onLoadPreset(preset)}
                      >
                        <CoverImage preset={preset} index={category.presets.indexOf(preset)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm lg:text-base font-medium text-text group-hover:text-sky transition-colors truncate">
                              {preset.name}
                            </span>
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
                          <div className="text-[10px] lg:text-xs text-muted">
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
                        <div className="library-preset-preview flex gap-px shrink-0">
                          {preset.tracks[0]?.steps.map((v, i) => (
                            <div
                              key={i}
                              className="w-1 h-3 rounded-sm"
                              style={{
                                backgroundColor: v > 0 ? preset.tracks[0].color : '#E2E8F0',
                                opacity: v > 0 ? 0.4 + v * 0.2 : 1,
                              }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-border" />

          {/* User saves (placeholder) */}
          <div className="library-user-saves px-3 py-3">
            <div className="text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wider px-2 mb-2">
              My Saves
            </div>

            <div className="library-saves-placeholder px-3 py-6 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="3" width="14" height="14" rx="2" />
                  <path d="M6 3 L6 8 L10 6 L14 8 L14 3" />
                </svg>
              </div>
              <p className="text-xs lg:text-sm text-muted mb-1">No saved patterns yet</p>
              <p className="text-[10px] lg:text-xs text-muted/60">Sign in to save and sync your patterns across devices</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(Library);
