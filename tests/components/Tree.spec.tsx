import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Tree } from 'src/components/Tree';
import type { TreeNode } from 'src/types/TreeNode';

const nodes: readonly TreeNode[] = [
  {
    id: 'root',
    title: 'Root',
    count: 42,
    children: [
      {
        id: 'branch',
        title: 'Branch',
        count: 12,
        children: [
          { id: 'a', title: 'Alpha', count: 5 },
          { id: 'b', title: 'Beta', count: 7 },
        ],
      },
      { id: 'c', title: 'Gamma', count: 30 },
    ],
  },
  { id: 'other', title: 'Other', count: 1 },
];

function expand(title: string) {
  const summary = screen.getByText(title).closest('summary');

  if (!summary) {
    throw new Error('Expected a branch summary');
  }

  fireEvent.click(summary);
}

function expandAll() {
  expand('Root');
  expand('Branch');
}

describe('Independent tree', () => {
  it('isolates descendants on Shift-click, preserves disclosure, and can isolate a single leaf', () => {
    render(<Tree nodes={nodes} label="Test tree" defaultHiddenIds={new Set(['a'])} />);
    expandAll();
    fireEvent.click(screen.getByRole('button', { name: 'Show all Branch' }), { shiftKey: true });
    expect(screen.getByRole('button', { name: 'Hide Alpha' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide Beta' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Show all Gamma' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show all Other' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Branch').closest('details')).toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: 'Hide Alpha' }), { shiftKey: true });
    expect(screen.getByRole('button', { name: 'Show all Beta' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Hide Alpha' }), { shiftKey: true });
    expect(screen.getByRole('button', { name: 'Hide Alpha' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the Shift affordance while focused and clears it on key release and window blur', () => {
    render(<Tree nodes={nodes} label="Test tree" />);
    const eye = screen.getByRole('button', { name: 'Hide Root' });
    expect(eye).toHaveAttribute('title', expect.stringContaining('Shift-click'));
    fireEvent.keyDown(eye, { key: 'Shift', shiftKey: true });
    expect(eye).toHaveClass('tree__visibility--isolate');
    expect(eye).toHaveAttribute('title', 'Show only this and its descendants');
    fireEvent.keyUp(eye, { key: 'Shift' });
    expect(eye).not.toHaveClass('tree__visibility--isolate');
    fireEvent.keyDown(window, { key: 'Shift', shiftKey: true });
    fireEvent.blur(window);
    expect(eye).not.toHaveClass('tree__visibility--isolate');
  });

  it('reports controlled isolation through its dedicated callback', () => {
    const onShowOnly = vi.fn();
    const onVisibilityChange = vi.fn();
    render(
      <Tree
        nodes={nodes}
        label="Test tree"
        hiddenIds={new Set()}
        onShowOnly={onShowOnly}
        onVisibilityChange={onVisibilityChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide Other' }), { shiftKey: true });
    expect(onShowOnly).toHaveBeenCalledWith(new Set(['a', 'b', 'c']), nodes[1]);
    expect(onVisibilityChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Hide Root' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('mounts custom title renderers only for shown rows and preserves nested disclosure while they are unmounted', () => {
    const renderTitle = (title: string) => <span data-testid="custom-title">{title}</span>;
    const { rerender } = render(<Tree nodes={nodes} label="Test tree" renderTitle={renderTitle} />);
    expect(screen.getAllByTestId('custom-title')).toHaveLength(2);
    expand('Root');
    expect(screen.getAllByTestId('custom-title')).toHaveLength(4);
    expand('Branch');
    expect(screen.getAllByTestId('custom-title')).toHaveLength(6);
    expand('Root');
    expect(screen.getAllByTestId('custom-title')).toHaveLength(2);
    expand('Root');
    expect(screen.getAllByTestId('custom-title')).toHaveLength(6);
    expect(screen.getByText('Branch').closest('details')).toHaveAttribute('open');
    rerender(
      <Tree
        nodes={nodes.map((node) => ({ ...node, hidden: node.id === 'root' }))}
        label="Test tree"
        renderTitle={renderTitle}
      />
    );
    expect(screen.getAllByTestId('custom-title')).toHaveLength(1);
  });

  it('toggles controlled disclosure with Enter and Space', async () => {
    render(<Tree nodes={nodes} label="Test tree" />);
    const summary = screen.getByText('Root').closest('summary');

    if (!summary) {
      throw new Error('Expected a root summary');
    }

    summary.focus();
    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    expect(summary.closest('details')).toHaveAttribute('open');
    await user.keyboard(' ');
    expect(summary.closest('details')).not.toHaveAttribute('open');
  });

  it('honors expansion requests without forcing branches open on every render or closing them when requests clear', () => {
    const { rerender } = render(<Tree nodes={nodes} label="Test tree" />);
    const requested = nodes.map((node) => (node.id === 'root' ? { ...node, expansionRequest: 'first' } : node));
    rerender(<Tree nodes={requested} label="Test tree" />);
    expect(screen.getByText('Root').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Branch').closest('details')).not.toHaveAttribute('open');
    expand('Root');
    expect(screen.getByText('Root').closest('details')).not.toHaveAttribute('open');
    rerender(<Tree nodes={[...requested]} label="Test tree" />);
    expect(screen.getByText('Root').closest('details')).not.toHaveAttribute('open');
    const updated = requested.map((node) => (node.id === 'root' ? { ...node, expansionRequest: 'second' } : node));
    rerender(<Tree nodes={updated} label="Test tree" />);
    expect(screen.getByText('Root').closest('details')).toHaveAttribute('open');
    rerender(<Tree nodes={nodes} label="Test tree" />);
    expect(screen.getByText('Root').closest('details')).toHaveAttribute('open');
    expand('Root');
    rerender(<Tree nodes={requested} label="Test tree" />);
    expect(screen.getByText('Root').closest('details')).toHaveAttribute('open');
  });

  it('renders an accessible empty list without controls', () => {
    render(<Tree nodes={[]} label="Test tree" />);
    expect(screen.getByRole('list', { name: 'Test tree' })).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('starts branches collapsed and defaults every node to visible', () => {
    const { container } = render(<Tree nodes={nodes} label="Test tree" />);
    expect(container.querySelectorAll('details')).toHaveLength(2);
    expect(container.querySelector('details[open]')).toBeNull();
    expandAll();

    for (const title of ['Root', 'Branch', 'Alpha', 'Beta', 'Gamma', 'Other']) {
      expect(screen.getByRole('button', { name: `Hide ${title}` })).toHaveAttribute('aria-pressed', 'true');
    }

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('updates every ancestor to mixed after hiding a leaf and enables the subtree from its mixed parent', async () => {
    render(<Tree nodes={nodes} label="Test tree" />);
    expandAll();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hide Alpha' }));
    expect(screen.getByRole('button', { name: 'Show all Alpha' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show all Branch' })).toHaveAttribute('aria-pressed', 'mixed');
    expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'mixed');
    expect(screen.getByRole('button', { name: 'Hide Other' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Show all Branch' }));
    expect(screen.getByRole('button', { name: 'Hide Alpha' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide Root' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides an entire branch without changing disclosure or sibling visibility, then restores it', async () => {
    render(<Tree nodes={nodes} label="Test tree" />);
    expandAll();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hide Branch' }));
    expect(screen.getByRole('button', { name: 'Show all Alpha' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show all Beta' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show all Branch' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Branch').closest('details')).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Hide Gamma' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Show all Root' }));
    expect(screen.getByRole('button', { name: 'Hide Alpha' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Hide Root' }));
    expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Hide Other' })).toBeInTheDocument();
  });

  it('supports keyboard visibility activation without collapsing the branch', async () => {
    render(<Tree nodes={nodes} label="Test tree" />);
    expandAll();
    const user = userEvent.setup();
    screen.getByRole('button', { name: 'Hide Branch' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Show all Branch' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Branch').closest('details')).toHaveAttribute('open');
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Hide Branch' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('retains leaf choices and expanded branches across collapse and configuration updates with stable IDs', async () => {
    const { rerender } = render(<Tree nodes={nodes} label="Test tree" />);
    expandAll();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Hide Alpha' }));
    expand('Root');
    expand('Root');
    expect(screen.getByText('Branch').closest('details')).toHaveAttribute('open');
    rerender(<Tree nodes={[...nodes].reverse()} label="Test tree" />);
    expect(screen.getByRole('button', { name: 'Show all Alpha' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'mixed');
  });

  it('uses supplied counts, supports icons, and hides optional controls independently', () => {
    render(
      <Tree
        nodes={[
          { id: 'shown', title: 'Shown', icon: <span>Icon A</span>, count: 99 },
          {
            id: 'hidden',
            title: 'Hidden controls',
            icon: <span>Icon B</span>,
            showIcon: false,
            showCount: false,
            showVisibility: false,
            count: 5,
          },
          { id: 'empty', title: 'No children', children: [] },
        ]}
        label="Test tree"
      />
    );
    expect(screen.getByText('Icon A')).toBeInTheDocument();
    expect(screen.queryByText('Icon B')).not.toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hidden controls/ })).not.toBeInTheDocument();
    expect(screen.getByText('No children').closest('details')).toBeNull();
  });

  it('accepts initial hidden leaf IDs without mutating them and does not reapply defaults after rerender', async () => {
    const initial = new Set(['a']);
    const { rerender } = render(<Tree nodes={nodes} label="Test tree" defaultHiddenIds={initial} />);
    expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'mixed');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show all Root' }));
    expect(initial).toEqual(new Set(['a']));
    rerender(<Tree nodes={nodes} label="Test tree" defaultHiddenIds={new Set(['other'])} />);
    expect(screen.getByRole('button', { name: 'Hide Root' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide Other' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reports controlled visibility changes without changing display until the caller updates props', async () => {
    const onChange = vi.fn();
    const hidden = new Set<string>();
    const { rerender } = render(
      <Tree nodes={nodes} label="Test tree" hiddenIds={hidden} onVisibilityChange={onChange} />
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Hide Root' }));
    expect(onChange).toHaveBeenCalledWith(new Set(['a', 'b', 'c']), expect.objectContaining({ id: 'root' }));
    expect(hidden.size).toBe(0);
    expect(screen.getByRole('button', { name: 'Hide Root' })).toHaveAttribute('aria-pressed', 'true');
    rerender(
      <Tree nodes={nodes} label="Test tree" hiddenIds={new Set(['a', 'b', 'c'])} onVisibilityChange={onChange} />
    );
    expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('works with externally owned state and reports internal changes as well', async () => {
    const onChange = vi.fn();

    function Harness() {
      const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

      return (
        <Tree
          nodes={nodes}
          label="Test tree"
          hiddenIds={hidden}
          onVisibilityChange={(next) => {
            setHidden(next);
            onChange(next);
          }}
        />
      );
    }

    const { unmount } = render(<Harness />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Hide Root' }));
    expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'false');
    unmount();
    render(<Tree nodes={nodes} label="Test tree" onVisibilityChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Hide Other' }));
    expect(onChange).toHaveBeenLastCalledWith(new Set(['other']), expect.objectContaining({ id: 'other' }));
    expect(
      within(screen.getByRole('list', { name: 'Test tree' })).getByRole('button', { name: 'Show all Other' })
    ).toHaveAttribute('aria-pressed', 'false');
  });
});

it('preserves hidden IDs when nodes change and derives mixed state for a newly added visible leaf', async () => {
  const onVisibilityChange = vi.fn();
  const { rerender } = render(
    <Tree
      nodes={[{ id: 'root', title: 'Root', children: [{ id: 'a', title: 'Original' }] }]}
      label="Test tree"
      onVisibilityChange={onVisibilityChange}
    />
  );
  expand('Root');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Hide Original' }));
  expect(screen.getByRole('button', { name: 'Show all Root' })).toHaveAttribute('aria-pressed', 'false');
  rerender(
    <Tree
      nodes={[
        {
          id: 'root',
          title: 'Renamed root',
          count: 50,
          children: [
            { id: 'a', title: 'Renamed leaf' },
            { id: 'b', title: 'New leaf' },
          ],
        },
      ]}
      label="Test tree"
      onVisibilityChange={onVisibilityChange}
    />
  );
  expect(screen.getByText('Renamed root').closest('details')).toHaveAttribute('open');
  expect(screen.getByRole('button', { name: 'Show all Renamed root' })).toHaveAttribute('aria-pressed', 'mixed');
  expect(screen.getByRole('button', { name: 'Show all Renamed leaf' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: 'Hide New leaf' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('50')).toBeInTheDocument();
  expect(onVisibilityChange).toHaveBeenCalledOnce();
});

it('applies default expansion only on mount and keeps a user-collapsed branch closed after updates', async () => {
  const configured: readonly TreeNode[] = [
    { id: 'branch', title: 'Expanded', defaultExpanded: true, children: [{ id: 'leaf', title: 'Leaf' }] },
  ];
  const { rerender } = render(<Tree nodes={configured} label="Test tree" />);
  const summary = screen.getByText('Expanded').closest('summary');

  if (!summary) {
    throw new Error('Expected branch summary');
  }

  expect(summary.closest('details')).toHaveAttribute('open');
  await userEvent.setup().click(summary);
  expect(summary.closest('details')).not.toHaveAttribute('open');
  rerender(<Tree nodes={[...configured]} label="Test tree" />);
  expect(summary.closest('details')).not.toHaveAttribute('open');
});

it('renders an always-expanded group without a disclosure action and can omit its leaf visibility controls', async () => {
  const onChange = vi.fn();
  render(
    <Tree
      nodes={[
        {
          id: 'group',
          title: 'Group',
          alwaysExpanded: true,
          collapsible: false,
          children: [{ id: 'leaf', title: 'Leaf', showVisibility: false }],
        },
      ]}
      label="Test tree"
      onVisibilityChange={onChange}
    />
  );
  const list = screen.getByRole('list', { name: 'Group' });
  const title = screen.getByText('Group');
  expect(title.closest('summary')).toBeNull();
  expect(list).toBeVisible();
  const user = userEvent.setup();
  await user.click(title);
  expect(list).toBeVisible();
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Hide Leaf' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Hide Group' }));
  expect(onChange).toHaveBeenCalledWith(new Set(['leaf']), expect.objectContaining({ id: 'group' }));
});
