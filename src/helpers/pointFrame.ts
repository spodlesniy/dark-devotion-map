import { tabletAppearance } from 'src/helpers/tabletAppearance';
import type { MapPointDetails } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceType } from 'src/types/MapPlaceType';

export function pointFrameColor(entity: MapPointDetails): string | null {
  if (entity.type === MapEntityType.Enemy && entity.isBoss) {
    return 'var(--color-entity-enemy)';
  }

  if (entity.type === MapEntityType.Codex) {
    return 'var(--point-frame-default-border-color)';
  }

  if (entity.type === MapEntityType.Place) {
    return entity.placeType === MapPlaceType.Tablet
      ? tabletAppearance[entity.tabletType].borderColor
      : 'var(--point-frame-default-border-color)';
  }

  return null;
}
