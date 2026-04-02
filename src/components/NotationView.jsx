import { memo } from 'react';
import { getVelocityOpacity } from '../audio/velocityConfig.js';

/**
 * Standard drum notation staff positions (from bottom line = 0).
 * Staff has 5 lines at y positions 0-4. Spaces are between lines.
 * Higher y = higher on staff visually (lower SVG y coordinate).
 *
 * Position reference (line 0 = bottom, line 4 = top):
 *   Above staff (5+): hi-hat, crash, ride
 *   Line 4 (top):     ride bell
 *   Space 3-4:        crash
 *   Line 3:           open hi-hat
 *   Space 2-3:        hi tom
 *   Line 2:           snare, cross stick
 *   Space 1-2:        floor tom
 *   Line 1:           bass drum
 *   Space 0-1:        bass drum alt
 *   Line 0 (bottom):  bass drum
 */

// Map group/kitSample names to notation position and notehead style
const NOTATION_MAP = {
  // Kicks — bottom of staff
  'kick':       { pos: 0,   head: 'filled' },
  'kick-alt':   { pos: 0,   head: 'filled' },

  // Snare — 3rd space from bottom (between lines 2 and 3)
  'snare':      { pos: 2.5, head: 'filled' },
  'snare-h':    { pos: 2.5, head: 'filled' },
  'snare-m':    { pos: 2.5, head: 'filled' },
  'snare-l':    { pos: 2.5, head: 'filled' },
  'snare-on1':  { pos: 2.5, head: 'filled' },
  'snare-on2':  { pos: 2.5, head: 'filled' },
  'snare-off':  { pos: 2.5, head: 'filled' },
  'crossstick': { pos: 2.5, head: 'x' },
  'rimshot':    { pos: 2.5, head: 'x' },

  // Hi-hats — above staff
  'hihat-close':  { pos: 5, head: 'x' },
  'hihat-closed': { pos: 5, head: 'x' },
  'hihat-open':   { pos: 5, head: 'xo' },
  'hhclosed':     { pos: 5, head: 'x' },
  'hhopen':       { pos: 5, head: 'xo' },
  'hh-closed1':   { pos: 5, head: 'x' },
  'hh-closed2':   { pos: 5, head: 'x' },
  'hh-open':      { pos: 5, head: 'xo' },
  'hh-foot':      { pos: -0.5, head: 'x' },

  // Toms
  'tom-hi':     { pos: 3.5, head: 'filled' },
  'tom-high':   { pos: 3.5, head: 'filled' },
  'tom-hh':     { pos: 3.5, head: 'filled' },
  'tom-1':      { pos: 3.5, head: 'filled' },
  'hi-tom':     { pos: 3.5, head: 'filled' },
  'mid-tom':    { pos: 2.5, head: 'filled' },
  'tom-mid':    { pos: 2.5, head: 'filled' },
  'tom-m':      { pos: 2.5, head: 'filled' },
  'tom-2':      { pos: 2.5, head: 'filled' },
  'tom-low':    { pos: 1.5, head: 'filled' },
  'tom-l':      { pos: 1.5, head: 'filled' },
  'tom-ll':     { pos: 1,   head: 'filled' },
  'tom-3':      { pos: 1.5, head: 'filled' },
  'floor-tom':  { pos: 1.5, head: 'filled' },

  // Cymbals
  'crash':      { pos: 5.5, head: 'x' },
  'cymbal':     { pos: 5.5, head: 'x' },
  'cymball':    { pos: 5.5, head: 'x' },
  'ride':       { pos: 4.5, head: 'x' },
  'ride-bell':  { pos: 4,   head: 'diamond' },

  // Latin percussion
  'cowbell':    { pos: 5.5, head: 'triangle' },
  'clave':      { pos: 5.5, head: 'x' },
  'conga-hi':   { pos: 3.5, head: 'filled' },
  'conga-high': { pos: 3.5, head: 'filled' },
  'conga-mid':  { pos: 2.5, head: 'filled' },
  'conga-low':  { pos: 1.5, head: 'filled' },
  'tambourine': { pos: 5.5, head: 'triangle' },
  'maraca':     { pos: 5.5, head: 'triangle' },
  'cabasa':     { pos: 5.5, head: 'triangle' },
  'agogo':      { pos: 5.5, head: 'triangle' },
};

function getNotation(track) {
  const key = track.kitSample || track.group || '';
  return NOTATION_MAP[key] || NOTATION_MAP[key.toLowerCase()] || { pos: 2.5, head: 'filled' };
}

// Staff geometry
const LINE_SPACING = 8;
const STAFF_TOP = 20; // y of top line (line 4)
const STAFF_BOTTOM = STAFF_TOP + 4 * LINE_SPACING;
const NOTE_R = 3.5;

function staffY(pos) {
  // pos 0 = bottom line, pos 4 = top line
  return STAFF_BOTTOM - pos * LINE_SPACING;
}

function NoteHead({ x, y, head, color, opacity }) {
  const o = Math.max(0.5, opacity);
  if (head === 'x' || head === 'xo') {
    return (
      <g>
        <line x1={x - 3} y1={y - 3} x2={x + 3} y2={y + 3} stroke={color} strokeWidth={1.8} opacity={o} />
        <line x1={x + 3} y1={y - 3} x2={x - 3} y2={y + 3} stroke={color} strokeWidth={1.8} opacity={o} />
        {head === 'xo' && <circle cx={x} cy={y - 7} r={2} fill="none" stroke={color} strokeWidth={1} opacity={o} />}
      </g>
    );
  }
  if (head === 'diamond') {
    return (
      <polygon
        points={`${x},${y - 3.5} ${x + 3.5},${y} ${x},${y + 3.5} ${x - 3.5},${y}`}
        fill={color} opacity={o}
      />
    );
  }
  if (head === 'triangle') {
    return (
      <polygon
        points={`${x},${y - 3.5} ${x + 3.5},${y + 2.5} ${x - 3.5},${y + 2.5}`}
        fill={color} opacity={o}
      />
    );
  }
  // filled circle (default)
  return <circle cx={x} cy={y} r={NOTE_R} fill={color} opacity={o} />;
}

function NotationView({ tracks, stepsPerPage, currentStep }) {
  const stepWidth = 28;
  const leftMargin = 40;
  const svgWidth = leftMargin + stepsPerPage * stepWidth + 20;
  const svgHeight = STAFF_TOP + 4 * LINE_SPACING + 30;

  return (
    <div className="notation-view bg-card rounded-2xl shadow-sm border border-border p-4 overflow-x-auto grid-scroll">
      <svg
        className="notation-svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Percussion clef — two thick vertical bars */}
        <rect x={leftMargin - 28} y={staffY(4) - 0.5} width={4} height={4 * LINE_SPACING + 1} rx={1} fill="#1A1A2E" />
        <rect x={leftMargin - 20} y={staffY(4) - 0.5} width={4} height={4 * LINE_SPACING + 1} rx={1} fill="#1A1A2E" />

        {/* Staff lines */}
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1={leftMargin - 2}
            y1={staffY(line)}
            x2={svgWidth - 10}
            y2={staffY(line)}
            stroke="#CBD5E1"
            strokeWidth={0.8}
          />
        ))}

        {/* Beat group lines (every 4 steps) */}
        {Array.from({ length: Math.ceil(stepsPerPage / 4) + 1 }, (_, i) => {
          const step = i * 4;
          if (step > stepsPerPage) return null;
          const x = leftMargin + step * stepWidth;
          return (
            <line
              key={`bar-${i}`}
              x1={x}
              y1={staffY(4) - 2}
              x2={x}
              y2={staffY(0) + 2}
              stroke={step === 0 || step === stepsPerPage ? '#94A3B8' : '#E2E8F0'}
              strokeWidth={step === 0 || step === stepsPerPage ? 1.5 : 0.5}
            />
          );
        })}

        {/* Beat numbers */}
        {Array.from({ length: Math.ceil(stepsPerPage / 4) }, (_, i) => (
          <text
            key={`beat-${i}`}
            x={leftMargin + i * 4 * stepWidth + 2 * stepWidth}
            y={svgHeight - 4}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill="#94A3B8"
          >
            {i + 1}
          </text>
        ))}

        {/* Playhead */}
        {currentStep >= 0 && (
          <rect
            x={leftMargin + currentStep * stepWidth - 1}
            y={staffY(5.5) - 4}
            width={stepWidth}
            height={svgHeight - staffY(5.5) + 4}
            fill="#5BC0EB"
            opacity={0.1}
            rx={2}
          />
        )}

        {/* Notes */}
        {tracks.map((track) => {
          const notation = getNotation(track);
          const y = staffY(notation.pos);

          return track.steps.map((vel, stepIdx) => {
            if (vel === 0) return null;
            const x = leftMargin + stepIdx * stepWidth + stepWidth / 2;
            const opacity = getVelocityOpacity(vel, track.velMode || 3);

            return (
              <g key={`${track.id}-${stepIdx}`}>
                <NoteHead
                  x={x}
                  y={y}
                  head={notation.head}
                  color={track.color}
                  opacity={opacity}
                />
                {/* Stem */}
                {notation.pos <= 2.5 ? (
                  // Stem up for lower notes
                  <line x1={x + NOTE_R} y1={y} x2={x + NOTE_R} y2={y - 16} stroke={track.color} strokeWidth={1} opacity={opacity} />
                ) : (
                  // Stem down for upper notes
                  <line x1={x - NOTE_R} y1={y} x2={x - NOTE_R} y2={y + 16} stroke={track.color} strokeWidth={1} opacity={opacity} />
                )}
                {/* Ledger line for notes below/above staff */}
                {notation.pos < 0 && (
                  <line x1={x - 5} y1={staffY(-0.5)} x2={x + 5} y2={staffY(-0.5)} stroke="#CBD5E1" strokeWidth={0.8} />
                )}
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

export default memo(NotationView);
