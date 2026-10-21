import type { MapEntity } from 'src/types/MapEntity';

export type MapEntityDatabase = Readonly<{
  schemaVersion: 2;
  entities: readonly MapEntity[];
}>;
