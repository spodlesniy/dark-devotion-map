import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';

export const tabletAppearance = {
  [MapPlaceTabletType.Damage]: { title: 'Damage', borderColor: 'var(--color-tablet-damage)' },
  [MapPlaceTabletType.Faith]: { title: 'Faith', borderColor: 'var(--color-tablet-faith)' },
  [MapPlaceTabletType.Crit]: { title: 'Crit', borderColor: 'var(--color-tablet-crit)' },
  [MapPlaceTabletType.Stamina]: { title: 'Stamina', borderColor: 'var(--color-tablet-stamina)' },
} as const;
