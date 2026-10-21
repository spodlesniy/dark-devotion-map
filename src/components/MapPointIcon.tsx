import { divIcon, type Marker as LeafletMarker } from 'leaflet';
import { type CSSProperties, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Marker } from 'react-leaflet';

import './MapPointIcon.scss';

import { MapPointOverlays, type PointPopupEvents } from 'src/components/MapPointOverlays';
import { PointAppearance } from 'src/components/PointAppearance';
import { mapEntityLabel, mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import { pointFrameColor } from 'src/helpers/pointFrame';
import { usePointPopupState } from 'src/hooks/usePointPopupState';
import type { MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

type MapPointIconProps = {
  onLayer?: (layer: LeafletMarker | null) => void;
  entity: MapPointEntity;
  color: string;
  tooltipDisabled?: boolean;
} & PointPopupEvents;

export function MapPointIcon({
  entity,
  onLayer,
  color,
  tooltipDisabled = false,
  onPopupOpen,
  onPopupClose,
}: Readonly<MapPointIconProps>) {
  const markerRef = useRef<LeafletMarker>(null);

  const popupOpen = usePointPopupState(markerRef, { onPopupOpen, onPopupClose });

  const frameColor = pointFrameColor(entity);
  const framed = frameColor !== null;

  const host = useMemo(() => document.createElement('div'), []);
  const icon = useMemo(
    () =>
      divIcon({
        html: host,
        className: `map-point-icon${framed ? ' point-frame-marker' : ''}${entity.type === MapEntityType.Title ? ' map-title-marker' : ''}`,
        iconSize: undefined,
      }),
    [host, framed, entity.type]
  );

  return (
    <>
      <Marker
        ref={(layer) => {
          markerRef.current = layer;
          onLayer?.(layer);
        }}
        position={mapPositionToLatLng(entity.position)}
        icon={icon}
        keyboard={false}
      >
        {!tooltipDisabled && <MapPointOverlays entity={entity} />}
      </Marker>
      {createPortal(
        <button
          type="button"
          className={`map-point-icon__button${framed ? ' point-frame' : ''}${framed && popupOpen ? ' point-frame--popup-open' : ''}`}
          style={
            {
              '--point-color': color,
              ...(frameColor ? { '--point-frame-border-color': frameColor } : {}),
            } as CSSProperties
          }
          aria-label={mapEntityLabel(entity)}
          onClick={(event) => {
            event.stopPropagation();
            markerRef.current?.togglePopup();
          }}
        >
          <PointAppearance entity={entity} />
        </button>,
        host
      )}
    </>
  );
}
