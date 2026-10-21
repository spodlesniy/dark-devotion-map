import { expect, it } from 'vitest';

import { entityTreeHiddenIds, entityTreeNodes, findEntityTreeNode } from 'src/helpers/entityTree';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';

const base = {
  id: '11111111-0000-4000-8000-000000000000',
  type: 'place',
  placeType: 'switch',
  position: { x: 1, y: 2 },
};

it.each([undefined, null, '', 'other', 1])('rejects unsupported Switch subtype %j', (switchType) => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, switchType }] })).toThrow('switchType');
});

it.each(['lever', 'button', 'blood-donation'])('rejects removed placeType %s', (placeType) => {
  expect(() => parseMapEntityDatabase({ schemaVersion: 2, entities: [{ ...base, placeType }] })).toThrow('placeType');
});

it.each([
  { placeType: 'chest', variant: 1 },
  { type: 'npc', title: 'NPC' },
])('rejects switchType on unrelated variants %j', (details) => {
  expect(() =>
    parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        { ...('type' in details ? { id: base.id, position: base.position } : base), ...details, switchType: 'lever' },
      ],
    })
  ).toThrow('switchType');
});

it('partitions Switches into three static subtype rows and keeps inherited visibility', () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: Object.values(MapPlaceSwitchType).map((switchType, index) => ({
      ...base,
      id: `${index + 1}1111111-0000-4000-8000-000000000000`,
      switchType,
    })),
  }).entities;
  const nodes = entityTreeNodes(members);
  const switches = findEntityTreeNode(nodes, 'place:switch');
  expect(switches?.count).toBe(3);
  expect(switches?.collapsible).toBe(true);
  expect(switches?.children.map((node) => [node.title, node.count, node.collapsible])).toEqual([
    ['Levers', 1, false],
    ['Buttons', 1, false],
    ['Blood donations', 1, false],
  ]);
  expect(entityTreeHiddenIds(nodes, new Map([['place:switch', false]]))).toEqual(
    new Set(members.map((entity) => entity.id))
  );
  expect(entityTreeHiddenIds(nodes, new Map([['place:switch:button', false]]))).toEqual(new Set([members[1]?.id]));
});
