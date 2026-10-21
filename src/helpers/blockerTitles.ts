import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';

export const blockerTitles: Readonly<Record<MapPlaceBlockerType, string>> = {
  [MapPlaceBlockerType.CrackedWall]: 'Cracked Wall',
  [MapPlaceBlockerType.FaithLock]: 'Faith Lock',
  [MapPlaceBlockerType.Door]: 'Door',
  [MapPlaceBlockerType.TreeTrunk]: 'Tree Trunk',
};
