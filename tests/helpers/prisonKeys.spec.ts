import { expect, it } from 'vitest';

import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';

const point = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'item',
  itemType: 'prison-key',
  title: 'Prison Key',
  position: { x: 10, y: 20 },
  description: 'Opens a cell',
  url: 'https://example.com/key',
};

it('round-trips a Prison Key item and uses its editable title and item icon', () => {
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a point');
  }

  expect(mapEntityLabel({ ...entity, title: 'Cell Key' })).toBe('Cell Key');
  expect(createPointIconResolver(['/public/images/entities/point/item/prison-key.png'], '/map/')(entity)).toBe(
    '/map/images/entities/point/item/prison-key.png'
  );
  expect(createPointIconResolver(['/public/images/entities/point/place/prison-key.png'], '/')(entity)).toBeNull();
});

it('rejects obsolete Place data', () => {
  expect(() =>
    parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [{ ...point, type: 'place', itemType: undefined, placeType: 'prison-key' }],
    })
  ).toThrow('placeType');
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, placeType: 'prison-key' }] })).toThrow(
    'only valid'
  );
});

it.each([undefined, '', '   '])('allows optional Prison Key title %j and displays the default name', (title) => {
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, title }] });
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a key');
  }

  expect(mapEntityLabel(entity)).toBe('Prison Key');
  const exported = JSON.parse(serializeMapEntityDatabase(database)).entities[0];

  if (title === undefined) {
    expect(exported).not.toHaveProperty('title');
  } else {
    expect(exported.title).toBe(title);
  }
});

it.each([null, 1, false])('rejects non-string Prison Key title %j', (title) => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, title }] })).toThrow('title');
});

it.each(['weapon', 'left-hand', 'armor', 'rune', 'trinket', 'consumable'])(
  'still requires a title for %s items',
  (itemType) => {
    expect(() =>
      parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, itemType, title: undefined }] })
    ).toThrow('title');
  }
);
