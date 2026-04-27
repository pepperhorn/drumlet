import { memo, useCallback, useRef, useState } from 'react';
import SectionHeadingEditor from './SectionHeadingEditor.js';
import type { Page, SectionHeading, SplitCount } from '../state/sequencerReducer.js';

const SPLIT_OPTIONS: (SplitCount | null)[] = [null, 2, 3, 4];
const SPLIT_LABELS: Record<string, string> = { 'null': '\u2014', '2': '2', '3': '3', '4': '4' };

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
  chainMode: boolean;
  splitMode: SplitCount | null;
  selectedStep: number | null;
  sectionHeadings?: SectionHeading[];
  onSetPage: (i: number) => void;
  onAddPage: () => void;
  onRemovePage: (i: number) => void;
  onSetStepsPerPage: (n: number) => void;
  onToggleChainMode: () => void;
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
  chainMode,
  splitMode,
  selectedStep,
  sectionHeadings,
  onSetPage,
  onAddPage,
  onRemovePage,
  onSetStepsPerPage,
  onToggleChainMode,
  onSetSplitMode,
  onClearPage,
  onAddSectionHeading,
  onUpdateSectionHeading,
  onRemoveSectionHeading,
}: PageTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionBtnRef = useRef<HTMLButtonElement | null>(null);
  const [editorAnchor, setEditorAnchor] = useState<AnchorRect | null>(null);

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
        className={`chain-mode-btn shrink-0 px-3 py-1 rounded-lg text-xs lg:text-sm font-semibold cursor-pointer transition-all
          ${chainMode
            ? 'bg-amber/15 text-amber border border-amber/30'
            : 'bg-gray-50 text-muted hover:bg-gray-100'
          }`}
        onClick={onToggleChainMode}
        title={chainMode ? 'Chain: plays pages in order' : 'Loop: repeats current page'}
      >
        {chainMode ? 'Chain' : 'Loop'}
      </button>

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
