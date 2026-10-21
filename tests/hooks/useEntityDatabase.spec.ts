import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { addMapPoint } from 'src/helpers/addMapPoint';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { readRepositoryEntityDatabase } from 'src/helpers/readRepositoryEntityDatabase';
import { useEntityDatabase } from 'src/hooks/useEntityDatabase';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';

vi.mock('src/helpers/readRepositoryEntityDatabase', () => ({ readRepositoryEntityDatabase: vi.fn() }));

afterEach(() => vi.resetAllMocks());

const initialDatabase = parseMapEntityDatabase({ schemaVersion: 2, entities: [] });

describe('Working entity database', () => {
  it('updates only the baseline after a matching read and tracks subsequent changes against it', async () => {
    const { result } = renderHook(() => useEntityDatabase(initialDatabase));
    const edited = addMapPoint(
      initialDatabase,
      { title: 'Test point', type: MapEntityType.Npc },
      { x: 100, y: 200 }
    ).database;
    act(() => result.current.setDatabase(edited));
    vi.mocked(readRepositoryEntityDatabase).mockResolvedValueOnce(parseMapEntityDatabase(edited));
    await act(() => result.current.syncDatabase());

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.database).toBe(edited);
    expect(result.current.syncResult?.kind).toBe('success');
    act(() => result.current.setDatabase(initialDatabase));
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.syncResult).toBeNull();
  });

  it('keeps the working database and baseline after a mismatch', async () => {
    const { result } = renderHook(() => useEntityDatabase(initialDatabase));
    const edited = addMapPoint(
      initialDatabase,
      { title: 'Test point', type: MapEntityType.Npc },
      { x: 100, y: 200 }
    ).database;
    act(() => result.current.setDatabase(edited));
    vi.mocked(readRepositoryEntityDatabase).mockResolvedValueOnce(initialDatabase);
    await act(() => result.current.syncDatabase());

    expect(result.current.database).toBe(edited);
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.syncResult?.kind).toBe('warning');
    act(() => result.current.setDatabase(initialDatabase));
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('preserves edits after a failed read and supports retrying', async () => {
    const { result } = renderHook(() => useEntityDatabase(initialDatabase));
    const edited = addMapPoint(
      initialDatabase,
      { title: 'Test point', type: MapEntityType.Npc },
      { x: 100, y: 200 }
    ).database;
    act(() => result.current.setDatabase(edited));
    vi.mocked(readRepositoryEntityDatabase)
      .mockRejectedValueOnce(new Error('Read failed'))
      .mockResolvedValueOnce(edited);
    await act(() => result.current.syncDatabase());

    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.database).toBe(edited);
    expect(result.current.syncResult).toEqual({ kind: 'error', message: 'Read failed' });
    expect(result.current.syncing).toBe(false);
    await act(() => result.current.syncDatabase());
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('compares against edits made during the read and prevents overlapping requests', async () => {
    const { result } = renderHook(() => useEntityDatabase(initialDatabase));
    const edited = addMapPoint(
      initialDatabase,
      { title: 'Test point', type: MapEntityType.Npc },
      { x: 100, y: 200 }
    ).database;
    act(() => result.current.setDatabase(edited));
    let finish!: (database: MapEntityDatabase) => void;
    vi.mocked(readRepositoryEntityDatabase).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    let syncing!: Promise<void>;
    act(() => {
      syncing = result.current.syncDatabase();
    });
    expect(result.current.syncing).toBe(true);
    await act(() => result.current.syncDatabase());
    expect(readRepositoryEntityDatabase).toHaveBeenCalledTimes(1);
    const newer = addMapPoint(
      edited,
      { title: 'Test point', type: MapEntityType.Item, itemType: MapItemType.Weapon },
      { x: 300, y: 400 }
    ).database;
    await act(async () => {
      result.current.setDatabase(newer);
      finish(edited);
      await syncing;
    });

    expect(result.current.database).toBe(newer);
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.syncResult?.kind).toBe('warning');
  });

  it('can synchronize edits that become equal to the file while a read is pending', async () => {
    const { result } = renderHook(() => useEntityDatabase(initialDatabase));
    const edited = addMapPoint(
      initialDatabase,
      { title: 'Test point', type: MapEntityType.Item, itemType: MapItemType.Weapon },
      { x: 300, y: 400 }
    ).database;
    let finish!: (database: MapEntityDatabase) => void;
    vi.mocked(readRepositoryEntityDatabase).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    let syncing!: Promise<void>;
    act(() => {
      syncing = result.current.syncDatabase();
    });
    await act(async () => {
      result.current.setDatabase(edited);
      finish(edited);
      await syncing;
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.database).toBe(edited);
  });

  it('aborts an in-flight request when the editor unmounts', async () => {
    const { result, unmount } = renderHook(() => useEntityDatabase(initialDatabase));
    let finish!: (database: MapEntityDatabase) => void;
    vi.mocked(readRepositoryEntityDatabase).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    let syncing!: Promise<void>;
    act(() => {
      syncing = result.current.syncDatabase();
    });
    const signal = vi.mocked(readRepositoryEntityDatabase).mock.calls[0]?.[0];
    unmount();
    expect(signal?.aborted).toBe(true);
    finish(initialDatabase);
    await syncing;
  });

  it('tracks edits and automatically clears the flag when contents return to the initial snapshot', () => {
    const { result } = renderHook(() => useEntityDatabase(initialDatabase));
    expect(result.current.hasUnsavedChanges).toBe(false);

    act(() => {
      result.current.setDatabase(
        addMapPoint(result.current.database, { title: 'Test point', type: MapEntityType.Npc }, { x: 100, y: 200 })
          .database
      );
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(initialDatabase.entities).toHaveLength(0);

    act(() => {
      result.current.setDatabase(parseMapEntityDatabase({ schemaVersion: 2, entities: [] }));
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('does not replace the working state or baseline when the initial input changes on a rerender', () => {
    const { result, rerender } = renderHook(({ initial }) => useEntityDatabase(initial), {
      initialProps: { initial: initialDatabase },
    });
    const edited = addMapPoint(
      initialDatabase,
      { title: 'Test point', type: MapEntityType.Item, itemType: MapItemType.Weapon },
      { x: 300, y: 400 }
    ).database;

    act(() => {
      result.current.setDatabase(edited);
    });

    rerender({ initial: edited });

    expect(result.current.database).toEqual(edited);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });
});
