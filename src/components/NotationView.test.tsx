import { fireEvent, render, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createInitialState } from '../state/sequencerReducer.js';
import NotationView from './NotationView.js';

vi.mock('../notation/renderStaff.js', () => ({
  fitStaffToWidth: () => ({ bars: 2, scale: 45 }),
  renderDrumStaff: (host: HTMLElement, { layout }: { layout: string }) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.dataset.scoreLayout = layout;
    host.replaceChildren(svg);
    return Promise.resolve({ stepPositions: [] });
  },
}));

it('shows one score through a wrapped → endless → wrapped switch', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const { pages, stepsPerPage, noteValue, stepValue } = createInitialState();
  const props = { pages, stepsPerPage, noteValue, stepValue, currentStep: -1, currentPageIndex: 0 };
  const { container, rerender, getByRole } = render(<NotationView {...props} layout="wrapped" />);
  fireEvent.click(getByRole('button', { name: '2' }));

  const expectScore = (layout: 'wrapped' | 'endless') => waitFor(() => {
    const scores = container.querySelectorAll('svg[data-score-layout]');
    expect(scores).toHaveLength(1);
    expect(scores[0]).toBe(container.querySelector(`.verovio-container > svg[data-score-layout="${layout}"]`));
    expect(Boolean(scores[0]!.closest('.notation-endless-scroll'))).toBe(layout === 'endless');
  });

  await expectScore('wrapped');
  rerender(<NotationView {...props} layout="endless" />);
  await expectScore('endless');
  rerender(<NotationView {...props} layout="wrapped" />);
  await expectScore('wrapped');
});
