import { expect, it } from 'vitest';

import { blockerTitles } from 'src/helpers/blockerTitles';
import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';

const base = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'place',
  placeType: 'blocker',
  position: { x: 10, y: 20 },
};

it.each(Object.values(MapPlaceBlockerType))(
  'round-trips and labels a %s blocker and resolves its exact image',
  (blockerType) => {
    const point = {
      ...base,
      blockerType,
      ...(blockerType === MapPlaceBlockerType.FaithLock ? { faithCost: 0 } : {}),
      description: 'Details',
      url: 'https://example.com/blocker',
    };
    const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
    expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
    const entity = database.entities[0];

    if (!entity) {
      throw new Error('Expected a point');
    }

    expect(mapEntityLabel(entity)).toBe(blockerTitles[blockerType]);
    const path = `point/place/blocker/${blockerType}.png`;
    expect(createPointIconResolver([`/public/images/entities/${path}`], '/map/')(entity)).toBe(
      `/map/images/entities/${path}`
    );
    expect(createPointIconResolver(['/public/images/entities/point/place/blocker.png'], '/')(entity)).toBeNull();
  }
);

it.each([undefined, null, '', '10', -1, Number.NaN, Number.POSITIVE_INFINITY])(
  'rejects an invalid or missing Faith Lock cost: %j',
  (faithCost) => {
    expect(() =>
      parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, blockerType: 'faith-lock', faithCost }] })
    ).toThrow('faithCost');
  }
);

it.each(Object.values(MapPlaceBlockerType).filter((value) => value !== MapPlaceBlockerType.FaithLock))(
  'rejects faithCost on %s',
  (blockerType) => {
    expect(() =>
      parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, blockerType, faithCost: 10 }] })
    ).toThrow('faithCost');
  }
);

it.each([undefined, null, 'CrackedWall', 'cracked_wall', 'spiked-pit', 'death-pit', 'unknown'])(
  'rejects unsupported blocker types: %j',
  (blockerType) => {
    expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, blockerType }] })).toThrow(
      'blockerType'
    );
  }
);

it('rejects blocker subtype fields on other categories and places', () => {
  expect(() =>
    parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, type: 'npc', blockerType: 'door' }] })
  ).toThrow('only valid');
  expect(() =>
    parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [{ ...base, placeType: 'mirror-teleporter', blockerType: 'door' }],
    })
  ).toThrow('only valid');
});
