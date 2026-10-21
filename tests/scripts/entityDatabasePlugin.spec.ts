// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { entityDatabasePlugin } from '../../scripts/entityDatabasePlugin';

let root: string;
let databasePath: string;
let server: ViteDevServer;
let endpoint: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'entity-sync-'));
  await mkdir(join(root, 'src/data'), { recursive: true });
  databasePath = join(root, 'src/data/entities.json');
  await writeFile(databasePath, '{"schemaVersion":2,"entities":[]}');
  server = await createServer({
    configFile: false,
    root,
    base: '/map/',
    logLevel: 'silent',
    plugins: [entityDatabasePlugin()],
    server: { port: 0, host: '127.0.0.1', watch: null },
  });
  await server.listen();
  const address = server.httpServer?.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected a listening dev server.');
  }

  endpoint = `http://127.0.0.1:${address.port}/map/__dev/entities`;
});

afterEach(async () => {
  await server?.close();

  if (root?.startsWith(join(tmpdir(), 'entity-sync-'))) {
    await rm(root, { recursive: true, force: true });
  }
});

describe('Development database endpoint', () => {
  it('reads fresh disk contents and disables caching, including conditional requests', async () => {
    const first = await fetch(endpoint);
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.headers.get('content-type')).toContain('application/json');
    expect(await first.json()).toEqual({ schemaVersion: 2, entities: [] });
    const changed = '{"schemaVersion":2,"entities":[{"changed":true}]}';
    await writeFile(databasePath, changed);
    const second = await fetch(endpoint, { headers: { 'If-None-Match': '*' } });
    expect(second.status).toBe(200);
    expect(await second.text()).toBe(changed);
  });

  it('reports a missing file without exposing filesystem paths', async () => {
    await rm(databasePath);
    const response = await fetch(endpoint);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(root);
  });

  it('rejects write requests without changing the repository file', async () => {
    const response = await fetch(endpoint, { method: 'POST', body: '{}' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(await (await fetch(endpoint)).json()).toEqual({ schemaVersion: 2, entities: [] });
  });
});
