import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';

export const trapTitles: Readonly<Record<MapPlaceTrapType, string>> = {
  [MapPlaceTrapType.Spear]: 'Spear',
  [MapPlaceTrapType.Axe]: 'Axe',
  [MapPlaceTrapType.SpinningBlade]: 'Spinning Blade',
  [MapPlaceTrapType.Spikes]: 'Spikes',
  [MapPlaceTrapType.OilSlick]: 'Oil Slick',
  [MapPlaceTrapType.Stalagtight]: 'Stalagtight',
  [MapPlaceTrapType.ExplodingPlant]: 'Exploding Plant',
  [MapPlaceTrapType.PoisonPlant]: 'Poison Plant',
  [MapPlaceTrapType.LightningOrb]: 'Lightning Orb',
  [MapPlaceTrapType.BloodExplosion]: 'Blood Explosion',
  [MapPlaceTrapType.BlessingThief]: 'Blessing Thief',
  [MapPlaceTrapType.DeathPit]: 'Death Pit',
  [MapPlaceTrapType.SlumpingFloor]: 'Slumping Floor',
};
