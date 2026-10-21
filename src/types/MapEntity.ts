import type { MapChestVariant } from 'src/types/MapChestVariant';
import type { MapEntityType } from 'src/types/MapEntityType';
import type { MapItemType } from 'src/types/MapItemType';
import type { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import type { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import type { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import type { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import type { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import type { MapPlaceType } from 'src/types/MapPlaceType';
import type { MapTitleSize } from 'src/types/MapTitleSize';

// Coordinates in the original image: x increases rightward, y downward.
export type MapPosition = Readonly<{
  x: number;
  y: number;
}>;

export type MapEntityMetadata = Readonly<{
  description?: string;
  url?: string;
}>;

export type MapEntityFields = MapEntityMetadata & { title: string };

export type MapPlaceDetails = Readonly<
  | {
      placeType: MapPlaceType.Altar;
      altarType: MapPlaceAltarType;
      faithCost?: number;
    }
  | { placeType: MapPlaceType.Blocker; blockerType: MapPlaceBlockerType.FaithLock; faithCost: number }
  | { placeType: MapPlaceType.Blocker; blockerType: Exclude<MapPlaceBlockerType, MapPlaceBlockerType.FaithLock> }
  | { placeType: MapPlaceType.Chest; variant: MapChestVariant }
  | { placeType: MapPlaceType.Switch; switchType: MapPlaceSwitchType }
  | { placeType: MapPlaceType.PrisonCell }
  | { placeType: MapPlaceType.LostRoom }
  | { placeType: MapPlaceType.Tablet; tabletType: MapPlaceTabletType }
  | { placeType: MapPlaceType.MirrorTeleporter }
  | { placeType: MapPlaceType.Trap; trapType: MapPlaceTrapType }
>;

export type MapPointDetails = Readonly<
  | { type: MapEntityType.Title; size: MapTitleSize; color: string }
  | { type: MapEntityType.Codex; isSavedToLibrary?: boolean; part?: number; totalParts?: number; group?: string }
  | { type: MapEntityType.Npc }
  | { type: MapEntityType.Enemy; isBoss: boolean; isElite?: boolean }
  | ({ type: MapEntityType.Place } & MapPlaceDetails)
  | { type: MapEntityType.Item; itemType: MapItemType.PrisonKey }
  | { type: MapEntityType.Item; itemType: MapItemType.Arrows }
  | { type: MapEntityType.Item; itemType: Exclude<MapItemType, MapItemType.PrisonKey | MapItemType.Arrows> }
>;

type PointFields<Details extends MapPointDetails> = Details extends
  | { type: MapEntityType.Place }
  | { type: MapEntityType.Item; itemType: MapItemType.PrisonKey | MapItemType.Arrows }
  ? Details & MapEntityMetadata & { title?: string }
  : Details & MapEntityFields;

export type MapPointFields = PointFields<MapPointDetails>;

export type MapPointEntity = Readonly<
  MapPointFields & { id: string } & {
    position: MapPosition;
  }
>;

export type MapEntity = MapPointEntity;
