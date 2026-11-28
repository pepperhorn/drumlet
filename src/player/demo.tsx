import { createRoot } from 'react-dom/client';
import '../index.css';
import './styles/base.css';
import { DrumletPlayer } from './index.js';

createRoot(document.getElementById('root')!).render(
  <main className="player-demo">
    <header className="player-demo-header">
      <h1 className="player-demo-heading">Drumlet Player demo</h1>
      <p className="player-demo-intro">Start either groove, then start the other to switch playback.</p>
      <button className="player-demo-host-button" type="button" disabled>
        Host button
      </button>
    </header>
    <section className="player-demo-full" aria-labelledby="demo-full">
      <h2 className="player-demo-label" id="demo-full">Dark · full controls</h2>
      <DrumletPlayer groove="rock-basic-8ths" theme="dark" chrome="full" />
    </section>
    <section className="player-demo-minimal" aria-labelledby="demo-minimal">
      <h2 className="player-demo-label" id="demo-minimal">Light · minimal controls</h2>
      <DrumletPlayer groove="rock-basic-8ths" theme="light" chrome="minimal" />
    </section>
  </main>,
);
