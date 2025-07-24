import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { i18nInit } from './lib/i18n'
import { initializeAppStore } from './stores/appStore'
import { ErrorBoundary } from '@medplum/react'

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  Promise.all([i18nInit, initializeAppStore()]).then(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
  });
}
