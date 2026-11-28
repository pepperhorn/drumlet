import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function preloadApp() {
  let base
  return {
    name: 'drumlet-preload-app',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { path, bundle }) {
        if (path !== '/index.html' || !bundle) return
        const app = Object.values(bundle).find(output =>
          output.type === 'chunk' && output.facadeModuleId?.endsWith('/src/App.tsx'))
        if (!app) throw new Error('Drumlet App chunk missing from the app build')

        const url = JSON.stringify(`${base}${app.fileName}`).replace(/</g, '\\u003c')
        return [{
          tag: 'script',
          injectTo: 'head-prepend',
          children: `if (!new URLSearchParams(location.search).has('embed')) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = ${url};
  link.crossOrigin = '';
  link.fetchPriority = 'high';
  link.dataset.drumletAppPreload = '';
  document.head.append(link);
}`,
        }]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadApp()],
})
