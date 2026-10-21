import { useState } from 'react';

import './MapTitle.scss';
import './PointAppearance.scss';

import { getPointIconUrl, type PointIconDetails } from 'src/helpers/pointIcons';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceType } from 'src/types/MapPlaceType';

function PointImage({
  url,
  fallbackVariant,
  elite,
}: Readonly<{
  url: string | null;
  elite: boolean;
  fallbackVariant:
    | 'blocker'
    | 'trap'
    | 'chest'
    | 'switch'
    | 'lever'
    | 'button'
    | 'prison-cell'
    | 'prison-key'
    | 'arrows'
    | null;
}>) {
  const [failed, setFailed] = useState(false);

  const className = `point-appearance${elite ? ' point-appearance--elite' : ''}`;

  if (!url || failed) {
    return (
      <span
        className={`${className} point-appearance--dot${fallbackVariant ? ` point-appearance--${fallbackVariant}` : ''}`}
      />
    );
  }

  return <img className={className} src={url} alt="" draggable={false} onError={() => setFailed(true)} />;
}

export function PointAppearance({ entity }: Readonly<{ entity: PointIconDetails }>) {
  const url = getPointIconUrl(entity);

  if (entity.type === MapEntityType.Title) {
    return (
      <span className={`map-title-label map-title-label--${entity.size}`} style={{ color: entity.color }}>
        {entity.title}
      </span>
    );
  }

  return (
    <PointImage
      key={url}
      url={url}
      elite={entity.type === MapEntityType.Enemy && entity.isElite === true}
      fallbackVariant={
        entity.type === MapEntityType.Place &&
        (entity.placeType === MapPlaceType.Blocker ||
          entity.placeType === MapPlaceType.Trap ||
          entity.placeType === MapPlaceType.Chest ||
          entity.placeType === MapPlaceType.Switch ||
          entity.placeType === MapPlaceType.PrisonCell)
          ? entity.placeType === MapPlaceType.Switch && 'switchType' in entity
            ? entity.switchType === 'blood-donation'
              ? null
              : entity.switchType
            : entity.placeType
          : entity.type === MapEntityType.Item &&
              (entity.itemType === MapItemType.PrisonKey || entity.itemType === MapItemType.Arrows)
            ? entity.itemType
            : null
      }
    />
  );
}
