import { memo, useState, useCallback, useRef, useSyncExternalStore, useMemo } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TrackRow from './TrackRow.jsx';
import SectionHeadingEditor from './SectionHeadingEditor.jsx';
import { NOTE_VALUES } from '../state/sequencerReducer.js';

const lgQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;
function subscribeToLg(cb) { lgQuery?.addEventListener('change', cb); return () => lgQuery?.removeEventListener('change', cb); }
function getIsLg() { return lgQuery?.matches ?? false; }

/** Beat subdivision labels per step within a beat */
const BEAT_LABELS = {
  1: [''],
  2: ['', '&'],
  3: ['', '&', 'a'],
  4: ['', 'e', '&', 'a'],
  6: ['', 'ta', 'ta', '&', 'ta', 'ta'],
  8: ['', 'e', '&', 'a', 'e', '&', 'a', 'e'],
};

function buildDivisorLabels(stepsPerPage, stepsPerBeat) {
  const labels = [];
  const subLabels = BEAT_LABELS[stepsPerBeat] || BEAT_LABELS[1];
  for (let i = 0; i < stepsPerPage; i++) {
    const beatNum = Math.floor(i / stepsPerBeat) + 1;
    const subIdx = i % stepsPerBeat;
    labels.push(subIdx === 0 ? String(beatNum) : subLabels[subIdx] || '');
  }
  return labels;
}

const SIZE_CYCLE = ['sm', 'md', 'lg'];
const SIZE_LABELS = { sm: 'S', md: 'M', lg: 'L' };
// [mobile, desktop] font sizes in px
const SIZE_PX = {
  sm: [9, 11],
  md: [11, 13],
  lg: [13, 15],
};

function Grid({
  tracks,
  currentStep,
  stepsPerPage,
  noteValue,
  sectionHeadings,
  splitMode,
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
}) {
  const [countMode, setCountMode] = useState('step'); // 'step' | 'beat'
  const [countSize, setCountSize] = useState('sm');
  const [expandedTracks, setExpandedTracks] = useState(new Set());
  const [expandedSplitCell, setExpandedSplitCell] = useState(null); // { trackIndex, stepIndex } | null
  const [editingHeading, setEditingHeading] = useState(null); // { step, heading?, anchorRect }
  const [dragHeading, setDragHeading] = useState(null); // heading being dragged
  const stepRefs = useRef([]); // refs for step cells in heading row
  const isLg = useSyncExternalStore(subscribeToLg, getIsLg);
  const fontSize = SIZE_PX[countSize][isLg ? 1 : 0];

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;
  const divisorLabels = buildDivisorLabels(stepsPerPage, stepsPerBeat);

  const anyExpanded = expandedTracks.size > 0;

  const toggleTrackExpand = useCallback((trackIdx) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackIdx)) next.delete(trackIdx);
      else next.add(trackIdx);
      return next;
    });
  }, []);

  const handleExpandSplitCell = useCallback((trackIndex, stepIndex) => {
    setExpandedSplitCell(prev => {
      if (prev && prev.trackIndex === trackIndex && prev.stepIndex === stepIndex) return null;
      return { trackIndex, stepIndex };
    });
  }, []);

  // Controls column width: narrow on mobile (collapsed), wide when any expanded, always wide on lg
  const colWidth = `${anyExpanded ? 'w-[180px]' : 'w-24'} lg:w-[220px] shrink-0 transition-[width] duration-200 overflow-hidden`;

  // Build heading lookup: step → heading
  const headings = useMemo(() => sectionHeadings || [], [sectionHeadings]);
  const headingByStep = useMemo(() => {
    const next = {};
    for (const h of headings) {
      if (h.step < stepsPerPage) next[h.step] = h;
    }
    return next;
  }, [headings, stepsPerPage]);
  // Section heading click handler
  const handleHeadingClick = useCallback((step, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const gridRect = e.currentTarget.closest('.sequencer-grid')?.getBoundingClientRect();
    const anchorRect = {
      left: rect.left - (gridRect?.left || 0),
      bottom: rect.bottom - (gridRect?.top || 0),
    };
    const existing = headingByStep[step];
    setEditingHeading({ step, heading: existing || null, anchorRect });
  }, [headingByStep]);

  const handleHeadingSave = useCallback((label) => {
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

  // Drag handlers for section headings
  const handleDragStart = useCallback((heading, e) => {
    setDragHeading(heading);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', heading.id);
  }, []);

  const handleDragOverStep = useCallback((e) => {
    if (dragHeading) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }, [dragHeading]);

  const handleDropOnStep = useCallback((step) => {
    if (dragHeading) {
      onMoveSectionHeading(dragHeading.id, step);
      setDragHeading(null);
    }
  }, [dragHeading, onMoveSectionHeading]);

  const handleDragEnd = useCallback(() => {
    setDragHeading(null);
  }, []);

  // Track reordering (dnd-kit)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const trackIds = useMemo(() => tracks.map(t => t.id), [tracks]);
  const handleTrackDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderTracks) return;
    const fromIndex = trackIds.indexOf(active.id);
    const toIndex = trackIds.indexOf(over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorderTracks(fromIndex, toIndex);
  }, [trackIds, onReorderTracks]);

  return (
    <div className="sequencer-grid bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll relative">
      {/* Section headings row — above step numbers */}
      <div className="section-headings flex items-center gap-3 mb-0.5">
        <div className={`section-headings-spacer ${colWidth}`} />
        <div className="section-headings-cells flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => {
            const heading = headingByStep[i];
            return (
              <div
                key={i}
                ref={el => stepRefs.current[i] = el}
                className={`section-heading-slot w-9 h-6 md:w-10 md:h-6 lg:w-11 lg:h-6 flex items-center justify-start
                  border border-transparent rounded-md cursor-pointer select-none
                  ${i > 0 && i % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}
                  ${heading ? '' : 'hover:bg-sky/5'}
                  ${dragHeading && !heading ? 'hover:bg-sky/10' : ''}
                `}
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

      {/* Step numbers header */}
      <div className="step-numbers flex items-center gap-3 mb-1">
        {/* Spacer for track controls + count mode toggle */}
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
            onClick={() => setCountMode(m => m === 'step' ? 'beat' : 'step')}
            title={countMode === 'step' ? 'Switch to beat count' : 'Switch to step count'}
          >
            {countMode === 'step' ? 'Steps' : 'Count'}
          </button>
          <button
            className="count-size-btn px-2.5 py-1 rounded-lg text-xs lg:text-sm font-mono font-medium cursor-pointer transition-colors bg-gray-100 text-muted hover:bg-gray-200"
            onClick={() => setCountSize(s => SIZE_CYCLE[(SIZE_CYCLE.indexOf(s) + 1) % SIZE_CYCLE.length])}
            title={`Count size: ${countSize}`}
          >
            {SIZE_LABELS[countSize]}
          </button>
        </div>
        <div className="step-numbers-cells flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => {
            const label = countMode === 'step' ? i + 1 : divisorLabels[i];
            const isBeatStart = i % stepsPerBeat === 0;
            return (
              <div
                key={i}
                className={`step-number w-9 h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 flex items-center justify-center
                  rounded-md border border-transparent font-mono select-none
                  ${i > 0 && i % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}
                  ${currentStep === i ? 'text-sky font-bold' : ''}
                  ${countMode === 'beat' && isBeatStart ? 'font-semibold text-text' : 'text-muted'}
                `}
                style={{ fontSize }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Beat group markers */}
      <div className="beat-markers flex items-center gap-3 mb-2">
        <div className={`beat-markers-spacer ${colWidth}`} />
        <div className="beat-markers-cells flex items-center">
          {Array.from({ length: stepsPerPage }, (_, i) => (
            <div
              key={i}
              className={`beat-marker w-9 md:w-10 lg:w-11 h-0.5 rounded-full border border-transparent
                ${i > 0 && i % stepsPerBeat === 0 ? 'ml-1.5' : 'ml-0.5'}`}
              style={{
                backgroundColor: currentStep >= Math.floor(i / stepsPerBeat) * stepsPerBeat && currentStep < (Math.floor(i / stepsPerBeat) + 1) * stepsPerBeat
                  ? 'var(--color-sky)'
                  : 'var(--color-border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Track rows */}
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
              expanded={expandedTracks.has(i)}
              onToggleExpand={() => toggleTrackExpand(i)}
              colWidth={colWidth}
              splitMode={splitMode}
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

      {/* Add track button */}
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

      {/* Section heading editor overlay */}
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
