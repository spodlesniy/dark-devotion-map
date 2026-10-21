import type { MapPointDetails } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceType } from 'src/types/MapPlaceType';

export type PointIconDetails = (
  | MapPointDetails
  | Pick<Extract<MapPointDetails, { type: MapEntityType.Place }>, 'type' | 'placeType'>
  | Pick<Extract<MapPointDetails, { type: MapEntityType.Item }>, 'type' | 'itemType'>
) & { readonly title?: string };

export function createPointIconResolver(paths: readonly string[], baseUrl: string) {
  const available = new Set(paths);

  return (entity: PointIconDetails): string | null => {
    let path: string;

    switch (entity.type) {
      case MapEntityType.Npc: {
        const title = entity.title?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '-');

        if (!title) {
          return null;
        }

        path = `point/npc/${title}.png`;
        break;
      }
      case MapEntityType.Codex:
        path = `point/codex/${entity.isSavedToLibrary === true ? 'book-library' : 'book'}.png`;
        break;
      case MapEntityType.Enemy: {
        const title = entity.title?.trim().toLowerCase().replace(/\s+/g, '-');
        const namedPath = title ? `point/enemy/${title}.png` : null;
        path = entity.isBoss
          ? 'point/enemy/boss.png'
          : namedPath && available.has(`/public/images/entities/${namedPath}`)
            ? namedPath
            : 'point/enemy/enemy.png';
        break;
      }
      case MapEntityType.Place:
        if (
          entity.placeType === MapPlaceType.Altar &&
          'altarType' in entity &&
          entity.altarType === MapPlaceAltarType.TeleportationAltar
        ) {
          path = 'point/place/altar/teleportation-altar.png';
        } else if (entity.placeType === MapPlaceType.Switch && 'switchType' in entity) {
          path = `point/place/switch/${entity.switchType}.png`;
        } else if (entity.placeType === MapPlaceType.Chest) {
          if (!('variant' in entity)) {
            return null;
          }

          path = `point/place/chest/chest-${entity.variant}.png`;
        } else if (entity.placeType === MapPlaceType.Blocker) {
          if (!('blockerType' in entity)) {
            return null;
          }

          path = `point/place/blocker/${entity.blockerType}.png`;
        } else if (entity.placeType === MapPlaceType.Trap) {
          if (!('trapType' in entity)) {
            return null;
          }

          path = `point/place/trap/${entity.trapType}.png`;
        } else {
          path = `point/place/${entity.placeType}.png`;
        }
        break;
      case MapEntityType.Item:
        path = `point/item/${entity.itemType}.png`;
        break;
      case MapEntityType.Title:
        return null;
    }

    if (!available.has(`/public/images/entities/${path}`)) {
      return null;
    }

    return `${baseUrl}images/entities/${path}`;
  };
}

// Keep Object.keys directly around the glob to index public paths without importing images.
export const getPointIconUrl = createPointIconResolver(
  Object.keys(import.meta.glob('/public/images/entities/point/**/*.png')),
  import.meta.env.BASE_URL
);
