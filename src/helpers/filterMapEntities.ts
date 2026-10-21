import type { MapEntity } from 'src/types/MapEntity';

export type MapEntityFilter = (entity: MapEntity) => boolean;

export function filterMapEntities(
  entities: readonly MapEntity[],
  filters: Iterable<MapEntityFilter>
): readonly MapEntity[] {
  const predicates = [...filters];

  return entities.filter((entity) => predicates.every((predicate) => predicate(entity)));
}
