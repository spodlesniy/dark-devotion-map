import { serializeMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';

export function exportMapEntityDatabase(database: MapEntityDatabase): void {
  const json = serializeMapEntityDatabase(database);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'entities.json';
  link.hidden = true;

  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    // Give the browser time to start the download before releasing the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
