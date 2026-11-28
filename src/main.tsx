import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { decodePayload, isEmbedMode, readShareCode } from './state/shareCodec.js'
import { applyPreference, initTheme } from './themes/applyTheme.js'

function loadApp() {
  const app = import('./App.js');
  initTheme();
  return app.then(({ default: App }) => <App />);
}

async function loadPage() {
  if (!isEmbedMode()) return loadApp();

  const hash = window.location.hash;
  const code = readShareCode(hash) ?? '';

  if (/[#&]dottl=/.test(hash)) {
    const { loadDottlFromHash } = await import('./state/projectSerializer.js');
    if (loadDottlFromHash()) return loadApp();
  }
  if (code && decodePayload(code)?.pluginMeta) return loadApp();

  const theme = new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';
  applyPreference(theme);
  const { default: EmbedPage } = await import('./player/EmbedPage.js');
  return <EmbedPage code={code} theme={theme} />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

void loadPage().then(page => {
  createRoot(rootEl).render(<StrictMode>{page}</StrictMode>);
});
