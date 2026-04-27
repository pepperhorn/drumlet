import { memo, type ReactElement } from 'react';
import type { Track } from '../state/sequencerReducer.js';

/**
 * Minimal SVG icons for drum/instrument types.
 */

const icons: Record<string, () => ReactElement> = {
  kick: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6.5" /><circle cx="8" cy="8" r="2.5" />
    </svg>
  ),
  snare: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="8" cy="6" rx="6" ry="3" /><line x1="2" y1="6" x2="2" y2="11" /><line x1="14" y1="6" x2="14" y2="11" />
      <ellipse cx="8" cy="11" rx="6" ry="3" /><line x1="4" y1="12.5" x2="12" y2="9.5" /><line x1="4" y1="9.5" x2="12" y2="12.5" />
    </svg>
  ),
  hihat: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="8" cy="6" rx="6.5" ry="2" /><ellipse cx="8" cy="8" rx="6.5" ry="2" />
      <line x1="8" y1="2" x2="8" y2="4" /><line x1="8" y1="10" x2="8" y2="14" />
    </svg>
  ),
  clap: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10 L6 5.5 A1.2 1.2 0 0 1 8.4 5.5 L8.4 4.5 A1.2 1.2 0 0 1 10.8 4.5 L10.8 5.5" />
      <path d="M8.4 5.5 L8.4 3.5 A1.2 1.2 0 0 0 6 3.5 L6 5.5" />
      <path d="M10.8 5.5 L10.8 6.5 A1.2 1.2 0 0 1 13 6.5 L13 9 A4 4 0 0 1 5 12" />
    </svg>
  ),
  tom: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="8" cy="5" rx="5.5" ry="2.5" /><line x1="2.5" y1="5" x2="2.5" y2="11" />
      <line x1="13.5" y1="5" x2="13.5" y2="11" /><ellipse cx="8" cy="11" rx="5.5" ry="2.5" />
    </svg>
  ),
  cowbell: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3 L11 3 L13 13 L3 13 Z" /><line x1="7" y1="1" x2="9" y2="1" />
    </svg>
  ),
  cymbal: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="8" cy="6" rx="7" ry="2.5" /><circle cx="8" cy="6" r="1" fill="currentColor" />
      <line x1="8" y1="8.5" x2="8" y2="15" /><line x1="5" y1="15" x2="11" y2="15" />
    </svg>
  ),
  rimshot: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="8" cy="9" rx="6" ry="3" /><line x1="12" y1="2" x2="6" y2="8" />
    </svg>
  ),
  clave: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="10" x2="14" y2="6" /><line x1="3" y1="5" x2="10" y2="12" />
    </svg>
  ),
  conga: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <ellipse cx="8" cy="3" rx="4" ry="2" /><path d="M4 3 Q3 8 4.5 13" />
      <path d="M12 3 Q13 8 11.5 13" /><ellipse cx="8" cy="13" rx="3.5" ry="1.5" />
    </svg>
  ),
  maraca: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="5.5" r="4" /><line x1="8" y1="9.5" x2="8" y2="15" />
    </svg>
  ),
  tambourine: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" /><circle cx="4" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="4" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
    </svg>
  ),
  soundfont: () => (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M11 1 L11 10 A2.5 2.5 0 1 1 9 7.5 L9 4 L6 5.5 L6 12 A2.5 2.5 0 1 1 4 9.5 L4 3 L11 1Z" />
    </svg>
  ),
  custom: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,8 3,4 5,11 7,3 9,13 11,5 13,10 15,8" />
    </svg>
  ),
};

function getIconKey(track: Pick<Track, 'sourceType' | 'kitSample' | 'group'>): string {
  if (track.sourceType === 'custom') return 'custom';
  if (track.sourceType === 'soundfont') return 'soundfont';

  const group = (track.kitSample ?? track.group ?? '').toLowerCase();

  if (group.startsWith('kick')) return 'kick';
  if (group.startsWith('snare')) return 'snare';
  if (group.startsWith('hihat') || group.startsWith('hh')) return 'hihat';
  if (group === 'clap') return 'clap';
  if (group.startsWith('tom') || group.startsWith('floor') || group === 'mid-tom' || group.startsWith('hi-tom')) return 'tom';
  if (group === 'cowbell') return 'cowbell';
  if (group.startsWith('cymbal') || group === 'crash' || group.startsWith('ride')) return 'cymbal';
  if (group.startsWith('rimshot') || group === 'rim' || group.startsWith('crossstick')) return 'rimshot';
  if (group === 'clave') return 'clave';
  if (group.startsWith('conga')) return 'conga';
  if (group === 'maraca' || group === 'cabasa') return 'maraca';
  if (group === 'tambourine') return 'tambourine';

  return 'kick';
}

interface TrackIconProps {
  track: Pick<Track, 'sourceType' | 'kitSample' | 'group'>;
  className?: string;
}

function TrackIcon({ track, className = '' }: TrackIconProps) {
  const key = getIconKey(track);
  const renderIcon = icons[key] ?? icons.kick!;

  return (
    <span className={`track-icon inline-flex items-center justify-center w-4 h-4 lg:w-5 lg:h-5 shrink-0 ${className}`}>
      {renderIcon()}
    </span>
  );
}

export default memo(TrackIcon);
