import { afterEach, describe, expect, it, vi } from 'vitest';

import { readRepositoryEntityDatabase } from 'src/helpers/readRepositoryEntityDatabase';

const mode = vi.hoisted(() => ({ isDeveloperMode: true }));
vi.mock('src/common/environment', () => mode);

afterEach(() => {
  vi.unstubAllGlobals();
  mode.isDeveloperMode = true;
});

describe('Repository database read', () => {
  it('bypasses browser caching and validates the actual JSON response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{ "entities": [], "schemaVersion": 2 }'));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await expect(readRepositoryEntityDatabase(signal)).resolves.toEqual({ schemaVersion: 2, entities: [] });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/__dev/entities', { cache: 'no-store', signal });
  });

  it.each(['{', '{"schemaVersion":1,"entities":[]}', '{"schemaVersion":2,"entities":[{}]}'])(
    'rejects malformed or invalid data: %s',
    async (contents) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(contents)));

      await expect(readRepositoryEntityDatabase(new AbortController().signal)).rejects.toThrow('not valid JSON');
    }
  );

  it('rejects unsuccessful HTTP responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));

    await expect(readRepositoryEntityDatabase(new AbortController().signal)).rejects.toThrow('Could not read');
  });

  it('does not make requests in production mode', async () => {
    mode.isDeveloperMode = false;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(readRepositoryEntityDatabase(new AbortController().signal)).rejects.toThrow('only in developer mode');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(readRepositoryEntityDatabase(new AbortController().signal)).rejects.toThrow(
      'Could not reach the development server'
    );
  });
});
