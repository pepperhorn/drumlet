import { StrictMode } from 'react'
import './index.css'
import { decodePayload, isEmbedMode, readShareCode } from './state/shareCodec.js'
import { applyPreference, initTheme } from './themes/applyTheme.js'

function loadApp() {
  const app = import('./App.js');
  initTheme();
  return app.then(({ default: App }) => <App />);
}

async function loadPage() {
  const hash = window.location.hash;
  const code = isEmbedMode() ? readShareCode(hash) : undefined;
  if (!code) return loadApp();

  if (/[#&]dottl=/.test(hash)) {
    const { loadDottlFromHash } = await import('./state/projectSerializer.js');
    if (loadDottlFromHash()) return loadApp();
  }
  if (decodePayload(code)?.pluginMeta) return loadApp();

  const theme = new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';
  applyPreference(theme);
  const { default: EmbedPage } = await import('./player/EmbedPage.js');
  return <EmbedPage code={code} theme={theme} />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

void Promise.all([loadPage(), import('react-dom/client')]).then(([page, { createRoot }]) => {
  createRoot(rootEl).render(<StrictMode>{page}</StrictMode>);
});
