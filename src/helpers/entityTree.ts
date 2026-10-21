import { type EntityGroup, entityGroups } from 'src/helpers/entityGroups';
import { groupByKey } from 'src/helpers/groupByKey';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import type { PointIconDetails } from 'src/helpers/pointIcons';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

export type EntityTreeNode = Readonly<{
  ungroupSingle?: boolean;
  id: string;
  title: string;
  count: number;
  icon?: PointIconDetails;
  showIcon?: boolean;
  showVisibility?: boolean;
  showCount?: boolean;
  collapsible: boolean;
  defaultExpanded?: boolean;
  expandOnSearch?: boolean;
  showWhenNoMatches?: boolean;
  alwaysExpanded?: boolean;
  children: readonly EntityTreeNode[];
  entity?: MapEntity;
}>;

export function entityTreeNodes(
  entities: readonly MapEntity[],
  groups: readonly EntityGroup[] = entityGroups
): readonly EntityTreeNode[] {
  return groups.map((group) => {
    const members = entities.filter(group.matches);
    const children = group.children?.length
      ? entityTreeNodes(members, group.children)
      : group.grouping
        ? groupedEntityNodes(members, group)
        : entityLeaves(members);

    return {
      id: group.id,
      title: group.title,
      count: members.length,
      showIcon: group.showIcon ?? true,
      showVisibility: group.showVisibility ?? true,
      showCount: group.showCount ?? true,
      ...(group.icon ? { icon: group.icon } : {}),
      collapsible: group.collapsible ?? true,
      defaultExpanded: group.defaultExpanded ?? false,
      expandOnSearch: group.expandOnSearch ?? true,
      showWhenNoMatches: group.showWhenNoMatches ?? false,
      children: group.sortChildren ? [...children].sort(group.sortChildren) : children,
    };
  });
}

function entityLeaves(
  entities: readonly MapEntity[],
  showVisibility = true,
  getTitle?: (entity: MapEntity) => string
): readonly EntityTreeNode[] {
  return entities.map((entity) => ({
    id: entity.id,
    title: getTitle
      ? getTitle(entity)
      : entity.type === MapEntityType.Codex && entity.part !== undefined && entity.totalParts !== undefined
        ? `${mapEntityLabel(entity)} ${entity.part}/${entity.totalParts}`
        : mapEntityLabel(entity),
    count: 1,
    collapsible: false,
    showVisibility,
    children: [],
    entity,
  }));
}

function groupedEntityNodes(members: readonly MapEntity[], group: EntityGroup): readonly EntityTreeNode[] {
  const grouping = group.grouping;

  if (!grouping) {
    return entityLeaves(members);
  }

  const groupedMembers = grouping.matches ? members.filter(grouping.matches) : members;
  const ungroupedMembers = grouping.matches ? members.filter((entity) => !grouping.matches?.(entity)) : [];
  const grouped = groupByKey(groupedMembers, grouping.getKey, grouping.keys).map(({ key, items }) => {
    const icon = grouping.getIcon?.(key);
    const children = entityLeaves(items, grouping.showEntityVisibility ?? true, grouping.getEntityTitle);

    return {
      id: `${group.id}:group:${encodeURIComponent(key)}`,
      ungroupSingle: grouping.ungroupSingle ?? false,
      title: grouping.getTitle?.(key) ?? key,
      count: items.length,
      ...(icon ? { icon } : {}),
      showIcon: grouping.showIcon ?? true,
      showVisibility: grouping.showVisibility ?? true,
      showCount: grouping.showCount ?? true,
      alwaysExpanded: grouping.alwaysExpanded ?? false,
      defaultExpanded: grouping.defaultExpanded ?? false,
      expandOnSearch: grouping.expandOnSearch ?? false,
      showWhenNoMatches: grouping.showWhenNoMatches ?? false,
      collapsible: grouping.collapsible ?? true,
      children: grouping.sortChildren ? [...children].sort(grouping.sortChildren) : children,
    };
  });

  return [...grouped, ...entityLeaves(ungroupedMembers)];
}

export function entityTreeHiddenIds(
  nodes: readonly EntityTreeNode[],
  rules: ReadonlyMap<string, boolean>,
  inheritedVisible = true
): ReadonlySet<string> {
  const hidden = new Set<string>();

  for (const node of nodes) {
    const visible = rules.get(node.id) ?? inheritedVisible;

    if (node.children.length) {
      for (const id of entityTreeHiddenIds(node.children, rules, visible)) {
        hidden.add(id);
      }
    } else if (!visible) {
      hidden.add(node.id);
    }
  }

  return hidden;
}

export function findEntityTreeNode(nodes: readonly EntityTreeNode[], id: string): EntityTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findEntityTreeNode(node.children, id);

    if (child) {
      return child;
    }
  }

  return undefined;
}

export function clearEntityTreeRules(node: EntityTreeNode, rules: Map<string, boolean>) {
  rules.delete(node.id);

  for (const child of node.children) {
    clearEntityTreeRules(child, rules);
  }
}
