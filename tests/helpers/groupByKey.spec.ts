import { describe, expect, it, vi } from 'vitest';

import { groupByKey } from 'src/helpers/groupByKey';

describe('Dynamic grouping', () => {
  it('groups any item type by its key while preserving first-seen group order, item order, and references', () => {
    const items = Object.freeze([
      { kind: 'b', id: 1 },
      { kind: 'a', id: 2 },
      { kind: 'b', id: 3 },
    ]);
    const getKey = vi.fn((item: (typeof items)[number]) => item.kind);
    const result = groupByKey(items, getKey);
    expect(result).toEqual([
      { key: 'b', items: [items[0], items[2]] },
      { key: 'a', items: [items[1]] },
    ]);
    expect(result[0]?.items[0]).toBe(items[0]);
    expect(getKey).toHaveBeenCalledTimes(3);
    expect(items).toHaveLength(3);
  });

  it('retains configured empty groups in explicit order without duplicating keys', () => {
    expect(groupByKey(['b', 'b', 'other'], (value) => value, ['a', 'b', 'a', 'c'])).toEqual([
      { key: 'a', items: [] },
      { key: 'b', items: ['b', 'b'] },
      { key: 'c', items: [] },
      { key: 'other', items: ['other'] },
    ]);
  });

  it('handles empty input and special string keys without object-key collisions', () => {
    expect(groupByKey([], () => 'unused')).toEqual([]);
    expect(groupByKey(['', '__proto__', 'constructor'], (value) => value).map((group) => group.key)).toEqual([
      '',
      '__proto__',
      'constructor',
    ]);
  });
});
