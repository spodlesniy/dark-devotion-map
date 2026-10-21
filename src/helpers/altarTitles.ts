import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';

export const altarTitles = {
  [MapPlaceAltarType.RunicAltar]: 'Runic Altar',
  [MapPlaceAltarType.BlessingAltar]: 'Blessing Altar',
  [MapPlaceAltarType.HealingStatue]: 'Healing Statue',
  [MapPlaceAltarType.DiseasePurgingStatue]: 'Disease Purging Statue',
  [MapPlaceAltarType.TeleportationAltar]: 'Teleportation Altar',
  [MapPlaceAltarType.FaithStatue]: 'Faith Statue',
  [MapPlaceAltarType.AltarOfTheMagnanimous]: 'Altar Of The Magnanimous',
  [MapPlaceAltarType.StrangeAltar]: 'Strange Altar',
  [MapPlaceAltarType.AltarOfRedemption]: 'Altar Of Redemption',
  [MapPlaceAltarType.ImpiousAltar]: 'Impious Altar',
} satisfies Record<MapPlaceAltarType, string>;
