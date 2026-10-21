import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

// Must be before other local imports
import './index.scss';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container is not found');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
