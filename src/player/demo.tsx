import { createRoot } from 'react-dom/client';
import '../index.css';
import './styles/base.css';
import { DrumletPlayer } from './index.js';

createRoot(document.getElementById('root')!).render(
  <main className="player-demo mx-auto grid max-w-3xl gap-8 px-4 py-8">
    <header className="player-demo-header grid justify-items-start gap-2">
      <h1 className="player-demo-heading text-3xl font-display font-bold">Drumlet Player demo</h1>
      <p className="player-demo-intro">Start either groove, then start the other to switch playback.</p>
      <button className="player-demo-host-button rounded-lg border border-current" type="button" disabled>
        Host button
      </button>
    </header>
    <section className="player-demo-full grid gap-2" aria-labelledby="demo-full">
      <h2 className="player-demo-label text-lg font-semibold" id="demo-full">Dark · full controls</h2>
      <DrumletPlayer groove="rock-basic-8ths" theme="dark" chrome="full" />
    </section>
    <section className="player-demo-minimal grid gap-2" aria-labelledby="demo-minimal">
      <h2 className="player-demo-label text-lg font-semibold" id="demo-minimal">Light · minimal controls</h2>
      <DrumletPlayer groove="rock-basic-8ths" theme="light" chrome="minimal" />
    </section>
  </main>,
);
