import { memo, useEffect, useState } from 'react';

interface SavePromptProps {
  /** Pattern has unsaved edits. */
  isDirty: boolean;
  /** Name of the loaded pattern (preset or user save), if any. */
  patternName: string | null;
  /** True when the pattern is already one of the user's saves. */
  isUserSave: boolean;
  /** Changes whenever a different pattern is loaded — resets dismissal. */
  sourceKey: string;
  onSaveToBank: () => void;
  onDownload: () => void;
}

/**
 * Floating nudge shown after the user edits a pattern: keep it in the local
 * bank (localStorage user library) or download it as a .drumlet file.
 */
function SavePrompt({ isDirty, patternName, isUserSave, sourceKey, onSaveToBank, onDownload }: SavePromptProps) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [justSaved]);

  if (justSaved) {
    return (
      <div className="save-prompt save-prompt-confirm fixed left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 px-4 py-2.5 rounded-full bg-play text-white text-sm font-medium shadow-lg">
        Saved to My Bank
      </div>
    );
  }

  if (!isDirty || dismissedKey === sourceKey) return null;

  const title = patternName
    ? isUserSave ? `Unsaved changes to “${patternName}”` : `You've changed “${patternName}”`
    : 'Keep this pattern?';

  return (
    <>
      {/* Reserves room at the page bottom so the fixed bar never covers the last row. */}
      <div className="save-prompt-spacer h-28 sm:h-20" aria-hidden="true" />
      <div
        className="save-prompt fixed left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 w-[calc(100%-1.5rem)] max-w-md flex flex-wrap sm:flex-nowrap items-center gap-2 pl-4 pr-2 py-2 rounded-2xl bg-card border border-border shadow-lg"
        role="status"
      >
        <span className="save-prompt-title basis-full sm:basis-auto flex-1 min-w-0 pt-1 sm:pt-0 text-sm font-medium text-text truncate">{title}</span>
        <button
          className="save-prompt-bank-btn flex-1 sm:flex-none shrink-0 h-10 px-3 rounded-xl bg-sky text-white text-sm font-semibold cursor-pointer hover:brightness-105 transition"
          onClick={() => { onSaveToBank(); setJustSaved(true); }}
        >
          {isUserSave ? 'Save' : 'Save to My Bank'}
        </button>
        <button
          className="save-prompt-download-btn shrink-0 h-10 px-3 rounded-xl bg-gray-100 text-text text-sm font-medium cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={() => { onDownload(); setDismissedKey(sourceKey); }}
          title="Download as a .drumlet file"
        >
          .drumlet
        </button>
        <button
          className="save-prompt-dismiss-btn shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-muted hover:text-text cursor-pointer"
          onClick={() => setDismissedKey(sourceKey)}
          aria-label="Dismiss"
        >
          <svg className="save-prompt-dismiss-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>
      </div>
    </>
  );
}

export default memo(SavePrompt);
