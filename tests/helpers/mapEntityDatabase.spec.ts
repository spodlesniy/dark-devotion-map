import { describe, expect, it } from 'vitest';

import initialDatabase from 'src/data/entities.json';
import {
  areMapEntityDatabasesEqual,
  parseMapEntityDatabase,
  serializeMapEntityDatabase,
} from 'src/helpers/mapEntityDatabase';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';

it.each([undefined, '', '   ', 'Temple records'])('round-trips optional Codex group %j', (group) => {
  const source = {
    schemaVersion: 2,
    entities: [
      {
        id: '11111111-0000-4000-8000-000000000000',
        type: 'codex',
        title: 'Entry',
        position: { x: 1, y: 2 },
        ...(group === undefined ? {} : { group }),
      },
    ],
  };
  const loaded = parseMapEntityDatabase(source);
  expect(loaded.entities[0]).toEqual({ ...source.entities[0], isSavedToLibrary: false });
  expect(parseMapEntityDatabase(JSON.parse(serializeMapEntityDatabase(loaded)))).toEqual(loaded);
});

it.each([null, 1, true, []])('rejects invalid Codex group %j', (group) => {
  expect(() =>
    parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        { id: '11111111-0000-4000-8000-000000000000', type: 'codex', title: 'Entry', group, position: { x: 1, y: 2 } },
      ],
    })
  ).toThrow('group must be a string');
});

it('rejects Codex group on another category', () => {
  expect(() =>
    parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        {
          id: '11111111-0000-4000-8000-000000000000',
          type: 'npc',
          title: 'NPC',
          group: 'Records',
          position: { x: 1, y: 2 },
        },
      ],
    })
  ).toThrow('group is only valid for codex');
});

const point = {
  title: 'Test point',
  id: '11111111-0000-4000-8000-000000000000',
  type: 'npc',
  position: { x: 1000, y: 1500 },
};
const secondPoint = { ...point, id: '22222222-0000-4000-8000-000000000000', title: 'Second point' };

describe('Entity database', () => {
  it('stores and exports only positioned entities without geometry discriminators', () => {
    const database = parseMapEntityDatabase(initialDatabase);
    const exported = JSON.parse(serializeMapEntityDatabase(database));

    expect(database.entities.length).toBeGreaterThan(0);

    for (const entity of exported.entities) {
      expect(entity).toHaveProperty('position');
      expect(entity).not.toHaveProperty('kind');
      expect(entity).not.toHaveProperty('points');
    }
  });

  it.each([
    { ...point, kind: 'point' },
    {
      id: point.id,
      title: 'Former area',
      kind: 'area',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
    },
    { ...point, points: [{ x: 0, y: 0 }] },
  ])('rejects removed geometry fields before loading legacy entities', (entity) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [entity] })).toThrow(
      'removed entity geometry fields'
    );
  });

  it('loads the repository database', () => {
    expect(() => parseMapEntityDatabase(initialDatabase)).not.toThrow();
  });

  it('round-trips entities without changing IDs, coordinates, titles, or order', () => {
    const input = { schemaVersion: 2, entities: [secondPoint, point] };
    const database = parseMapEntityDatabase(input);
    const serialized = serializeMapEntityDatabase(database);

    expect(JSON.parse(serialized)).toEqual(input);
    expect(parseMapEntityDatabase(JSON.parse(serialized))).toEqual(database);
    expect(serialized).toContain('\n  "schemaVersion": 2,');
    expect(serialized.endsWith('\n')).toBe(true);
    expect(database.entities[0]).not.toBe(secondPoint);
  });

  it('discards legacy iconId values without affecting change tracking or export', () => {
    const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
    const legacy = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, iconId: 'old.png' }] });
    expect(areMapEntityDatabasesEqual(original, legacy)).toBe(true);
    expect(JSON.parse(serializeMapEntityDatabase(legacy)).entities[0]).not.toHaveProperty('iconId');
  });

  it.each(['8', '9', 'a', 'b'])('accepts UUID v4 variant digit %s', (variant) => {
    const id = `abcdefab-cdef-4abc-${variant}bcd-abcdefabcdef`;

    expect(parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, id }] }).entities[0]?.id).toBe(id);
  });

  it.each([
    { type: 'npc' },
    { type: 'enemy', isBoss: false, isElite: false },
    { type: 'item', itemType: 'weapon' },
    { type: 'place', placeType: 'tablet', tabletType: 'faith' },
  ])('accepts the $type point category', (details) => {
    expect(parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...details }] }).entities).toHaveLength(1);
  });

  it.each([
    { type: 'enemy', isBoss: false, isElite: false },
    { type: 'enemy', isBoss: true, isElite: false },
    ...Object.values(MapPlaceTabletType).map((tabletType) => ({ type: 'place', placeType: 'tablet', tabletType })),
    ...Object.values(MapPlaceAltarType).map((altarType) => ({ type: 'place', placeType: 'altar', altarType })),
    { type: 'place', placeType: 'altar', altarType: 'healing-statue', faithCost: 0 },
    { type: 'place', placeType: 'altar', altarType: 'healing-statue', faithCost: 25 },
    { type: 'place', placeType: 'lost-room' },
    { type: 'place', placeType: 'mirror-teleporter' },
    ...['weapon', 'left-hand', 'armor', 'rune', 'trinket', 'consumable'].map((itemType) => ({
      type: 'item',
      itemType,
    })),
  ])('round-trips category-specific fields: %j', (details) => {
    const { title, ...untitled } = point;
    const input = {
      schemaVersion: 2,
      entities: [
        {
          ...('placeType' in details ? untitled : { ...untitled, title }),
          ...details,
        },
      ],
    };

    expect(JSON.parse(serializeMapEntityDatabase(parseMapEntityDatabase(input)))).toEqual(input);
  });

  it('defaults missing enemy isBoss to false and compares it as equivalent to explicit false', () => {
    const implicit = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'enemy' }] });
    const explicit = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [{ ...point, type: 'enemy', isBoss: false, isElite: false }],
    });

    expect(implicit.entities[0]).toEqual({ ...point, type: 'enemy', isBoss: false, isElite: false });
    expect(areMapEntityDatabasesEqual(implicit, explicit)).toBe(true);
  });

  it.each([
    { type: 'enemy', isBoss: null },
    { type: 'enemy', isBoss: 'false' },
    { type: 'enemy', isBoss: 0 },
    { type: 'place' },
    { type: 'place', placeType: null },
    { type: 'place', placeType: 'Altar' },
    { type: 'place', placeType: 'lost_room' },
    { type: 'place', placeType: 'tablet' },
    { type: 'place', placeType: 'tablet', tabletType: null },
    { type: 'place', placeType: 'tablet', tabletType: 'Faith' },
    { type: 'place', placeType: 'tablet', tabletType: 'unknown' },
    { type: 'place', placeType: 'altar' },
    { type: 'place', placeType: 'altar', altarType: null },
    { type: 'place', placeType: 'altar', altarType: 'RunicAltar' },
    { type: 'place', placeType: 'altar', altarType: 'unknown' },
    ...[null, '10', -1, Number.NaN, Number.POSITIVE_INFINITY].map((faithCost) => ({
      type: 'place',
      placeType: 'altar',
      altarType: 'runic-altar',
      faithCost,
    })),
    ...['npc', 'enemy', 'item'].flatMap((type) => [
      { type, altarType: 'runic-altar' },
      { type, tabletType: 'faith' },
      { type, faithCost: 10 },
    ]),
    ...['mirror-teleporter', 'lost-room'].flatMap((placeType) => [
      { type: 'place', placeType, altarType: 'runic-altar' },
      { type: 'place', placeType, tabletType: 'faith' },
      { type: 'place', placeType, faithCost: 0 },
    ]),
    { type: 'place', placeType: 'tablet', tabletType: 'faith', faithCost: 10 },
    { type: 'place', placeType: 'tablet', tabletType: 'faith', altarType: 'runic-altar' },
    { type: 'place', placeType: 'altar', altarType: 'runic-altar', tabletType: 'faith' },
    { type: 'item' },
    { type: 'item', itemType: null },
    { type: 'item', itemType: 'leftHand' },
    { type: 'npc', isBoss: false, isElite: false },
    { type: 'enemy', placeType: 'tablet', tabletType: 'faith' },
    { type: 'place', placeType: 'altar', itemType: 'rune' },
    { type: 'item', itemType: 'rune', isBoss: true, isElite: false },
  ])('rejects invalid or inapplicable category fields: %j', (details) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...details }] })).toThrow();
  });

  it.each([
    [
      { type: 'enemy', isBoss: false, isElite: false },
      { type: 'enemy', isBoss: true, isElite: false },
    ],
    [
      { type: 'place', placeType: 'tablet', tabletType: 'faith' },
      { type: 'place', placeType: 'altar', altarType: 'runic-altar' },
    ],
    [
      { type: 'item', itemType: 'weapon' },
      { type: 'item', itemType: 'left-hand' },
    ],
  ])('detects changes to category-specific fields: %j', (before, after) => {
    const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...before }] });
    const edited = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...after }] });

    expect(areMapEntityDatabasesEqual(original, edited)).toBe(false);
  });

  it.each([
    [
      { placeType: 'tablet', tabletType: 'faith' },
      { placeType: 'tablet', tabletType: 'stamina' },
    ],
    [
      { placeType: 'altar', altarType: 'runic-altar' },
      { placeType: 'altar', altarType: 'healing-statue' },
    ],
    [
      { placeType: 'altar', altarType: 'runic-altar' },
      { placeType: 'altar', altarType: 'runic-altar', faithCost: 0 },
    ],
    [
      { placeType: 'altar', altarType: 'runic-altar', faithCost: 0 },
      { placeType: 'altar', altarType: 'runic-altar', faithCost: 10 },
    ],
  ])('includes place-specific fields in unsaved-change and Sync comparison: %j', (before, after) => {
    const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'place', ...before }] });
    const updated = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'place', ...after }] });

    expect(areMapEntityDatabasesEqual(original, updated)).toBe(false);
  });

  describe.each([point])('Point metadata', (entity) => {
    it.each([undefined, null, 42, '', ' \n '])('rejects a missing or invalid title: %j', (title) => {
      expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...entity, title }] })).toThrow('title');
    });

    it.each([
      {},
      { description: '', url: '' },
      { description: 'A useful location.\nSecond line.', url: 'https://example.com/wiki?a=1#details' },
    ])('preserves optional metadata through parsing and export: %j', (metadata) => {
      const input = { schemaVersion: 2, entities: [{ ...entity, ...metadata }] };
      const database = parseMapEntityDatabase(input);

      expect(JSON.parse(serializeMapEntityDatabase(database))).toEqual(input);
    });

    it.each(['http://example.com', 'https://example.com/path', 'ftp://example.com/file', 'mailto:user@example.com'])(
      'accepts a valid absolute URL: %s',
      (url) => {
        const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...entity, url }] });

        expect(database.entities[0]?.url).toBe(url);
      }
    );

    it.each([
      { description: null },
      { description: 42 },
      { url: null },
      { url: 42 },
      { url: ' ' },
      { url: 'not a URL' },
      { url: 'example.com/page' },
      { url: '/relative/path' },
      { url: '//example.com' },
      { url: 'https://' },
      { url: 'https://invalid host/' },
      { url: 'https://example.com:99999/' },
    ])('rejects invalid metadata: %j', (metadata) => {
      expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...entity, ...metadata }] })).toThrow(
        Object.keys(metadata)[0]
      );
    });

    it.each([{ description: '' }, { description: 'Updated' }, { url: '' }, { url: 'https://example.com' }])(
      'includes metadata in unsaved-change comparison: %j',
      (metadata) => {
        const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [entity] });
        const updated = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...entity, ...metadata }] });

        expect(areMapEntityDatabasesEqual(original, updated)).toBe(false);
      }
    );
  });

  it.each(['Npc', 'Enemy', 'Item', 'Place'])('rejects a category that is not lowercase: %s', (type) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type }] })).toThrow('type');
  });

  it.each([
    { value: null, message: 'must be an object' },
    { value: { schemaVersion: 1, entities: [] }, message: 'schemaVersion' },
    { value: { schemaVersion: 2, entities: {} }, message: 'must be an array' },
  ])('rejects invalid database envelopes: $message', ({ value, message }) => {
    expect(() => parseMapEntityDatabase(value)).toThrow(message);
  });

  it.each([
    { value: { ...point, id: 1 }, message: 'id' },
    { value: { ...point, id: '' }, message: 'id' },
    { value: { ...point, id: `${point.id}\n` }, message: 'id' },
    { value: { ...point, id: 'not-a-uuid' }, message: 'id' },
    { value: { ...point, id: '11111111000040008000000000000000' }, message: 'id' },
    { value: { ...point, id: '11111111-0000-1000-8000-000000000000' }, message: 'id' },
    { value: { ...point, id: '11111111-0000-4000-7000-000000000000' }, message: 'id' },
    { value: { ...point, id: '11111111-0000-4000-g000-000000000000' }, message: 'id' },
    { value: { ...point, id: 1.5 }, message: 'id' },
    { value: { ...point, kind: 'unknown' }, message: 'kind' },
    { value: { ...point, type: 'Boss' }, message: 'type' },
    { value: { ...point, position: { x: Number.NaN, y: 0 } }, message: 'position.x' },
    { value: { ...point, position: { x: 7401, y: 0 } }, message: 'position.x' },
    { value: { ...point, position: { x: 0, y: -1 } }, message: 'position.y' },
    { value: { ...point, position: { x: 0, y: Number.POSITIVE_INFINITY } }, message: 'position.y' },
    { value: { ...secondPoint, title: '  ' }, message: 'title' },
  ])('rejects invalid entities: $message', ({ value, message }) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [value] })).toThrow(message);
  });

  it('rejects duplicate IDs across entities', () => {
    expect(() =>
      parseMapEntityDatabase({ schemaVersion: 2, entities: [point, { ...secondPoint, id: point.id }] })
    ).toThrow('unique');
  });

  it('normalizes UUID case and rejects duplicates that differ only in case', () => {
    const id = 'abcdefab-cdef-4abc-abcd-abcdefabcdef';
    const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, id: id.toUpperCase() }] });

    expect(database.entities[0]?.id).toBe(id);
    expect(() =>
      parseMapEntityDatabase({
        schemaVersion: 2,
        entities: [
          { ...point, id },
          { ...secondPoint, id: id.toUpperCase() },
        ],
      })
    ).toThrow('unique');
  });

  it('exports the latest in-memory state and leaves it untouched', () => {
    const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
    const edited = {
      ...original,
      entities: [
        ...original.entities,
        ...parseMapEntityDatabase({ schemaVersion: 2, entities: [secondPoint] }).entities,
      ],
    };

    expect(JSON.parse(serializeMapEntityDatabase(edited)).entities).toHaveLength(2);
    expect(original.entities).toHaveLength(1);
    expect(edited.entities).toHaveLength(2);
  });

  it('compares contents independently of entity and object-property order without changing either database', () => {
    const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [secondPoint, point] });
    const reordered = {
      schemaVersion: 2 as const,
      entities: [{ position: { y: 1500, x: 1000 }, type: point.type, title: point.title, id: point.id }, secondPoint],
    };

    expect(areMapEntityDatabasesEqual(original, parseMapEntityDatabase(reordered))).toBe(true);
    expect(original.entities.map(({ id }) => id)).toEqual([secondPoint.id, point.id]);
    expect(reordered.entities.map(({ id }) => id)).toEqual([point.id, secondPoint.id]);
  });

  it.each([
    { name: 'point ID', entities: [secondPoint, { ...point, id: '33333333-0000-4000-8000-000000000000' }] },
    { name: 'point title', entities: [secondPoint, { ...point, title: 'Renamed point' }] },
    { name: 'point type', entities: [secondPoint, { ...point, type: 'enemy' }] },
    { name: 'point coordinates', entities: [secondPoint, { ...point, position: { x: 1001, y: 1500 } }] },
    { name: 'secondPoint title', entities: [{ ...secondPoint, title: 'Renamed secondPoint' }, point] },

    { name: 'removed entity', entities: [point] },
    { name: 'added entity', entities: [secondPoint, point, { ...point, id: '33333333-0000-4000-8000-000000000000' }] },
  ])('detects a changed $name', ({ entities }) => {
    const original = parseMapEntityDatabase({ schemaVersion: 2, entities: [secondPoint, point] });
    const changed = parseMapEntityDatabase({ schemaVersion: 2, entities });

    expect(areMapEntityDatabasesEqual(original, changed)).toBe(false);
  });
});

it.each([undefined, '', 'Old title'])('normalizes Tablet metadata without storing a derived title (%s)', (title) => {
  const tablet = {
    id: '11111111-0000-4000-8000-000000000000',
    type: 'place',
    placeType: 'tablet',
    tabletType: 'damage',
    position: { x: 10, y: 20 },
    url: 'https://example.com/tablet',
  };
  const database = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ ...tablet, title, description: 'Old description' }],
  });
  expect(database.entities[0]).toEqual(tablet);
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(tablet);
  expect(areMapEntityDatabasesEqual(database, parseMapEntityDatabase({ schemaVersion: 2, entities: [tablet] }))).toBe(
    true
  );
});

it.each([undefined, '', '   ', 'Named room'])(
  'preserves optional LostRoom title and metadata on load and export (%j)',
  (title) => {
    const room = {
      id: '11111111-0000-4000-8000-000000000000',
      type: 'place',
      placeType: 'lost-room',
      ...(title === undefined ? {} : { title }),
      description: 'Room description',
      url: 'https://example.com/room',
      position: { x: 10, y: 20 },
    };
    const database = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [room],
    });
    expect(database.entities[0]).toEqual(room);
    expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(room);
  }
);

it.each(['mirror-teleporter'])('loads and exports %s without stored metadata', (placeType) => {
  const teleporter = {
    id: '11111111-0000-4000-8000-000000000000',
    type: 'place',
    placeType,
    position: { x: 10, y: 20 },
  };
  const loaded = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ ...teleporter, title: 'Old title', description: 'Old description', url: 'https://example.com/old' }],
  });
  expect(loaded.entities[0]).toEqual(teleporter);
  expect(JSON.parse(serializeMapEntityDatabase(loaded)).entities[0]).toEqual(teleporter);
  expect(parseMapEntityDatabase({ schemaVersion: 2, entities: [teleporter] })).toEqual(loaded);
});

it.each([undefined, '', 'Old title'])(
  'omits Altar title on load and export while retaining other metadata (%s)',
  (title) => {
    const altar = {
      id: '11111111-0000-4000-8000-000000000000',
      type: 'place',
      placeType: 'altar',
      altarType: 'runic-altar',
      description: 'Keep this description',
      url: 'https://example.com/altar',
      faithCost: 12,
      position: { x: 10, y: 20 },
    };
    const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...altar, title }] });
    expect(database.entities[0]).toEqual(altar);
    expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(altar);
    expect(areMapEntityDatabasesEqual(database, parseMapEntityDatabase({ schemaVersion: 2, entities: [altar] }))).toBe(
      true
    );
  }
);

it('defaults missing elite flags and exports explicit false without marking the database changed', () => {
  const implicit = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'enemy' }] });
  const explicit = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ ...point, type: 'enemy', isBoss: false, isElite: false }],
  });
  expect(implicit.entities[0]).toMatchObject({ isBoss: false, isElite: false });
  expect(areMapEntityDatabasesEqual(implicit, explicit)).toBe(true);
  expect(JSON.parse(serializeMapEntityDatabase(implicit)).entities[0].isElite).toBe(false);
});

it.each([null, 'true', 1])('rejects an invalid elite flag: %j', (isElite) => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'enemy', isElite }] })).toThrow(
    'isElite must be a boolean'
  );
});

it('rejects elite bosses and detects elite edits', () => {
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'enemy', isBoss: true, isElite: true }] })
  ).toThrow('cannot both be true');
  const regular = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'enemy' }] });
  const elite = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type: 'enemy', isElite: true }] });
  expect(areMapEntityDatabasesEqual(regular, elite)).toBe(false);
  expect(JSON.parse(serializeMapEntityDatabase(elite)).entities[0]).toMatchObject({ isBoss: false, isElite: true });
});

it.each(['npc', 'codex'])('rejects elite fields on %s points', (type) => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, type, isElite: false }] })).toThrow(
    'isElite is only valid for enemy'
  );
});
