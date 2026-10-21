export function groupByKey<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  keys: readonly string[] = []
): readonly Readonly<{ key: string; items: readonly T[] }>[] {
  const groups = new Map<string, T[]>();

  for (const key of keys) {
    if (!groups.has(key)) {
      groups.set(key, []);
    }
  }

  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);

    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return Array.from(groups, ([key, members]) => ({ key, items: members }));
}
