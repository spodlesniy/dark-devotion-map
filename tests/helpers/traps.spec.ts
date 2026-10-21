import { expect, it } from 'vitest';

import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';
import { trapTitles } from 'src/helpers/trapTitles';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';

const base = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'place',
  placeType: 'trap',
  position: { x: 10, y: 20 },
};

it.each(Object.values(MapPlaceTrapType))('round-trips, labels and resolves the exact icon of a %s trap', (trapType) => {
  const point = { ...base, trapType, description: 'Trap details', url: 'https://example.com/trap' };
  const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
  expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
  const entity = database.entities[0];

  if (!entity) {
    throw new Error('Expected a point');
  }

  expect(mapEntityLabel(entity)).toBe(trapTitles[trapType]);
  const path = `point/place/trap/${trapType}.png`;
  expect(createPointIconResolver([`/public/images/entities/${path}`], '/map/')(entity)).toBe(
    `/map/images/entities/${path}`
  );
  expect(createPointIconResolver(['/public/images/entities/point/place/trap.png'], '/')(entity)).toBeNull();
});

it.each([undefined, null, 'Spear', 'spinning_blade', 'posion-plant', 'spiked-pit', 'unknown'])(
  'rejects invalid trap types: %j',
  (trapType) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, trapType }] })).toThrow('trapType');
  }
);

it('preserves the game spelling Stalagtight and uses Poison Plant', () => {
  expect(MapPlaceTrapType.Stalagtight).toBe('stalagtight');
  expect(trapTitles[MapPlaceTrapType.Stalagtight]).toBe('Stalagtight');
  expect(MapPlaceTrapType.PoisonPlant).toBe('poison-plant');
  expect(trapTitles[MapPlaceTrapType.PoisonPlant]).toBe('Poison Plant');
});

it('rejects fields belonging to other categories and places', () => {
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, type: 'npc', trapType: 'spear' }] })
  ).toThrow('only valid');
  expect(() =>
    parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [{ ...base, placeType: 'blocker', blockerType: 'door', trapType: 'spear' }],
    })
  ).toThrow('only valid');
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, trapType: 'spear', faithCost: 10 }] })
  ).toThrow('faithCost');
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, trapType: 'spear', blockerType: 'door' }] })
  ).toThrow('blockerType');
});
