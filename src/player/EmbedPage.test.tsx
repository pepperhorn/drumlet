import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import EmbedPage from './EmbedPage.js';

it.each([1, 2])('renders a v%i share with full chrome and read-only pads', async (version) => {
  const code = btoa(JSON.stringify({ v: version, sp: 4, t: [{ n: 'Kick', s: '3000' }] }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const { container } = render(<EmbedPage code={code} theme="dark" />);
  await screen.findByRole('group', { name: 'Playback controls' });
  const player = container.querySelector('.drumlet-player.drumlet-embed-page');
  expect(player?.getAttribute('data-theme')).toBe('dark');
  expect(player?.querySelectorAll('.endless-page-heading')).toHaveLength(1);
  const pads = player?.querySelectorAll('.step-cell') ?? [];
  expect(pads).toHaveLength(4);
  expect(pads[0]?.getAttribute('aria-pressed')).toBe('true');
  expect(pads[1]?.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(pads[1]!);
  expect(pads[1]?.getAttribute('aria-pressed')).toBe('false');
});
