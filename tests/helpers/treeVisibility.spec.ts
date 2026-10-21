import { describe, expect, it } from 'vitest';

import { toggleTreeVisibility, treeLeafIds, treeVisibility } from 'src/helpers/treeVisibility';
import type { TreeNode } from 'src/types/TreeNode';

const root: TreeNode = {
  id: 'root',
  title: 'Root',
  children: [
    {
      id: 'branch',
      title: 'Branch',
      children: [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ],
    },
    { id: 'c', title: 'C', children: [] },
  ],
};

describe('Tree visibility', () => {
  it('collects only leaves at every depth, treating empty children as a leaf', () => {
    expect(treeLeafIds(root)).toEqual(['a', 'b', 'c']);
  });

  it.each([
    { hidden: [], expected: 'visible' },
    { hidden: ['a'], expected: 'mixed' },
    { hidden: ['a', 'b'], expected: 'mixed' },
    { hidden: ['a', 'b', 'c'], expected: 'hidden' },
    { hidden: ['unrelated', 'root'], expected: 'visible' },
  ])('derives $expected from hidden leaves $hidden', ({ hidden, expected }) => {
    expect(treeVisibility(root, new Set(hidden))).toBe(expected);
  });

  it('enables an entire mixed subtree without affecting another branch or mutating the input', () => {
    const hidden = new Set(['a', 'unrelated']);
    const next = toggleTreeVisibility(root, hidden);
    expect(next).toEqual(new Set(['unrelated']));
    expect(hidden).toEqual(new Set(['a', 'unrelated']));
    expect(next).not.toBe(hidden);
  });

  it('hides all leaves on one action and enables them again on the next action', () => {
    const hidden = toggleTreeVisibility(root, new Set());
    expect(hidden).toEqual(new Set(['a', 'b', 'c']));
    expect(toggleTreeVisibility(root, hidden)).toEqual(new Set());
  });

  it('derives visibility from leaves even when their controls and counts are hidden', () => {
    const node: TreeNode = {
      id: 'root',
      title: 'Root',
      showVisibility: false,
      children: [{ id: 'leaf', title: 'Leaf', showVisibility: false, showCount: false }],
    };
    expect(treeVisibility(node, new Set(['leaf']))).toBe('hidden');
    expect(toggleTreeVisibility(node, new Set(['leaf']))).toEqual(new Set());
  });
});
