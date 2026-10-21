import type { EntityTreeNode } from 'src/helpers/entityTree';

export type SearchableEntityTreeNode = Readonly<
  Omit<EntityTreeNode, 'children'> & {
    children: readonly SearchableEntityTreeNode[];
    hidden?: boolean;
    countChanged?: boolean;
    disabled?: boolean;
    expansionRequest?: string;
  }
>;

export function applyEntityTreeSearch(
  nodes: readonly EntityTreeNode[],
  matchingIds: ReadonlySet<string>,
  query = ''
): readonly SearchableEntityTreeNode[] {
  return nodes.map((node) => {
    if (node.entity) {
      return { ...node, hidden: !matchingIds.has(node.entity.id) };
    }

    const children = applyEntityTreeSearch(node.children, matchingIds, query);
    const count = children.reduce((sum, child) => sum + (child.hidden ? 0 : child.count), 0);

    return {
      ...node,
      children,
      count,
      hidden: Boolean(query) && count === 0 && !node.showWhenNoMatches,
      countChanged: count !== node.count,
      disabled: count === 0,
      ...(query && count > 0 && (node.expandOnSearch ?? true) ? { expansionRequest: query } : {}),
    };
  });
}
