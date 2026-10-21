import { ImageHeight, ImageWidth } from 'src/common/mapSettings';
import { altarHasFaithCost } from 'src/helpers/altarHasFaithCost';
import { codexPartsError } from 'src/helpers/codexPartsError';
import { entityFieldVisibility } from 'src/helpers/entityFieldVisibility';
import { isValidEntityUrl } from 'src/helpers/isValidEntityUrl';
import { chestVariants, type MapChestVariant } from 'src/types/MapChestVariant';
import type { MapEntity, MapPlaceDetails, MapPointDetails, MapPosition } from 'src/types/MapEntity';
import type { MapEntityDatabase } from 'src/types/MapEntityDatabase';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import { MapPlaceType } from 'src/types/MapPlaceType';
import { MapTitleSize } from 'src/types/MapTitleSize';

function parseMapPlaceDetails(data: Record<string, unknown>, path: string): MapPlaceDetails {
  const { placeType, altarType, tabletType, blockerType, trapType, switchType, faithCost, variant } = data;

  for (const [field, owner] of [
    ['variant', MapPlaceType.Chest],
    ['altarType', MapPlaceType.Altar],
    ['blockerType', MapPlaceType.Blocker],
    ['trapType', MapPlaceType.Trap],
    ['tabletType', MapPlaceType.Tablet],
    ['switchType', MapPlaceType.Switch],
  ] as const) {
    if (data[field] !== undefined && placeType !== owner) {
      throw new Error(`${path}.${field} is only valid for ${owner} places.`);
    }
  }

  if (
    faithCost !== undefined &&
    placeType !== MapPlaceType.Altar &&
    !(placeType === MapPlaceType.Blocker && blockerType === MapPlaceBlockerType.FaithLock)
  ) {
    throw new Error(`${path}.faithCost is only valid for altars and Faith Lock blockers.`);
  }

  switch (placeType) {
    case MapPlaceType.Switch:
      if (!Object.values(MapPlaceSwitchType).some((value) => value === switchType)) {
        throw new Error(`${path}.switchType must be a supported switch type.`);
      }

      return { placeType, switchType: switchType as MapPlaceSwitchType };
    case MapPlaceType.Chest:
      if (!chestVariants.some((value) => value === variant)) {
        throw new Error(`${path}.variant is required and must be an integer from 1 to 5.`);
      }

      return { placeType, variant: variant as MapChestVariant };
    case MapPlaceType.Trap:
      if (!Object.values(MapPlaceTrapType).some((value) => value === trapType)) {
        throw new Error(`${path}.trapType must be a supported trap type.`);
      }

      return { placeType, trapType: trapType as MapPlaceTrapType };
    case MapPlaceType.Blocker:
      if (!Object.values(MapPlaceBlockerType).some((value) => value === blockerType)) {
        throw new Error(`${path}.blockerType must be a supported blocker type.`);
      }

      if (blockerType === MapPlaceBlockerType.FaithLock) {
        if (typeof faithCost !== 'number' || !Number.isFinite(faithCost) || faithCost < 0) {
          throw new Error(`${path}.faithCost is required and must be a finite non-negative number for Faith Lock.`);
        }

        return { placeType, blockerType, faithCost };
      }

      return { placeType, blockerType: blockerType as Exclude<MapPlaceBlockerType, MapPlaceBlockerType.FaithLock> };
    case MapPlaceType.Altar:
      if (!Object.values(MapPlaceAltarType).some((value) => value === altarType)) {
        throw new Error(`${path}.altarType must be a supported altar type.`);
      }

      if (faithCost !== undefined && (typeof faithCost !== 'number' || !Number.isFinite(faithCost) || faithCost < 0)) {
        throw new Error(`${path}.faithCost must be a finite non-negative number.`);
      }

      return {
        placeType,
        altarType: altarType as MapPlaceAltarType,
        ...(faithCost === undefined || !altarHasFaithCost(altarType as MapPlaceAltarType) ? {} : { faithCost }),
      };
    case MapPlaceType.Tablet:
      if (!Object.values(MapPlaceTabletType).some((value) => value === tabletType)) {
        throw new Error(`${path}.tabletType must be a supported tablet type.`);
      }

      return { placeType, tabletType: tabletType as MapPlaceTabletType };
    case MapPlaceType.PrisonCell:
    case MapPlaceType.LostRoom:
    case MapPlaceType.MirrorTeleporter:
      return { placeType };
    default:
      throw new Error(
        `${path}.placeType must be switch, prison-cell, chest, trap, blocker, tablet, altar, mirror-teleporter, or lost-room.`
      );
  }
}

export function parseMapPointDetails(value: unknown, path = 'Point'): MapPointDetails {
  const data = record(value, path);
  const { type, isBoss, isElite, itemType, isSavedToLibrary, part, totalParts, group, size, color } = data;

  for (const [field, owner] of [
    ['size', MapEntityType.Title],
    ['color', MapEntityType.Title],
    ['isSavedToLibrary', MapEntityType.Codex],
    ['part', MapEntityType.Codex],
    ['totalParts', MapEntityType.Codex],
    ['group', MapEntityType.Codex],
    ['isBoss', MapEntityType.Enemy],
    ['isElite', MapEntityType.Enemy],
    ['variant', MapEntityType.Place],
    ['placeType', MapEntityType.Place],
    ['switchType', MapEntityType.Place],
    ['blockerType', MapEntityType.Place],
    ['trapType', MapEntityType.Place],
    ['altarType', MapEntityType.Place],
    ['tabletType', MapEntityType.Place],
    ['faithCost', MapEntityType.Place],
    ['itemType', MapEntityType.Item],
  ] as const) {
    if (data[field] !== undefined && type !== owner) {
      throw new Error(`${path}.${field} is only valid for ${owner} points.`);
    }
  }

  switch (type) {
    case MapEntityType.Title:
      if (!Object.values(MapTitleSize).some((value) => value === size)) {
        throw new Error(`${path}.size must be huge, big, medium, or small.`);
      }

      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) {
        throw new Error(`${path}.color must be a six-digit hexadecimal color.`);
      }

      return { type, size: size as MapTitleSize, color };
    case MapEntityType.Codex: {
      if (group !== undefined && typeof group !== 'string') {
        throw new Error(`${path}.group must be a string.`);
      }

      if (isSavedToLibrary !== undefined && typeof isSavedToLibrary !== 'boolean') {
        throw new Error(`${path}.isSavedToLibrary must be a boolean.`);
      }

      const error = codexPartsError(part, totalParts);

      if (error) {
        throw new Error(`${path}: ${error}`);
      }

      return {
        type,
        isSavedToLibrary: isSavedToLibrary ?? false,
        ...(group === undefined ? {} : { group }),
        ...(part === undefined ? {} : { part: part as number, totalParts: totalParts as number }),
      };
    }
    case MapEntityType.Npc:
      return { type };
    case MapEntityType.Enemy:
      if (isBoss !== undefined && typeof isBoss !== 'boolean') {
        throw new Error(`${path}.isBoss must be a boolean.`);
      }

      if (isElite !== undefined && typeof isElite !== 'boolean') {
        throw new Error(`${path}.isElite must be a boolean.`);
      }

      if (isBoss && isElite) {
        throw new Error(`${path}.isBoss and isElite cannot both be true.`);
      }

      return { type, isBoss: isBoss ?? false, isElite: isElite ?? false };
    case MapEntityType.Place:
      return { type, ...parseMapPlaceDetails(data, path) };
    case MapEntityType.Item:
      if (!Object.values(MapItemType).some((item) => item === itemType)) {
        throw new Error(
          `${path}.itemType must be weapon, left-hand, armor, rune, trinket, consumable, prison-key, or arrows.`
        );
      }

      return { type, itemType: itemType as MapItemType };
    default:
      throw new Error(`${path}.type must be npc, enemy, item, place, codex, or title.`);
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function position(value: unknown, path: string): MapPosition {
  const { x, y } = record(value, path);

  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > ImageWidth) {
    throw new Error(`${path}.x must be between 0 and ${ImageWidth}.`);
  }

  if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > ImageHeight) {
    throw new Error(`${path}.y must be between 0 and ${ImageHeight}.`);
  }

  return { x, y };
}

function entity(value: unknown, path: string): MapEntity {
  const data = record(value, path);
  const { id: rawId } = data;

  if ('kind' in data || 'points' in data) {
    throw new Error(
      `${path} uses removed entity geometry fields. Remove kind from point entries and discard area entries.`
    );
  }

  if (
    typeof rawId !== 'string' ||
    rawId.length !== 36 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawId)
  ) {
    throw new Error(`${path}.id must be a UUID v4 string.`);
  }

  const id = rawId.toLowerCase();
  const { title, description, url } = data;

  const details = parseMapPointDetails(data, path);
  const visibility = entityFieldVisibility(details);

  if (visibility.titleRequired && (typeof title !== 'string' || title.trim().length === 0)) {
    throw new Error(`${path}.title must be a non-empty string.`);
  }

  if (title !== undefined && typeof title !== 'string') {
    throw new Error(`${path}.title must be a string.`);
  }

  if (description !== undefined && typeof description !== 'string') {
    throw new Error(`${path}.description must be a string.`);
  }

  if (url !== undefined) {
    if (typeof url !== 'string') {
      throw new Error(`${path}.url must be a string.`);
    }

    if (!isValidEntityUrl(url)) {
      throw new Error(`${path}.url must be a valid absolute URL or an empty string.`);
    }
  }

  const metadata = {
    ...(visibility.description && description !== undefined ? { description } : {}),
    ...(url === undefined ? {} : { url }),
  };

  const pointPosition = position(data.position, `${path}.position`);

  if (details.type === MapEntityType.Place && details.placeType === MapPlaceType.MirrorTeleporter) {
    return { id, ...details, position: pointPosition };
  }

  if (details.type === MapEntityType.Place && details.placeType === MapPlaceType.LostRoom) {
    return {
      id,
      ...metadata,
      ...details,
      ...(title === undefined ? {} : { title: title as string }),
      position: pointPosition,
    };
  }

  if (
    details.type === MapEntityType.Place ||
    (details.type === MapEntityType.Item && details.itemType === MapItemType.Arrows)
  ) {
    return { id, ...metadata, ...details, position: pointPosition };
  }

  if (details.type === MapEntityType.Item && details.itemType === MapItemType.PrisonKey) {
    return {
      id,
      ...metadata,
      ...(title === undefined ? {} : { title: title as string }),
      ...details,
      position: pointPosition,
    };
  }

  return { id, ...metadata, title: title as string, ...details, position: pointPosition };
}

export function parseMapEntityDatabase(value: unknown): MapEntityDatabase {
  const data = record(value, 'Database');

  if (data.schemaVersion !== 2) {
    throw new Error('Unsupported entity database schemaVersion. Expected 2.');
  }

  if (!Array.isArray(data.entities)) {
    throw new Error('Database.entities must be an array.');
  }

  const entities = data.entities.map((value: unknown, index: number) => entity(value, `entities[${index}]`));

  if (new Set(entities.map(({ id }) => id)).size !== entities.length) {
    throw new Error('Entity IDs must be unique.');
  }

  return { schemaVersion: 2, entities };
}

export function serializeMapEntityDatabase(database: MapEntityDatabase): string {
  return `${JSON.stringify(parseMapEntityDatabase(database), null, 2)}\n`;
}

export function areMapEntityDatabasesEqual(left: MapEntityDatabase, right: MapEntityDatabase): boolean {
  const normalize = (database: MapEntityDatabase) =>
    serializeMapEntityDatabase({
      ...database,
      entities: [...database.entities].sort((first, second) => first.id.localeCompare(second.id)),
    });

  return normalize(left) === normalize(right);
}
