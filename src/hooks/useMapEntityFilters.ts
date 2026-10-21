import { useMemo, useState } from 'react';

import { filterMapEntities, type MapEntityFilter } from 'src/helpers/filterMapEntities';
import type { MapEntity } from 'src/types/MapEntity';

export function useMapEntityFilters(entities: readonly MapEntity[]) {
  const [filters, setFilters] = useState<ReadonlyMap<string, MapEntityFilter>>(() => new Map());

  const visibleEntities = useMemo(() => filterMapEntities(entities, filters.values()), [entities, filters]);
  const activeFilterIds = useMemo(() => new Set(filters.keys()), [filters]);

  function setFilter(id: string, predicate: MapEntityFilter | null) {
    setFilters((current) => {
      const next = new Map(current);

      if (predicate) {
        next.set(id, predicate);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  return { visibleEntities, activeFilterIds, setFilter };
}
