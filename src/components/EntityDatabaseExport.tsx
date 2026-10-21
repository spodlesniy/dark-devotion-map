import { type ReactNode, useState } from 'react';

import './EntityDatabaseExport.scss';

import { exportMapEntityDatabase } from 'src/helpers/exportMapEntityDatabase';
import type { EntitySyncResult } from 'src/hooks/useEntityDatabase';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';

type EntityDatabaseExportProps = {
  statusControl?: ReactNode;
  database: MapEntityDatabase;
  hasUnsavedChanges: boolean;
  syncing: boolean;
  syncResult: EntitySyncResult | null;
  onSync: () => void;
};

export function EntityDatabaseExport({
  statusControl,
  database,
  hasUnsavedChanges,
  syncing,
  syncResult,
  onSync,
}: Readonly<EntityDatabaseExportProps>) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="entity-database-export">
      <div className="entity-database-export__status-row">
        <p
          className={`entity-database-export__status${hasUnsavedChanges ? ' entity-database-export__status--unsaved' : ''}`}
          role="status"
        >
          {hasUnsavedChanges ? 'Unsaved changes' : 'No unsaved changes'}
        </p>
        {statusControl}
      </div>
      <div className="entity-database-export__actions">
        <button
          className="entity-database-export__button"
          type="button"
          onClick={() => {
            try {
              exportMapEntityDatabase(database);
              setError(null);
            } catch {
              setError('Could not export the entity database. Please try again.');
            }
          }}
        >
          Export JSON
        </button>
        <button
          className="entity-database-export__button"
          type="button"
          disabled={!hasUnsavedChanges || syncing}
          onClick={onSync}
        >
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>
      {syncResult && (
        <p
          className={syncResult.kind !== 'success' ? 'entity-database-export__error' : undefined}
          role={syncResult.kind === 'error' ? 'alert' : 'status'}
        >
          {syncResult.message}
        </p>
      )}
      {error && (
        <p className="entity-database-export__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
