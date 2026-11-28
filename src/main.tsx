import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { loadDottlFromHash } from './state/projectSerializer.js'
import { decodePayload, isEmbedMode } from './state/shareCodec.js'
import { applyPreference, initTheme } from './themes/applyTheme.js'

async function loadPage() {
  const code = isEmbedMode() && !loadDottlFromHash()
    ? window.location.hash.match(/[#&]s=([A-Za-z0-9_-]+)/)?.[1]
    : undefined;
  if (code && decodePayload(code)?.pluginMeta === null) {
    const theme = new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';
    applyPreference(theme);
    const { default: EmbedPage } = await import('./player/EmbedPage.js');
    return <EmbedPage code={code} theme={theme} />;
  }
  initTheme();
  const { default: App } = await import('./App.js');
  return <App />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

void loadPage().then(page => createRoot(rootEl).render(<StrictMode>{page}</StrictMode>));
