import { expect, it } from 'vitest';

import { parseMapEntityDatabase, serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { createPointIconResolver } from 'src/helpers/pointIcons';
import { MapPlaceType } from 'src/types/MapPlaceType';

it.each([[MapPlaceType.PrisonCell, 'Prison Cell']])(
  'round-trips %s, derives its title and resolves only its named icon',
  (placeType, title) => {
    const point = {
      id: '11111111-0000-4000-8000-000000000000',
      type: 'place',
      placeType,
      position: { x: 10, y: 20 },
      description: 'Prison details',
      url: 'https://example.com/prison',
    };
    const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [point] });
    expect(JSON.parse(serializeMapEntityDatabase(database)).entities[0]).toEqual(point);
    const entity = database.entities[0];

    if (!entity) {
      throw new Error('Expected a point');
    }

    expect(mapEntityLabel(entity)).toBe(title);
    const path = `point/place/${placeType}.png`;
    expect(createPointIconResolver([`/public/images/entities/${path}`], '/map/')(entity)).toBe(
      `/map/images/entities/${path}`
    );
    expect(createPointIconResolver([], '/')(entity)).toBeNull();

    for (const fields of [{ variant: 1 }, { blockerType: 'door' }, { trapType: 'spear' }, { faithCost: 1 }]) {
      expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...point, ...fields }] })).toThrow();
    }
  }
);
