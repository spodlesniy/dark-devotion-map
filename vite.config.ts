import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';

import packageJson from './package.json' with { type: 'json' };
import { entityDatabasePlugin } from './scripts/entityDatabasePlugin.ts';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const envVariables = loadEnv(mode, process.cwd());

  const isDevServer = command === 'serve';

  if (!isDevServer) {
    console.log('Building for env: ', envVariables.VITE_ENV_NAME, mode);
  }

  process.env.VITE_APP_VERSION = packageJson.version;

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      entityDatabasePlugin(),
      svgr({
        // Force to use oxc setting for Vite 8
        include: '**/*.svg?react',
      }),
      react({
        compiler: true,
      }),
      checker({
        typescript: {
          tsconfigPath: './tsconfig.app.json',
        },
        biome: {
          watchPath: 'src',
        },
        stylelint: {
          lintCommand: 'stylelint "**/*.{css,scss}"',
        },
        terminal: true,
        overlay: true,
        enableBuild: false,
      }),
    ],
    build: {
      outDir: './build',

      reportCompressedSize: false,
      sourcemap: process.env.GENERATE_SOURCEMAP === 'true',

      minify: true,
    },
  };
});
