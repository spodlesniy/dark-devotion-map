import { describe, expect, it } from 'vitest';

import { applyEntityTreeSearch, type SearchableEntityTreeNode } from 'src/helpers/applyEntityTreeSearch';
import { type EntityTreeNode, entityTreeNodes } from 'src/helpers/entityTree';
import { treeLeafIds, treeVisibility } from 'src/helpers/treeVisibility';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

const entities: readonly MapEntity[] = [
  { id: 'a', type: MapEntityType.Enemy, title: 'Guard', isBoss: false, position: { x: 1, y: 2 } },
  { id: 'b', type: MapEntityType.Enemy, title: 'Guard', isBoss: false, position: { x: 3, y: 4 } },
  { id: 'c', type: MapEntityType.Enemy, title: 'Knight', isBoss: false, position: { x: 5, y: 6 } },
  { id: 'keeper', type: MapEntityType.Npc, title: 'Keeper', position: { x: 7, y: 8 } },
];

function indexNodes(nodes: readonly SearchableEntityTreeNode[]): Map<string, SearchableEntityTreeNode> {
  return new Map(nodes.flatMap((node) => [[node.id, node] as const, ...indexNodes(node.children)]));
}

function freezeNodes(nodes: readonly EntityTreeNode[]) {
  for (const node of nodes) {
    freezeNodes(node.children);
    Object.freeze(node);
  }

  Object.freeze(nodes);
}

describe('Entity tree search presentation', () => {
  it('hides unmatched nested branches only during active search while keeping configured roots visible', () => {
    const source = entityTreeNodes(entities);
    freezeNodes(source);
    const nodes = indexNodes(applyEntityTreeSearch(source, new Set(['a']), 'guard'));
    expect(nodes.get('npc')).toMatchObject({ count: 0, showWhenNoMatches: true, hidden: false });
    expect(nodes.get('item')).toMatchObject({ count: 0, hidden: false });
    expect(nodes.get('enemy:boss')).toMatchObject({ count: 0, hidden: true });
    expect(nodes.get('enemy:regular:group:Knight')).toMatchObject({ count: 0, hidden: true });
    expect(nodes.get('enemy:regular:group:Guard')).toMatchObject({ count: 1, hidden: false });
    expect([...source].every((node) => node.showWhenNoMatches === true)).toBe(true);
    const cleared = indexNodes(applyEntityTreeSearch(source, new Set(entities.map((entity) => entity.id))));
    expect(cleared.get('enemy:boss')?.hidden).toBe(false);
    expect(cleared.get('enemy:regular:group:Knight')?.hidden).toBe(false);
    expect(source).toEqual(entityTreeNodes(entities));
    expect(treeLeafIds(nodes.get('enemy') as SearchableEntityTreeNode)).toEqual(['enemy:boss', 'a', 'b', 'c']);
  });

  it.each([undefined, false, true])('honors showWhenNoMatches=%s at configured and generated levels', (value) => {
    const config = value === undefined ? {} : { showWhenNoMatches: value };
    const source = entityTreeNodes(entities, [
      {
        id: 'custom',
        title: 'Custom',
        matches: () => true,
        ...config,
        grouping: { getKey: (entity) => entity.title ?? '', ...config },
      },
    ]);
    const nodes = indexNodes(applyEntityTreeSearch(source, new Set(), 'missing'));
    expect(nodes.get('custom')?.hidden).toBe(value !== true);
    expect(nodes.get('custom:group:Guard')?.hidden).toBe(value !== true);
    expect(indexNodes(applyEntityTreeSearch(source, new Set())).get('custom')?.hidden).toBe(false);
  });

  it('requests expansion through every matching category level but leaves generated groups unchanged by default', () => {
    const source = entityTreeNodes(entities);
    const result = indexNodes(applyEntityTreeSearch(source, new Set(['a']), 'guard'));
    expect(result.get('enemy')).toMatchObject({ expandOnSearch: true, expansionRequest: 'guard' });
    expect(result.get('enemy:regular')).toMatchObject({ expansionRequest: 'guard' });
    expect(result.get('enemy:regular:group:Guard')).toMatchObject({ expandOnSearch: false, count: 1 });
    expect(result.get('enemy:regular:group:Guard')?.expansionRequest).toBeUndefined();
    expect(result.get('npc')?.expansionRequest).toBeUndefined();
    expect(result.get('a')?.expansionRequest).toBeUndefined();
    const cleared = indexNodes(applyEntityTreeSearch(source, new Set(entities.map((entity) => entity.id))));
    expect([...cleared.values()].every((node) => node.expansionRequest === undefined)).toBe(true);
  });

  it('allows category opt-out and generated group opt-in independently', () => {
    const source = entityTreeNodes(entities, [
      {
        id: 'custom',
        title: 'Custom',
        matches: () => true,
        expandOnSearch: false,
        grouping: { getKey: (entity) => entity.title ?? '', expandOnSearch: true },
      },
    ]);
    const nodes = indexNodes(applyEntityTreeSearch(source, new Set(['a']), 'guard'));
    expect(nodes.get('custom')?.expansionRequest).toBeUndefined();
    expect(nodes.get('custom:group:Guard')?.expansionRequest).toBe('guard');
    expect(nodes.get('custom:group:Knight')?.expansionRequest).toBeUndefined();
  });

  it('projects matches through nested groups while preserving membership and entity references', () => {
    const source = entityTreeNodes(entities);
    freezeNodes(source);
    const result = applyEntityTreeSearch(source, new Set(['a']));
    const nodes = indexNodes(result);
    expect(nodes.get('a')).toMatchObject({ hidden: false, entity: entities[0] });
    expect(nodes.get('a')?.entity).toBe(entities[0]);
    expect(nodes.get('b')).toMatchObject({ hidden: true, entity: entities[1] });
    expect(nodes.get('enemy:regular:group:Guard')).toMatchObject({ count: 1, countChanged: true, disabled: false });
    expect(nodes.get('enemy:regular')).toMatchObject({ count: 1, countChanged: true, disabled: false });
    expect(nodes.get('enemy')).toMatchObject({ count: 1, countChanged: true, disabled: false });
    expect(nodes.get('enemy:regular:group:Knight')).toMatchObject({ count: 0, countChanged: true, disabled: true });
    expect(nodes.get('npc')).toMatchObject({ count: 0, countChanged: true, disabled: true });
    expect(source).toEqual(entityTreeNodes(entities));
    expect(result.flatMap(treeLeafIds)).toEqual(source.flatMap(treeLeafIds));
  });

  it('retains empty categories with unchanged zero counts and disabled disclosure', () => {
    const source = entityTreeNodes(entities);
    const result = applyEntityTreeSearch(source, new Set());
    const nodes = indexNodes(result);
    expect(result.map((node) => node.id)).toEqual(source.map((node) => node.id));
    expect(nodes.get('enemy:boss')).toMatchObject({ count: 0, countChanged: false, disabled: true });
    expect(nodes.get('enemy')).toMatchObject({ count: 0, countChanged: true, disabled: true });
    expect(nodes.get('a')?.hidden).toBe(true);
    expect(nodes.get('b')?.hidden).toBe(true);
  });

  it('restores the unfiltered presentation from the complete tree without retaining prior search state', () => {
    const source = entityTreeNodes(entities);
    applyEntityTreeSearch(source, new Set(['a']));
    const nodes = indexNodes(applyEntityTreeSearch(source, new Set(entities.map((entity) => entity.id))));
    expect(nodes.get('enemy')).toMatchObject({ count: 3, countChanged: false, disabled: false });
    expect(nodes.get('enemy:regular:group:Guard')).toMatchObject({ count: 2, countChanged: false, disabled: false });
    expect(nodes.get('b')?.hidden).toBe(false);
  });

  it('keeps map visibility independent of search, including title-only members and static categories', () => {
    const source = entityTreeNodes(entities, [
      { id: 'static', title: 'Static', collapsible: false, matches: () => true },
    ]);
    const result = applyEntityTreeSearch(source, new Set(['a']));
    expect(result[0]).toMatchObject({ collapsible: false, count: 1, countChanged: true, disabled: false });
    expect(treeVisibility(result[0] as SearchableEntityTreeNode, new Set(['a']))).toBe('mixed');
    const grouped = indexNodes(applyEntityTreeSearch(entityTreeNodes(entities), new Set(['a'])));
    const guard = grouped.get('enemy:regular:group:Guard');

    if (!guard) {
      throw new Error('Expected Guard group');
    }

    expect(guard.children.every((child) => child.showVisibility === false)).toBe(true);
    expect(treeVisibility(guard, new Set(['a']))).toBe('mixed');
  });
});
