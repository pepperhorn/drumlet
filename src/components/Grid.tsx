import { memo, useState, useCallback, useRef, useSyncExternalStore, useMemo, type DragEvent, type MouseEvent, type CSSProperties } from 'react';
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
}: GridProps) {
  const [countMode, setCountMode] = useState<'step' | 'beat'>('step');
  const [countSize, setCountSize] = useState<SizeKey>('sm');
  const [expandedTracks, setExpandedTracks] = useState<Set<number>>(new Set());
  const [expandedSplitCell, setExpandedSplitCell] = useState<ExpandedSplitCell | null>(null);
  const [editingHeading, setEditingHeading] = useState<EditingHeading | null>(null);
  const [dragHeading, setDragHeading] = useState<SectionHeading | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isLg = useSyncExternalStore(subscribeToLg, getIsLg);
  const fontSize = SIZE_PX[countSize][isLg ? 1 : 0];

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) ?? NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;
  const divisorLabels = buildDivisorLabels(stepsPerPage, stepsPerBeat);

  const stepNv = NOTE_VALUES.find((n) => n.key === stepValue) ?? nv;
  const realStepsPerBeat = Math.max(1, Math.round(nv.beatsPerStep / stepNv.beatsPerStep));
  const stepsPerBar = beatsPerBar * realStepsPerBeat;

  const anyExpanded = expandedTracks.size > 0;

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

  return (
    <div className="sequencer-grid bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll relative">
      <div className="section-headings flex items-center gap-3 mb-0.5">
        <div className={`section-headings-spacer ${colWidth}`} />
        <div className="section-headings-cells flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => {
            const heading = headingByStep[i];
            const isBarStart = i > 0 && i % stepsPerBar === 0;
            return (
              <div
                key={i}
                ref={(el) => { stepRefs.current[i] = el; }}
                className={`section-heading-slot w-9 h-6 md:w-10 md:h-6 lg:w-11 lg:h-6 flex items-center justify-start
                  border border-transparent rounded-md cursor-pointer select-none
                  ${i > 0 && i % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}
                  ${heading ? '' : 'hover:bg-sky/5'}
                  ${dragHeading && !heading ? 'hover:bg-sky/10' : ''}
                `}
                style={isBarStart ? BAR_LINE_STYLE : undefined}
                onClick={(e) => handleHeadingClick(i, e)}
                onDragOver={handleDragOverStep}
                onDrop={() => handleDropOnStep(i)}
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

      {onSelectStep && selectedStep == null && (
        <div className="step-numbers-hint flex items-center gap-5 mb-0.5">
          <div className={`step-numbers-hint-spacer ${colWidth}`} />
          <div className="step-numbers-hint-text text-[10px] lg:text-xs text-muted/70 italic">
            click a count to add a Section title
          </div>
        </div>
      )}

      <div className="step-numbers flex items-center gap-3 mb-1">
        <div className={`grid-count-toggle ${colWidth} flex justify-end gap-1`}>
          {onToggleNotation && (
            <button
              className={`notation-toggle-btn w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all
                ${notationView
                  ? 'bg-text text-white'
                  : 'bg-gray-100 text-muted hover:bg-gray-200 hover:text-text'
                }`}
              onClick={onToggleNotation}
              title={notationView ? 'Switch to grid view' : 'Switch to notation view'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="6.5" x2="14" y2="6.5" />
                <line x1="2" y1="9" x2="14" y2="9" /><line x1="2" y1="11.5" x2="14" y2="11.5" />
                <line x1="2" y1="14" x2="14" y2="14" />
                <circle cx="6" cy="6.5" r="1.8" fill="currentColor" stroke="none" />
                <line x1="7.8" y1="6.5" x2="7.8" y2="2" strokeWidth="1.5" />
                <circle cx="10" cy="11.5" r="1.8" fill="currentColor" stroke="none" />
                <line x1="11.8" y1="11.5" x2="11.8" y2="7" strokeWidth="1.5" />
              </svg>
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
        </div>
        <div className="step-numbers-cells flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => {
            const label = countMode === 'step' ? i + 1 : divisorLabels[i];
            const isBeatStart = i % stepsPerBeat === 0;
            const isBarStart = i > 0 && i % stepsPerBar === 0;
            const isSelected = selectedStep === i;
            const handleSelect = onSelectStep
              ? () => onSelectStep(selectedStep === i ? null : i)
              : undefined;
            return (
              <div
                key={i}
                className={`step-number w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 flex items-center justify-center
                  rounded-md border font-mono select-none transition-colors
                  ${onSelectStep ? 'cursor-pointer' : ''}
                  ${i > 0 && i % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}
                  ${isSelected
                    ? 'bg-sky/15 border-sky text-sky font-bold'
                    : `border-transparent hover:bg-sky/5 ${currentStep === i ? 'text-sky font-bold' : ''} ${countMode === 'beat' && isBeatStart ? 'font-semibold text-text' : 'text-muted'}`
                  }
                `}
                style={{ fontSize, ...(isBarStart ? BAR_LINE_STYLE : {}) }}
                onClick={handleSelect}
                title={onSelectStep ? `Step ${i + 1} — click to ${isSelected ? 'deselect' : 'select for section heading'}` : undefined}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      <div className="beat-markers flex items-center gap-3 mb-2">
        <div className={`beat-markers-spacer ${colWidth}`} />
        <div className="beat-markers-cells flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => {
            const isBarStart = i > 0 && i % stepsPerBar === 0;
            return (
              <div
                key={i}
                className={`beat-marker w-9 md:w-10 lg:w-11 h-0.5 rounded-full border border-transparent
                  ${i > 0 && i % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}`}
                style={{
                  backgroundColor: currentStep >= Math.floor(i / stepsPerBeat) * stepsPerBeat && currentStep < (Math.floor(i / stepsPerBeat) + 1) * stepsPerBeat
                    ? 'var(--color-sky)'
                    : 'var(--color-border)',
                  ...(isBarStart ? BAR_LINE_STYLE : {}),
                }}
              />
            );
          })}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTrackDragEnd}>
        <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              trackIndex={i}
              currentStep={currentStep}
              stepsPerPage={stepsPerPage}
              stepsPerBeat={stepsPerBeat}
              stepsPerBar={stepsPerBar}
              expanded={expandedTracks.has(i)}
              onToggleExpand={() => toggleTrackExpand(i)}
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
              sortableEnabled={!!onReorderTracks}
            />
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
