import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { NotationLoading, NotationPending } from './NotationLoading.js';

it.each([
  ['engine', 'Loading notation engine…'],
  ['render', 'Rendering score…'],
  ['slow', 'Still loading — slow connection?'],
  ['error', 'Could not load notation.'],
] as const)('shows feedback for the %s phase', (phase, message) => {
  render(<NotationLoading phase={phase} />);
  expect(screen.getByText(message)).toBeTruthy();
});

it.each(['slow', 'error'] as const)('calls Retry in the %s phase', (phase) => {
  const retry = vi.fn();
  render(<NotationLoading phase={phase} onRetry={retry} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it('carries the 15-second deadline from the engine phase into the render phase', () => {
  vi.useFakeTimers();
  try {
    render(<NotationPending phase="render" startedAt={Date.now() - 13000} onRetry={vi.fn()} />);
    act(() => vi.advanceTimersByTime(1999));
    expect(screen.getByText('Rendering score…')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  } finally {
    vi.useRealTimers();
  }
});
