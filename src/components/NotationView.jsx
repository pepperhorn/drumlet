import { useRef, useEffect, useState } from 'react';
import { NOTE_VALUES } from '../state/sequencerReducer.js';
import { renderDrumStaff } from '../notation/renderStaff.js';

/**
 * NotationView — VexFlow drum notation with Petaluma font.
 *
 * Architecture:
 *   - VexFlow re-renders only when note data / layout params change (fingerprint check)
 *   - Playhead is a lightweight React div overlay, re-rendered on every currentStep change
 *   - Beat numbers are a separate SVG below the staff
 */
function NotationView({ tracks, stepsPerPage, currentStep, noteValue }) {
  const containerRef = useRef(null);
  const layoutRef = useRef(null);
  const prevDataRef = useRef(null);
  const [beatInfo, setBeatInfo] = useState(null);

  const nv = NOTE_VALUES.find((n) => n.key === noteValue) || NOTE_VALUES[3];
  const stepsPerBeat = Math.round(1 / nv.beatsPerStep) || 1;
  const beatCount = Math.ceil(stepsPerPage / stepsPerBeat);

  // Fingerprint for VexFlow re-render — excludes currentStep so playhead
  // changes don't trigger expensive VexFlow re-renders
  const stepsFingerprint = tracks.map(t => t.steps.join(',')).join('|');
  const tracksFingerprint = tracks.map(t => `${t.id}:${t.color}:${t.group}:${t.kitSample}:${t.velMode}`).join('|');
  const dataKey = `${stepsFingerprint}|${tracksFingerprint}|${stepsPerPage}|${noteValue}`;

  // Render VexFlow when note data changes
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
  });

  // Playhead overlay — simple div positioned over the VexFlow SVG
  const layout = layoutRef.current;
  let playheadX = null;
  if (layout && currentStep >= 0 && currentStep < layout.noteXPositions.length) {
    playheadX = layout.noteXPositions[currentStep];
  }

  return (
    <div className="notation-view bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div ref={containerRef} className="vexflow-container" />
        {playheadX !== null && (
          <div
            style={{
              position: 'absolute',
              left: playheadX - 14,
              top: 4,
              width: 28,
              height: (layout?.svgHeight || 150) - 8,
              background: 'rgba(91, 192, 235, 0.15)',
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </div>

      {/* Beat numbers below the staff */}
      {beatInfo && (
        <svg
          style={{ display: 'block', width: beatInfo.svgWidth, height: 20 }}
          viewBox={`0 0 ${beatInfo.svgWidth} 20`}
        >
          {Array.from({ length: beatCount }, (_, i) => {
            const startStep = i * stepsPerBeat;
            const midStep = Math.min(startStep + Math.floor(stepsPerBeat / 2), stepsPerPage - 1);
            const x = beatInfo.noteXPositions[midStep] || 0;
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
  );
}

export default NotationView;
