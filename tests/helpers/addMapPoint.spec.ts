import { describe, expect, it } from 'vitest';

import { addMapPoint } from 'src/helpers/addMapPoint';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';

describe('Adding a point to the working database', () => {
  it('generates UUID v4 IDs for new points without changing existing IDs or mutating the database', () => {
    const database = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        {
          title: 'Test point',
          id: '11111111-0000-4000-8000-000000000000',
          type: 'item',
          itemType: 'weapon',
          position: { x: 0, y: 0 },
        },
        { id: '22222222-0000-4000-8000-000000000000', title: 'Other point', type: 'npc', position: { x: 0, y: 0 } },
        {
          title: 'Test point',
          id: '33333333-0000-4000-8000-000000000000',
          type: 'npc',
          position: { x: 1, y: 1 },
        },
      ],
    });
    const result = addMapPoint(
      database,
      {
        title: 'Test point',
        type: MapEntityType.Enemy,
        isBoss: false,
        description: 'Boss room',
        url: 'https://example.com/enemy',
      },
      { x: 7400, y: 11600 }
    );
    expect(result.entity).toEqual({
      title: 'Test point',
      id: expect.any(String),
      description: 'Boss room',
      url: 'https://example.com/enemy',
      type: 'enemy',
      isBoss: false,
      isElite: false,
      position: { x: 7400, y: 11600 },
    });
    expect(result.database.entities).toEqual([...database.entities, result.entity]);
    expect(database.entities).toHaveLength(3);
    const next = addMapPoint(
      result.database,
      { title: 'Test point', type: MapEntityType.Item, itemType: MapItemType.Weapon },
      { x: 1, y: 1 }
    );
    expect(next.entity.id).not.toBe(result.entity.id);
    expect(parseMapEntityDatabase(next.database)).toEqual(next.database);
  });

  it('validates additions before returning an updated database', () => {
    const database = parseMapEntityDatabase({ schemaVersion: 2, entities: [] });
    expect(() =>
      addMapPoint(database, { title: 'Test point', type: MapEntityType.Npc }, { x: Number.NaN, y: 0 })
    ).toThrow();
    expect(() => addMapPoint(database, { title: 'Test point', type: MapEntityType.Npc }, { x: 7401, y: 0 })).toThrow();
    expect(database.entities).toHaveLength(0);
  });
});
