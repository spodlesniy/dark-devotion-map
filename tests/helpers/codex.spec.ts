import { describe, expect, it } from 'vitest';

import {
  areMapEntityDatabasesEqual,
  parseMapEntityDatabase,
  parseMapPointDetails,
  serializeMapEntityDatabase,
} from 'src/helpers/mapEntityDatabase';

const codex = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'codex',
  title: 'Codex entry',
  description: 'Local text',
  url: 'https://example.com/codex',
  position: { x: 10, y: 20 },
};

function database(fields: Record<string, unknown>) {
  return parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...codex, ...fields }] });
}

describe('Codex data', () => {
  it('defaults library status to false without inventing part fields', () => {
    expect(database({}).entities[0]).toEqual({ ...codex, isSavedToLibrary: false });
  });

  it.each([false, true])('round-trips library status %s with metadata and parts', (isSavedToLibrary) => {
    const parsed = database({ isSavedToLibrary, part: 2, totalParts: 3 });
    expect(JSON.parse(serializeMapEntityDatabase(parsed)).entities[0]).toEqual({
      ...codex,
      isSavedToLibrary,
      part: 2,
      totalParts: 3,
    });
    expect(
      areMapEntityDatabasesEqual(parsed, database({ isSavedToLibrary: !isSavedToLibrary, part: 2, totalParts: 3 }))
    ).toBe(false);
    expect(areMapEntityDatabasesEqual(parsed, database({ isSavedToLibrary, part: 3, totalParts: 3 }))).toBe(false);
  });

  it('accepts the last part', () => {
    expect(parseMapPointDetails({ type: 'codex', part: 3, totalParts: 3 })).toEqual({
      type: 'codex',
      isSavedToLibrary: false,
      part: 3,
      totalParts: 3,
    });
  });

  it.each([
    { part: 1 },
    { totalParts: 3 },
    { part: 4, totalParts: 3 },
    { part: 0, totalParts: 3 },
    { part: -1, totalParts: 3 },
    { part: 1.5, totalParts: 3 },
    { part: 1, totalParts: 3.5 },
    { part: 1, totalParts: 0 },
    { part: '1', totalParts: 3 },
    { part: null, totalParts: 3 },
    { part: NaN, totalParts: 3 },
    { part: 1, totalParts: Infinity },
    { isSavedToLibrary: 'true' },
    { isSavedToLibrary: null },
  ])('rejects invalid Codex details: %j', (fields) => {
    expect(() => database(fields)).toThrow();
  });

  it.each(['isSavedToLibrary', 'part', 'totalParts'])('rejects %s on another point category', (field) => {
    expect(() => parseMapPointDetails({ type: 'npc', [field]: field === 'isSavedToLibrary' ? true : 1 })).toThrow(
      'only valid for codex'
    );
  });

  it('still requires a title and validates URL', () => {
    expect(() => database({ title: '' })).toThrow('title');
    expect(() => database({ url: 'invalid' })).toThrow('url');
  });
});
