import { expect, it } from 'vitest';

import { entityGroups } from 'src/helpers/entityGroups';
import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { createPointIconResolver } from 'src/helpers/pointIcons';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceType } from 'src/types/MapPlaceType';

const base = { id: '11111111-0000-4000-8000-000000000000', type: 'place', position: { x: 10, y: 20 } };

it.each([MapPlaceAltarType.TeleportationAltar, MapPlaceAltarType.FaithStatue])(
  'loads and exports %s without Faith cost',
  (altarType) => {
    const database = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [{ ...base, placeType: 'altar', altarType, faithCost: 20 }],
    });
    expect(database.entities[0]).not.toHaveProperty('faithCost');
    expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual({
      ...base,
      placeType: 'altar',
      altarType,
    });
  }
);

it('rejects obsolete Teleporter entities', () => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, placeType: 'teleporter' }] })).toThrow(
    'placeType'
  );
});

it('partitions Altars, Teleporters and Mirror teleporters without overlap', () => {
  const database = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      { ...base, placeType: 'altar', altarType: 'runic-altar' },
      { ...base, id: '22222222-0000-4000-8000-000000000000', placeType: 'altar', altarType: 'teleportation-altar' },
      { ...base, id: '33333333-0000-4000-8000-000000000000', placeType: 'mirror-teleporter' },
    ],
  });
  const places = entityGroups.find((group) => group.id === MapEntityType.Place);
  const titles = ['Altars', 'Teleporters', 'Mirror teleporters'];

  for (const [index, entity] of database.entities.entries()) {
    expect(places?.children?.filter((group) => group.matches(entity)).map((group) => group.title)).toEqual([
      titles[index],
    ]);
  }
});

it('uses the relocated Teleportation Altar image and a separate Mirror Teleporter path', () => {
  const resolve = createPointIconResolver(
    [
      '/public/images/entities/point/place/altar/teleportation-altar.png',
      '/public/images/entities/point/place/mirror-teleporter.png',
      '/public/images/entities/point/place/altar.png',
    ],
    '/map/'
  );
  expect(
    resolve({
      type: MapEntityType.Place,
      placeType: MapPlaceType.Altar,
      altarType: MapPlaceAltarType.TeleportationAltar,
    })
  ).toBe('/map/images/entities/point/place/altar/teleportation-altar.png');
  expect(
    resolve({ type: MapEntityType.Place, placeType: MapPlaceType.Altar, altarType: MapPlaceAltarType.RunicAltar })
  ).toBe('/map/images/entities/point/place/altar.png');
  expect(resolve({ type: MapEntityType.Place, placeType: MapPlaceType.MirrorTeleporter })).toBe(
    '/map/images/entities/point/place/mirror-teleporter.png'
  );
  expect(
    createPointIconResolver([], '/')({ type: MapEntityType.Place, placeType: MapPlaceType.MirrorTeleporter })
  ).toBeNull();
});
