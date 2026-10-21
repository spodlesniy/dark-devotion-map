import type { TreeVisibility } from 'src/types/TreeNode';

type VisibilityNode = Readonly<{ id: string; children?: readonly VisibilityNode[] }>;

export function treeLeafIds(node: VisibilityNode): readonly string[] {
  if (!node.children?.length) {
    return [node.id];
  }

  return node.children.flatMap(treeLeafIds);
}

export function treeVisibility(node: VisibilityNode, hiddenIds: ReadonlySet<string>): TreeVisibility {
  const leaves = treeLeafIds(node);
  const hiddenCount = leaves.filter((id) => hiddenIds.has(id)).length;

  if (hiddenCount === 0) {
    return 'visible';
  }

  return hiddenCount === leaves.length ? 'hidden' : 'mixed';
}

export function toggleTreeVisibility(node: VisibilityNode, hiddenIds: ReadonlySet<string>): ReadonlySet<string> {
  const next = new Set(hiddenIds);
  const hide = treeVisibility(node, hiddenIds) === 'visible';

  for (const id of treeLeafIds(node)) {
    if (hide) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }

  return next;
}

export function isolateTreeVisibility(nodes: readonly VisibilityNode[], selected: VisibilityNode): ReadonlySet<string> {
  const visible = new Set(treeLeafIds(selected));

  return new Set(nodes.flatMap(treeLeafIds).filter((id) => !visible.has(id)));
}
