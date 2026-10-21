import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addMapPoint } from 'src/helpers/addMapPoint';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { readRepositoryEntityDatabase } from 'src/helpers/readRepositoryEntityDatabase';
import { useEntityDatabase } from 'src/hooks/useEntityDatabase';
import { useUnsavedChangesWarning } from 'src/hooks/useUnsavedChangesWarning';
import { MapEntityType } from 'src/types/MapEntityType';

const mode = vi.hoisted(() => ({ isDeveloperMode: true }));

vi.mock('src/common/environment', () => mode);
vi.mock('src/helpers/readRepositoryEntityDatabase', () => ({ readRepositoryEntityDatabase: vi.fn() }));

const initialDatabase = parseMapEntityDatabase({ schemaVersion: 2, entities: [] });
const edited = addMapPoint(
  initialDatabase,
  { title: 'Test point', type: MapEntityType.Npc },
  { x: 100, y: 200 }
).database;

function useEditor() {
  const editor = useEntityDatabase(initialDatabase);
  useUnsavedChangesWarning(editor.hasUnsavedChanges);

  return editor;
}

function requestsUnloadWarning() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);

  return event.defaultPrevented;
}

beforeEach(() => {
  mode.isDeveloperMode = true;
});

afterEach(() => vi.resetAllMocks());

describe('Unsaved changes unload warning', () => {
  it('warns only while edits differ from the snapshot and removes the warning on unmount', () => {
    const { result, unmount } = renderHook(useEditor, { wrapper: StrictMode });
    expect(requestsUnloadWarning()).toBe(false);
    act(() => result.current.setDatabase(edited));
    expect(requestsUnloadWarning()).toBe(true);
    act(() => result.current.setDatabase(initialDatabase));
    expect(requestsUnloadWarning()).toBe(false);
    act(() => result.current.setDatabase(edited));
    expect(requestsUnloadWarning()).toBe(true);
    unmount();
    expect(requestsUnloadWarning()).toBe(false);
  });

  it('removes the warning after successful Sync and restores it for subsequent edits', async () => {
    const { result } = renderHook(useEditor);
    act(() => result.current.setDatabase(edited));
    expect(requestsUnloadWarning()).toBe(true);
    vi.mocked(readRepositoryEntityDatabase).mockResolvedValueOnce(edited);
    await act(() => result.current.syncDatabase());
    expect(requestsUnloadWarning()).toBe(false);
    act(() => result.current.setDatabase(initialDatabase));
    expect(requestsUnloadWarning()).toBe(true);
  });

  it('keeps warning after mismatched or failed Sync', async () => {
    const { result } = renderHook(useEditor);
    act(() => result.current.setDatabase(edited));
    vi.mocked(readRepositoryEntityDatabase)
      .mockResolvedValueOnce(initialDatabase)
      .mockRejectedValueOnce(new Error('Read failed'));
    await act(() => result.current.syncDatabase());
    expect(requestsUnloadWarning()).toBe(true);
    await act(() => result.current.syncDatabase());
    expect(requestsUnloadWarning()).toBe(true);
  });

  it('does not warn in read-only mode even if the working state is changed programmatically', () => {
    mode.isDeveloperMode = false;
    const { result } = renderHook(useEditor);
    act(() => result.current.setDatabase(edited));
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(requestsUnloadWarning()).toBe(false);
  });
});
