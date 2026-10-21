import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceType } from 'src/types/MapPlaceType';

type EntityFieldContext = {
  type?: MapEntityType;
  placeType?: MapPlaceType;
  itemType?: MapItemType;
};

export function entityFieldVisibility(entity: EntityFieldContext) {
  const hiddenMetadata =
    entity.type === MapEntityType.Place &&
    (entity.placeType === MapPlaceType.Tablet || entity.placeType === MapPlaceType.MirrorTeleporter);

  const hiddenTitle =
    (entity.type === MapEntityType.Place && entity.placeType !== MapPlaceType.LostRoom) ||
    (entity.type === MapEntityType.Item && entity.itemType === MapItemType.Arrows);

  return {
    title: !hiddenTitle,
    titleRequired:
      !hiddenTitle &&
      !(entity.type === MapEntityType.Item && entity.itemType === MapItemType.PrisonKey) &&
      !(entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.LostRoom),
    description: !hiddenMetadata,
    url: !hiddenMetadata,
  };
}
