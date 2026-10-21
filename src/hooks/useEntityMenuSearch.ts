import { useMemo } from 'react';

import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import type { MapEntity } from 'src/types/MapEntity';

export function useEntityMenuSearch(entities: readonly MapEntity[], query: string) {
  return useMemo(
    () => (query ? entities.filter((entity) => mapEntityLabel(entity).toLowerCase().includes(query)) : entities),
    [entities, query]
  );
}
