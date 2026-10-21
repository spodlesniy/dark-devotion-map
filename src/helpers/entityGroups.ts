import { altarTitles } from 'src/helpers/altarTitles';
import { blockerTitles } from 'src/helpers/blockerTitles';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import type { PointIconDetails } from 'src/helpers/pointIcons';
import { tabletAppearance } from 'src/helpers/tabletAppearance';
import { trapTitles } from 'src/helpers/trapTitles';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import { MapPlaceType } from 'src/types/MapPlaceType';

export type EntityVisibilityGroup = {
  id: string;
  title: string;
  matches: (entity: MapEntity) => boolean;
};

export type EntityGrouping = {
  ungroupSingle?: boolean;
  matches?: (entity: MapEntity) => boolean;
  getEntityTitle?: (entity: MapEntity) => string;
  sortChildren?: EntityChildrenSort;
  getKey: (entity: MapEntity) => string;
  getTitle?: (key: string) => string;
  getIcon?: (key: string) => PointIconDetails | undefined;
  keys?: readonly string[];
  showIcon?: boolean;
  showVisibility?: boolean;
  showCount?: boolean;
  collapsible?: boolean;
  alwaysExpanded?: boolean;
  defaultExpanded?: boolean;
  expandOnSearch?: boolean;
  showWhenNoMatches?: boolean;
  showEntityVisibility?: boolean;
};

type EntityChildrenSort = (
  left: Readonly<{ title: string; entity?: MapEntity }>,
  right: Readonly<{ title: string; entity?: MapEntity }>
) => number;

const titleCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function sortByTitle(left: Readonly<{ title: string }>, right: Readonly<{ title: string }>) {
  return titleCollator.compare(left.title, right.title);
}

export type EntityGroup = EntityVisibilityGroup & {
  sortChildren?: EntityChildrenSort;
  icon?: PointIconDetails;
  showIcon?: boolean;
  showVisibility?: boolean;
  showCount?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expandOnSearch?: boolean;
  showWhenNoMatches?: boolean;
  children?: readonly EntityGroup[];
  grouping?: EntityGrouping;
};

const enemySubgroups: readonly EntityGroup[] = [
  {
    id: 'enemy:boss',
    title: 'Bosses',
    sortChildren: sortByTitle,
    icon: { type: MapEntityType.Enemy, isBoss: true },
    matches: (entity) => entity.type === MapEntityType.Enemy && entity.isBoss,
  },
  {
    id: 'enemy:regular',
    title: 'Regular',
    sortChildren: sortByTitle,
    icon: { type: MapEntityType.Enemy, isBoss: false },
    grouping: { getKey: mapEntityLabel, showEntityVisibility: false },
    matches: (entity) => entity.type === MapEntityType.Enemy && !entity.isBoss,
  },
];

const placeTitles: Record<MapPlaceType, string> = {
  [MapPlaceType.Chest]: 'Chests',
  [MapPlaceType.Switch]: 'Switches',
  [MapPlaceType.PrisonCell]: 'Prison cells',
  [MapPlaceType.Blocker]: 'Blockers',
  [MapPlaceType.Trap]: 'Traps',
  [MapPlaceType.Tablet]: 'Tablets',
  [MapPlaceType.Altar]: 'Altars',
  [MapPlaceType.MirrorTeleporter]: 'Mirror teleporters',
  [MapPlaceType.LostRoom]: 'Lost rooms',
};

const itemTitles: Record<MapItemType, string> = {
  [MapItemType.Weapon]: 'Weapons',
  [MapItemType.LeftHand]: 'Left hand',
  [MapItemType.Armor]: 'Armor',
  [MapItemType.Rune]: 'Runes',
  [MapItemType.Trinket]: 'Trinkets',
  [MapItemType.Consumable]: 'Consumables',
  [MapItemType.PrisonKey]: 'Prison keys',
  [MapItemType.Arrows]: 'Arrows',
};

const placeGroupIcons: Partial<Record<MapPlaceType, PointIconDetails>> = {
  [MapPlaceType.Trap]: { type: MapEntityType.Place, placeType: MapPlaceType.Trap, trapType: MapPlaceTrapType.Spear },
  [MapPlaceType.Blocker]: {
    type: MapEntityType.Place,
    placeType: MapPlaceType.Blocker,
    blockerType: MapPlaceBlockerType.CrackedWall,
  },
  [MapPlaceType.Chest]: { type: MapEntityType.Place, placeType: MapPlaceType.Chest, variant: 1 },
};

const placeSubgroups: readonly EntityGroup[] = Object.values(MapPlaceType).flatMap((type): EntityGroup[] => {
  const subgroup: EntityGroup = {
    id: `place:${type}`,
    title: placeTitles[type],
    ...(type === MapPlaceType.Tablet
      ? {
          grouping: {
            getKey: (entity: MapEntity) =>
              entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Tablet ? entity.tabletType : '',
            getTitle: (key: string) =>
              Object.entries(tabletAppearance).find(([value]) => value === key)?.[1].title ?? key,
            keys: Object.values(MapPlaceTabletType),
            showEntityVisibility: false,
          },
        }
      : type === MapPlaceType.Altar
        ? {
            grouping: {
              getKey: (entity: MapEntity) =>
                entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Altar ? entity.altarType : '',
              getTitle: (key: string) => altarTitles[key as MapPlaceAltarType],
              collapsible: false,
              showEntityVisibility: false,
            },
          }
        : type === MapPlaceType.Trap
          ? {
              grouping: {
                getKey: (entity: MapEntity) =>
                  entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Trap ? entity.trapType : '',
                getTitle: (key: string) => trapTitles[key as MapPlaceTrapType],
                keys: Object.values(MapPlaceTrapType),
                collapsible: false,
                showEntityVisibility: false,
              },
            }
          : type === MapPlaceType.Blocker
            ? {
                grouping: {
                  getKey: (entity: MapEntity) =>
                    entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.Blocker
                      ? entity.blockerType
                      : '',
                  getTitle: (key: string) => blockerTitles[key as MapPlaceBlockerType],
                  keys: Object.values(MapPlaceBlockerType),
                  collapsible: false,
                  showEntityVisibility: false,
                },
              }
            : {}),
    ...(type === MapPlaceType.Switch
      ? {
          children: Object.values(MapPlaceSwitchType).map((switchType) => ({
            id: `place:switch:${switchType}`,
            title: { lever: 'Levers', button: 'Buttons', 'blood-donation': 'Blood donations' }[switchType],
            icon: { type: MapEntityType.Place as const, placeType: MapPlaceType.Switch as const, switchType },
            collapsible: false,
            matches: (entity: MapEntity) =>
              entity.type === MapEntityType.Place &&
              entity.placeType === MapPlaceType.Switch &&
              entity.switchType === switchType,
          })),
        }
      : {}),
    collapsible: ![MapPlaceType.MirrorTeleporter, MapPlaceType.Chest, MapPlaceType.PrisonCell].includes(type),
    icon: placeGroupIcons[type] ?? { type: MapEntityType.Place, placeType: type },
    matches: (entity) =>
      entity.type === MapEntityType.Place &&
      entity.placeType === type &&
      !(entity.placeType === MapPlaceType.Altar && entity.altarType === MapPlaceAltarType.TeleportationAltar),
  };

  if (type === MapPlaceType.MirrorTeleporter) {
    return [
      {
        id: 'place:teleportation-altar',
        title: 'Teleporters',
        collapsible: false,
        icon: {
          type: MapEntityType.Place,
          placeType: MapPlaceType.Altar,
          altarType: MapPlaceAltarType.TeleportationAltar,
        },
        matches: (entity) =>
          entity.type === MapEntityType.Place &&
          entity.placeType === MapPlaceType.Altar &&
          entity.altarType === MapPlaceAltarType.TeleportationAltar,
      },
      subgroup,
    ];
  }

  return [subgroup];
});

const itemSubgroups: readonly EntityGroup[] = Object.values(MapItemType).map((type) => ({
  id: `item:${type}`,
  title: itemTitles[type],
  collapsible: type !== MapItemType.PrisonKey && type !== MapItemType.Arrows,
  icon: { type: MapEntityType.Item, itemType: type },
  matches: (entity) => entity.type === MapEntityType.Item && entity.itemType === type,
}));

export const entityGroups: readonly EntityGroup[] = [
  {
    id: 'title',
    title: 'Titles',
    sortChildren: sortByTitle,
    showWhenNoMatches: true,
    matches: (entity) => entity.type === MapEntityType.Title,
  },
  {
    id: 'npc',
    title: 'NPCs',
    grouping: { getKey: mapEntityLabel, showEntityVisibility: false, ungroupSingle: true },
    sortChildren: sortByTitle,
    showWhenNoMatches: true,
    matches: (entity) => entity.type === MapEntityType.Npc,
  },
  {
    id: 'codex',
    title: 'Codex',
    sortChildren: sortByTitle,
    showWhenNoMatches: true,
    matches: (entity) => entity.type === MapEntityType.Codex,
    grouping: {
      matches: (entity) =>
        entity.type === MapEntityType.Codex &&
        (Boolean(entity.group?.trim()) || (entity.part !== undefined && entity.totalParts !== undefined)),
      getKey: (entity) =>
        entity.type === MapEntityType.Codex ? entity.group?.trim() || mapEntityLabel(entity) : mapEntityLabel(entity),
      sortChildren: (left, right) =>
        (left.entity?.type === MapEntityType.Codex ? (left.entity.part ?? 0) : 0) -
        (right.entity?.type === MapEntityType.Codex ? (right.entity.part ?? 0) : 0),
      showEntityVisibility: false,
    },
  },
  {
    id: 'item',
    title: 'Items',
    showWhenNoMatches: true,
    matches: (entity) => entity.type === MapEntityType.Item,
    children: itemSubgroups,
  },
  {
    id: 'enemy',
    title: 'Enemies',
    showWhenNoMatches: true,
    defaultExpanded: true,
    matches: (entity) => entity.type === MapEntityType.Enemy,
    children: enemySubgroups,
  },
  {
    id: 'place',
    title: 'Places',
    showWhenNoMatches: true,
    defaultExpanded: true,
    matches: (entity) => entity.type === MapEntityType.Place,
    children: placeSubgroups,
  },
];
