import { expect, it } from 'vitest';

import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';
import { chestVariants } from 'src/types/MapChestVariant';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceType } from 'src/types/MapPlaceType';

const base = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'place',
  position: { x: 10, y: 20 },
};

it.each(chestVariants)('round-trips chest variant %s and resolves only its exact icon', (variant) => {
  const point = { ...base, placeType: 'chest', variant, description: 'Loot', url: 'https://example.com' };
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a point');
  }

  expect(mapEntityLabel(entity)).toBe('Chest');
  const path = `point/place/chest/chest-${variant}.png`;
  expect(createPointIconResolver([`/public/images/entities/${path}`], '/map/')(entity)).toBe(
    `/map/images/entities/${path}`
  );
  expect(createPointIconResolver(['/public/images/entities/point/place/chest.png'], '/')(entity)).toBeNull();
});

it.each([undefined, null, '1', 0, 6, 1.5, NaN, Infinity, true])('rejects invalid chest variant %j', (variant) => {
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, placeType: 'chest', variant }] })
  ).toThrow('variant');
});

it('rejects variant on other places and categories', () => {
  for (const fields of [
    { placeType: 'switch', switchType: 'lever' },
    { placeType: 'trap', trapType: 'spear' },
    { type: 'npc', title: 'NPC' },
  ]) {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, ...fields, variant: 1 }] })).toThrow(
      'variant'
    );
  }
});

it('round-trips and labels a Lever, using its icon only when present', () => {
  const database = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ ...base, placeType: 'switch', switchType: 'lever' }],
  });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual({
    ...base,
    placeType: 'switch',
    switchType: 'lever',
  });
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a point');
  }

  expect(mapEntityLabel(entity)).toBe('Lever');
  expect(createPointIconResolver(['/public/images/entities/point/place/switch/lever.png'], '/map/')(entity)).toBe(
    '/map/images/entities/point/place/switch/lever.png'
  );
  expect(createPointIconResolver([], '/')(entity)).toBeNull();
  expect(
    createPointIconResolver(
      ['/public/images/entities/point/place/chest/chest-1.png'],
      '/'
    )({ type: MapEntityType.Place, placeType: MapPlaceType.Chest })
  ).toBeNull();
});
