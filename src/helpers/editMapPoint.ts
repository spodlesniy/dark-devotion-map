import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import type { MapPointEntity } from 'src/types/MapEntity';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';

export function updateMapPoint(database: MapEntityDatabase, point: MapPointEntity): MapEntityDatabase {
  if (!database.entities.some((entity) => entity.id === point.id)) {
    throw new Error('The point no longer exists.');
  }

  return parseMapEntityDatabase({
    ...database,
    entities: database.entities.map((entity) => (entity.id === point.id ? point : entity)),
  });
}

export function removeMapPoint(database: MapEntityDatabase, id: string): MapEntityDatabase {
  return parseMapEntityDatabase({
    ...database,
    entities: database.entities.filter((entity) => entity.id !== id),
  });
}
