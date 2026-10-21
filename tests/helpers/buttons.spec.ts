import { expect, it } from 'vitest';

import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';

const point = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'place',
  placeType: 'switch',
  switchType: 'button',
  position: { x: 10, y: 20 },
  description: 'Opens a door',
  url: 'https://example.com/button',
};

it('round-trips a Button, derives its title and resolves the icon with the application base URL', () => {
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a point');
  }

  expect(mapEntityLabel(entity)).toBe('Button');
  expect(createPointIconResolver(['/public/images/entities/point/place/switch/button.png'], '/map/')(entity)).toBe(
    '/map/images/entities/point/place/switch/button.png'
  );
  expect(createPointIconResolver([], '/')(entity)).toBeNull();
});

it.each([{ variant: 1 }, { blockerType: 'door' }, { trapType: 'spear' }, { faithCost: 1 }])(
  'rejects unrelated subtype fields on Buttons: %j',
  (fields) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...fields }] })).toThrow();
  }
);
