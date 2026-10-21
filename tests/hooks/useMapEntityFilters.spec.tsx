import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type EntityVisibilityGroup, entityGroups } from 'src/helpers/entityGroups';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { useMapEntityFilters } from 'src/hooks/useMapEntityFilters';

const variants = [
  { type: 'npc' },
  { type: 'codex' },
  { type: 'title', size: 'medium', color: '#c5bfb2' },
  { type: 'enemy', isBoss: true },
  { type: 'enemy', isBoss: false },
  { type: 'place', placeType: 'tablet', tabletType: 'faith' },
  { type: 'place', placeType: 'altar', altarType: 'runic-altar' },
  { type: 'place', placeType: 'altar', altarType: 'teleportation-altar' },
  { type: 'place', placeType: 'mirror-teleporter' },
  { type: 'place', placeType: 'lost-room' },
  { type: 'place', placeType: 'blocker', blockerType: 'door' },
  { type: 'place', placeType: 'trap', trapType: 'axe' },
  { type: 'place', placeType: 'chest', variant: 1 },
  { type: 'place', placeType: 'switch', switchType: 'lever' },
  { type: 'place', placeType: 'switch', switchType: 'button' },
  { type: 'place', placeType: 'prison-cell' },
  { type: 'place', placeType: 'switch', switchType: 'blood-donation' },
  ...['weapon', 'left-hand', 'armor', 'rune', 'trinket', 'consumable', 'prison-key', 'arrows'].map((itemType) => ({
    type: 'item',
    itemType,
  })),
];
const entities = parseMapEntityDatabase({
  schemaVersion: 2,
  entities: [
    ...variants.map((variant, index) => ({
      ...variant,
      id: `${String(index + 2).padStart(8, '0')}-0000-4000-8000-000000000000`,
      title: `Point ${index}`,
      position: { x: 1, y: 1 },
    })),
  ],
}).entities;
const groups = entityGroups.flatMap<EntityVisibilityGroup>((group) =>
  group.children?.length ? [...group.children] : [group]
);

describe('Map entity filters', () => {
  it.each(groups)('hides only $title and restores original order and references', (group) => {
    const { result } = renderHook(() => useMapEntityFilters(entities));
    expect(result.current.activeFilterIds.size).toBe(0);
    expect(result.current.visibleEntities).toEqual(entities);
    act(() => result.current.setFilter(group.id, (entity) => !group.matches(entity)));
    expect(result.current.visibleEntities).toHaveLength(entities.filter((entity) => !group.matches(entity)).length);
    expect(result.current.visibleEntities.some(group.matches)).toBe(false);
    expect(result.current.activeFilterIds.has(group.id)).toBe(true);
    act(() => result.current.setFilter(group.id, null));
    expect(result.current.visibleEntities).toEqual(entities);
    expect(result.current.visibleEntities[0]).toBe(entities[0]);
  });

  it('combines independent predicates without changing the database', () => {
    const { result } = renderHook(() => useMapEntityFilters(entities));
    act(() => {
      result.current.setFilter('npc', (entity) => entity.type !== 'npc');
      result.current.setFilter('title', (entity) => entity.title === 'Point 0');
    });
    expect(result.current.visibleEntities).toEqual([]);
    act(() => result.current.setFilter('npc', null));
    expect(result.current.visibleEntities).toEqual([entities[0]]);
    expect(entities.length).toBe(variants.length);
  });
});
