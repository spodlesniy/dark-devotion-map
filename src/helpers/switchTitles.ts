import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';

export const switchTitles: Readonly<Record<MapPlaceSwitchType, string>> = {
  [MapPlaceSwitchType.Lever]: 'Lever',
  [MapPlaceSwitchType.Button]: 'Button',
  [MapPlaceSwitchType.BloodDonation]: 'Blood Donation',
};
