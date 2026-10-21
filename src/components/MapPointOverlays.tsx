import { type Layer, type LayerEvent, type Popup as LeafletPopup, type Tooltip as LeafletTooltip, Path } from 'leaflet';
import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Popup, Tooltip, useMap } from 'react-leaflet';

import './MapEntityTooltip.scss';

import { MapEntityContent, useMapEntityWiki } from 'src/components/MapEntityContent';
import { mapEntityLabel } from 'src/helpers/mapEntityDisplay';
import { useTooltipViewport } from 'src/hooks/useTooltipViewport';
import type { MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

export type PointPopupEvents = { onPopupOpen?: () => void; onPopupClose?: () => void };
type PointOverlayProps = { entity: MapPointEntity; dot?: boolean } & PointPopupEvents;

function pointClass(entity: MapPointEntity, dot: boolean) {
  return `map-point-tooltip${dot ? ' map-point-tooltip--dot' : ''}${entity.type === MapEntityType.Place ? ' map-point-tooltip--place' : ''}`;
}

export function MapPointPopup({
  entity,
  dot = false,
  children,
  onPopupOpen,
  onPopupClose,
}: Readonly<PropsWithChildren<PointOverlayProps>>) {
  const popupRef = useRef<LeafletPopup>(null);

  const map = useMap();

  const wiki = useMapEntityWiki(entity, popupRef);

  useTooltipViewport(popupRef);

  useEffect(() => {
    if (!dot) {
      return;
    }

    let detach: (() => void) | undefined;

    function bindPath(layer: Layer) {
      if (!(layer instanceof Path) || layer.getPopup() !== popupRef.current) {
        return;
      }

      const element = layer.getElement();
      // Leaflet Path popups do not toggle on repeated clicks like Marker popups.
      const toggle = (event: Event) => {
        event.stopPropagation();
        layer.togglePopup();
      };
      element?.addEventListener('click', toggle);
      detach = () => element?.removeEventListener('click', toggle);
      map.off('layeradd', layerAdded);
    }

    function layerAdded(event: LayerEvent) {
      bindPath(event.layer);
    }

    map.on('layeradd', layerAdded);
    map.eachLayer(bindPath);

    return () => {
      map.off('layeradd', layerAdded);
      detach?.();
    };
  }, [map, dot]);

  return (
    <Popup
      ref={popupRef}
      className={`map-entity-tooltip map-point-popup ${pointClass(entity, dot)}`}
      autoPan={false}
      autoClose
      closeOnClick
      closeOnEscapeKey
      eventHandlers={{ add: () => onPopupOpen?.(), remove: () => onPopupClose?.() }}
    >
      <MapEntityContent entity={entity} wiki={wiki}>
        {children}
      </MapEntityContent>
    </Popup>
  );
}

function PointTitleTooltip({ entity, dot }: Readonly<{ entity: MapPointEntity; dot: boolean }>) {
  const tooltipRef = useRef<LeafletTooltip>(null);

  useTooltipViewport(tooltipRef);

  return (
    <Tooltip
      ref={tooltipRef}
      direction="top"
      opacity={1}
      interactive={false}
      className={`map-entity-tooltip map-point-title ${pointClass(entity, dot)}`}
    >
      <div className="map-entity-tooltip__content">
        <div className="map-entity-tooltip__title">
          {mapEntityLabel(entity)}
          {entity.type === MapEntityType.Codex &&
            entity.part !== undefined &&
            entity.totalParts !== undefined &&
            ` ${entity.part}/${entity.totalParts}`}
        </div>
      </div>
    </Tooltip>
  );
}

export function MapPointOverlays({ entity, dot = false, onPopupOpen, onPopupClose }: Readonly<PointOverlayProps>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && <PointTitleTooltip entity={entity} dot={dot} />}
      <MapPointPopup
        entity={entity}
        dot={dot}
        onPopupOpen={() => {
          setOpen(true);
          onPopupOpen?.();
        }}
        onPopupClose={() => {
          setOpen(false);
          onPopupClose?.();
        }}
      />
    </>
  );
}
