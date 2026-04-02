import { memo, useRef, useEffect, useCallback, useState } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import { renderDrumStaff } from '../notation/renderStaff.js';

/**
 * NotationStaff — renders the VexFlow staff.
 * Memo'd on tracks, stepsPerPage, and noteValue to avoid re-render on playhead changes.
 */
const NotationStaff = memo(function NotationStaff({ tracks, stepsPerPage, noteValue, onLayout }) {
  const containerRef = useRef(null);

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear previous render
    el.innerHTML = '';

    try {
      const result = renderDrumStaff(el, {
        tracks,
        stepsPerPage,
        noteValueKey: noteValue || '1/4',
        stepsPerBeat,
      });

      // Report layout info to parent for playhead positioning
      onLayout(result);
    } catch (err) {
      console.error('VexFlow render error:', err);
      // Show fallback text
      el.textContent = 'Notation rendering error';
    }
  }, [tracks, stepsPerPage, noteValue, stepsPerBeat, onLayout]);

  return <div ref={containerRef} className="vexflow-container" />;
});

/**
 * NotationView — top-level component with dual-layer architecture:
 *   1. VexFlow SVG layer (re-renders on data changes)
 *   2. Playhead overlay (re-renders on currentStep changes — lightweight)
 */
function NotationView({ tracks, stepsPerPage, currentStep, noteValue }) {
  const [layout, setLayout] = useState(null);

  const handleLayout = useCallback((result) => {
    setLayout(result);
  }, []);

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;

  // Compute beat numbers for display
  const beatCount = Math.ceil(stepsPerPage / stepsPerBeat);

  return (
    <div className="notation-view bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Layer 1: VexFlow staff */}
        <NotationStaff
          tracks={tracks}
          stepsPerPage={stepsPerPage}
          noteValue={noteValue}
          onLayout={handleLayout}
        />

        {/* Layer 2: Playhead overlay */}
        {layout && currentStep >= 0 && currentStep < layout.noteXPositions.length && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              width: layout.svgWidth,
              height: layout.svgHeight,
            }}
            viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
          >
            <rect
              x={layout.noteXPositions[currentStep] - 12}
              y={4}
              width={24}
              height={layout.svgHeight - 8}
              fill="#5BC0EB"
              opacity={0.12}
              rx={3}
            />
          </svg>
        )}

        {/* Beat numbers below the staff */}
        {layout && (
          <svg
            style={{
              position: 'absolute',
              bottom: -16,
              left: 0,
              pointerEvents: 'none',
              width: layout.svgWidth,
              height: 20,
            }}
            viewBox={`0 0 ${layout.svgWidth} 20`}
          >
            {Array.from({ length: beatCount }, (_, i) => {
              // Center the beat number under the middle step of each beat group
              const startStep = i * stepsPerBeat;
              const midStep = Math.min(startStep + Math.floor(stepsPerBeat / 2), stepsPerPage - 1);
              const x = layout.noteXPositions[midStep] || 0;
              return (
                <text
                  key={i}
                  x={x}
                  y={14}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  fill="#94A3B8"
                >
                  {i + 1}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

export default memo(NotationView);
