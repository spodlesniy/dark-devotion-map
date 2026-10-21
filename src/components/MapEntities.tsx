import type { Layer } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { CircleMarker, useMap } from 'react-leaflet';

import { isDeveloperMode } from 'src/common/environment';
import { MaxNativeZoom } from 'src/common/mapSettings';
import { EditableMapPoint } from 'src/components/EditableMapPoint';
import { MapPointIcon } from 'src/components/MapPointIcon';
import { MapPointOverlays } from 'src/components/MapPointOverlays';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import { pointFrameColor } from 'src/helpers/pointFrame';
import { getPointIconUrl } from 'src/helpers/pointIcons';
import type { MapEntity, MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';

type MapEntitiesProps = {
  entities: readonly MapEntity[];
  suggestionEntities?: readonly MapEntity[];
  entityToLocate: MapEntity | null;
  onUpdatePoint?: (entity: MapPointEntity) => void;
  onDeletePoint?: (id: string) => void;
  editingDisabled?: boolean;
};

const pointColors = {
  [MapEntityType.Title]: 'var(--color-map-title)',
  [MapEntityType.Codex]: 'var(--color-entity-codex)',
  [MapEntityType.Npc]: 'var(--color-entity-npc)',
  [MapEntityType.Enemy]: 'var(--color-entity-enemy)',
  [MapEntityType.Item]: 'var(--color-entity-item)',
  [MapEntityType.Place]: 'var(--color-entity-place)',
};

export function MapEntities({
  entities,
  suggestionEntities = entities,
  entityToLocate,
  onUpdatePoint,
  onDeletePoint,
  editingDisabled = false,
}: Readonly<MapEntitiesProps>) {
  const map = useMap();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [movingPointId, setMovingPointId] = useState<string | null>(null);
  const [previousLocate, setPreviousLocate] = useState(entityToLocate);
  const [previousEditingDisabled, setPreviousEditingDisabled] = useState(editingDisabled);

  const layers = useRef(new Map<string, Layer>());
  const pendingLocate = useRef<MapEntity | null>(null);

  const activeMovingPointId = entities.some((entity) => entity.id === movingPointId) ? movingPointId : null;
  const tooltipDisabled = editingDisabled || activeMovingPointId !== null;
  const activePopupId = !tooltipDisabled && entities.some((entity) => entity.id === popupId) ? popupId : null;

  function registerLayer(id: string, layer: Layer | null) {
    if (layer) {
      layers.current.set(id, layer);
    } else {
      layers.current.delete(id);
    }
  }

  function openMenu(id: string) {
    if (
      editingDisabled ||
      (activeMovingPointId !== null && activeMovingPointId !== id) ||
      (activePopupId !== null && activePopupId !== id)
    ) {
      return;
    }

    setActiveMenuId(id);
    setMovingPointId((current) => (current === id ? current : null));
  }

  if (previousLocate !== entityToLocate) {
    setPreviousLocate(entityToLocate);
    setMovingPointId(null);
  }

  if (previousEditingDisabled !== editingDisabled) {
    setPreviousEditingDisabled(editingDisabled);
    setActiveMenuId(null);
    setMovingPointId(null);
    setPopupId(null);
  }

  useEffect(() => {
    const container = map.getContainer();
    const previousSize = container.style.getPropertyValue('--point-hit-size');

    function updateIconSize() {
      const zoom = map.getZoom();
      let size = 'var(--point-icon-size-medium)';

      if (zoom <= 1) {
        size = 'var(--point-icon-size-small)';
      } else if (zoom >= MaxNativeZoom - 2) {
        size = 'var(--point-icon-size-large)';
      }

      container.style.setProperty('--point-hit-size', size);
    }

    updateIconSize();
    map.on('zoomend', updateIconSize);

    return () => {
      map.off('zoomend', updateIconSize);

      if (previousSize) {
        container.style.setProperty('--point-hit-size', previousSize);
      } else {
        container.style.removeProperty('--point-hit-size');
      }
    };
  }, [map]);

  useEffect(() => {
    if (!entityToLocate) {
      return;
    }

    pendingLocate.current = entityToLocate;

    map.setView(mapPositionToLatLng(entityToLocate.position), MaxNativeZoom, { animate: false });
  }, [map, entityToLocate]);

  useEffect(() => {
    if (!entityToLocate || pendingLocate.current !== entityToLocate || tooltipDisabled) {
      return;
    }

    const layer = layers.current.get(entityToLocate.id);

    if (!layer) {
      return;
    }

    pendingLocate.current = null;
    map.closePopup();
    map.eachLayer((candidate) => candidate.closeTooltip());

    layer.openPopup();
  }, [map, entityToLocate, tooltipDisabled]);

  return entities.map((entity) => {
    const popupEvents = {
      onPopupOpen: () => {
        setPopupId(entity.id);
        setActiveMenuId(entity.id);
      },
      onPopupClose: () => setPopupId((current) => (current === entity.id ? null : current)),
    };
    const pointColor =
      entity.type === MapEntityType.Item && entity.itemType === MapItemType.Arrows
        ? 'var(--color-entity-arrows)'
        : pointColors[entity.type];
    const pathOptions = {
      color: pointColor,
      weight: 2,
      fillOpacity: 0.9,
    };

    if (isDeveloperMode && !editingDisabled && onUpdatePoint && onDeletePoint) {
      return (
        <EditableMapPoint
          {...popupEvents}
          key={entity.id}
          entity={entity}
          onLayer={(layer) => registerLayer(entity.id, layer)}
          suggestionEntities={suggestionEntities}
          color={pointColor}
          menuSuppressed={
            (activePopupId !== null && activePopupId !== entity.id) ||
            (tooltipDisabled && activeMovingPointId !== entity.id) ||
            (activeMenuId !== null && activeMenuId !== entity.id)
          }
          tooltipDisabled={tooltipDisabled}
          onOpenMenu={() => openMenu(entity.id)}
          moving={activeMovingPointId === entity.id}
          onMovingChange={(moving) => setMovingPointId(moving ? entity.id : null)}
          onUpdate={onUpdatePoint}
          onDelete={onDeletePoint}
        />
      );
    }

    if (entity.type === MapEntityType.Title || pointFrameColor(entity) !== null || getPointIconUrl(entity)) {
      return (
        <MapPointIcon
          onLayer={(layer) => registerLayer(entity.id, layer)}
          {...popupEvents}
          key={entity.id}
          entity={entity}
          color={pointColor}
          tooltipDisabled={tooltipDisabled}
        />
      );
    }

    return (
      <CircleMarker
        key={entity.id}
        ref={(layer) => registerLayer(entity.id, layer)}
        pane="markerPane"
        center={mapPositionToLatLng(entity.position)}
        radius={6}
        pathOptions={pathOptions}
      >
        {!tooltipDisabled && <MapPointOverlays entity={entity} dot {...popupEvents} />}
      </CircleMarker>
    );
  });
}
