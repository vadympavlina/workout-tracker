import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';
import App from './App';
import { registerSW } from './pwa/registerSW';
import { installPreloadErrorHandler } from './pwa/chunkReload';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support / installability. Registered relative to the page so it
// works from a GitHub Pages sub-path; dev server is skipped to avoid stale caches.
installPreloadErrorHandler();
if (import.meta.env.PROD) registerSW();
