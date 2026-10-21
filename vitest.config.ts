import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [svgr(), react()],
  test: {
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  build: {
    target: 'node20',
  },
});
