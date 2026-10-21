import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportMapEntityDatabase } from 'src/helpers/exportMapEntityDatabase';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setupDownload() {
  vi.useFakeTimers();
  const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:entity-export');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.stubGlobal('Blob', NodeBlob);

  return { createObjectURL, revokeObjectURL };
}

describe('Entity JSON download', () => {
  it('downloads a JSON file containing the current database and releases its resources', async () => {
    const { createObjectURL, revokeObjectURL } = setupDownload();
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
      expect(this.isConnected).toBe(true);
    });
    const database = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        {
          title: 'Test point',
          id: '77777777-0000-4000-8000-000000000000',
          type: 'item',
          itemType: 'weapon',
          position: { x: 7400, y: 11600 },
        },
      ],
    });

    exportMapEntityDatabase(database);

    expect(downloadName).toBe('entities.json');
    const blob: unknown = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(NodeBlob);

    if (!(blob instanceof NodeBlob)) {
      throw new Error('Expected an exported Blob');
    }

    expect(blob.type).toBe('application/json;charset=utf-8');
    expect(JSON.parse(await blob.text())).toEqual(database);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:entity-export');
  });

  it('cleans up even if starting the download fails', () => {
    const { revokeObjectURL } = setupDownload();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('Download failed');
    });

    expect(() => exportMapEntityDatabase({ schemaVersion: 2, entities: [] })).toThrow('Download failed');
    expect(document.querySelector('a[download]')).toBeNull();

    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:entity-export');
  });
});
