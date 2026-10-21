import { expect, it } from 'vitest';

import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceType } from 'src/types/MapPlaceType';

it.each([
  { title: undefined, expected: 'Lost room' },
  { title: '', expected: 'Lost room' },
  { title: '   ', expected: 'Lost room' },
  { title: '  Quiet chamber  ', expected: 'Quiet chamber' },
])('uses optional LostRoom title $title or its default label', ({ title, expected }) => {
  expect(
    mapEntityLabel({
      id: 'room',
      type: MapEntityType.Place,
      placeType: MapPlaceType.LostRoom,
      ...(title === undefined ? {} : { title }),
      position: { x: 1, y: 2 },
    })
  ).toBe(expected);
});

it.each([
  [MapPlaceAltarType.RunicAltar, 'Runic Altar'],
  [MapPlaceAltarType.BlessingAltar, 'Blessing Altar'],
  [MapPlaceAltarType.HealingStatue, 'Healing Statue'],
  [MapPlaceAltarType.DiseasePurgingStatue, 'Disease Purging Statue'],
  [MapPlaceAltarType.TeleportationAltar, 'Teleportation Altar'],
  [MapPlaceAltarType.FaithStatue, 'Faith Statue'],
  [MapPlaceAltarType.AltarOfTheMagnanimous, 'Altar Of The Magnanimous'],
  [MapPlaceAltarType.StrangeAltar, 'Strange Altar'],
  [MapPlaceAltarType.AltarOfRedemption, 'Altar Of Redemption'],
  [MapPlaceAltarType.ImpiousAltar, 'Impious Altar'],
] as const)('derives %s title as %s instead of a legacy title', (altarType, title) => {
  const altar = {
    id: '11111111-0000-4000-8000-000000000000',
    type: MapEntityType.Place,
    placeType: MapPlaceType.Altar,
    altarType,
    position: { x: 10, y: 20 },
  } as const;
  expect(mapEntityLabel(altar)).toBe(title);
  expect(mapEntityLabel({ ...altar, title: 'Legacy title' })).toBe(title);
});
