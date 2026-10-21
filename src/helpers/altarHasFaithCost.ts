import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';

export function altarHasFaithCost(altarType: MapPlaceAltarType): boolean {
  return altarType !== MapPlaceAltarType.TeleportationAltar && altarType !== MapPlaceAltarType.FaithStatue;
}
