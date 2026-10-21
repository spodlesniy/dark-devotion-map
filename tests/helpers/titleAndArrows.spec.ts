import { expect, it } from 'vitest';

import { DefaultMapTitleColor } from 'src/common/titleSettings';
import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';
import { MapTitleSize } from 'src/types/MapTitleSize';

const base = { id: '11111111-0000-4000-8000-000000000000', position: { x: 10, y: 20 } };
const label = { ...base, type: 'title', title: 'Temple', size: 'medium', color: DefaultMapTitleColor };

it.each(Object.values(MapTitleSize))('round-trips Title size %s with optional metadata', (size) => {
  const point = { ...label, size, description: 'Temple details', url: 'https://example.com' };
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
});

it.each([
  { size: undefined },
  { size: 'large' },
  { color: undefined },
  { color: '#fff' },
  { color: 'red' },
  { color: '#gggggg' },
  { title: undefined },
  { title: '' },
  { itemType: 'weapon' },
])('rejects invalid Title fields %j', (fields) => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...label, ...fields }] })).toThrow();
});

it.each([{ size: 'medium' }, { color: '#ffffff' }])('rejects Title styling on other categories %j', (fields) => {
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, type: 'npc', title: 'NPC', ...fields }] })
  ).toThrow('only valid');
});

it('omits Arrows titles and resolves only the item icon', () => {
  const database = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ ...base, type: 'item', itemType: 'arrows', title: 'Old title', description: 'Ammo' }],
  });
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected Arrows');
  }

  expect(mapEntityLabel(entity)).toBe('Arrows');
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).not.toHaveProperty('title');
  expect(createPointIconResolver(['/public/images/entities/point/item/arrows.png'], '/map/')(entity)).toBe(
    '/map/images/entities/point/item/arrows.png'
  );
  expect(createPointIconResolver([], '/')(entity)).toBeNull();
  expect(
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, type: 'item', itemType: 'arrows' }] }).entities[0]
  ).not.toHaveProperty('title');
});
