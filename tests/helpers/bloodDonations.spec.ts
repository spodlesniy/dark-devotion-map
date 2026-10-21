import { expect, it } from 'vitest';

import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';

const point = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'place',
  placeType: 'switch',
  switchType: 'blood-donation',
  position: { x: 10, y: 20 },
  description: 'Donation details',
  url: 'https://example.com',
};

it('round-trips Blood Donation without a stored title and resolves only its named icon', () => {
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, title: 'Old title' }] });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a point');
  }

  expect(mapEntityLabel(entity)).toBe('Blood Donation');
  expect(
    createPointIconResolver(['/public/images/entities/point/place/switch/blood-donation.png'], '/map/')(entity)
  ).toBe('/map/images/entities/point/place/switch/blood-donation.png');
  expect(createPointIconResolver([], '/')(entity)).toBeNull();
  expect(parseMapEntityDatabase({ schemaVersion: 2, entities: [point] })).toEqual(database);
});

it.each([{ variant: 1 }, { altarType: 'runic-altar' }, { trapType: 'spear' }, { faithCost: 1 }])(
  'rejects unrelated subtype fields %j',
  (fields) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...fields }] })).toThrow();
  }
);
