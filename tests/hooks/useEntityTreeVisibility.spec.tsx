import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { useEntityTreeVisibility } from 'src/hooks/useEntityTreeVisibility';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

const entities: readonly MapEntity[] = [
  { id: 'a', type: MapEntityType.Enemy, title: 'A', isBoss: false, position: { x: 1, y: 2 } },
  { id: 'b', type: MapEntityType.Enemy, title: 'B', isBoss: false, position: { x: 3, y: 4 } },
  { id: 'c', type: MapEntityType.Enemy, title: 'Boss', isBoss: true, position: { x: 5, y: 6 } },
];

describe('Entity tree map visibility', () => {
  it.each(['hidden-group', 'isolation'])('reveals a new entity before the database rerender under %s rules', (mode) => {
    const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
      initialProps: { members: entities },
    });

    act(() => {
      if (mode === 'isolation') {
        result.current.showOnly('enemy:boss');
      } else {
        result.current.toggleVisibility('enemy:regular');
      }
    });

    const created: MapEntity = {
      id: 'created',
      type: MapEntityType.Enemy,
      isBoss: false,
      title: 'A',
      position: { x: 9, y: 10 },
    };
    const members = [...entities, created];
    act(() => result.current.showEntity(created.id, members));
    rerender({ members });
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['c', 'created']);
    expect(result.current.hiddenIds.has('a')).toBe(true);
    expect(result.current.hiddenIds.has('b')).toBe(true);
    act(() => result.current.toggleVisibility('enemy:regular'));
    expect(result.current.visibleEntities).toEqual(members);
  });

  it('isolates the full selected branch, replaces old exceptions, and inherits rules for new entities', () => {
    const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
      initialProps: { members: entities },
    });
    act(() => result.current.toggleVisibility('a'));
    act(() => result.current.showOnly('enemy:regular'));
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['a', 'b']);
    const npc: MapEntity = { id: 'new-npc', type: MapEntityType.Npc, title: 'New NPC', position: { x: 0, y: 0 } };
    const regular: MapEntity = {
      id: 'new-regular',
      type: MapEntityType.Enemy,
      title: 'New regular',
      isBoss: false,
      position: { x: 0, y: 0 },
    };
    rerender({ members: [...entities, npc, regular] });
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['a', 'b', 'new-regular']);
    act(() => result.current.showOnly('a'));
    expect(result.current.visibleEntities).toEqual([entities[0]]);
    act(() => result.current.showOnly('a'));
    expect(result.current.visibleEntities).toEqual([entities[0]]);
    act(() => result.current.showOnly('missing'));
    expect(result.current.visibleEntities).toEqual([entities[0]]);
    act(() => result.current.resetVisibility());
    expect(result.current.visibleEntities).toHaveLength(5);
  });

  it('starts visible and toggles a parent in one update without mutating or reordering data', () => {
    const { result } = renderHook(() => useEntityTreeVisibility(entities));
    expect(result.current.visibleEntities).toEqual(entities);
    act(() => result.current.toggleVisibility('enemy'));
    expect(result.current.visibleEntities).toEqual([]);
    act(() => result.current.toggleVisibility('enemy'));
    expect(result.current.visibleEntities).toEqual(entities);
    expect(result.current.visibleEntities[0]).toBe(entities[0]);
  });

  it('inherits category rules for new entities and empty categories, then clears descendant overrides when a parent is enabled', () => {
    const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
      initialProps: { members: entities },
    });
    act(() => result.current.toggleVisibility('enemy:regular'));
    const created: MapEntity = {
      id: 'new',
      type: MapEntityType.Enemy,
      title: 'New',
      isBoss: false,
      position: { x: 9, y: 10 },
    };
    rerender({ members: [...entities, created] });
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['c']);
    act(() => result.current.showEntity('a'));
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['a', 'c']);
    act(() => result.current.toggleVisibility('enemy'));
    expect(result.current.visibleEntities).toHaveLength(4);
    act(() => result.current.toggleVisibility('npc'));
    const npc: MapEntity = { id: 'npc-new', type: MapEntityType.Npc, title: 'NPC', position: { x: 0, y: 0 } };
    rerender({ members: [...entities, created, npc] });
    expect(result.current.hiddenIds.has(npc.id)).toBe(true);
  });

  it('updates membership after edits, retains explicit per-entity settings, and ignores deleted entities in parent states', () => {
    const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
      initialProps: { members: entities },
    });
    act(() => result.current.toggleVisibility('enemy:regular'));
    const edited = entities.map((entity) =>
      entity.id === 'a' && entity.type === MapEntityType.Enemy ? { ...entity, isBoss: true } : entity
    );
    rerender({ members: edited });
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['a', 'c']);
    act(() => result.current.toggleVisibility('a'));
    rerender({ members: entities });
    expect(result.current.hiddenIds.has('a')).toBe(true);
    rerender({ members: entities.filter((entity) => entity.id !== 'a') });
    expect(result.current.hiddenIds.has('a')).toBe(false);
    act(() => result.current.toggleVisibility('missing-node'));
    expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['c']);
  });
});

it('inherits Regular title-group visibility and reveals only the located member', () => {
  const duplicate: MapEntity = {
    id: 'duplicate',
    type: MapEntityType.Enemy,
    title: 'A',
    isBoss: false,
    position: { x: 20, y: 30 },
  };
  const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
    initialProps: { members: entities },
  });
  act(() => result.current.toggleVisibility('enemy:regular:group:A'));
  expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['b', 'c']);
  rerender({ members: [...entities, duplicate] });
  expect(result.current.hiddenIds.has(duplicate.id)).toBe(true);
  act(() => result.current.showEntity(duplicate.id));
  expect(result.current.visibleEntities.map((entity) => entity.id)).toEqual(['b', 'c', 'duplicate']);
  act(() => result.current.toggleVisibility('enemy:regular:group:A'));
  expect(result.current.visibleEntities).toHaveLength(4);
});

it('does not create an unnecessary visibility exception when locating an already visible entity', () => {
  const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
    initialProps: { members: entities },
  });
  act(() => {
    result.current.toggleVisibility('enemy:boss');
    result.current.showEntity('a');
  });
  const edited = entities.map((entity) =>
    entity.id === 'a' && entity.type === MapEntityType.Enemy ? { ...entity, isBoss: true } : entity
  );
  rerender({ members: edited });
  expect(result.current.hiddenIds.has('a')).toBe(true);
});

it('toggles Tablet subtype groups, inherits preferences for added tablets, and follows subtype edits', () => {
  const faith = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      {
        id: '11111111-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'tablet',
        tabletType: 'faith',
        position: { x: 1, y: 2 },
      },
    ],
  }).entities;
  const { result, rerender } = renderHook(({ members }) => useEntityTreeVisibility(members), {
    initialProps: { members: faith },
  });
  act(() => result.current.toggleVisibility('place:tablet:group:faith'));
  expect(result.current.visibleEntities).toHaveLength(0);
  const added = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      ...faith,
      {
        id: '22222222-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'tablet',
        tabletType: 'faith',
        position: { x: 3, y: 4 },
      },
    ],
  }).entities;
  rerender({ members: added });
  expect(result.current.visibleEntities).toHaveLength(0);
  const edited = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: added.map((entity) => ({ ...entity, tabletType: 'damage' })),
  }).entities;
  rerender({ members: edited });
  expect(result.current.visibleEntities).toHaveLength(2);
  act(() => result.current.toggleVisibility('place:tablet:group:damage'));
  expect(result.current.visibleEntities).toHaveLength(0);
  act(() => result.current.toggleVisibility('place:tablet'));
  expect(result.current.visibleEntities).toHaveLength(2);
});
