import { useMemo, useState } from 'react';

import './EntityMenu.scss';

import { PointAppearance } from 'src/components/PointAppearance';
import { ScrollingText } from 'src/components/ScrollingText';
import { SearchInput } from 'src/components/SearchInput';
import { Tree } from 'src/components/Tree';
import { applyEntityTreeSearch, type SearchableEntityTreeNode } from 'src/helpers/applyEntityTreeSearch';
import { entityTreeNodes } from 'src/helpers/entityTree';
import { useEntityMenuSearch } from 'src/hooks/useEntityMenuSearch';
import type { MapEntity } from 'src/types/MapEntity';
import type { TreeNode } from 'src/types/TreeNode';

type EntityMenuProps = {
  entities: readonly MapEntity[];
  onLocate: (entity: MapEntity) => void;
  hiddenIds?: ReadonlySet<string>;
  onToggleVisibility?: (id: string) => void;
  onShowOnly?: (id: string) => void;
  onResetVisibility?: () => void;
};

function renderMenuTitle(title: string) {
  return <ScrollingText text={title} />;
}

export function EntityMenu({
  entities,
  onLocate,
  hiddenIds,
  onToggleVisibility,
  onShowOnly,
  onResetVisibility,
}: Readonly<EntityMenuProps>) {
  const [query, setQuery] = useState('');
  const [resetRevision, setResetRevision] = useState(0);
  const [inputRevision, setInputRevision] = useState(0);

  const nodes = useMemo(() => entityTreeNodes(entities), [entities]);

  const matchingEntities = useEntityMenuSearch(entities, query);

  const searchNodes = useMemo(
    () => applyEntityTreeSearch(nodes, new Set(matchingEntities.map((entity) => entity.id)), query),
    [nodes, matchingEntities, query]
  );

  function reset(resetInput = true) {
    setQuery('');
    setResetRevision((current) => current + 1);

    if (resetInput) {
      setInputRevision((current) => current + 1);
    }

    onResetVisibility?.();
  }

  function adapt(node: SearchableEntityTreeNode): TreeNode {
    if (node.entity) {
      const entity = node.entity;

      return {
        id: node.id,
        title: node.title,
        showCount: false,
        showVisibility: node.showVisibility ?? true,
        hidden: node.hidden ?? false,
        onActivate: () => onLocate(entity),
      };
    }

    const singleChild = node.children[0];

    if (node.ungroupSingle && node.children.length === 1 && singleChild?.entity) {
      return { ...adapt(singleChild), showVisibility: node.showVisibility ?? true };
    }

    const children = node.children.map(adapt);
    return {
      id: node.id,
      title: node.title,
      children,
      collapsible: node.collapsible,
      defaultExpanded: node.defaultExpanded ?? false,
      ...(node.expansionRequest !== undefined ? { expansionRequest: node.expansionRequest } : {}),
      alwaysExpanded: node.alwaysExpanded ?? false,
      count: node.count,
      hidden: node.hidden ?? false,
      countChanged: node.countChanged ?? false,
      showIcon: node.showIcon ?? true,
      showVisibility: node.showVisibility ?? true,
      showCount: node.showCount ?? true,
      disabled: node.disabled ?? false,
      ...(node.icon
        ? {
            icon: (
              <span className="entity-menu__icon" data-type={node.icon.type}>
                <PointAppearance entity={node.icon} />
              </span>
            ),
          }
        : {}),
    };
  }

  return (
    <div className="entity-menu">
      <div className="entity-menu__search">
        <SearchInput
          key={inputRevision}
          label="Search entities"
          onSearchChange={setQuery}
          onClear={() => reset(false)}
          placeholder="Search (3+ characters)"
        />
        <button type="button" className="entity-menu__reset" title="Reset" aria-label="Reset" onClick={() => reset()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
          </svg>
        </button>
      </div>
      <Tree
        key={resetRevision}
        nodes={searchNodes.map(adapt)}
        label="Map entities"
        renderTitle={renderMenuTitle}
        {...(hiddenIds ? { hiddenIds } : {})}
        onVisibilityChange={(_next, node) => onToggleVisibility?.(node.id)}
        onShowOnly={(_next, node) => onShowOnly?.(node.id)}
      />
    </div>
  );
}
