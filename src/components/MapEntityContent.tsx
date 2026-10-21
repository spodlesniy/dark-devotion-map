import type { Popup, Tooltip } from 'leaflet';
import { type PropsWithChildren, type RefObject, useState } from 'react';

import { isDeveloperMode } from 'src/common/environment';
import { entityFieldVisibility } from 'src/helpers/entityFieldVisibility';
import { entityWikiPage } from 'src/helpers/entityWikiPage';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { useEntityWiki } from 'src/hooks/useEntityWiki';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceType } from 'src/types/MapPlaceType';

type MapEntityContentProps = PropsWithChildren<{ entity: MapEntity; wiki: ReturnType<typeof useEntityWiki> }>;

export function MapEntityContent({ entity, wiki, children }: Readonly<MapEntityContentProps>) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);

  const isTitle = entity.type === MapEntityType.Title;
  const isNpc = entity.type === MapEntityType.Npc;
  const isCodex = entity.type === MapEntityType.Codex;
  const isLostRoom = entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.LostRoom;

  const url = entity.url && entityFieldVisibility(entity).url ? new URL(entity.url) : null;
  const description = entityFieldVisibility(entity).description ? (wiki?.description ?? entity.description) : undefined;
  const image = isLostRoom || wiki?.image?.url === failedImageUrl ? null : wiki?.image;
  const showImage = Boolean((!isCodex && !isLostRoom && wiki?.loading) || image);
  const imageOnly = isNpc && !description?.trim() && !wiki?.loading;
  const showText = Boolean(description?.trim() || wiki?.loading || wiki?.failed || children);
  const imageLoading = Boolean(wiki?.loading || (image && loadedImageUrl !== image.url));

  return (
    <div className="map-entity-tooltip__viewport">
      <div className="map-entity-tooltip__content">
        <div className="map-entity-tooltip__title">
          {mapEntityLabel(entity)}
          {entity.type === MapEntityType.Codex &&
            entity.part !== undefined &&
            entity.totalParts !== undefined &&
            ` ${entity.part}/${entity.totalParts}`}
        </div>
        {(description?.trim() || image || wiki?.loading || wiki?.failed || children) && (
          <div
            className={`map-entity-tooltip__body${showImage ? (imageOnly ? ' map-entity-tooltip__body--image-only' : ' map-entity-tooltip__body--image') : ''}`}
          >
            {showText && (
              <div className="map-entity-tooltip__text">
                {wiki?.loading && (
                  <p className="map-entity-tooltip__hint" role="status">
                    Loading wiki data…
                  </p>
                )}
                {!wiki?.loading && description?.trim() && (
                  <p className="map-entity-tooltip__description">{description}</p>
                )}
                {!wiki?.loading && wiki?.failed && (
                  <p className="map-entity-tooltip__hint" role="status">
                    Some wiki data could not be loaded.
                  </p>
                )}
                {!wiki?.loading && children && <p className="map-entity-tooltip__hint">{children}</p>}
              </div>
            )}
            {showImage && (
              <div className="map-entity-tooltip__image-frame" aria-busy={imageLoading}>
                {imageLoading && (
                  <span className="map-entity-tooltip__image-loading" role="status">
                    Loading image…
                  </span>
                )}
                {image && (
                  <img
                    className="map-entity-tooltip__image"
                    {...(isDeveloperMode ? { referrerPolicy: 'no-referrer' } : {})}
                    src={image.url}
                    alt={mapEntityLabel(entity)}
                    width={image.width}
                    height={image.height}
                    onLoad={() => setLoadedImageUrl(image.url)}
                    onError={() => setFailedImageUrl(image.url)}
                  />
                )}
              </div>
            )}
          </div>
        )}
        {(isTitle || !wiki?.loading) && url && (
          <a
            className="map-entity-tooltip__link"
            href={entity.url}
            title={entity.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{url.hostname || 'External Link'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 3h6v6M10 14 21 3M21 14v7H3V3h7" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

export function useMapEntityWiki(entity: MapEntity, overlayRef: RefObject<Popup | Tooltip | null>) {
  const isCodex = entity.type === MapEntityType.Codex;
  const isNpc = entity.type === MapEntityType.Npc;
  const isLostRoom = entity.type === MapEntityType.Place && entity.placeType === MapPlaceType.LostRoom;
  const wikiPage = entityWikiPage(entity.url);

  return useEntityWiki(
    overlayRef,
    entity.type === MapEntityType.Enemy || entity.type === MapEntityType.Title || isNpc || isCodex || isLostRoom
      ? wikiPage.pageTitle
      : null,
    isCodex
      ? 'codex'
      : isNpc
        ? 'npc'
        : isLostRoom
          ? 'description'
          : entity.type === MapEntityType.Title
            ? 'title'
            : 'enemy',
    isCodex ? entity.part : undefined,
    isCodex ? entity.totalParts : undefined,
    isCodex ? wikiPage.anchor : undefined
  );
}
