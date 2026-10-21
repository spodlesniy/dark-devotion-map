import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import type { MapPointEntity, MapPointFields, MapPosition } from 'src/types/MapEntity';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';

export function addMapPoint(database: MapEntityDatabase, details: MapPointFields, position: MapPosition) {
  const id = crypto.randomUUID();
  const entity: MapPointEntity = {
    id,
    ...details,
    position,
  };

  const nextDatabase = parseMapEntityDatabase({ ...database, entities: [...database.entities, entity] });
  const addedEntity = nextDatabase.entities.find((candidate): candidate is MapPointEntity => candidate.id === id);

  if (!addedEntity) {
    throw new Error('The added point is missing from the validated database.');
  }

  return { entity: addedEntity, database: nextDatabase };
}
