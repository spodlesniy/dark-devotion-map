import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EntityDatabaseExport } from 'src/components/EntityDatabaseExport';
import { addMapPoint } from 'src/helpers/addMapPoint';
import { exportMapEntityDatabase } from 'src/helpers/exportMapEntityDatabase';
import { readRepositoryEntityDatabase } from 'src/helpers/readRepositoryEntityDatabase';
import { useEntityDatabase } from 'src/hooks/useEntityDatabase';
import { useUnsavedChangesWarning } from 'src/hooks/useUnsavedChangesWarning';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';
import { MapEntityType } from 'src/types/MapEntityType';

vi.mock('src/helpers/exportMapEntityDatabase', () => ({ exportMapEntityDatabase: vi.fn() }));
vi.mock('src/common/environment', () => ({ isDeveloperMode: true }));
vi.mock('src/helpers/readRepositoryEntityDatabase', () => ({ readRepositoryEntityDatabase: vi.fn() }));

function ExportHarness() {
  const { database, setDatabase, hasUnsavedChanges, syncing, syncResult, syncDatabase } = useEntityDatabase({
    schemaVersion: 2,
    entities: [],
  });

  useUnsavedChangesWarning(hasUnsavedChanges);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setDatabase(
            addMapPoint(database, { title: 'Test point', type: MapEntityType.Enemy, isBoss: false }, { x: 100, y: 200 })
              .database
          )
        }
      >
        Add test point
      </button>
      <EntityDatabaseExport
        database={database}
        hasUnsavedChanges={hasUnsavedChanges}
        syncing={syncing}
        syncResult={syncResult}
        onSync={syncDatabase}
      />
    </>
  );
}

describe('Export and unsaved changes', () => {
  it('keeps Sync visible, enables it only for changes, and reports mismatch and success', async () => {
    render(<ExportHarness />);
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Sync' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sync' }).parentElement).toContainElement(
      screen.getByRole('button', { name: 'Export JSON' })
    );
    await user.click(screen.getByRole('button', { name: 'Add test point' }));
    expect(screen.getByText('Unsaved changes')).toHaveClass('entity-database-export__status--unsaved');
    let finish!: (database: MapEntityDatabase) => void;
    vi.mocked(readRepositoryEntityDatabase).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await user.click(screen.getByRole('button', { name: 'Sync' }));
    expect(screen.getByRole('button', { name: 'Syncing…' })).toBeDisabled();
    await act(async () => {
      finish({ schemaVersion: 2, entities: [] });
    });
    expect(await screen.findByText(/Repository database differs/)).toHaveClass('entity-database-export__error');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export JSON' }));
    const working = vi.mocked(exportMapEntityDatabase).mock.calls.at(-1)?.[0];

    if (!working) {
      throw new Error('Expected an exported database.');
    }

    vi.mocked(readRepositoryEntityDatabase).mockResolvedValueOnce(working);
    await user.click(screen.getByRole('button', { name: 'Sync' }));
    expect(await screen.findByText(/Changes are synchronized/)).toBeInTheDocument();
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync' })).toBeDisabled();
  });

  it('keeps the dirty status after successful and failed exports of the working database', async () => {
    render(<ExportHarness />);
    const user = userEvent.setup();

    expect(screen.getByRole('status')).toHaveTextContent('No unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Add test point' }));
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    await user.click(screen.getByRole('button', { name: 'Export JSON' }));

    expect(exportMapEntityDatabase).toHaveBeenCalledWith({
      schemaVersion: 2,
      entities: [
        {
          title: 'Test point',
          id: expect.any(String),
          type: 'enemy',
          isBoss: false,
          isElite: false,
          position: { x: 100, y: 200 },
        },
      ],
    });
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');

    const afterExport = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterExport);
    expect(afterExport.defaultPrevented).toBe(true);

    vi.mocked(exportMapEntityDatabase).mockImplementationOnce(() => {
      throw new Error('Download failed');
    });
    await user.click(screen.getByRole('button', { name: 'Export JSON' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not export');
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    const afterFailedExport = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(afterFailedExport);
    expect(afterFailedExport.defaultPrevented).toBe(true);
  });
});
