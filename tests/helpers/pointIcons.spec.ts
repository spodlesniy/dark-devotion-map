import { describe, expect, it } from 'vitest';

import { createPointIconResolver, type PointIconDetails } from 'src/helpers/pointIcons';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceType } from 'src/types/MapPlaceType';

const cases: readonly { entity: PointIconDetails; path: string }[] = [
  { entity: { type: MapEntityType.Place, placeType: MapPlaceType.Switch }, path: 'place/switch.png' },
  ...Object.values(MapPlaceSwitchType).map((switchType) => ({
    entity: { type: MapEntityType.Place as const, placeType: MapPlaceType.Switch as const, switchType },
    path: `place/switch/${switchType}.png`,
  })),
  { entity: { type: MapEntityType.Npc, title: 'Kraumdeith' }, path: 'npc/kraumdeith.png' },
  { entity: { type: MapEntityType.Codex }, path: 'codex/book.png' },
  { entity: { type: MapEntityType.Codex, isSavedToLibrary: false }, path: 'codex/book.png' },
  { entity: { type: MapEntityType.Codex, isSavedToLibrary: true }, path: 'codex/book-library.png' },
  { entity: { type: MapEntityType.Enemy, isBoss: false }, path: 'enemy/enemy.png' },
  { entity: { type: MapEntityType.Enemy, isBoss: true }, path: 'enemy/boss.png' },
  ...Object.values(MapPlaceTabletType).map((tabletType) => ({
    entity: { type: MapEntityType.Place as const, placeType: MapPlaceType.Tablet as const, tabletType },
    path: 'place/tablet.png',
  })),
  ...Object.values(MapPlaceAltarType).map((altarType) => ({
    entity: { type: MapEntityType.Place as const, placeType: MapPlaceType.Altar as const, altarType },
    path:
      altarType === MapPlaceAltarType.TeleportationAltar ? 'place/altar/teleportation-altar.png' : 'place/altar.png',
  })),
  {
    entity: { type: MapEntityType.Place, placeType: MapPlaceType.MirrorTeleporter },
    path: 'place/mirror-teleporter.png',
  },
  { entity: { type: MapEntityType.Place, placeType: MapPlaceType.LostRoom }, path: 'place/lost-room.png' },
  ...Object.values(MapItemType).map((itemType) => ({
    entity: { type: MapEntityType.Item as const, itemType },
    path: `item/${itemType}.png`,
  })),
];

describe('Derived point icons', () => {
  it.each(cases)('resolves $path and respects the application base', ({ entity, path }) => {
    const resolve = createPointIconResolver([`/public/images/entities/point/${path}`], '/DarkDevotionMap/');
    expect(resolve(entity)).toBe(`/DarkDevotionMap/images/entities/point/${path}`);
  });

  it.each(cases)('falls back when $path is missing instead of using a different icon', ({ entity }) => {
    const resolve = createPointIconResolver(['/public/images/entities/point/other.png'], '/');
    expect(resolve(entity)).toBeNull();
  });

  it('uses the standard dot for NPCs without a matching title icon', () => {
    const resolve = createPointIconResolver(['/public/images/entities/point/npc.png'], '/');
    expect(resolve({ type: MapEntityType.Npc })).toBeNull();
  });
});

it.each([
  { title: 'NPC 42 - The Keeper', filename: 'npc-42---the-keeper' },
  { title: "A.B/C\\D's!?", filename: 'a-b-c-d-s--' },
  { title: 'Éowyn 7', filename: 'éowyn-7' },
])('normalizes NPC title $title without collapsing replacement characters', ({ title, filename }) => {
  const resolve = createPointIconResolver([`/public/images/entities/point/npc/${filename}.png`], '/map/');
  expect(resolve({ type: MapEntityType.Npc, title })).toBe(`/map/images/entities/point/npc/${filename}.png`);
});

it.each([undefined, '', 'Unknown NPC'])('falls back for an NPC with no matching icon (%j)', (title) => {
  const resolve = createPointIconResolver(['/public/images/entities/point/npc/kraumdeith.png'], '/');
  expect(resolve({ type: MapEntityType.Npc, ...(title === undefined ? {} : { title }) })).toBeNull();
});

it('prefers a regular enemy icon derived from its lowercase hyphenated title', () => {
  const resolve = createPointIconResolver(
    ['/public/images/entities/point/enemy/fallen-knight.png', '/public/images/entities/point/enemy/enemy.png'],
    '/map/'
  );
  expect(resolve({ type: MapEntityType.Enemy, isBoss: false, title: 'Fallen Knight' })).toBe(
    '/map/images/entities/point/enemy/fallen-knight.png'
  );
  expect(resolve({ type: MapEntityType.Enemy, isBoss: false, isElite: true, title: '  FALLEN   Knight  ' })).toBe(
    '/map/images/entities/point/enemy/fallen-knight.png'
  );
});

it('falls back to enemy.png for missing title icons and preserves the dot when both files are missing', () => {
  const enemy = { type: MapEntityType.Enemy, isBoss: false, title: 'Unknown enemy' } as const;
  expect(createPointIconResolver(['/public/images/entities/point/enemy/enemy.png'], '/')(enemy)).toBe(
    '/images/entities/point/enemy/enemy.png'
  );
  expect(createPointIconResolver([], '/')(enemy)).toBeNull();
});

it('keeps boss.png for bosses regardless of the title icon', () => {
  const resolve = createPointIconResolver(
    ['/public/images/entities/point/enemy/boss.png', '/public/images/entities/point/enemy/fallen-knight.png'],
    '/'
  );
  expect(resolve({ type: MapEntityType.Enemy, isBoss: true, title: 'Fallen Knight' })).toBe(
    '/images/entities/point/enemy/boss.png'
  );
});
