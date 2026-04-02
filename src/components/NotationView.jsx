import { useRef, useEffect, useState, useCallback, memo } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import { renderDrumStaff } from '../notation/renderStaff.js';
import { downloadSVG, downloadPNG } from '../notation/notationExport.js';

const SIZE_CYCLE = ['sm', 'md', 'lg', 'xl', '2xl'];
const SIZE_LABELS = { sm: 'S', md: 'M', lg: 'L', xl: 'XL', '2xl': '2X' };
const SIZE_FONT = { sm: 9, md: 11, lg: 14, xl: 18, '2xl': 24 };

/** Subdivision options — perBeat is how many labels per beat */
const SUBDIVISIONS = [
  { key: '1/4',  label: '1/4',  perBeat: 1 },
  { key: '1/8',  label: '1/8',  perBeat: 2 },
  { key: '1/8T', label: '1/8T', perBeat: 3 },
  { key: '1/16', label: '1/16', perBeat: 4 },
  { key: '1/16T', label: '1/16T', perBeat: 6 },
];

/** Labels within a single beat for each subdivision */
const BEAT_LABELS = {
  '1/4':  (b) => [`${b}`],
  '1/8':  (b) => [`${b}`, '&'],
  '1/8T': (b) => [`${b}`, '&', 'a'],
  '1/16': (b) => [`${b}`, 'e', '&', 'a'],
  '1/16T': (b) => [`${b}`, 'ta', 'ta', '&', 'ta', 'ta'],
};

/**
 * Interpolate an X position for a fractional step index.
 */
function interpolateX(positions, stepFloat) {
  if (stepFloat <= 0) return positions[0] || 0;
  if (stepFloat >= positions.length - 1) return positions[positions.length - 1] || 0;
  const lo = Math.floor(stepFloat);
  const hi = Math.ceil(stepFloat);
  if (lo === hi) return positions[lo] || 0;
  const frac = stepFloat - lo;
  return (positions[lo] || 0) * (1 - frac) + (positions[hi] || 0) * frac;
}

function NotationView({ tracks, stepsPerPage, currentStep, noteValue }) {
  const containerRef = useRef(null);
  const layoutRef = useRef(null);
  const prevDataRef = useRef(null);
  const [beatInfo, setBeatInfo] = useState(null);
  const [useColor, setUseColor] = useState(true);
  const [countSize, setCountSize] = useState('sm');
  const [subdivIdx, setSubdivIdx] = useState(0);

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;
  const beatCount = Math.ceil(stepsPerPage / stepsPerBeat);

  // Filter subdivisions to only those that fit within the current tick resolution
  const availableSubdivs = SUBDIVISIONS.filter(s => s.perBeat <= stepsPerBeat);
  const safeIdx = Math.min(subdivIdx, availableSubdivs.length - 1);
  const subdiv = availableSubdivs[safeIdx] || SUBDIVISIONS[0];

  useEffect(() => {
    if (subdivIdx > availableSubdivs.length - 1) {
      setSubdivIdx(0);
    }
  }, [subdivIdx, availableSubdivs.length]);

  const stepsFingerprint = tracks.map(t => t.steps.join(',')).join('|');
  const tracksFingerprint = tracks.map(t => `${t.id}:${t.color}:${t.group}:${t.kitSample}:${t.velMode}`).join('|');
  const dataKey = `${stepsFingerprint}|${tracksFingerprint}|${stepsPerPage}|${noteValue}|${useColor}`;

  useEffect(() => {
    if (prevDataRef.current === dataKey) return;
    prevDataRef.current = dataKey;

    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';

    try {
      const result = renderDrumStaff(el, {
        tracks,
        stepsPerPage,
        noteValueKey: noteValue || '1/4',
        stepsPerBeat,
        useColor,
      });
      layoutRef.current = result;
      setBeatInfo({
        noteXPositions: result.noteXPositions,
        svgWidth: result.svgWidth,
      });
    } catch (err) {
      console.error('VexFlow render error:', err);
      el.textContent = 'Notation rendering error';
    }
  }, [dataKey, tracks, stepsPerPage, noteValue, stepsPerBeat, useColor]);

  const layout = layoutRef.current;
  let playheadX = null;
  if (layout && currentStep >= 0 && currentStep < layout.noteXPositions.length) {
    playheadX = layout.noteXPositions[currentStep];
  }
  const playheadWidth = layout?.stepWidth || 28;

  // Build count labels with positions
  const countLabels = [];
  const fontSize = SIZE_FONT[countSize];
  if (beatInfo) {
    const labelFn = BEAT_LABELS[subdiv.key];
    for (let beat = 0; beat < beatCount; beat++) {
      const labels = labelFn(beat + 1);
      const beatStartStep = beat * stepsPerBeat;
      for (let j = 0; j < labels.length; j++) {
        const stepFloat = beatStartStep + (j / labels.length) * stepsPerBeat;
        const x = interpolateX(beatInfo.noteXPositions, stepFloat) + fontSize * 0.4;
        const isBeatNum = j === 0;
        countLabels.push({ text: labels[j], x, isBeatNum });
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

  return (
    <div className="notation-view bg-card rounded-2xl shadow-sm border border-border px-4 py-2 overflow-x-auto grid-scroll">
      {/* Toolbar */}
      <div className="notation-toolbar flex items-center gap-1.5 mb-2">
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

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div ref={containerRef} className="vexflow-container" />
        {playheadX !== null && (
          <div
            style={{
              position: 'absolute',
              left: playheadX - playheadWidth / 2,
              top: 4,
              width: playheadWidth,
              height: (layout?.svgHeight || 180) - 8,
              background: 'rgba(91, 192, 235, 0.15)',
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </div>

      {/* Count labels below the staff */}
      {beatInfo && countLabels.length > 0 && (
        <svg
          style={{ display: 'block', width: beatInfo.svgWidth, height: fontSize + 10 }}
          viewBox={`0 0 ${beatInfo.svgWidth} ${fontSize + 10}`}
        >
          {countLabels.map((cl, i) => (
            <text
              key={i}
              x={cl.x}
              y={fontSize + 2}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily="var(--font-mono)"
              fontWeight={cl.isBeatNum ? 600 : 400}
              fill={cl.isBeatNum ? '#64748B' : '#B0BEC5'}
            >
              {cl.text}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}

export default memo(NotationView);
