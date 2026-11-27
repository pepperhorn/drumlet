import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import type { Page, NoteValueKey, SectionHeading } from '../state/sequencerReducer.js';
import { fitStaffToWidth, renderDrumStaff, type RenderDrumStaffOptions, type RenderDrumStaffResult, type StepPosition, type MergedTrack } from '../notation/renderStaff.js';
import { downloadSVG, downloadPNG } from '../notation/notationExport.js';
import { effectiveStep } from '../util/stepHelpers.js';
import { v4 as uuid } from 'uuid';
import { NotationLoading, NotationPending } from './NotationLoading.js';
import { restartPendingPetaluma } from './notationPrefetch.js';
import { useMeasuredAutoFollow } from './useAutoFollow.js';

type SizeKey = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CYCLE: SizeKey[] = ['sm', 'md', 'lg', 'xl', '2xl'];
const SIZE_LABELS: Record<SizeKey, string> = { sm: 'S', md: 'M', lg: 'L', xl: 'XL', '2xl': '2X' };
const SIZE_FONT: Record<SizeKey, number> = { sm: 9, md: 11, lg: 14, xl: 18, '2xl': 24 };
const SCORE_SCALE: Record<SizeKey, number> = { sm: 36, md: 41, lg: 45, xl: 52, '2xl': 62 };

const BARS_PER_LINE_OPTIONS = [null, 2, 3, 4, 0]; // null = Auto, 0 = single scrolling line.

interface SubdivisionDef {
  key: string;
  label: string;
  perBeat: number;
}

const SUBDIVISIONS: SubdivisionDef[] = [
  { key: '1/4',  label: '1/4',  perBeat: 1 },
  { key: '1/8',  label: '1/8',  perBeat: 2 },
  { key: '1/8T', label: '1/8T', perBeat: 3 },
  { key: '1/16', label: '1/16', perBeat: 4 },
  { key: '1/16T', label: '1/16T', perBeat: 6 },
];

const BEAT_LABELS: Record<string, (b: number) => string[]> = {
  '1/4':  (b) => [`${b}`],
  '1/8':  (b) => [`${b}`, '&'],
  '1/8T': (b) => [`${b}`, '&', 'a'],
  '1/16': (b) => [`${b}`, 'e', '&', 'a'],
  '1/16T': (b) => [`${b}`, 'ta', 'ta', '&', 'ta', 'ta'],
};

function interpolateX(positions: StepPosition[], stepFloat: number): number {
  if (positions.length === 0) return 0;
  if (stepFloat <= 0) return positions[0]?.x ?? 0;
  if (stepFloat >= positions.length - 1) return positions[positions.length - 1]?.x ?? 0;
  const lo = Math.floor(stepFloat);
  const hi = Math.ceil(stepFloat);
  if (lo === hi) return positions[lo]?.x ?? 0;
  const frac = stepFloat - lo;
  return (positions[lo]?.x ?? 0) * (1 - frac) + (positions[hi]?.x ?? 0) * frac;
}

interface MergedResult {
  mergedTracks: MergedTrack[];
  totalSteps: number;
  sectionHeadings: (SectionHeading & { pageStart?: boolean })[];
}

function mergePages(pages: Page[] | undefined, stepsPerPage: number, endless: boolean): MergedResult {
  if (!pages || pages.length === 0) return { mergedTracks: [], totalSteps: 0, sectionHeadings: [] };

  const firstPage = pages[0]!;
  const mergedTracks: MergedTrack[] = firstPage.tracks.map((track, trackIdx) => {
    const allSteps: (number | number[])[] = [];
    for (const page of pages) {
      const t = page.tracks[trackIdx];
      if (endless) {
        for (let step = 0; step < stepsPerPage; step++) allSteps.push(effectiveStep(t?.steps[step] ?? 0));
      } else if (t) {
        allSteps.push(...t.steps.slice(0, stepsPerPage).map((s) => effectiveStep(s)));
      }
    }
    return { ...track, steps: allSteps };
  });

  const sectionHeadings = pages.flatMap((page, pageIdx) => {
    const start = pageIdx * stepsPerPage;
    const headings = (page.sectionHeadings ?? [])
      .filter(heading => !endless || heading.step !== 0)
      .map(heading => ({ ...heading, step: start + heading.step }));
    if (!endless) return headings;
    const label = page.sectionHeadings?.find(heading => heading.step === 0)?.label || page.name;
    return [{ id: page.id, step: start, label, pageStart: true }, ...headings];
  });

  return { mergedTracks, totalSteps: pages.length * stepsPerPage, sectionHeadings };
}

interface Part {
  id: string;
  name: string;
  trackIds: Set<string>;
}

function makePart(name: string, trackIds: string[]): Part {
  return { id: uuid(), name, trackIds: new Set(trackIds) };
}

interface NotationViewProps {
  pages: Page[];
  stepsPerPage: number;
  currentStep: number;
  currentPageIndex: number;
  layout?: RenderDrumStaffOptions['layout'];
  currentGlobalStep?: number;
  noteValue: NoteValueKey;
  beatsPerBar?: number;
  stepValue: NoteValueKey;
  startedAt?: number;
  onClose?: () => void;
}

interface CountLabel {
  text: string;
  x: number;
  y: number;
  line: number;
  isBeatNum: boolean;
}

const NotationCounts = memo(function NotationCounts({
  layout, subdivision, totalBeats, stepsPerBeat, fontSize,
}: {
  layout: RenderDrumStaffResult;
  subdivision: string;
  totalBeats: number;
  stepsPerBeat: number;
  fontSize: number;
}) {
  const lineHeight = layout.lineHeight;
  const { stepPositions } = layout;
  const labelFn = BEAT_LABELS[subdivision];
  if (!labelFn || stepPositions.length === 0) return null;

  const countLabels: CountLabel[] = [];
  for (let beat = 0; beat < totalBeats; beat++) {
    const labels = labelFn(beat + 1);
    const beatStartStep = beat * stepsPerBeat;
    for (let j = 0; j < labels.length; j++) {
      const stepFloat = beatStartStep + (j / labels.length) * stepsPerBeat;
      const pos = stepPositions[Math.min(Math.floor(stepFloat), stepPositions.length - 1)]!;
      const x = interpolateX(stepPositions, stepFloat) + fontSize * 0.4;
      countLabels.push({ text: labels[j]!, x, y: pos.y, line: pos.line, isBeatNum: j === 0 });
    }
  }

  if (countLabels.length === 0) return null;

  return (
    <div
      className="notation-count-labels"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: layout.svgWidth,
        height: layout.svgHeight,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: layout.numLines }, (_, lineIdx) => {
        const lineLabels = countLabels.filter((cl) => cl.line === lineIdx);
        if (lineLabels.length === 0) return null;
        const topOffset = lineLabels[0]!.y + lineHeight * 0.8 + 8;
        return (
          <svg
            className="notation-count-line"
            key={lineIdx}
            style={{
              position: 'absolute',
              top: topOffset,
              left: 0,
              width: layout.svgWidth,
              height: fontSize + 10,
            }}
            viewBox={`0 0 ${layout.svgWidth} ${fontSize + 10}`}
          >
            {lineLabels.map((cl, i) => (
              <text
                className="notation-count-label"
                key={i}
                x={cl.x}
                y={fontSize + 2}
                textAnchor="middle"
                fontSize={fontSize}
                fontFamily="var(--font-mono)"
                fontWeight={cl.isBeatNum ? 600 : 400}
                fill="var(--color-muted)"
                fillOpacity={cl.isBeatNum ? 1 : 0.5}
              >
                {cl.text}
              </text>
            ))}
          </svg>
        );
      })}
    </div>
  );
});

function NotationView({
  pages, stepsPerPage, currentStep, currentPageIndex, layout: viewLayout = 'wrapped', currentGlobalStep,
  noteValue, beatsPerBar = 4, stepValue, startedAt, onClose,
}: NotationViewProps) {
  const endless = viewLayout === 'endless';
  const [endlessScroll, setEndlessScroll] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState<{
    options: RenderDrumStaffOptions;
    attempt: number;
    result?: RenderDrumStaffResult;
    error?: string;
  }>();
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    restartPendingPetaluma();
    setAttempt((n) => n + 1);
  };
  const [useColor, setUseColor] = useState(true);
  const [countSize, setCountSize] = useState<SizeKey>('lg');
  const [subdivIdx, setSubdivIdx] = useState(0);
  const [barsPerLine, setBarsPerLine] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const [scoreWidth, setScoreWidth] = useState(0);

  useEffect(() => {
    const score = scoreRef.current;
    if (endless || !score) return;
    let timer: number | undefined;
    let first = true;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry!.contentRect.width);
      window.clearTimeout(timer);
      if (first) setScoreWidth(width);
      else timer = window.setTimeout(() => setScoreWidth(width), 120);
      first = false;
    });
    observer.observe(score);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [endless]);

  const allTrackIds = useMemo(
    () => (pages?.[0]?.tracks ?? []).map((t) => t.id),
    [pages],
  );
  const [parts, setParts] = useState<Part[]>(() => [makePart('Part 1', allTrackIds)]);
  const [activePartIdx, setActivePartIdx] = useState(0);

  const displayParts = useMemo<Part[]>(() => {
    if (parts.length !== 1 || parts[0]!.name !== 'Part 1') return parts;

    const current = parts[0]!.trackIds;
    const shouldSync = allTrackIds.every((id) => current.has(id)) || current.size === 0;
    if (!shouldSync) return parts;

    return [{ ...parts[0]!, trackIds: new Set(allTrackIds) }];
  }, [allTrackIds, parts]);

  const activePart = displayParts[Math.min(activePartIdx, displayParts.length - 1)]!;

  const handleAddPart = useCallback(() => {
    setParts((prev) => [...prev, makePart(`Part ${prev.length + 1}`, [])]);
    setActivePartIdx((prev) => prev + 1);
  }, []);

  const handleRemovePart = useCallback((idx: number) => {
    setParts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
    setActivePartIdx((prev) => Math.min(prev, parts.length - 2));
  }, [parts.length]);

  const handleToggleTrack = useCallback((partIdx: number, trackId: string) => {
    setParts((prev) => prev.map((p, i) => {
      if (i !== partIdx) return p;
      const next = new Set(p.trackIds);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return { ...p, trackIds: next };
    }));
  }, []);

  const beatNv = NOTE_VALUES.find((n) => n.key === noteValue) ?? NOTE_VALUES[3];
  const stepNv = NOTE_VALUES.find((n) => n.key === (stepValue || noteValue)) ?? beatNv;
  const stepsPerBeat = Math.round(beatNv.beatsPerStep / stepNv.beatsPerStep) || 1;

  const { mergedTracks: allMergedTracks, totalSteps, sectionHeadings } = useMemo(() => mergePages(pages, stepsPerPage, endless), [pages, stepsPerPage, endless]);

  const mergedTracks = useMemo(() => allMergedTracks.filter((t) => activePart.trackIds.has(t.id)), [allMergedTracks, activePart]);
  const partTrackCount = mergedTracks.length;
  const numStaffLines = partTrackCount <= 1 ? 1 : partTrackCount === 2 ? 2 : 5;

  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const totalBars = Math.ceil(totalSteps / stepsPerBar);
  const totalBeats = Math.ceil(totalSteps / stepsPerBeat);
  const fit = fitStaffToWidth(scoreWidth, stepsPerBar, SCORE_SCALE[countSize]);
  const effectiveBarsPerLine = endless ? 0 : barsPerLine === 0 ? totalBars : barsPerLine ?? fit.bars;
  const scale = !endless && barsPerLine === null ? fit.scale : SCORE_SCALE[countSize];

  const availableSubdivs = SUBDIVISIONS.filter((s) => s.perBeat <= stepsPerBeat);
  const subdivisionCount = availableSubdivs.length;
  const safeIdx = Math.min(subdivIdx, subdivisionCount - 1);
  const subdiv = availableSubdivs[safeIdx] ?? SUBDIVISIONS[0]!;

  const options = useMemo<RenderDrumStaffOptions>(() => ({
    layout: viewLayout, mergedTracks, totalSteps, noteValueKey: stepValue, beatNoteValue: noteValue,
    stepsPerBeat, beatsPerBar, barsPerLine: effectiveBarsPerLine, useColor, numStaffLines, scale, sectionHeadings,
  }), [viewLayout, mergedTracks, totalSteps, stepValue, noteValue, stepsPerBeat, beatsPerBar, effectiveBarsPerLine, useColor, numStaffLines, scale, sectionHeadings]);

  const hasScore = mergedTracks.length > 0 && totalSteps > 0;
  const canRender = hasScore && (endless || barsPerLine !== null || scoreWidth > 0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!canRender) {
      el.replaceChildren();
      return;
    }

    const controller = new AbortController();
    renderDrumStaff(el, options, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setRendered({ options, attempt, result });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        el.replaceChildren();
        setRendered({
          options, attempt,
          error: error instanceof Error ? error.message : 'Could not render the score.',
        });
      });

    return () => controller.abort();
  }, [options, attempt, canRender]);

  const current = rendered?.options === options && rendered.attempt === attempt ? rendered : undefined;
  const layout = hasScore ? current?.result : undefined;

  const pageStep = currentStep < 0 ? -1 : currentPageIndex * stepsPerPage + currentStep;
  const globalStep = endless ? currentGlobalStep ?? pageStep : pageStep;
  const playhead = layout?.stepPositions[globalStep];
  const getFollowTarget = useCallback(() => {
    const pos = layout?.stepPositions[globalStep];
    return pos ? { x: pos.x } : null;
  }, [layout, globalStep]);
  const { resume, isTap } = useMeasuredAutoFollow(endlessScroll, endless && globalStep >= 0, getFollowTarget);

  useEffect(() => {
    if (endless || barsPerLine !== 0 || !playhead || !scrollRef.current) return;
    const el = scrollRef.current;
    const barWidthPx = stepsPerBar * (layout?.stepWidth ?? 28);
    const contextPx = barWidthPx * 2.5;
    const targetScroll = playhead.x - contextPx;
    if (targetScroll > el.scrollLeft) {
      el.scrollLeft = targetScroll;
    } else if (el.scrollLeft - targetScroll > barWidthPx * 2) {
      el.scrollLeft = Math.max(0, targetScroll);
    }
  });

  const handleDownloadSVG = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (svg) downloadSVG(svg);
  }, []);

  const handleDownloadPNG = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (svg) downloadPNG(svg);
  }, []);

  const playheadWidth = layout?.stepWidth ?? 28;
  const lineHeight = layout?.lineHeight ?? 100;

  const allTracks = pages[0]?.tracks;
  const playheadStyle = playhead ? {
    position: 'absolute' as const,
    left: endless ? 0 : playhead.x - playheadWidth / 2,
    transform: endless ? `translateX(${playhead.x - playheadWidth / 2}px)` : undefined,
    top: playhead.y + 8 - lineHeight * 0.2,
    width: playheadWidth,
    height: lineHeight,
    background: 'color-mix(in srgb, var(--color-sky) 15%, transparent)',
    borderRadius: 4,
    zIndex: 10,
  } : undefined;

  const score = (
    <div ref={scoreRef} className="notation-score-wrap" style={{ position: 'relative', display: 'block', minHeight: 160, paddingTop: 8, paddingBottom: 12 }}>
      <div ref={containerRef} className="verovio-container" />
      {hasScore && !layout && (current?.error
        ? <NotationLoading phase="error" message={current.error} onRetry={retry} />
        : <NotationPending key={attempt} phase="render" startedAt={attempt === 0 && !rendered ? startedAt : undefined} onRetry={retry} />)}
      {!hasScore && <p className="notation-empty text-sm text-text py-4">Select a track to show notation.</p>}
      {playhead && (endless ? (
        <button
          type="button"
          className="notation-playhead notation-playhead-resume cursor-pointer"
          style={playheadStyle}
          aria-label="Resume notation auto-follow"
          onClick={event => { if (isTap(event.detail)) resume(); }}
        />
      ) : (
        <div className="notation-playhead" style={{ ...playheadStyle, pointerEvents: 'none' }} />
      ))}

      {layout && <NotationCounts layout={layout} subdivision={subdiv.key} totalBeats={totalBeats} stepsPerBeat={stepsPerBeat} fontSize={SIZE_FONT[countSize]} />}
    </div>
  );

  const controls = useMemo(() => (
    <>
      <div className="notation-parts flex items-center gap-1.5 mb-2 flex-wrap">
        {displayParts.map((part, idx) => (
          <button
            key={part.id}
            className={`notation-part-tab px-3 py-1 rounded-lg text-xs font-display font-semibold cursor-pointer transition-all
              ${idx === activePartIdx
                ? 'bg-sky text-white shadow-sm'
                : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-text'
              }`}
            onClick={() => setActivePartIdx(idx)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (displayParts.length > 1) handleRemovePart(idx);
            }}
            title={displayParts.length > 1 ? `${part.name} (right-click to remove)` : part.name}
          >
            {part.name}
          </button>
        ))}
        <button
          className="notation-add-part w-7 h-7 rounded-lg bg-gray-50 text-muted hover:bg-gray-100 hover:text-text text-sm cursor-pointer transition-colors flex items-center justify-center"
          onClick={handleAddPart}
          title="Add part"
        >
          +
        </button>

        <div className="notation-part-tracks flex flex-wrap min-w-0 items-center gap-2 ml-3 pl-3 border-l border-border">
          {allTracks?.map((track) => (
            <label
              key={track.id}
              className="notation-track-check flex items-center gap-1 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={activePart.trackIds.has(track.id)}
                onChange={() => handleToggleTrack(activePartIdx, track.id)}
                className="notation-track-checkbox accent-sky w-3.5 h-3.5 cursor-pointer"
              />
              <span
                className="notation-track-name text-xs font-medium truncate max-w-[80px]"
                style={{ color: track.color }}
              >
                {track.name}
              </span>
            </label>
          ))}
          <span className="notation-staff-lines text-[10px] text-muted font-mono ml-1">
            {numStaffLines === 1 ? '1-line' : numStaffLines === 2 ? '2-line' : '5-line'}
          </span>
        </div>
      </div>

      <div className="notation-toolbar flex items-center gap-1.5 mb-2 flex-wrap">
        {onClose && (
          <button
            className="notation-back-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 hover:text-text text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
            onClick={onClose}
            title="Back to grid view"
          >
            <svg className="notation-back-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line className="notation-back-shaft" x1="13" y1="8" x2="3" y2="8" />
              <polyline className="notation-back-arrow" points="7 4 3 8 7 12" />
            </svg>
            Grid
          </button>
        )}
        <button
          className={`notation-color-btn px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors
            ${useColor
              ? 'bg-sky/12 text-sky'
              : 'bg-gray-100 text-muted hover:bg-gray-200'
            }`}
          onClick={() => setUseColor((c) => !c)}
          title={useColor ? 'Turn off note colors' : 'Turn on note colors'}
        >
          Color {useColor ? 'On' : 'Off'}
        </button>

        <button
          className="notation-count-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 text-xs font-mono font-semibold cursor-pointer transition-colors"
          onClick={() => setCountSize((prev) => SIZE_CYCLE[(SIZE_CYCLE.indexOf(prev) + 1) % SIZE_CYCLE.length]!)}
          title={`Notation size: ${countSize}`}
        >
          Size: {SIZE_LABELS[countSize]}
        </button>

        {subdivisionCount > 1 && (
          <button
            className="notation-subdiv-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 text-xs font-mono font-semibold cursor-pointer transition-colors"
            onClick={() => setSubdivIdx((prev) => (prev + 1) % subdivisionCount)}
            title={`Count subdivision: ${subdiv.label}`}
          >
            Count: {subdiv.label}
          </button>
        )}

        {!endless && (
          <div className="notation-bpl flex items-center gap-0.5">
            <span className="notation-bpl-label text-sm md:text-xs text-muted font-semibold mr-0.5">Bars/line</span>
            {BARS_PER_LINE_OPTIONS.map((n) => (
              <button
                key={n}
                className={`notation-bpl-btn px-1.5 py-0.5 rounded text-sm md:text-xs font-mono cursor-pointer transition-colors
                  ${barsPerLine === n ? 'bg-sky/10 text-sky font-bold' : 'text-muted hover:text-text'}`}
                aria-pressed={barsPerLine === n}
                onClick={() => setBarsPerLine(n)}
              >
                {n === null ? 'Auto' : n === 0 ? '∞' : n}
              </button>
            ))}
          </div>
        )}

        <div className="notation-export-btns flex items-center gap-1.5 ml-auto">
          <button
            className="notation-svg-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 text-xs font-semibold cursor-pointer transition-colors"
            onClick={handleDownloadSVG}
            title="Download notation as SVG"
          >
            SVG
          </button>
          <button
            className="notation-png-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 text-xs font-semibold cursor-pointer transition-colors"
            onClick={handleDownloadPNG}
            title="Download notation as PNG"
          >
            PNG
          </button>
        </div>
      </div>
    </>
  ), [
    activePart, activePartIdx, allTracks, subdivisionCount, barsPerLine, countSize, displayParts, endless,
    handleAddPart, handleDownloadPNG, handleDownloadSVG, handleRemovePart, handleToggleTrack,
    numStaffLines, onClose, subdiv.label, useColor,
  ]);

  return (
    <div ref={scrollRef} className="notation-view bg-card rounded-2xl shadow-sm border border-border px-6 py-4 lg:px-8 lg:py-5 overflow-x-auto grid-scroll">
      {controls}

      {endless ? (
        <div ref={setEndlessScroll} className="notation-endless-scroll grid-scroll overflow-x-auto" tabIndex={0} aria-label="Endless drum notation">
          {score}
        </div>
      ) : score}
    </div>
  );
}

export default memo(NotationView);
