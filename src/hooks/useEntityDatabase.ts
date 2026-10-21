import { type SetStateAction, useEffect, useMemo, useReducer, useRef } from 'react';

import { areMapEntityDatabasesEqual, parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { readRepositoryEntityDatabase } from 'src/helpers/readRepositoryEntityDatabase';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';

export type EntitySyncResult = Readonly<{ kind: 'success' | 'warning' | 'error'; message: string }>;

type State = {
  database: MapEntityDatabase;
  snapshot: MapEntityDatabase;
  syncing: boolean;
  syncResult: EntitySyncResult | null;
};

type Action =
  | { type: 'edit'; update: SetStateAction<MapEntityDatabase> }
  | { type: 'sync-start' }
  | { type: 'sync-read'; database: MapEntityDatabase }
  | { type: 'sync-error'; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'edit': {
      const database = typeof action.update === 'function' ? action.update(state.database) : action.update;

      return { ...state, database, syncResult: null };
    }
    case 'sync-start':
      return { ...state, syncing: true, syncResult: null };
    case 'sync-read': {
      // Compare with the latest working state, including edits made while the request was pending.
      const matches = areMapEntityDatabasesEqual(state.database, action.database);

      return {
        ...state,
        snapshot: matches ? action.database : state.snapshot,
        syncing: false,
        syncResult: matches
          ? { kind: 'success', message: 'Repository database matches. Changes are synchronized.' }
          : {
              kind: 'warning',
              message:
                'Repository database differs. Export JSON, replace src/data/entities.json, then try Sync again. Your working changes are unchanged.',
            },
      };
    }
    case 'sync-error':
      return { ...state, syncing: false, syncResult: { kind: 'error', message: action.message } };
  }
}

function initialize(initialDatabase: unknown): State {
  const snapshot = parseMapEntityDatabase(initialDatabase);

  return { snapshot, database: parseMapEntityDatabase(snapshot), syncing: false, syncResult: null };
}

export function useEntityDatabase(initialDatabase: unknown) {
  const [state, dispatch] = useReducer(reducer, initialDatabase, initialize);

  const request = useRef<AbortController | null>(null);

  const hasUnsavedChanges = useMemo(
    () => !areMapEntityDatabasesEqual(state.snapshot, state.database),
    [state.snapshot, state.database]
  );

  useEffect(() => () => request.current?.abort(), []);

  function setDatabase(update: SetStateAction<MapEntityDatabase>) {
    dispatch({ type: 'edit', update });
  }

  async function syncDatabase() {
    if (request.current) {
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    dispatch({ type: 'sync-start' });

    try {
      const database = await readRepositoryEntityDatabase(controller.signal);

      if (!controller.signal.aborted) {
        dispatch({ type: 'sync-read', database });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        dispatch({
          type: 'sync-error',
          message:
            error instanceof Error ? error.message : 'Could not synchronize the repository database. Please try again.',
        });
      }
    } finally {
      request.current = null;
    }
  }

  return {
    database: state.database,
    setDatabase,
    hasUnsavedChanges,
    syncing: state.syncing,
    syncResult: state.syncResult,
    syncDatabase,
  };
}
