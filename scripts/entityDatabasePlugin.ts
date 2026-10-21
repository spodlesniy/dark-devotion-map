import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';

export function entityDatabasePlugin() {
  let databasePath = '';

  return {
    name: 'entity-database-sync',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      databasePath = normalizePath(resolve(server.config.root, 'src/data/entities.json'));
      const endpoint = `${server.config.base}__dev/entities`;
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== endpoint) {
          next();

          return;
        }

        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (request.method !== 'GET') {
          response.statusCode = 405;
          response.setHeader('Allow', 'GET');
          response.end(JSON.stringify({ error: 'Only GET is supported.' }));

          return;
        }

        try {
          const contents = await readFile(databasePath, 'utf8');
          response.end(contents);
        } catch {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'Could not read the repository entity database.' }));
        }
      });
    },
    hotUpdate({ file }) {
      if (normalizePath(file) === databasePath) {
        // Repository replacement must not refresh the editor or update its baseline before Sync.
        return [];
      }
    },
  } satisfies Plugin;
}
