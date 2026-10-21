import { describe, expect, it } from 'vitest';

import database from 'src/data/entities.json';
import { type EntityTreeNode, entityTreeHiddenIds, entityTreeNodes, findEntityTreeNode } from 'src/helpers/entityTree';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { treeLeafIds } from 'src/helpers/treeVisibility';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

function collectEntities(nodes: readonly EntityTreeNode[]): string[] {
  return nodes.flatMap((node) => (node.entity ? [node.entity.id] : collectEntities(node.children)));
}

it('supports optional child comparators without mutating the database or changing default order', () => {
  const members: readonly MapEntity[] = ['Zulu', 'Alpha', 'Alpha'].map((title, index) => ({
    id: String(index),
    type: MapEntityType.Npc,
    title,
    position: { x: 0, y: 0 },
  }));
  const group = { id: 'custom', title: 'Custom', matches: () => true };
  expect(entityTreeNodes(members, [group])[0]?.children.map((node) => node.id)).toEqual(['0', '1', '2']);
  expect(
    entityTreeNodes(members, [{ ...group, sortChildren: (a, b) => a.title.localeCompare(b.title) }])[0]?.children.map(
      (node) => node.id
    )
  ).toEqual(['1', '2', '0']);
  expect(members.map((entity) => entity.id)).toEqual(['0', '1', '2']);
});

it('sorts NPCs, Titles, Codex, Bosses and Regular title groups alphabetically with natural numeric order', () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      { type: 'npc' },
      { type: 'title', size: 'medium', color: '#ffffff' },
      { type: 'codex' },
      { type: 'enemy', isBoss: true },
      { type: 'enemy', isBoss: false },
    ].flatMap((details, category) =>
      ['Zulu', 'alpha 10', 'Alpha 2'].map((title, index) => ({
        ...details,
        id: `${category + 1}${index + 1}111111-0000-4000-8000-000000000000`,
        title,
        position: { x: 0, y: 0 },
      }))
    ),
  }).entities;
  const nodes = entityTreeNodes(members);

  for (const id of ['npc', 'title', 'codex', 'enemy:boss', 'enemy:regular']) {
    expect(findEntityTreeNode(nodes, id)?.children.map((node) => node.title)).toEqual(['Alpha 2', 'alpha 10', 'Zulu']);
  }
});

it('groups only multipart Codex by title, sorts parts numerically and preserves stable IDs and visibility membership', () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      ...[10, 2, 1, 2].map((part, index) => ({
        id: `${index + 1}1111111-0000-4000-8000-000000000000`,
        type: 'codex',
        title: 'Journal',
        part,
        totalParts: 12,
        position: { x: 0, y: 0 },
      })),
      { id: '51111111-0000-4000-8000-000000000000', type: 'codex', title: 'Alpha', position: { x: 0, y: 0 } },
    ],
  }).entities;
  const nodes = entityTreeNodes(members);
  const codex = findEntityTreeNode(nodes, 'codex');
  expect(codex?.children.map((node) => node.title)).toEqual(['Alpha', 'Journal']);
  const journal = findEntityTreeNode(nodes, 'codex:group:Journal');
  expect(journal?.count).toBe(4);
  expect(journal?.defaultExpanded).toBe(false);
  expect(journal?.children.map((node) => node.title)).toEqual([
    'Journal 1/12',
    'Journal 2/12',
    'Journal 2/12',
    'Journal 10/12',
  ]);
  expect(journal?.children.map((node) => node.entity)).toEqual([members[2], members[1], members[3], members[0]]);
  expect(journal?.children.every((node) => node.showVisibility === false)).toBe(true);
  expect(entityTreeHiddenIds(nodes, new Map([['codex:group:Journal', false]]))).toEqual(
    new Set(members.slice(0, 4).map((entity) => entity.id))
  );
});

describe('Entity tree adapter data', () => {
  it('uses explicit Codex groups across different titles and supports entries without parts', () => {
    const members = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        {
          id: '11111111-0000-4000-8000-000000000000',
          type: 'codex',
          title: 'Later entry',
          group: '  Records  ',
          part: 2,
          totalParts: 3,
          position: { x: 0, y: 0 },
        },
        {
          id: '21111111-0000-4000-8000-000000000000',
          type: 'codex',
          title: 'Earlier entry',
          group: 'Records',
          part: 1,
          totalParts: 3,
          position: { x: 0, y: 0 },
        },
        {
          id: '31111111-0000-4000-8000-000000000000',
          type: 'codex',
          title: 'Introduction',
          group: 'Records',
          position: { x: 0, y: 0 },
        },
      ],
    }).entities;
    const nodes = entityTreeNodes(members);
    const group = findEntityTreeNode(nodes, 'codex:group:Records');
    expect(group?.title).toBe('Records');
    expect(group?.count).toBe(3);
    expect(group?.children.map((node) => node.title)).toEqual(['Introduction', 'Earlier entry 1/3', 'Later entry 2/3']);
    expect(entityTreeHiddenIds(nodes, new Map([['codex:group:Records', false]]))).toEqual(
      new Set(members.map((entity) => entity.id))
    );
  });

  it('places every repository entity in exactly one leaf without modifying the database', () => {
    const parsed = parseMapEntityDatabase(database);
    const nodes = entityTreeNodes(parsed.entities);
    const ids = collectEntities(nodes);
    expect(ids.length).toBe(parsed.entities.length);
    expect(new Set(ids)).toEqual(new Set(parsed.entities.map((entity) => entity.id)));
    const allNodeIds: string[] = [];

    function visit(items: readonly EntityTreeNode[]) {
      for (const node of items) {
        allNodeIds.push(node.id);
        visit(node.children);
      }
    }

    visit(nodes);
    expect(new Set(allNodeIds).size).toBe(allNodeIds.length);
    expect(parsed.entities[0]).toEqual(parseMapEntityDatabase(database).entities[0]);
  });

  it('supports deeper group configuration and inherited rules with explicit leaf exceptions', () => {
    const parsed = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        {
          id: '11111111-0000-4000-8000-000000000000',
          type: 'enemy',
          title: 'Guard',
          isBoss: false,
          position: { x: 1, y: 2 },
        },
      ],
    });
    const matches = (entity: (typeof parsed.entities)[number]) => entity.type === MapEntityType.Enemy;
    const nodes = entityTreeNodes(parsed.entities, [
      {
        id: 'root',
        showCount: false,
        showVisibility: false,
        showIcon: false,
        title: 'Root',
        matches,
        children: [{ id: 'middle', title: 'Middle', matches, children: [{ id: 'deep', title: 'Deep', matches }] }],
      },
    ]);
    expect(nodes[0]?.count).toBe(1);
    expect(nodes[0]).toMatchObject({ showCount: false, showVisibility: false, showIcon: false });
    expect(nodes[0] ? treeLeafIds(nodes[0]) : []).toEqual([parsed.entities[0]?.id]);
    expect(entityTreeHiddenIds(nodes, new Map([['root', false]]))).toEqual(new Set([parsed.entities[0]?.id]));
    expect(
      entityTreeHiddenIds(
        nodes,
        new Map([
          ['root', false],
          ['deep', true],
        ])
      )
    ).toEqual(new Set());
  });
});

it('builds dynamic group nodes from callbacks with stable encoded IDs and configurable presentation', () => {
  const parsed = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ id: '11111111-0000-4000-8000-000000000000', type: 'npc', title: 'NPC', position: { x: 1, y: 2 } }],
  });
  const nodes = entityTreeNodes(parsed.entities, [
    {
      id: 'custom',
      title: 'Custom',
      matches: () => true,
      grouping: {
        getKey: () => 'a/b',
        getTitle: (key) => `Group ${key}`,
        getIcon: () => ({ type: MapEntityType.Npc }),
        showIcon: false,
        showVisibility: false,
        showCount: false,
        showEntityVisibility: false,
        alwaysExpanded: true,
      },
    },
  ]);
  const grouped = nodes[0]?.children[0];
  expect(grouped).toMatchObject({
    id: 'custom:group:a%2Fb',
    title: 'Group a/b',
    count: 1,
    icon: { type: MapEntityType.Npc },
    showIcon: false,
    showVisibility: false,
    showCount: false,
    alwaysExpanded: true,
  });
  expect(grouped?.children[0]).toMatchObject({ id: parsed.entities[0]?.id, showVisibility: false });
  expect(grouped?.children[0]?.entity).toBe(parsed.entities[0]);
});
