import { memo, useMemo, useState, type MouseEvent } from 'react';
import { getFieldValue } from '../plugins/librarySchema.js';
import type { LibraryItem, LibraryCollection, LibraryAction } from '../plugins/librarySchema.js';
import LibraryEditForm from './LibraryEditForm.js';
import type { SequencerState, Track } from '../state/sequencerReducer.js';
import type { LibraryEntry } from '../state/userLibrary.js';
import type { ActivePreset, LibraryEditMode } from '../state/useLibraryActions.js';

const COVER_COLORS = ['#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB', '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1'];

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#EF4444' : 'none'} stroke={filled ? '#EF4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function getPreviewSteps(item: LibraryItem): unknown[] | null {
  const cardPreview = item.card?.previewSteps;
  if (Array.isArray(cardPreview)) return cardPreview;
  const patternState = getFieldValue<SequencerState | null>(item, 'pattern_state', null);
  return patternState?.pages?.[0]?.tracks?.[0]?.steps ?? null;
}

function getCardMeta(item: LibraryItem): string[] {
  if (item.card?.meta?.length) return item.card.meta;

  const bpm = getFieldValue<number | null>(item, 'bpm', null);
  const swing = getFieldValue<number | null>(item, 'swing', null);
  const credit = getFieldValue<string>(item, 'credit', '');
  const duration = getFieldValue<string>(item, 'duration', '');
  const difficulty = getFieldValue<string>(item, 'difficulty', '');

  return [
    bpm ? `${bpm} BPM${swing ? ` · swing ${swing}` : ''}` : '',
    credit || '',
    duration || '',
    difficulty ? String(difficulty).replace(/^\w/, (char) => char.toUpperCase()) : '',
  ].filter(Boolean);
}

interface CoverImageProps {
  item: { title?: string; card?: { cover?: string; title?: string } };
  index: number;
}

function CoverImage({ item, index }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const cover = item.card?.cover ?? '';
  const title = item.card?.title ?? item.title ?? 'Item';
  const color = COVER_COLORS[index % COVER_COLORS.length]!;
  const initials = title.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();

  if (!cover || failed) {
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
      src={cover}
      alt={title}
      className="preset-cover w-12 h-12 rounded-xl shrink-0 object-cover overflow-hidden"
      onError={() => setFailed(true)}
    />
  );
}

interface GenericLibraryCardProps {
  item: LibraryItem;
  index: number;
  onActivate: (item: LibraryItem, action?: LibraryAction) => void;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}

function GenericLibraryCard({ item, index, onActivate, bookmarked, onToggleBookmark }: GenericLibraryCardProps) {
  const title = item.card?.title ?? item.title;
  const subtitle = item.card?.subtitle ?? '';
  const meta = getCardMeta(item);
  const previewSteps = getPreviewSteps(item);
  const patternState = getFieldValue<SequencerState | null>(item, 'pattern_state', null);
  const previewTrack: Track | undefined = patternState?.pages?.[0]?.tracks?.[0];

  return (
    <div className="preset-card-row flex items-center">
      <div className="preset-card-shell flex-1 px-3 py-2.5 rounded-xl transition-all hover:bg-sky/6 group">
        <button
          className="preset-card w-full flex items-center gap-3 text-left cursor-pointer"
          onClick={() => onActivate(item)}
        >
          <CoverImage item={item} index={index} />
          <div className="preset-card-info flex-1 min-w-0">
            <div className="preset-card-title flex flex-col">
              {subtitle && (
                <span className="preset-style-of text-[10px] uppercase tracking-wider text-muted/70 font-medium leading-tight">
                  {subtitle}
                </span>
              )}
              <span className="preset-name text-sm font-medium text-text group-hover:text-sky transition-colors truncate">
                {title}
              </span>
            </div>
            <div className="preset-meta flex flex-wrap items-center gap-1.5 text-xs text-muted mt-0.5">
              {meta.map((part, metaIndex) => (
                <span key={`${part}-${metaIndex}`} className="preset-meta-info">{part}</span>
              ))}
            </div>
          </div>
          {previewSteps && previewTrack && (
            <div className="preset-preview flex gap-px shrink-0">
              {previewSteps.map((value, stepIndex) => (
                <div
                  key={stepIndex}
                  className="preset-preview-step w-1 h-4 rounded-sm"
                  style={{
                    backgroundColor: Array.isArray(value)
                      ? (value as number[]).some((subValue) => subValue > 0) ? previewTrack.color : 'var(--color-border)'
                      : (typeof value === 'number' && value > 0) ? previewTrack.color : 'var(--color-border)',
                    opacity: Array.isArray(value)
                      ? (value as number[]).some((subValue) => subValue > 0) ? 0.75 : 1
                      : (typeof value === 'number' && value > 0) ? 0.4 + value * 0.2 : 1,
                  }}
                />
              ))}
            </div>
          )}
        </button>
        {item.actions && item.actions.length > 1 && (
          <div className="preset-actions flex flex-wrap gap-1.5 mt-2 ml-[60px]">
            {item.actions.slice(0, 3).map((action) => (
              <button
                key={action.id}
                className="preset-action-chip px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-semibold uppercase tracking-wide text-muted hover:bg-sky/10 hover:text-sky cursor-pointer transition-colors"
                onClick={() => onActivate(item, action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className="preset-heart-btn shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-red-400 transition-colors cursor-pointer"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onToggleBookmark(item.id);
        }}
        title={bookmarked ? 'Remove from Your Library' : 'Add to Your Library'}
      >
        <HeartIcon filled={bookmarked} />
      </button>
    </div>
  );
}

interface UserSaveCardProps {
  entry: LibraryEntry;
  index: number;
  onLoad: (entry: LibraryEntry) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function UserSaveCard({ entry, index, onLoad, onEdit, onDelete }: UserSaveCardProps) {
  return (
    <div className="user-save-card-row flex items-center">
      <button
        className="user-save-card flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all hover:bg-sky/6 group"
        onClick={() => onLoad(entry)}
      >
        <CoverImage item={{ title: entry.name, card: { cover: entry.cover } }} index={index} />
        <div className="user-save-info flex-1 min-w-0">
          <div className="user-save-title flex flex-col">
            {entry.inTheStyleOf && (
              <span className="preset-style-of text-[10px] uppercase tracking-wider text-muted/70 font-medium leading-tight">
                In the style of
              </span>
            )}
            <span className="user-save-name text-sm font-medium text-text group-hover:text-sky transition-colors truncate">
              {entry.name}
            </span>
          </div>
          <div className="user-save-meta text-xs text-muted mt-0.5">
            {entry.bpm} BPM{entry.swing ? ` · swing ${entry.swing}` : ''}
            {entry.credit && ` · ${entry.credit}`}
          </div>
        </div>
        {entry.state?.pages?.[0]?.tracks?.[0] && (
          <div className="preset-preview flex gap-px shrink-0">
            {entry.state.pages[0].tracks[0].steps.map((value, stepIndex) => {
              const trackColor = entry.state.pages[0]!.tracks[0]!.color;
              return (
                <div
                  key={stepIndex}
                  className="preset-preview-step w-1 h-4 rounded-sm"
                  style={{
                    backgroundColor: Array.isArray(value)
                      ? (value as number[]).some((subValue) => subValue > 0) ? trackColor : 'var(--color-border)'
                      : (typeof value === 'number' && value > 0) ? trackColor : 'var(--color-border)',
                    opacity: Array.isArray(value)
                      ? (value as number[]).some((subValue) => subValue > 0) ? 0.75 : 1
                      : (typeof value === 'number' && value > 0) ? 0.4 + value * 0.2 : 1,
                  }}
                />
              );
            })}
          </div>
        )}
      </button>
      <button
        className="user-save-edit-btn shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-sky transition-colors cursor-pointer"
        onClick={(event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); onEdit(entry.id); }}
        title="Edit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        className="user-save-delete-btn shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-muted/50 hover:text-red-400 transition-colors cursor-pointer"
        onClick={(event: MouseEvent<HTMLButtonElement>) => { event.stopPropagation(); onDelete(entry.id); }}
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

interface LibraryProps {
  isOpen: boolean;
  onClose: () => void;
  libraryCollections?: LibraryCollection[];
  userEntries?: LibraryEntry[];
  bookmarks?: string[];
  onToggleBookmark: (id: string) => void;
  onEditEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onLoadUserEntry: (entry: LibraryEntry) => void;
  onActivateLibraryItem: (item: LibraryItem, action?: LibraryAction) => void;
  editMode: LibraryEditMode | null;
  onSaveEdit: (metadata: Record<string, unknown>) => void;
  onCancelEdit: () => void;
  activePreset: ActivePreset | null;
  state: SequencerState;
}

function Library({
  isOpen,
  onClose,
  libraryCollections = [],
  userEntries = [],
  bookmarks = [],
  onToggleBookmark,
  onEditEntry,
  onDeleteEntry,
  onLoadUserEntry,
  onActivateLibraryItem,
  editMode,
  onSaveEdit,
  onCancelEdit,
  activePreset,
  state,
}: LibraryProps) {
  const { bookmarkedItems, unbookmarkedCollections } = useMemo(() => {
    const bookmarked: { item: LibraryItem; collection: LibraryCollection }[] = [];
    const collections: LibraryCollection[] = [];

    for (const collection of libraryCollections) {
      const unbookmarkedItems: LibraryItem[] = [];
      for (const item of collection.items ?? []) {
        if (bookmarks.includes(item.id)) {
          bookmarked.push({ item, collection });
        } else {
          unbookmarkedItems.push(item);
        }
      }

      if (unbookmarkedItems.length > 0) {
        collections.push({ ...collection, items: unbookmarkedItems });
      }
    }

    return { bookmarkedItems: bookmarked, unbookmarkedCollections: collections };
  }, [bookmarks, libraryCollections]);

  const hasYourLibrary = userEntries.length > 0 || bookmarkedItems.length > 0;

  return (
    <>
      {isOpen && (
        <div
          className="library-backdrop fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`library-panel fixed inset-0 z-50 flex flex-col bg-card transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="library-header flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="library-title text-xl font-display font-bold text-text">Library</h2>
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

        <div className="library-content flex-1 overflow-y-auto px-6 py-6">
          <div className="library-grid max-w-5xl mx-auto">
            {editMode ? (
              <LibraryEditForm
                key={editMode.id ?? activePreset?.sourceEntryId ?? activePreset?.sourcePreset ?? activePreset?.name ?? 'new-entry'}
                editMode={editMode}
                entry={editMode.id ? userEntries.find((entry) => entry.id === editMode.id) : null}
                activePreset={activePreset}
                state={state}
                onSave={onSaveEdit}
                onCancel={onCancelEdit}
                onDelete={editMode.id ? () => onDeleteEntry(editMode.id!) : undefined}
              />
            ) : (
              <>
                {hasYourLibrary && (
                  <div className="your-library-section mb-8">
                    <h3 className="your-library-heading text-sm font-display font-bold uppercase tracking-wider text-muted px-3 mb-3">
                      Your Library
                    </h3>
                    <div className="your-library-cards bg-white rounded-2xl border border-border shadow-sm">
                      {userEntries.map((entry, index) => (
                        <div key={entry.id} className={index > 0 ? 'border-t border-border/50' : ''}>
                          <UserSaveCard
                            entry={entry}
                            index={index}
                            onLoad={onLoadUserEntry}
                            onEdit={onEditEntry}
                            onDelete={onDeleteEntry}
                          />
                        </div>
                      ))}
                      {bookmarkedItems.map(({ item }, index) => (
                        <div
                          key={item.id}
                          className={(userEntries.length > 0 || index > 0) ? 'border-t border-border/50' : ''}
                        >
                          <GenericLibraryCard
                            item={item}
                            index={index}
                            onActivate={onActivateLibraryItem}
                            bookmarked={true}
                            onToggleBookmark={onToggleBookmark}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasYourLibrary && (
                  <div className="library-empty-state mb-8 rounded-2xl border border-dashed border-border bg-white px-5 py-4 text-sm text-muted">
                    Save your own patterns or bookmark items from any library plugin to build your library.
                  </div>
                )}

                <div className="more-grooves-section">
                  <h3 className="more-grooves-heading text-sm font-display font-bold uppercase tracking-wider text-muted px-3 mb-3">
                    {hasYourLibrary ? 'Browse Library' : 'Library'}
                  </h3>
                  <div className="library-categories columns-1 md:columns-2 lg:columns-3 gap-6">
                    {unbookmarkedCollections.map((collection) => (
                      <div key={collection.id} className="library-category break-inside-avoid mb-6">
                        <div className="category-heading px-3 mb-2">
                          <h4 className="category-name text-xs font-semibold uppercase tracking-wider text-muted">
                            {collection.label}
                          </h4>
                        </div>
                        <div className="category-presets bg-white rounded-2xl border border-border shadow-sm">
                          {collection.items.map((item, index) => (
                            <div key={item.id} className={index > 0 ? 'border-t border-border/50' : ''}>
                              <GenericLibraryCard
                                item={item}
                                index={index}
                                onActivate={onActivateLibraryItem}
                                bookmarked={false}
                                onToggleBookmark={onToggleBookmark}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(Library);
