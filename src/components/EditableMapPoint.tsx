import { CRS, divIcon, type Marker as LeafletMarker } from 'leaflet';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { Marker, useMap } from 'react-leaflet';

import './EditableMapPoint.scss';

import { ImageHeight, ImageWidth, MaxNativeZoom } from 'src/common/mapSettings';
import { AddPointDialog } from 'src/components/AddPointDialog';
import { DeleteEntityDialog } from 'src/components/DeleteEntityDialog';
import { EntityActionIcon } from 'src/components/EntityActionIcon';
import { MapPointOverlays, type PointPopupEvents } from 'src/components/MapPointOverlays';
import { PointAppearance } from 'src/components/PointAppearance';
import { mapEntityLabel, mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import { pointFrameColor } from 'src/helpers/pointFrame';
import { usePointPopupState } from 'src/hooks/usePointPopupState';
import type { MapEntity, MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

type EditableMapPointProps = {
  entity: MapPointEntity;
  onLayer?: (layer: LeafletMarker | null) => void;
  suggestionEntities?: readonly MapEntity[];
  color: string;
  menuSuppressed: boolean;
  tooltipDisabled?: boolean;
  onOpenMenu: () => void;
  moving: boolean;
  onMovingChange: (moving: boolean) => void;
  onUpdate: (point: MapPointEntity) => void;
  onDelete: (id: string) => void;
} & PointPopupEvents;

export function EditableMapPoint({
  entity,
  onLayer,
  suggestionEntities,
  color,
  menuSuppressed,
  tooltipDisabled = false,
  onOpenMenu,
  moving,
  onMovingChange,
  onUpdate,
  onDelete,
  onPopupOpen,
  onPopupClose,
}: Readonly<EditableMapPointProps>) {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);

  const markerRef = useRef<LeafletMarker>(null);
  const pointRef = useRef<HTMLButtonElement>(null);
  const toolbarRef = useRef<HTMLFieldSetElement>(null);
  const hadDialog = useRef(false);

  const popupOpen = usePointPopupState(markerRef, { onPopupOpen, onPopupClose });

  const frameColor = pointFrameColor(entity);
  const framed = frameColor !== null;

  const host = useMemo(() => document.createElement('div'), []);
  const icon = useMemo(
    () =>
      divIcon({
        html: host,
        className: `editable-point-icon${framed ? ' point-frame-marker' : ''}${entity.type === MapEntityType.Title ? ' map-title-marker' : ''}`,
        iconSize: undefined,
      }),
    [host, framed, entity.type]
  );

  const map = useMap();

  const subscribeToViewport = useCallback(
    (onChange: () => void) => {
      map.on('moveend zoomend resize', onChange);

      return () => {
        map.off('moveend zoomend resize', onChange);
      };
    },
    [map]
  );
  const getToolbarSide = useCallback(() => {
    const screen = map.latLngToContainerPoint(mapPositionToLatLng(entity.position));

    return screen.x > map.getSize().x / 2;
  }, [map, entity.position]);

  const right = useSyncExternalStore(subscribeToViewport, getToolbarSide);

  useEffect(() => {
    if (!moving) {
      markerRef.current?.setLatLng(mapPositionToLatLng(entity.position));
    }
  }, [moving, entity.position]);

  useEffect(() => {
    if (dialog) {
      hadDialog.current = true;
    } else if (hadDialog.current) {
      hadDialog.current = false;
      pointRef.current?.focus();
    }
  }, [dialog]);

  useEffect(() => {
    const toolbar = toolbarRef.current;

    if (!toolbar) {
      return;
    }

    const stop = (event: Event) => event.stopPropagation();
    const events = ['mousedown', 'touchstart', 'dblclick', 'contextmenu', 'wheel'];
    for (const event of events) {
      toolbar.addEventListener(event, stop);
    }

    return () => {
      for (const event of events) {
        toolbar.removeEventListener(event, stop);
      }
    };
  }, []);

  const stopMoving = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      markerRef.current?.setLatLng(mapPositionToLatLng(entity.position));
      onMovingChange(false);
      pointRef.current?.focus();
    }
  });

  useEffect(() => {
    if (!moving) {
      return;
    }

    const stopMovingListener = (event: KeyboardEvent) => stopMoving(event);
    document.addEventListener('keydown', stopMovingListener, true);

    return () => document.removeEventListener('keydown', stopMovingListener, true);
  }, [moving]);

  function closeDialog() {
    setDialog(null);
  }

  function constrainPosition() {
    const marker = markerRef.current;

    if (!marker) {
      return entity.position;
    }

    const pixel = CRS.Simple.latLngToPoint(marker.getLatLng(), MaxNativeZoom);
    const position = {
      x: Math.round(Math.max(0, Math.min(ImageWidth, pixel.x))),
      y: Math.round(Math.max(0, Math.min(ImageHeight, pixel.y))),
    };
    marker.setLatLng(mapPositionToLatLng(position));

    return position;
  }

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
        draggable={moving}
        autoPan={false}
        riseOnHover={true}
        eventHandlers={{
          mouseover: onOpenMenu,
          drag: constrainPosition,
          dragend: () => {
            const position = constrainPosition();
            onUpdate({ ...entity, position });
          },
        }}
      >
        {!moving && !tooltipDisabled && <MapPointOverlays entity={entity} />}
      </Marker>
      {createPortal(
        <div
          className={`editable-point${moving ? ' editable-point--moving' : ''}${right ? ' editable-point--right' : ''}`}
          style={
            {
              '--point-color': color,
              ...(frameColor ? { '--point-frame-border-color': frameColor } : {}),
            } as CSSProperties
          }
          onMouseEnter={onOpenMenu}
          onFocusCapture={onOpenMenu}
        >
          <button
            ref={pointRef}
            type="button"
            className={`editable-point__dot${framed ? ' point-frame' : ''}${framed && popupOpen ? ' point-frame--popup-open' : ''}`}
            aria-label={mapEntityLabel(entity)}
            onClick={(event) => {
              event.stopPropagation();
              onOpenMenu();
              markerRef.current?.togglePopup();
            }}
          >
            <PointAppearance entity={entity} />
          </button>
          <div className="editable-point__bridge" hidden={menuSuppressed}>
            <fieldset
              ref={toolbarRef}
              className="editable-point__toolbar"
              aria-label="Point actions"
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                type="button"
                title="Move"
                aria-label="Move"
                aria-pressed={moving}
                onClick={() => onMovingChange(!moving)}
              >
                <EntityActionIcon action="move" />
              </button>
              <button
                type="button"
                title="Edit"
                aria-label="Edit"
                onClick={() => {
                  onMovingChange(false);
                  markerRef.current?.closePopup();
                  setDialog('edit');
                }}
              >
                <EntityActionIcon action="edit" />
              </button>
              <button
                type="button"
                className="editable-point__delete"
                title="Delete"
                aria-label="Delete"
                onClick={() => {
                  onMovingChange(false);
                  markerRef.current?.closePopup();
                  setDialog('delete');
                }}
              >
                <EntityActionIcon action="delete" />
              </button>
            </fieldset>
          </div>
        </div>,
        host,
        'point'
      )}
      {dialog === 'edit' &&
        createPortal(
          <AddPointDialog
            editing
            {...(suggestionEntities ? { suggestionEntities } : {})}
            initialDetails={entity}
            position={entity.position}
            onCancel={closeDialog}
            onAdd={(details, position) => {
              onUpdate({
                id: entity.id,
                ...details,
                position,
              });
              closeDialog();
            }}
          />,
          document.body,
          dialog
        )}
      {dialog === 'delete' &&
        createPortal(
          <DeleteEntityDialog
            onCancel={closeDialog}
            onConfirm={() => {
              onDelete(entity.id);
              // Wait until the native dialog has restored focus during unmount.
              const container = map.getContainer();
              requestAnimationFrame(() => {
                if (container.isConnected) {
                  container.focus();
                }
              });
            }}
          />,
          document.body
        )}
    </>
  );
}
