import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { i18nInit } from './lib/i18n'
import { initializeAppStore } from './stores/appStore'
import { ErrorBoundary } from '@medplum/react'

// Render the app
const rootElement = document.getElementById("root");

if (rootElement) {
  // Render only when container is empty (avoid double-mount or SSR hydration issues)
  if (!rootElement.innerHTML) {
    const root = createRoot(rootElement);

    (async () => {
      try {
        // i18nInit is a promise, initializeAppStore is a function that returns a promise.
        const i18nPromise = i18nInit;
        const storePromise = initializeAppStore();

        await Promise.all([i18nPromise, storePromise]);
      } catch (err) {
        // Initialization failures shouldn't prevent the app from attempting to render.
        // Log the error to aid debugging in development/CI.
        // We intentionally continue to render so that at least UI and error boundaries mount.
        // eslint-disable-next-line no-console
        console.error('App initialization failed:', err);
      }

      root.render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>
      );
    })();
  }
} else {
  // Helpful error when mounting target is missing.
  // eslint-disable-next-line no-console
  console.error('Root element with id="root" not found. App cannot be mounted.');
}
