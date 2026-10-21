import { describe, expect, it } from 'vitest';

import { removeMapPoint, updateMapPoint } from 'src/helpers/editMapPoint';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import type { MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

const point: MapPointEntity = {
  title: 'Test point',
  id: 'abcdefab-cdef-4abc-abcd-abcdefabcdef',
  type: MapEntityType.Npc,
  position: { x: 100, y: 200 },
};
const database = parseMapEntityDatabase({
  schemaVersion: 2,
  entities: [
    point,
    { id: 'bbbbbbbb-cdef-4abc-abcd-abcdefabcdef', title: 'Other point', type: 'npc', position: { x: 0, y: 0 } },
  ],
});

describe('Point database edits', () => {
  it('validates replacement coordinates and rejects missing points without changing the input', () => {
    expect(() => updateMapPoint(database, { ...point, position: { x: 7401, y: 0 } })).toThrow();
    expect(() => updateMapPoint(database, { ...point, id: crypto.randomUUID() })).toThrow('no longer exists');
    expect(database.entities[0]).toEqual(point);
  });

  it('removes only the matching point and preserves other points and the original database', () => {
    expect(removeMapPoint(database, point.id).entities).toEqual([database.entities[1]]);
    expect(removeMapPoint(database, 'missing-id').entities).toEqual(database.entities);
    expect(database.entities).toHaveLength(2);
  });
});
