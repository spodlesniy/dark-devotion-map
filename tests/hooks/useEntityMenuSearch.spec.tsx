import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useEntityMenuSearch } from 'src/hooks/useEntityMenuSearch';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

const entities: readonly MapEntity[] = [
  { id: 'a', title: 'Ancient Altar', type: MapEntityType.Npc, position: { x: 1, y: 2 } },
  {
    id: 'b',
    title: 'Hezek - The Baptized',
    description: 'Altar keeper',
    type: MapEntityType.Enemy,
    isBoss: true,
    position: { x: 1, y: 2 },
  },
  { id: 'c', title: 'ALTAR Hall', type: MapEntityType.Npc, position: { x: 0, y: 0 } },
];

describe('Entity menu title search', () => {
  it('matches the applied query against partial titles case-insensitively, ignoring descriptions', () => {
    const { result } = renderHook(() => useEntityMenuSearch(entities, 'alt'));
    expect(result.current).toEqual([entities[0], entities[2]]);
  });

  it('returns the complete database for an empty applied query', () => {
    const { result } = renderHook(() => useEntityMenuSearch(entities, ''));
    expect(result.current).toBe(entities);
  });

  it('uses updated entities and queries without modifying the input database', () => {
    const { result, rerender } = renderHook(({ data, query }) => useEntityMenuSearch(data, query), {
      initialProps: { data: entities, query: 'alt' },
    });
    rerender({ data: entities, query: 'hez' });
    expect(result.current).toEqual([entities[1]]);
    const changed = entities.map((entity) => ({ ...entity, title: 'Another title' }));
    rerender({ data: changed, query: 'hez' });
    expect(result.current).toEqual([]);
    expect(entities[0]?.title).toBe('Ancient Altar');
  });
});
