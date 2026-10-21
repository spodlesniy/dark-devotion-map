import { useMemo, useState } from 'react';

import { clearEntityTreeRules, entityTreeHiddenIds, entityTreeNodes, findEntityTreeNode } from 'src/helpers/entityTree';
import { filterMapEntities } from 'src/helpers/filterMapEntities';
import { treeVisibility } from 'src/helpers/treeVisibility';
import type { MapEntity } from 'src/types/MapEntity';

export function useEntityTreeVisibility(entities: readonly MapEntity[]) {
  const [rules, setRules] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const nodes = useMemo(() => entityTreeNodes(entities), [entities]);
  const hiddenIds = useMemo(() => entityTreeHiddenIds(nodes, rules), [nodes, rules]);
  const visibleEntities = useMemo(
    () => filterMapEntities(entities, [(entity) => !hiddenIds.has(entity.id)]),
    [entities, hiddenIds]
  );

  function toggleVisibility(id: string) {
    const node = findEntityTreeNode(nodes, id);

    if (!node) {
      return;
    }

    setRules((current) => {
      const visible = treeVisibility(node, entityTreeHiddenIds(nodes, current)) !== 'visible';
      const next = new Map(current);
      clearEntityTreeRules(node, next);
      next.set(node.id, visible);

      return next;
    });
  }

  function showEntity(id: string, nextEntities: readonly MapEntity[] = entities) {
    const nextNodes = nextEntities === entities ? nodes : entityTreeNodes(nextEntities);

    if (!findEntityTreeNode(nextNodes, id)?.entity) {
      return;
    }

    setRules((current) => {
      if (!entityTreeHiddenIds(nextNodes, current).has(id)) {
        return current;
      }

      const next = new Map(current);
      next.set(id, true);

      return next;
    });
  }

  function showOnly(id: string) {
    const node = findEntityTreeNode(nodes, id);

    if (!node) {
      return;
    }

    const next = new Map(nodes.map((root) => [root.id, false]));
    next.set(node.id, true);
    setRules(next);
  }

  function resetVisibility() {
    setRules(new Map());
  }

  return { nodes, hiddenIds, visibleEntities, toggleVisibility, showOnly, showEntity, resetVisibility };
}
