import { CRS, type LatLng, point } from 'leaflet';

import { MaxNativeZoom } from 'src/common/mapSettings';
import { altarTitles } from 'src/helpers/altarTitles';
import { blockerTitles } from 'src/helpers/blockerTitles';
import { switchTitles } from 'src/helpers/switchTitles';
import { tabletAppearance } from 'src/helpers/tabletAppearance';
import { trapTitles } from 'src/helpers/trapTitles';
import type { MapEntity, MapPosition } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceType } from 'src/types/MapPlaceType';

export function mapPositionToLatLng(position: MapPosition): LatLng {
  return CRS.Simple.pointToLatLng(point(position.x, position.y), MaxNativeZoom);
}

export function mapEntityLabel(entity: MapEntity): string {
  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Switch) {
    return switchTitles[entity.switchType];
  }

  if (entity.type === MapEntityType.Item && entity.itemType === MapItemType.Arrows) {
    return 'Arrows';
  }

  if (entity.type === MapEntityType.Item && entity.itemType === MapItemType.PrisonKey) {
    return entity.title?.trim() || 'Prison Key';
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.PrisonCell) {
    return 'Prison Cell';
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Chest) {
    return 'Chest';
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Trap) {
    return trapTitles[entity.trapType];
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Blocker) {
    return blockerTitles[entity.blockerType];
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Tablet) {
    return tabletAppearance[entity.tabletType].title;
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.MirrorTeleporter) {
    return 'Mirror Teleporter';
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.LostRoom) {
    return entity.title?.trim() || 'Lost room';
  }

  if (entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Altar) {
    return altarTitles[entity.altarType];
  }

  return entity.title;
}
