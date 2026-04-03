import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import { renderDrumStaff } from '../notation/renderStaff.js';
import { downloadSVG, downloadPNG } from '../notation/notationExport.js';
import { v4 as uuid } from 'uuid';

const SIZE_CYCLE = ['sm', 'md', 'lg', 'xl', '2xl'];
const SIZE_LABELS = { sm: 'S', md: 'M', lg: 'L', xl: 'XL', '2xl': '2X' };
const SIZE_FONT = { sm: 9, md: 11, lg: 14, xl: 18, '2xl': 24 };

const BARS_PER_LINE_OPTIONS = [0, 2, 3, 4]; // 0 = ∞ (single scrolling line)

/** Subdivision options — perBeat is how many labels per beat */
const SUBDIVISIONS = [
  { key: '1/4',  label: '1/4',  perBeat: 1 },
  { key: '1/8',  label: '1/8',  perBeat: 2 },
  { key: '1/8T', label: '1/8T', perBeat: 3 },
  { key: '1/16', label: '1/16', perBeat: 4 },
  { key: '1/16T', label: '1/16T', perBeat: 6 },
];

const BEAT_LABELS = {
  '1/4':  (b) => [`${b}`],
  '1/8':  (b) => [`${b}`, '&'],
  '1/8T': (b) => [`${b}`, '&', 'a'],
  '1/16': (b) => [`${b}`, 'e', '&', 'a'],
  '1/16T': (b) => [`${b}`, 'ta', 'ta', '&', 'ta', 'ta'],
};

function interpolateX(positions, stepFloat) {
  if (positions.length === 0) return 0;
  if (stepFloat <= 0) return positions[0]?.x || 0;
  if (stepFloat >= positions.length - 1) return positions[positions.length - 1]?.x || 0;
  const lo = Math.floor(stepFloat);
  const hi = Math.ceil(stepFloat);
  if (lo === hi) return positions[lo]?.x || 0;
  const frac = stepFloat - lo;
  return (positions[lo]?.x || 0) * (1 - frac) + (positions[hi]?.x || 0) * frac;
}

/**
 * Merge all pages' tracks into flat step arrays.
 * Returns tracks with concatenated steps + totalSteps.
 */
function mergePages(pages, stepsPerPage) {
  if (!pages || pages.length === 0) return { mergedTracks: [], totalSteps: 0 };

  const firstPage = pages[0];
  const mergedTracks = firstPage.tracks.map((track, trackIdx) => {
    const allSteps = [];
    for (const page of pages) {
      const t = page.tracks[trackIdx];
      if (t) {
        // Use only visible steps (stepsPerPage), not the full array
        allSteps.push(...t.steps.slice(0, stepsPerPage));
      }
    }
    return { ...track, steps: allSteps };
  });

  return { mergedTracks, totalSteps: pages.length * stepsPerPage };
}

function makePart(name, trackIds) {
  return { id: uuid(), name, trackIds: new Set(trackIds) };
}

function NotationView({ pages, stepsPerPage, currentStep, currentPageIndex, noteValue, beatsPerBar = 4, stepValue }) {
  const containerRef = useRef(null);
  const prevDataRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const [layoutInfo, setLayoutInfo] = useState(null);
  const [useColor, setUseColor] = useState(true);
  const [countSize, setCountSize] = useState('lg');
  const [subdivIdx, setSubdivIdx] = useState(0);
  const [barsPerLine, setBarsPerLine] = useState(0); // 0 = ∞
  const scrollRef = useRef(null);

  // Parts state
  const allTrackIds = useMemo(
    () => (pages?.[0]?.tracks || []).map(t => t.id),
    [pages],
  );
  const [parts, setParts] = useState(() => [makePart('Part 1', allTrackIds)]);
  const [activePartIdx, setActivePartIdx] = useState(0);

  const displayParts = useMemo(() => {
    if (parts.length !== 1 || parts[0].name !== 'Part 1') return parts;

    const current = parts[0].trackIds;
    const shouldSync = allTrackIds.every(id => current.has(id)) || current.size === 0;
    if (!shouldSync) return parts;

    return [{ ...parts[0], trackIds: new Set(allTrackIds) }];
  }, [allTrackIds, parts]);

  const activePart = displayParts[Math.min(activePartIdx, displayParts.length - 1)];

  const handleAddPart = useCallback(() => {
    setParts(prev => [...prev, makePart(`Part ${prev.length + 1}`, [])]);
    setActivePartIdx(prev => prev + 1);
  }, []);

  const handleRemovePart = useCallback((idx) => {
    setParts(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      return next;
    });
    setActivePartIdx(prev => Math.min(prev, parts.length - 2));
  }, [parts.length]);

  const handleToggleTrack = useCallback((partIdx, trackId) => {
    setParts(prev => prev.map((p, i) => {
      if (i !== partIdx) return p;
      const next = new Set(p.trackIds);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return { ...p, trackIds: next };
    }));
  }, []);

  const beatNv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepNv = NOTE_VALUES.find((n) => n.key === (stepValue || noteValue)) || beatNv;
  const stepsPerBeat = Math.round(beatNv.beatsPerStep / stepNv.beatsPerStep) || 1;

  const { mergedTracks: allMergedTracks, totalSteps } = mergePages(pages, stepsPerPage);

  // Filter tracks by active part selection
  const mergedTracks = allMergedTracks.filter(t => activePart.trackIds.has(t.id));
  const partTrackCount = mergedTracks.length;
  const numStaffLines = partTrackCount <= 1 ? 1 : partTrackCount === 2 ? 2 : 5;

  const stepsPerBar = beatsPerBar * stepsPerBeat;
  const totalBars = Math.ceil(totalSteps / stepsPerBar);
  const totalBeats = Math.ceil(totalSteps / stepsPerBeat);
  const effectiveBarsPerLine = barsPerLine === 0 ? totalBars : barsPerLine;

  // Filter subdivisions to current resolution
  const availableSubdivs = SUBDIVISIONS.filter(s => s.perBeat <= stepsPerBeat);
  const safeIdx = Math.min(subdivIdx, availableSubdivs.length - 1);
  const subdiv = availableSubdivs[safeIdx] || SUBDIVISIONS[0];

  // Fingerprint — includes all pages
  const stepsFingerprint = mergedTracks.map(t => t.steps.join(',')).join('|');
  const tracksFingerprint = mergedTracks.map(t => `${t.id}:${t.color}:${t.group}:${t.kitSample}:${t.velMode}`).join('|');
  const dataKey = `${stepsFingerprint}|${tracksFingerprint}|${totalSteps}|${noteValue}|${stepValue}|${beatsPerBar}|${effectiveBarsPerLine}|${useColor}|${numStaffLines}`;

  useEffect(() => {
    if (prevDataRef.current === dataKey) return;
    prevDataRef.current = dataKey;

    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    if (mergedTracks.length === 0 || totalSteps === 0) return;

    try {
      const result = renderDrumStaff(el, {
        mergedTracks,
        totalSteps,
        noteValueKey: stepValue || noteValue || '1/4',
        beatNoteValue: noteValue || '1/4',
        stepsPerBeat,
        beatsPerBar,
        barsPerLine: effectiveBarsPerLine,
        useColor,
        numStaffLines,
      });
      setLayout(result);
      setLayoutInfo({
        stepPositions: result.stepPositions,
        svgWidth: result.svgWidth,
        svgHeight: result.svgHeight,
      });
    } catch (err) {
      setLayout(null);
      setLayoutInfo(null);
      console.error('VexFlow render error:', err);
      el.textContent = 'Notation rendering error';
    }
  }, [dataKey, mergedTracks, totalSteps, noteValue, stepValue, stepsPerBeat, beatsPerBar, effectiveBarsPerLine, useColor, numStaffLines]);

  // Playhead: compute global step from currentPageIndex + currentStep
  const globalStep = (currentPageIndex || 0) * stepsPerPage + (currentStep >= 0 ? currentStep : -1);
  let playhead = null;
  if (layout && globalStep >= 0 && globalStep < layout.stepPositions.length) {
    const pos = layout.stepPositions[globalStep];
    playhead = { x: pos.x, y: pos.y, line: pos.line };
  }

  // Auto-scroll in ∞ mode to keep playhead visible with 2.5 bars of context
  useEffect(() => {
    if (barsPerLine !== 0 || !playhead || !scrollRef.current) return;
    const el = scrollRef.current;
    const barWidthPx = stepsPerBar * (layout?.stepWidth || 28);
    const contextPx = barWidthPx * 2.5;
    const targetScroll = playhead.x - contextPx;
    // Smooth scroll only if moving forward; snap if jumping back (loop restart)
    if (targetScroll > el.scrollLeft) {
      el.scrollLeft = targetScroll;
    } else if (el.scrollLeft - targetScroll > barWidthPx * 2) {
      el.scrollLeft = Math.max(0, targetScroll);
    }
  });

  // Build count labels per line
  const countLabels = [];
  const fontSize = SIZE_FONT[countSize];
  if (layoutInfo && layoutInfo.stepPositions.length > 0) {
    const labelFn = BEAT_LABELS[subdiv.key];
    for (let beat = 0; beat < totalBeats; beat++) {
      const labels = labelFn(beat + 1);
      const beatStartStep = beat * stepsPerBeat;
      for (let j = 0; j < labels.length; j++) {
        const stepFloat = beatStartStep + (j / labels.length) * stepsPerBeat;
        const stepIdx = Math.min(Math.floor(stepFloat), layoutInfo.stepPositions.length - 1);
        if (stepIdx < 0) continue;
        const pos = layoutInfo.stepPositions[stepIdx];
        const x = interpolateX(layoutInfo.stepPositions, stepFloat) + fontSize * 0.4;
        countLabels.push({ text: labels[j], x, y: pos.y, line: pos.line, isBeatNum: j === 0 });
      }
    }
  }

  const handleDownloadSVG = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (svg) downloadSVG(svg);
  }, []);

  const handleDownloadPNG = useCallback(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (svg) downloadPNG(svg);
  }, []);

  const playheadWidth = layout?.stepWidth || 28;
  const lineHeight = layout?.lineHeight || 100;
  const lineGap = layout?.lineGap || 10;

  // All tracks from first page (for checkbox display)
  const allTracks = pages?.[0]?.tracks || [];

  return (
    <div ref={scrollRef} className="notation-view bg-card rounded-2xl shadow-sm border border-border px-4 py-2 overflow-x-auto grid-scroll">
      {/* Parts tab bar */}
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

        {/* Track checkboxes for active part */}
        <div className="notation-part-tracks flex items-center gap-2 ml-3 pl-3 border-l border-border">
          {allTracks.map((track) => (
            <label
              key={track.id}
              className="notation-track-check flex items-center gap-1 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={activePart.trackIds.has(track.id)}
                onChange={() => handleToggleTrack(activePartIdx, track.id)}
                className="accent-sky w-3.5 h-3.5 cursor-pointer"
              />
              <span
                className="text-xs font-medium truncate max-w-[80px]"
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

      {/* Toolbar */}
      <div className="notation-toolbar flex items-center gap-1.5 mb-2 flex-wrap">
        <button
          className={`notation-color-btn px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors
            ${useColor
              ? 'bg-sky/12 text-sky'
              : 'bg-gray-100 text-muted hover:bg-gray-200'
            }`}
          onClick={() => setUseColor(c => !c)}
          title={useColor ? 'Turn off note colors' : 'Turn on note colors'}
        >
          Color {useColor ? 'On' : 'Off'}
        </button>

        <button
          className="notation-count-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 text-xs font-mono font-semibold cursor-pointer transition-colors"
          onClick={() => setCountSize(prev => SIZE_CYCLE[(SIZE_CYCLE.indexOf(prev) + 1) % SIZE_CYCLE.length])}
          title={`Beat count size: ${countSize}`}
        >
          Size: {SIZE_LABELS[countSize]}
        </button>

        {availableSubdivs.length > 1 && (
          <button
            className="notation-subdiv-btn px-2 py-1 rounded-lg bg-gray-100 text-muted hover:bg-gray-200 text-xs font-mono font-semibold cursor-pointer transition-colors"
            onClick={() => setSubdivIdx(prev => (prev + 1) % availableSubdivs.length)}
            title={`Count subdivision: ${subdiv.label}`}
          >
            Count: {subdiv.label}
          </button>
        )}

        {/* Bars per line toggle */}
        <div className="notation-bpl flex items-center gap-0.5">
          <span className="notation-bpl-label text-[10px] text-muted font-semibold mr-0.5">Bars/line</span>
          {BARS_PER_LINE_OPTIONS.map(n => (
            <button
              key={n}
              className={`notation-bpl-btn px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors
                ${barsPerLine === n ? 'bg-sky/10 text-sky font-bold' : 'text-muted hover:text-text'}`}
              onClick={() => setBarsPerLine(n)}
            >
              {n === 0 ? '∞' : n}
            </button>
          ))}
        </div>

        {/* Export buttons */}
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

      <div className="notation-score-wrap" style={{ position: 'relative', display: 'inline-block' }}>
        <div ref={containerRef} className="vexflow-container" />
        {playhead && (
          <div
            className="notation-playhead"
            style={{
              position: 'absolute',
              left: playhead.x - playheadWidth / 2,
              top: playhead.y + 4,
              width: playheadWidth,
              height: lineHeight - 16,
              background: 'color-mix(in srgb, var(--color-sky) 15%, transparent)',
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </div>

      {/* Count labels below each system line */}
      {layoutInfo && countLabels.length > 0 && layout && (
        <div className="notation-count-labels" style={{ position: 'relative', width: layoutInfo.svgWidth, marginTop: -layoutInfo.svgHeight }}>
          {Array.from({ length: layout.numLines }, (_, lineIdx) => {
            const lineLabels = countLabels.filter(cl => cl.line === lineIdx);
            if (lineLabels.length === 0) return null;
            const topOffset = (lineIdx + 1) * (lineHeight + lineGap) - lineGap + 10;
            return (
              <svg
                key={lineIdx}
                style={{
                  position: 'absolute',
                  top: topOffset,
                  left: 0,
                  width: layoutInfo.svgWidth,
                  height: fontSize + 10,
                }}
                viewBox={`0 0 ${layoutInfo.svgWidth} ${fontSize + 10}`}
              >
                {lineLabels.map((cl, i) => (
                  <text
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
      )}
    </div>
  );
}

export default memo(NotationView);
