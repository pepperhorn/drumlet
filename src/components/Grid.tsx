import { memo, useState, useCallback, useEffect, useRef, useSyncExternalStore, useMemo, type DragEvent, type MouseEvent, type CSSProperties } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TrackRow from './TrackRow.js';
import SectionHeadingEditor from './SectionHeadingEditor.js';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import type { Track, SectionHeading, CellRef, NoteValueKey, VelMode } from '../state/sequencerReducer.js';

const lgQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;
function subscribeToLg(cb: () => void) { lgQuery?.addEventListener('change', cb); return () => lgQuery?.removeEventListener('change', cb); }
function getIsLg(): boolean { return lgQuery?.matches ?? false; }

const BEAT_LABELS: Record<number, string[]> = {
  1: [''],
  2: ['', '&'],
  3: ['', '&', 'a'],
  4: ['', 'e', '&', 'a'],
  6: ['', 'ta', 'ta', '&', 'ta', 'ta'],
  8: ['', 'e', '&', 'a', 'e', '&', 'a', 'e'],
};

function buildDivisorLabels(stepsPerPage: number, stepsPerBeat: number): string[] {
  const labels: string[] = [];
  const subLabels = BEAT_LABELS[stepsPerBeat] ?? BEAT_LABELS[1]!;
  for (let i = 0; i < stepsPerPage; i++) {
    const beatNum = Math.floor(i / stepsPerBeat) + 1;
    const subIdx = i % stepsPerBeat;
    labels.push(subIdx === 0 ? String(beatNum) : (subLabels[subIdx] ?? ''));
  }
  return labels;
}

type SizeKey = 'sm' | 'md' | 'lg';
const SIZE_CYCLE: SizeKey[] = ['sm', 'md', 'lg'];
const SIZE_LABELS: Record<SizeKey, string> = { sm: 'S', md: 'M', lg: 'L' };
const SIZE_PX: Record<SizeKey, [number, number]> = {
  sm: [9, 11],
  md: [11, 13],
  lg: [13, 15],
};

const BAR_LINE_STYLE: CSSProperties = {
  borderLeftWidth: 2,
  borderLeftStyle: 'dashed',
  borderLeftColor: 'color-mix(in srgb, var(--color-sky) 30%, transparent)',
};

interface ExpandedSplitCell {
  trackIndex: number;
  stepIndex: number;
}

interface EditingHeading {
  step: number;
  heading: SectionHeading | null;
  anchorRect: { left: number; bottom: number };
}

interface GridProps {
  tracks: Track[];
  currentStep: number;
  stepsPerPage: number;
  noteValue: NoteValueKey;
  stepValue: NoteValueKey;
  beatsPerBar?: number;
  selectedStep: number | null;
  onSelectStep?: (step: number | null) => void;
  sectionHeadings?: SectionHeading[];
  activeCell: CellRef | null;
  notationView: boolean;
  onToggleNotation?: () => void;
  onAddSectionHeading: (step: number, label: string) => void;
  onUpdateSectionHeading: (id: string, label: string) => void;
  onMoveSectionHeading: (id: string, step: number) => void;
  onRemoveSectionHeading: (id: string) => void;
  onToggleCell: (trackIndex: number, stepIndex: number, isRightClick?: boolean) => void;
  onToggleSubStep: (trackIndex: number, stepIndex: number, subIndex: number) => void;
  onClearSubStep: (trackIndex: number, stepIndex: number, subIndex: number) => void;
  onChangeProp: (trackIndex: number, prop: keyof Track, value: unknown) => void;
  onChangeVelMode: (trackIndex: number, mode: VelMode) => void;
  onAddTrack?: () => void;
  onReorderTracks?: (fromIndex: number, toIndex: number) => void;
  onOpenSoundPicker: (trackIndex: number) => void;
  onDrop: (file: File, trackIndex: number) => void;
  deleteMode?: boolean;
  onToggleDeleteMode?: () => void;
  onPickTrackForDelete?: (trackIndex: number) => void;
  canCopy?: boolean;
  canPaste?: boolean;
  onCopyCell?: () => void;
  onCutCell?: () => void;
  onPasteCell?: () => void;
}

function Grid({
  tracks,
  currentStep,
  stepsPerPage,
  noteValue,
  stepValue,
  beatsPerBar = 4,
  selectedStep,
  onSelectStep,
  sectionHeadings,
  activeCell,
  notationView,
  onToggleNotation,
  onAddSectionHeading,
  onUpdateSectionHeading,
  onMoveSectionHeading,
  onRemoveSectionHeading,
  onToggleCell,
  onToggleSubStep,
  onClearSubStep,
  onChangeProp,
  onChangeVelMode,
  onAddTrack,
  onReorderTracks,
  onOpenSoundPicker,
  onDrop,
  deleteMode = false,
  onToggleDeleteMode,
  onPickTrackForDelete,
  canCopy = false,
  canPaste = false,
  onCopyCell,
  onCutCell,
  onPasteCell,
}: GridProps) {
  const [countMode, setCountMode] = useState<'step' | 'beat'>('step');
  const [countSize, setCountSize] = useState<SizeKey>('sm');
  const [expandedTracks, setExpandedTracks] = useState<Set<number>>(new Set());
  const [expandedSplitCell, setExpandedSplitCell] = useState<ExpandedSplitCell | null>(null);
  const [editingHeading, setEditingHeading] = useState<EditingHeading | null>(null);
  const [dragHeading, setDragHeading] = useState<SectionHeading | null>(null);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isLg = useSyncExternalStore(subscribeToLg, getIsLg);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fontSize = SIZE_PX[countSize][isLg ? 1 : 0];

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) ?? NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;
  const divisorLabels = buildDivisorLabels(stepsPerPage, stepsPerBeat);

  const stepNv = NOTE_VALUES.find((n) => n.key === stepValue) ?? nv;
  const realStepsPerBeat = Math.max(1, Math.round(nv.beatsPerStep / stepNv.beatsPerStep));
  const stepsPerBar = beatsPerBar * realStepsPerBeat;
  const totalBars = Math.max(1, Math.ceil(stepsPerPage / stepsPerBar));

  const anyExpanded = expandedTracks.size > 0;

  // Estimate widths to pick how many full bars fit per row.
  // Cell sizes follow w-9 md:w-10 lg:w-11 (36/40/44) with ml-0.5 between steps,
  // ml-1.5 between beats. Track-controls col is w-24 (96) at base, w-[180px]
  // when any track is expanded, lg:w-[220px].
  const cellWidthPx = isLg ? 44 : 40;
  const subBeatGapPx = 2;     // ml-0.5
  const beatGapExtraPx = 4;   // ml-1.5 vs ml-0.5 = extra 4px at beat boundaries
  const trackControlsWidthPx = isLg ? 220 : anyExpanded ? 180 : 96;
  const gridPadPx = 32;       // p-4 left + right
  const colGapPx = 12;        // gap-3 between track-controls and steps
  const barWidthPx = stepsPerBar * (cellWidthPx + subBeatGapPx)
    + (beatsPerBar - 1) * beatGapExtraPx;
  const availableForCellsPx = containerWidth > 0
    ? containerWidth - trackControlsWidthPx - gridPadPx - colGapPx
    : 0;
  // Before first measure, render single row (existing behavior). Once measured,
  // wrap to as many bars as cleanly fit, minimum one bar per row.
  const barsPerRow = containerWidth > 0
    ? Math.min(totalBars, Math.max(1, Math.floor(availableForCellsPx / barWidthPx)))
    : totalBars;
  const stepsPerRow = barsPerRow * stepsPerBar;

  const systems = useMemo(() => {
    const out: { stepStart: number; stepCount: number }[] = [];
    for (let s = 0; s < stepsPerPage; s += stepsPerRow) {
      out.push({ stepStart: s, stepCount: Math.min(stepsPerRow, stepsPerPage - s) });
    }
    return out.length ? out : [{ stepStart: 0, stepCount: stepsPerPage }];
  }, [stepsPerPage, stepsPerRow]);

  const toggleTrackExpand = useCallback((trackIdx: number) => {
    setExpandedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackIdx)) next.delete(trackIdx);
      else next.add(trackIdx);
      return next;
    });
  }, []);

  const handleExpandSplitCell = useCallback((trackIndex: number, stepIndex: number) => {
    setExpandedSplitCell((prev) => {
      if (prev && prev.trackIndex === trackIndex && prev.stepIndex === stepIndex) return null;
      return { trackIndex, stepIndex };
    });
  }, []);

  const colWidth = `${anyExpanded ? 'w-[180px]' : 'w-24'} lg:w-[220px] shrink-0 transition-[width] duration-200 overflow-hidden`;

  const headings = useMemo(() => sectionHeadings ?? [], [sectionHeadings]);
  const headingByStep = useMemo(() => {
    const next: Record<number, SectionHeading> = {};
    for (const h of headings) {
      if (h.step < stepsPerPage) next[h.step] = h;
    }
    return next;
  }, [headings, stepsPerPage]);

  const handleHeadingClick = useCallback((step: number, e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const gridRect = (e.currentTarget.closest('.sequencer-grid') as HTMLElement | null)?.getBoundingClientRect();
    const anchorRect = {
      left: rect.left - (gridRect?.left ?? 0),
      bottom: rect.bottom - (gridRect?.top ?? 0),
    };
    const existing = headingByStep[step];
    setEditingHeading({ step, heading: existing ?? null, anchorRect });
  }, [headingByStep]);

  const handleHeadingSave = useCallback((label: string) => {
    if (!editingHeading) return;
    if (editingHeading.heading) {
      onUpdateSectionHeading(editingHeading.heading.id, label);
    } else {
      onAddSectionHeading(editingHeading.step, label);
    }
    setEditingHeading(null);
  }, [editingHeading, onAddSectionHeading, onUpdateSectionHeading]);

  const handleHeadingDelete = useCallback(() => {
    if (editingHeading?.heading) {
      onRemoveSectionHeading(editingHeading.heading.id);
    }
    setEditingHeading(null);
  }, [editingHeading, onRemoveSectionHeading]);

  const handleDragStart = useCallback((heading: SectionHeading, e: DragEvent<HTMLSpanElement>) => {
    setDragHeading(heading);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', heading.id);
  }, []);

  const handleDragOverStep = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (dragHeading) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }, [dragHeading]);

  const handleDropOnStep = useCallback((step: number) => {
    if (dragHeading) {
      onMoveSectionHeading(dragHeading.id, step);
      setDragHeading(null);
    }
  }, [dragHeading, onMoveSectionHeading]);

  const handleDragEnd = useCallback(() => {
    setDragHeading(null);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const handleTrackDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderTracks) return;
    const fromIndex = trackIds.indexOf(active.id as string);
    const toIndex = trackIds.indexOf(over.id as string);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorderTracks(fromIndex, toIndex);
  }, [trackIds, onReorderTracks]);

  const renderCountToggleButtons = () => (
    <>
      {onCopyCell && (
        <button
          className={`cell-copy-btn w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-all
            ${canCopy ? 'bg-gray-100 text-muted hover:bg-sky/15 hover:text-sky cursor-pointer' : 'bg-gray-50 text-muted/40 cursor-not-allowed'}`}
          onClick={canCopy ? onCopyCell : undefined}
          disabled={!canCopy}
          title="Copy active cell (⌘C)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="9" height="9" rx="1.5" />
            <path d="M3 11V3.5a1 1 0 0 1 1-1H11" />
          </svg>
        </button>
      )}
      {onCutCell && (
        <button
          className={`cell-cut-btn w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-all
            ${canCopy ? 'bg-gray-100 text-muted hover:bg-coral/15 hover:text-coral cursor-pointer' : 'bg-gray-50 text-muted/40 cursor-not-allowed'}`}
          onClick={canCopy ? onCutCell : undefined}
          disabled={!canCopy}
          title="Cut active cell (⌘X)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="4" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <line x1="5.5" y1="10.5" x2="13" y2="2" />
            <line x1="10.5" y1="10.5" x2="3" y2="2" />
          </svg>
        </button>
      )}
      {onPasteCell && (
        <button
          className={`cell-paste-btn w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-all
            ${canPaste ? 'bg-gray-100 text-muted hover:bg-mint/15 hover:text-mint cursor-pointer' : 'bg-gray-50 text-muted/40 cursor-not-allowed'}`}
          onClick={canPaste ? onPasteCell : undefined}
          disabled={!canPaste}
          title="Paste into active cell (⌘V)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="8" height="11" rx="1" />
            <rect x="6" y="1.5" width="4" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
      )}
      {(onCopyCell || onCutCell || onPasteCell) && onToggleDeleteMode && (
        <div className="grid-count-toggle-divider w-px h-6 self-center bg-border mx-0.5" />
      )}
      {onToggleDeleteMode && (
        <button
          className={`track-delete-toggle-btn w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all
            ${deleteMode
              ? 'bg-coral text-white'
              : 'bg-gray-100 text-muted hover:bg-coral/15 hover:text-coral'
            }`}
          onClick={onToggleDeleteMode}
          title={deleteMode ? 'Cancel delete' : 'Delete a track'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4h11" />
            <path d="M6 4V2.5h4V4" />
            <path d="M3.5 4l.7 9a1 1 0 0 0 1 1h5.6a1 1 0 0 0 1-1l.7-9" />
            <path d="M6.5 7v5M9.5 7v5" />
          </svg>
        </button>
      )}
      {onToggleNotation && (
        <button
          className={`notation-toggle-btn w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all
            ${notationView
              ? 'bg-text text-white'
              : 'bg-gray-100 text-muted hover:bg-gray-200 hover:text-text'
            }`}
          onClick={onToggleNotation}
          title={notationView ? 'Switch back to pattern' : 'Switch to notation view'}
        >
          {notationView ? (
            <svg className="notation-toggle-icon-grid" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
          ) : (
            <svg className="notation-toggle-icon-note" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="5" cy="12" rx="2.5" ry="1.8" fill="currentColor" stroke="none" />
              <path d="M7.5 12V3l5 -1.5V10" />
              <ellipse cx="10" cy="10" rx="2.5" ry="1.8" fill="currentColor" stroke="none" />
            </svg>
          )}
        </button>
      )}
      <button
        className="count-mode-btn px-2.5 py-1 rounded-lg text-xs lg:text-sm font-mono font-medium cursor-pointer transition-colors bg-gray-100 text-muted hover:bg-gray-200"
        onClick={() => setCountMode((m) => m === 'step' ? 'beat' : 'step')}
        title={countMode === 'step' ? 'Switch to beat count' : 'Switch to step count'}
      >
        {countMode === 'step' ? 'Steps' : 'Count'}
      </button>
      <button
        className="count-size-btn px-2.5 py-1 rounded-lg text-xs lg:text-sm font-mono font-medium cursor-pointer transition-colors bg-gray-100 text-muted hover:bg-gray-200"
        onClick={() => setCountSize((s) => SIZE_CYCLE[(SIZE_CYCLE.indexOf(s) + 1) % SIZE_CYCLE.length]!)}
        title={`Count size: ${countSize}`}
      >
        {SIZE_LABELS[countSize]}
      </button>
    </>
  );

  const renderSectionHeadings = (stepStart: number, stepCount: number) => (
    <div className="section-headings flex items-center gap-3 mb-0.5">
      <div className={`section-headings-spacer ${colWidth}`} />
      <div className="section-headings-cells flex items-center">
        {Array.from({ length: stepCount }, (_, localIdx) => {
          const globalIdx = stepStart + localIdx;
          const heading = headingByStep[globalIdx];
          const isBarStart = localIdx > 0 && globalIdx % stepsPerBar === 0;
          return (
            <div
              key={globalIdx}
              className={`section-heading-slot w-9 h-6 md:w-10 md:h-6 lg:w-11 lg:h-6 flex items-center justify-start
                border border-transparent rounded-md cursor-pointer select-none
                ${localIdx > 0 && globalIdx % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}
                ${heading ? '' : 'hover:bg-sky/5'}
                ${dragHeading && !heading ? 'hover:bg-sky/10' : ''}
              `}
              style={isBarStart ? BAR_LINE_STYLE : undefined}
              onClick={(e) => handleHeadingClick(globalIdx, e)}
              onDragOver={handleDragOverStep}
              onDrop={() => handleDropOnStep(globalIdx)}
            >
              {heading ? (
                <span
                  className="section-heading-label text-[10px] lg:text-xs font-display font-semibold text-sky truncate leading-tight px-0.5 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => handleDragStart(heading, e)}
                  onDragEnd={handleDragEnd}
                  title={`${heading.label} (drag to move, click to edit)`}
                >
                  {heading.label}
                </span>
              ) : (
                <span className="section-heading-placeholder text-[10px] text-transparent hover:text-muted/30 transition-colors">+</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStepNumbers = (stepStart: number, stepCount: number, showToggle: boolean) => (
    <div className="step-numbers flex items-center gap-3 mb-1">
      <div className={`grid-count-toggle ${colWidth} flex justify-end gap-1`}>
        {showToggle && renderCountToggleButtons()}
      </div>
      <div className="step-numbers-cells flex items-center">
        {Array.from({ length: stepCount }, (_, localIdx) => {
          const globalIdx = stepStart + localIdx;
          const label = countMode === 'step' ? globalIdx + 1 : divisorLabels[globalIdx];
          const isBeatStart = globalIdx % stepsPerBeat === 0;
          const isBarStart = localIdx > 0 && globalIdx % stepsPerBar === 0;
          const isSelected = selectedStep === globalIdx;
          const handleSelect = onSelectStep
            ? () => onSelectStep(selectedStep === globalIdx ? null : globalIdx)
            : undefined;
          return (
            <div
              key={globalIdx}
              className={`step-number w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 flex items-center justify-center
                rounded-md border font-mono select-none transition-colors
                ${onSelectStep ? 'cursor-pointer' : ''}
                ${localIdx > 0 && globalIdx % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}
                ${isSelected
                  ? 'bg-sky/15 border-sky text-sky font-bold'
                  : `border-transparent hover:bg-sky/5 ${currentStep === globalIdx ? 'text-sky font-bold' : ''} ${countMode === 'beat' && isBeatStart ? 'font-semibold text-text' : 'text-muted'}`
                }
              `}
              style={{ fontSize, ...(isBarStart ? BAR_LINE_STYLE : {}) }}
              onClick={handleSelect}
              title={onSelectStep ? `Step ${globalIdx + 1} — click to ${isSelected ? 'deselect' : 'select for section heading'}` : undefined}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBeatMarkers = (stepStart: number, stepCount: number) => (
    <div className="beat-markers flex items-center gap-3 mb-2">
      <div className={`beat-markers-spacer ${colWidth}`} />
      <div className="beat-markers-cells flex items-center">
        {Array.from({ length: stepCount }, (_, localIdx) => {
          const globalIdx = stepStart + localIdx;
          const isBarStart = localIdx > 0 && globalIdx % stepsPerBar === 0;
          const beatIdx = Math.floor(globalIdx / stepsPerBeat);
          const currentBeatIdx = Math.floor(currentStep / stepsPerBeat);
          return (
            <div
              key={globalIdx}
              className={`beat-marker w-9 md:w-10 lg:w-11 h-0.5 rounded-full border border-transparent
                ${localIdx > 0 && globalIdx % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}`}
              style={{
                backgroundColor: currentBeatIdx === beatIdx
                  ? 'var(--color-sky)'
                  : 'var(--color-border)',
                ...(isBarStart ? BAR_LINE_STYLE : {}),
              }}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={outerRef} className="sequencer-grid bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll relative">
      {deleteMode && (
        <div className="track-delete-banner mb-2 px-3 py-2 rounded-lg bg-coral/10 border border-coral/30 text-xs lg:text-sm text-coral flex items-center justify-between gap-2">
          <span className="track-delete-banner-text">Pick a track to delete — it will be removed from all pages.</span>
          {onToggleDeleteMode && (
            <button
              className="track-delete-banner-cancel px-2 py-0.5 rounded text-[10px] lg:text-xs font-medium bg-white/40 hover:bg-white/60 cursor-pointer"
              onClick={onToggleDeleteMode}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTrackDragEnd}>
        <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
          {systems.map((sys, systemIdx) => (
            <div
              key={systemIdx}
              className={`grid-system ${systemIdx > 0 ? 'mt-4 pt-4 border-t border-dashed border-border/60' : ''}`}
            >
              {renderSectionHeadings(sys.stepStart, sys.stepCount)}

              {systemIdx === 0 && onSelectStep && selectedStep == null && (
                <div className="step-numbers-hint flex items-center gap-5 mb-0.5">
                  <div className={`step-numbers-hint-spacer ${colWidth}`} />
                  <div className="step-numbers-hint-text text-[10px] lg:text-xs text-muted/70 italic">
                    click a count to add a Section title
                  </div>
                </div>
              )}

              {renderStepNumbers(sys.stepStart, sys.stepCount, systemIdx === 0)}
              {renderBeatMarkers(sys.stepStart, sys.stepCount)}

              {tracks.map((track, ti) => (
                <TrackRow
                  key={`${track.id}-${systemIdx}`}
                  track={track}
                  trackIndex={ti}
                  currentStep={currentStep}
                  stepsPerPage={stepsPerPage}
                  stepsPerBeat={stepsPerBeat}
                  stepsPerBar={stepsPerBar}
                  expanded={expandedTracks.has(ti)}
                  onToggleExpand={() => toggleTrackExpand(ti)}
                  colWidth={colWidth}
                  activeCell={activeCell}
                  expandedSplitCell={expandedSplitCell}
                  onExpandSplitCell={handleExpandSplitCell}
                  onToggleCell={onToggleCell}
                  onToggleSubStep={onToggleSubStep}
                  onClearSubStep={onClearSubStep}
                  onChangeProp={onChangeProp}
                  onChangeVelMode={onChangeVelMode}
                  onOpenSoundPicker={onOpenSoundPicker}
                  onDrop={onDrop}
                  sortableEnabled={systemIdx === 0 && !!onReorderTracks && !deleteMode}
                  deleteMode={deleteMode}
                  onPickForDelete={
                    systemIdx === 0 && onPickTrackForDelete
                      ? () => onPickTrackForDelete(ti)
                      : undefined
                  }
                  stepStart={sys.stepStart}
                  stepCount={sys.stepCount}
                  slimControls={systemIdx > 0}
                />
              ))}
            </div>
          ))}
        </SortableContext>
      </DndContext>


      {onAddTrack && (
        <div className="add-track mt-2">
          <button
            className={`add-track-btn ${colWidth} px-4 py-1.5 rounded-lg bg-gray-50 text-muted text-sm hover:bg-gray-100 hover:text-text transition-colors cursor-pointer border border-dashed border-border`}
            onClick={onAddTrack}
          >
            + Add Track
          </button>
        </div>
      )}

      {editingHeading && (
        <SectionHeadingEditor
          heading={editingHeading.heading}
          anchorRect={editingHeading.anchorRect}
          onSave={handleHeadingSave}
          onDelete={handleHeadingDelete}
          onClose={() => setEditingHeading(null)}
        />
      )}
    </div>
  );
}

export default memo(Grid);
