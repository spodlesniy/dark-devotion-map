import { type ReactNode, useEffect, useId, useState } from 'react';

import './Tree.scss';

import { isolateTreeVisibility, toggleTreeVisibility, treeVisibility } from 'src/helpers/treeVisibility';
import type { TreeNode } from 'src/types/TreeNode';

type TreeProps = {
  nodes: readonly TreeNode[];
  label: string;
  hiddenIds?: ReadonlySet<string>;
  defaultHiddenIds?: ReadonlySet<string>;
  onVisibilityChange?: (hiddenIds: ReadonlySet<string>, node: TreeNode) => void;
  onShowOnly?: (hiddenIds: ReadonlySet<string>, node: TreeNode) => void;
  renderTitle?: (title: string) => ReactNode;
};

type TreeNodeViewProps = {
  node: TreeNode;
  hiddenIds: ReadonlySet<string>;
  onToggle: (node: TreeNode, isolate: boolean) => void;
  shiftPressed: boolean;
  parentVisible: boolean;
  renderTitle: TreeProps['renderTitle'];
};

export function Tree({
  nodes,
  label,
  hiddenIds,
  defaultHiddenIds,
  onVisibilityChange,
  onShowOnly,
  renderTitle,
}: Readonly<TreeProps>) {
  const [internalHiddenIds, setInternalHiddenIds] = useState<ReadonlySet<string>>(() => new Set(defaultHiddenIds));
  const [shiftPressed, setShiftPressed] = useState(false);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      setShiftPressed(event.key === 'Shift' || event.shiftKey);
    }

    function keyUp(event: KeyboardEvent) {
      setShiftPressed(event.key !== 'Shift' && event.shiftKey);
    }

    function resetShift() {
      setShiftPressed(false);
    }

    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);
    window.addEventListener('blur', resetShift);
    document.addEventListener('visibilitychange', resetShift);

    return () => {
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('blur', resetShift);
      document.removeEventListener('visibilitychange', resetShift);
    };
  }, []);

  const currentHiddenIds = hiddenIds ?? internalHiddenIds;

  function toggle(node: TreeNode, isolate: boolean) {
    const next = isolate ? isolateTreeVisibility(nodes, node) : toggleTreeVisibility(node, currentHiddenIds);

    if (hiddenIds === undefined) {
      setInternalHiddenIds(next);
    }

    if (isolate && onShowOnly) {
      onShowOnly(next, node);
    } else {
      onVisibilityChange?.(next, node);
    }
  }

  return (
    <ul className="tree" aria-label={label} onPointerEnter={(event) => setShiftPressed(event.shiftKey)}>
      {nodes.map((node) => (
        <TreeNodeView
          key={node.id}
          node={node}
          hiddenIds={currentHiddenIds}
          onToggle={toggle}
          shiftPressed={shiftPressed}
          parentVisible={true}
          renderTitle={renderTitle}
        />
      ))}
    </ul>
  );
}

function TreeNodeView({
  node,
  hiddenIds,
  onToggle,
  shiftPressed,
  parentVisible,
  renderTitle,
}: Readonly<TreeNodeViewProps>) {
  const [expanded, setExpanded] = useState(node.expansionRequest !== undefined || (node.defaultExpanded ?? false));
  const [previousExpansionRequest, setPreviousExpansionRequest] = useState(node.expansionRequest);

  const titleId = useId();

  if (node.expansionRequest !== previousExpansionRequest) {
    setPreviousExpansionRequest(node.expansionRequest);

    if (node.expansionRequest !== undefined) {
      setExpanded(true);
    }
  }

  if (node.disabled && expanded) {
    setExpanded(false);
  }

  const state = treeVisibility(node, hiddenIds);
  const action = state === 'visible' ? 'Hide' : 'Show all';
  const visible = parentVisible && !node.hidden;
  const title = visible && renderTitle ? renderTitle(node.title) : node.title;
  const heading = (
    <>
      {node.showIcon !== false && node.icon && (
        <span className="tree__icon" aria-hidden="true">
          {node.icon}
        </span>
      )}
      <span id={titleId} className="tree__title">
        {node.onActivate ? (
          <button
            type="button"
            className="tree__entry"
            title={renderTitle ? undefined : node.title}
            onClick={node.onActivate}
          >
            {title}
          </button>
        ) : (
          title
        )}
      </span>
      {node.showVisibility !== false && (
        <button
          type="button"
          className={`tree__visibility${shiftPressed ? ' tree__visibility--isolate' : ''}`}
          title={
            shiftPressed
              ? 'Show only this and its descendants'
              : `${
                  state === 'mixed'
                    ? 'Partially visible; show all'
                    : state === 'visible'
                      ? 'Visible; hide all'
                      : 'Hidden; show all'
                }. Shift-click to show only this and its descendants.`
          }
          aria-label={`${action} ${node.title}`}
          aria-pressed={state === 'mixed' ? 'mixed' : state === 'visible'}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle(node, event.shiftKey);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
            {state === 'mixed' ? <path d="M8 12h8" /> : <circle cx="12" cy="12" r="3" />}
            {state === 'hidden' && <path d="m3 3 18 18" />}
          </svg>
        </button>
      )}
      {node.showCount !== false && (
        <span className={`tree__count${node.countChanged ? ' tree__count--changed' : ''}`}>{node.count ?? 0}</span>
      )}
    </>
  );

  if (!node.children?.length || (node.collapsible === false && !node.alwaysExpanded)) {
    return (
      <li hidden={node.hidden}>
        <div className="tree__row tree__row--leaf">{heading}</div>
      </li>
    );
  }

  if (node.alwaysExpanded) {
    return (
      <li hidden={node.hidden}>
        <div className="tree__row tree__row--leaf">{heading}</div>
        <ul className="tree__children" aria-labelledby={titleId}>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              hiddenIds={hiddenIds}
              onToggle={onToggle}
              shiftPressed={shiftPressed}
              parentVisible={visible}
              renderTitle={renderTitle}
            />
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li hidden={node.hidden}>
      <details data-node-id={node.id} open={!node.disabled && expanded}>
        <summary
          className="tree__row"
          aria-labelledby={titleId}
          aria-disabled={node.disabled || undefined}
          tabIndex={node.disabled ? -1 : 0}
          onClick={(event) => {
            event.preventDefault();

            if (!node.disabled) {
              setExpanded((current) => !current);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();

              if (!node.disabled) {
                setExpanded((current) => !current);
              }
            }
          }}
        >
          {heading}
        </summary>
        <ul className="tree__children" aria-labelledby={titleId}>
          {node.children.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              hiddenIds={hiddenIds}
              onToggle={onToggle}
              shiftPressed={shiftPressed}
              parentVisible={visible && !node.disabled && expanded}
              renderTitle={renderTitle}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}
