import { CRS, type LeafletMouseEvent } from 'leaflet';
import { type CSSProperties, useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMapEvents } from 'react-leaflet';

import './PointCreation.scss';

import { ImageHeight, ImageWidth, MaxNativeZoom } from 'src/common/mapSettings';
import { AddPointDialog } from 'src/components/AddPointDialog';
import type { MapEntity, MapPointFields, MapPosition } from 'src/types/MapEntity';

type MapPointCreationProps = {
  suggestionEntities?: readonly MapEntity[];
  onAdd: (details: MapPointFields, position: MapPosition) => void;
  placing?: boolean;
  onPlacementEnd?: () => void;
};

type ContextPosition = { position: MapPosition; left: number; top: number };

export function MapPointCreation({
  suggestionEntities = [],
  onAdd,
  placing = false,
  onPlacementEnd,
}: Readonly<MapPointCreationProps>) {
  const [context, setContext] = useState<ContextPosition | null>(null);
  const [draft, setDraft] = useState<MapPosition | null>(null);
  const [showActions, setShowActions] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointRef = useRef<HTMLButtonElement>(null);

  const map = useMapEvents({
    contextmenu(event: LeafletMouseEvent) {
      if (draft || placing) {
        return;
      }

      const { x, y } = CRS.Simple.latLngToPoint(event.latlng, MaxNativeZoom);

      if (x < 0 || y < 0 || x > ImageWidth || y > ImageHeight) {
        setContext(null);

        return;
      }

      setShowActions(false);
      setContext({
        position: { x: Math.round(x), y: Math.round(y) },
        left: event.originalEvent.clientX,
        top: event.originalEvent.clientY,
      });
    },
    click(event: LeafletMouseEvent) {
      setContext(null);

      if (!placing || draft) {
        return;
      }

      const { x, y } = CRS.Simple.latLngToPoint(event.latlng, MaxNativeZoom);

      if (x < 0 || y < 0 || x > ImageWidth || y > ImageHeight) {
        return;
      }

      setDraft({ x: Math.round(x), y: Math.round(y) });
      onPlacementEnd?.();
    },
    movestart: () => setContext(null),
    zoomstart: () => setContext(null),
  });

  const cancelPlacement = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setContext(null);
      onPlacementEnd?.();
      map.getContainer().focus();
    }
  });

  useEffect(() => {
    if (!placing) {
      return;
    }

    const container = map.getContainer();
    container.classList.add('map-point-placement');
    container.focus();

    const cancelPlacementListener = (event: KeyboardEvent) => cancelPlacement(event);
    document.addEventListener('keydown', cancelPlacementListener);

    return () => {
      container.classList.remove('map-point-placement');
      document.removeEventListener('keydown', cancelPlacementListener);
    };
  }, [placing, map]);

  useEffect(() => {
    if (!context || placing) {
      return;
    }

    (showActions ? pointRef : buttonRef).current?.focus();

    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setContext(null);
      }
    }

    document.addEventListener('pointerdown', dismiss);

    return () => document.removeEventListener('pointerdown', dismiss);
  }, [context, placing, showActions]);

  function closeDialog() {
    setDraft(null);
    map.getContainer().focus();
  }

  return createPortal(
    <>
      {placing && (
        <div className="point-placement">
          <p role="status">Click or tap the map to place a point. Press Escape to cancel.</p>
          <button
            type="button"
            onClick={() => {
              setContext(null);
              onPlacementEnd?.();
              map.getContainer().focus();
            }}
          >
            Cancel placement
          </button>
        </div>
      )}
      {context && !placing && (
        <div
          ref={menuRef}
          className="point-context-menu"
          role="menu"
          aria-label="Map actions"
          style={{ '--context-menu-x': `${context.left}px`, '--context-menu-y': `${context.top}px` } as CSSProperties}
          onKeyDown={(event) => {
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault();
              const buttons = Array.from(
                menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
              );
              const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
              const index =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
              buttons[index]?.focus();
            }

            if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
              }

              setContext(null);
              map.getContainer().focus();
            }
          }}
        >
          <button
            ref={buttonRef}
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={showActions}
            onClick={() => setShowActions((current) => !current)}
          >
            Add Entity
          </button>
          {showActions && (
            <div role="menu" aria-label="Entity actions">
              <button
                ref={pointRef}
                type="button"
                role="menuitem"
                onClick={() => {
                  setDraft(context.position);
                  setContext(null);
                }}
              >
                Add point…
              </button>
            </div>
          )}
        </div>
      )}
      {draft && (
        <AddPointDialog
          suggestionEntities={suggestionEntities}
          position={draft}
          onCancel={closeDialog}
          onAdd={(details, position) => {
            onAdd(details, position);
            closeDialog();
          }}
        />
      )}
    </>,
    document.body
  );
}
