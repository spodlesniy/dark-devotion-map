import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class implements ResizeObserver {
    observe() {
      // Geometry-sensitive tests provide their own observer implementation.
    }

    unobserve() {
      // jsdom has no layout-driven resize notifications.
    }

    disconnect() {
      // There are no subscriptions to release in the default test observer.
    }
  };
}

// Clean up rendered components after each test case.
afterEach(() => {
  cleanup();
});
