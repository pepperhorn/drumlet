import { memo, useCallback, useMemo, useRef, useState } from 'react';
import SectionHeadingEditor from './SectionHeadingEditor.js';
import type { Page, SectionHeading, SplitCount } from '../state/sequencerReducer.js';

const SPLIT_OPTIONS: (SplitCount | null)[] = [null, 2, 3, 4];
const SPLIT_LABELS: Record<string, string> = { 'null': '\u2014', '2': '2', '3': '3', '4': '4' };

const PAGINATION_THRESHOLD = 10;

function computeVisiblePages(current: number, total: number): (number | 'gap')[] {
  const candidates = new Set<number>([
    0,
    total - 1,
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ]);
  const sorted = [...candidates]
    .filter((i) => i >= 0 && i < total)
    .sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  let prev = -1;
  for (const idx of sorted) {
    if (prev !== -1 && idx - prev > 1) result.push('gap');
    result.push(idx);
    prev = idx;
  }
  return result;
}

interface StepOption {
  steps: number;
  stepValue?: string;
  default?: boolean;
}

interface AnchorRect {
  left: number;
  bottom: number;
}

interface PageTabsProps {
  pages: Page[];
  currentPageIndex: number;
  stepsPerPage: number;
  stepOptions?: StepOption[];
  splitMode: SplitCount | null;
  selectedStep: number | null;
  sectionHeadings?: SectionHeading[];
  onSetPage: (i: number) => void;
  onAddPage: () => void;
  onRemovePage: (i: number) => void;
  onSetStepsPerPage: (n: number) => void;
  onSetSplitMode: (val: SplitCount | null) => void;
  onClearPage: () => void;
  onAddSectionHeading?: (step: number, label: string) => void;
  onUpdateSectionHeading?: (id: string, label: string) => void;
  onRemoveSectionHeading?: (id: string) => void;
}

function PageTabs({
  pages,
  currentPageIndex,
  stepsPerPage,
  stepOptions,
  splitMode,
  selectedStep,
  sectionHeadings,
  onSetPage,
  onAddPage,
  onRemovePage,
  onSetStepsPerPage,
  onSetSplitMode,
  onClearPage,
  onAddSectionHeading,
  onUpdateSectionHeading,
  onRemoveSectionHeading,
}: PageTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionBtnRef = useRef<HTMLButtonElement | null>(null);
  const [editorAnchor, setEditorAnchor] = useState<AnchorRect | null>(null);
  const [jumpValue, setJumpValue] = useState('');

  const usePagination = pages.length > PAGINATION_THRESHOLD;
  const visiblePages = useMemo(
    () => (usePagination ? computeVisiblePages(currentPageIndex, pages.length) : []),
    [usePagination, currentPageIndex, pages.length]
  );

  const handleJumpSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= pages.length) {
      onSetPage(n - 1);
    }
    setJumpValue('');
  }, [jumpValue, pages.length, onSetPage]);

  const existingHeading: SectionHeading | null = (selectedStep != null && sectionHeadings)
    ? sectionHeadings.find((h) => h.step === selectedStep) ?? null
    : null;
  const sectionEnabled = selectedStep != null;

  const openSectionEditor = useCallback(() => {
    if (!sectionEnabled || !sectionBtnRef.current || !containerRef.current) return;
    const btnRect = sectionBtnRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setEditorAnchor({
      left: btnRect.left - containerRect.left,
      bottom: btnRect.bottom - containerRect.top,
    });
  }, [sectionEnabled]);

  const handleSectionSave = useCallback((label: string) => {
    if (selectedStep == null) return;
    if (existingHeading) onUpdateSectionHeading?.(existingHeading.id, label);
    else onAddSectionHeading?.(selectedStep, label);
    setEditorAnchor(null);
  }, [selectedStep, existingHeading, onAddSectionHeading, onUpdateSectionHeading]);

  const handleSectionDelete = useCallback(() => {
    if (existingHeading) onRemoveSectionHeading?.(existingHeading.id);
    setEditorAnchor(null);
  }, [existingHeading, onRemoveSectionHeading]);

  return (
    <div ref={containerRef} className="page-tabs relative flex items-center gap-2 lg:gap-3 bg-card rounded-2xl shadow-sm border border-border px-3 lg:px-4 py-2 lg:py-2.5 overflow-x-auto grid-scroll">
      {usePagination ? (
        <div className="page-pager flex items-center gap-1 shrink-0">
          <button
            className="page-prev-btn w-7 h-7 rounded-lg bg-gray-50 text-muted hover:bg-gray-100 hover:text-text text-sm cursor-pointer transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => onSetPage(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            title="Previous page"
            aria-label="Previous page"
          >
            ‹
          </button>
          {visiblePages.map((entry, idx) => {
            if (entry === 'gap') {
              return (
                <span
                  key={`gap-${idx}`}
                  className="page-gap text-muted text-xs px-1 select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }
            const page = pages[entry];
            if (!page) return null;
            return (
              <button
                key={page.id}
                className={`page-tab min-w-7 h-7 px-2 rounded-lg text-xs lg:text-sm font-medium cursor-pointer transition-all
                  ${entry === currentPageIndex
                    ? 'bg-sky text-white shadow-sm'
                    : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-text'
                  }`}
                onClick={() => onSetPage(entry)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (pages.length > 1) onRemovePage(entry);
                }}
                title={`${page.name} (page ${entry + 1}${pages.length > 1 ? ', right-click to remove' : ''})`}
              >
                {entry + 1}
              </button>
            );
          })}
          <button
            className="page-next-btn w-7 h-7 rounded-lg bg-gray-50 text-muted hover:bg-gray-100 hover:text-text text-sm cursor-pointer transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={() => onSetPage(Math.min(pages.length - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === pages.length - 1}
            title="Next page"
            aria-label="Next page"
          >
            ›
          </button>
          <span className="page-counter text-xs text-muted font-mono mx-1 shrink-0 select-none">
            {currentPageIndex + 1} / {pages.length}
          </span>
          <form className="page-jump-form flex items-center" onSubmit={handleJumpSubmit}>
            <input
              type="number"
              min={1}
              max={pages.length}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder="#"
              className="page-jump-input w-12 h-7 px-1.5 rounded-lg bg-gray-50 border border-transparent focus:border-sky/40 text-xs text-text outline-none text-center font-mono"
              aria-label={`Jump to page (1–${pages.length})`}
              title={`Jump to page (1–${pages.length})`}
            />
          </form>
          <button
            className="page-add-btn w-7 h-7 rounded-lg bg-gray-50 text-muted hover:bg-gray-100 hover:text-text text-sm cursor-pointer transition-colors flex items-center justify-center"
            onClick={onAddPage}
            title="Add page"
          >
            +
          </button>
        </div>
      ) : (
        <div className="page-tab-list flex items-center gap-1">
          {pages.map((page, i) => (
            <button
              key={page.id}
              className={`page-tab px-3 py-1 rounded-lg text-sm lg:text-base font-medium cursor-pointer transition-all
                ${i === currentPageIndex
                  ? 'bg-sky text-white shadow-sm'
                  : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-text'
                }`}
              onClick={() => onSetPage(i)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (pages.length > 1) onRemovePage(i);
              }}
              title={`${page.name}${pages.length > 1 ? ' (right-click to remove)' : ''}`}
            >
              {page.name}
            </button>
          ))}
          <button
            className="page-add-btn w-7 h-7 rounded-lg bg-gray-50 text-muted hover:bg-gray-100 hover:text-text text-sm cursor-pointer transition-colors flex items-center justify-center"
            onClick={onAddPage}
            title="Add page"
          >
            +
          </button>
        </div>
      )}

      <div className="page-divider w-px h-6 bg-border shrink-0" />

      <div className="steps-selector flex items-center gap-1 shrink-0">
        <span className="steps-selector-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide mr-1">Steps</span>
        {(stepOptions ?? [{ steps: 16 }]).map(({ steps }) => (
          <button
            key={steps}
            className={`steps-option px-2 py-0.5 rounded text-xs lg:text-sm font-mono cursor-pointer transition-colors
              ${stepsPerPage === steps
                ? 'bg-sky/10 text-sky font-bold'
                : 'text-muted hover:text-text'
              }`}
            onClick={() => onSetStepsPerPage(steps)}
          >
            {steps}
          </button>
        ))}
      </div>

      <div className="page-divider w-px h-6 bg-border shrink-0" />

      <div className="split-selector flex items-center gap-1 shrink-0">
        <span className="split-selector-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide mr-1">Split</span>
        {SPLIT_OPTIONS.map((val) => (
          <button
            key={String(val)}
            className={`split-option px-2 py-0.5 rounded text-xs lg:text-sm font-mono cursor-pointer transition-colors
              ${splitMode === val
                ? 'bg-violet/10 text-violet font-bold'
                : 'text-muted hover:text-text'
              }`}
            onClick={() => onSetSplitMode(val)}
            title={val === null ? 'No split' : `Split cells into ${val}`}
          >
            {SPLIT_LABELS[String(val)]}
          </button>
        ))}
      </div>

      <div className="page-divider w-px h-6 bg-border shrink-0" />

      <button
        ref={sectionBtnRef}
        className={`section-btn shrink-0 px-3 py-1 rounded-lg text-xs lg:text-sm font-semibold cursor-pointer transition-all border
          ${sectionEnabled
            ? (existingHeading
                ? 'bg-sky/15 text-sky border-sky/40 hover:bg-sky/25'
                : 'bg-sky/10 text-sky border-sky/30 hover:bg-sky/20')
            : 'bg-gray-50 text-muted/60 border-transparent cursor-not-allowed'
          }`}
        onClick={openSectionEditor}
        disabled={!sectionEnabled}
        title={sectionEnabled
          ? (existingHeading ? `Edit "${existingHeading.label}" at step ${(selectedStep ?? 0) + 1}` : `Add section heading at step ${(selectedStep ?? 0) + 1}`)
          : 'Select a step number to add a section heading'}
      >
        {existingHeading ? `§ ${existingHeading.label}` : '+ Section'}
      </button>

      <button
        className="clear-page-btn shrink-0 px-3 py-1 rounded-lg text-xs text-muted bg-gray-50 hover:bg-red-50 hover:text-stop cursor-pointer transition-colors"
        onClick={onClearPage}
        title="Clear all steps on this page"
      >
        Clear
      </button>

      {editorAnchor && (
        <SectionHeadingEditor
          heading={existingHeading}
          anchorRect={editorAnchor}
          onSave={handleSectionSave}
          onDelete={handleSectionDelete}
          onClose={() => setEditorAnchor(null)}
        />
      )}
    </div>
  );
}

export default memo(PageTabs);
