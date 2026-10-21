import { CRS } from 'leaflet';
import { type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';

import { ImageHeight, ImageWidth, MaxNativeZoom } from 'src/common/mapSettings';
import type { MapPosition } from 'src/types/MapEntity';

type MapCursorCoordinatesProps = { targetRef: RefObject<HTMLSpanElement | null> };

export function MapCursorCoordinates({ targetRef }: Readonly<MapCursorCoordinatesProps>) {
  const map = useMap();

  const [position, setPosition] = useState<(MapPosition & { target: HTMLSpanElement }) | null>(null);

  const pointerRef = useRef<MouseEvent | null>(null);

  const update = useEffectEvent(() => {
    const event = pointerRef.current;

    const portalTarget = targetRef.current;

    if (!event || !portalTarget) {
      setPosition(null);

      return;
    }

    const target = event.target;

    if (target instanceof Element && target.closest('.leaflet-control, .leaflet-popup, .leaflet-tooltip')) {
      setPosition(null);

      return;
    }

    const { x, y } = CRS.Simple.latLngToPoint(map.mouseEventToLatLng(event), MaxNativeZoom);

    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > ImageWidth || y > ImageHeight) {
      setPosition(null);

      return;
    }

    const next = { x: Math.round(x), y: Math.round(y), target: portalTarget };
    setPosition((current) =>
      current?.x === next.x && current.y === next.y && current.target === next.target ? current : next
    );
  });

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => update());
    }

    function moved(event: MouseEvent) {
      pointerRef.current = event;
      schedule();
    }

    function clear() {
      pointerRef.current = null;
      cancelAnimationFrame(frame);
      setPosition(null);
    }

    container.addEventListener('pointermove', moved);
    container.addEventListener('pointerleave', clear);
    window.addEventListener('blur', clear);
    map.on('move zoomend resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('pointermove', moved);
      container.removeEventListener('pointerleave', clear);
      window.removeEventListener('blur', clear);
      map.off('move zoomend resize', schedule);
    };
  }, [map]);

  if (!position) {
    return null;
  }

  return createPortal(`X: ${position.x} Y: ${position.y}`, position.target);
}
