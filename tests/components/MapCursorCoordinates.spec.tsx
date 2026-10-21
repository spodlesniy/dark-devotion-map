import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CRS, type Map as LeafletMap } from 'leaflet';
import { createRef } from 'react';
import { MapContainer } from 'react-leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapCursorCoordinates } from 'src/components/MapCursorCoordinates';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';

function setup(x = 624.4, y = 3552.2) {
  const mapRef = createRef<LeafletMap>();
  const targetRef = createRef<HTMLSpanElement>();
  const view = render(
    <>
      <MapContainer ref={mapRef} crs={CRS.Simple} center={[-40, 25]} zoom={2}>
        <MapCursorCoordinates targetRef={targetRef} />
      </MapContainer>
      <span ref={targetRef} data-testid="cursor" />
    </>
  );
  const map = mapRef.current;

  if (!map) {
    throw new Error('Expected a Leaflet map');
  }

  const location = vi.spyOn(map, 'mouseEventToLatLng').mockReturnValue(mapPositionToLatLng({ x, y }));

  const container = map.getContainer();

  function move(target = container) {
    fireEvent(target, new MouseEvent('pointermove', { bubbles: true, clientX: 200, clientY: 300 }));
  }

  return { map, location, move, target: screen.getByTestId('cursor'), unmount: view.unmount };
}

afterEach(() => vi.restoreAllMocks());

describe('Map cursor coordinates', () => {
  it('shows rounded original-image pixels only in the supplied status target', async () => {
    const { move, target, map } = setup();
    expect(target).toBeEmptyDOMElement();
    move();
    await waitFor(() => expect(target).toHaveTextContent('X: 624 Y: 3552'));
    expect(map.getContainer()).not.toHaveTextContent('X: 624');
  });

  it.each([
    { x: -1, y: 20 },
    { x: 20, y: -1 },
    { x: 7401, y: 20 },
    { x: 20, y: 11601 },
  ])('hides positions outside the map image: %j', async ({ x, y }) => {
    const { move, target, location } = setup();
    move();
    await waitFor(() => expect(target).not.toBeEmptyDOMElement());
    location.mockReturnValue(mapPositionToLatLng({ x, y }));
    move();
    await waitFor(() => expect(target).toBeEmptyDOMElement());
  });

  it('clears coordinates on leaving the map or losing focus and never restores stale coordinates from a map event', async () => {
    const { move, target, map } = setup();
    move();
    await waitFor(() => expect(target).not.toBeEmptyDOMElement());
    fireEvent(map.getContainer(), new MouseEvent('pointerleave'));
    expect(target).toBeEmptyDOMElement();
    act(() => map.fire('move'));
    await waitFor(() => expect(target).toBeEmptyDOMElement());
    move();
    await waitFor(() => expect(target).not.toBeEmptyDOMElement());
    fireEvent(window, new Event('blur'));
    expect(target).toBeEmptyDOMElement();
  });

  it.each(['leaflet-popup', 'leaflet-tooltip', 'leaflet-control'])(
    'does not show coordinates over %s overlays',
    async (className) => {
      const { move, target, map } = setup();
      move();
      await waitFor(() => expect(target).not.toBeEmptyDOMElement());
      const overlay = document.createElement('div');
      overlay.className = className;
      map.getContainer().append(overlay);
      move(overlay);
      await waitFor(() => expect(target).toBeEmptyDOMElement());
    }
  );

  it('recalculates under a stationary pointer after map movement and zoom, then cancels pending updates on unmount', async () => {
    const { move, target, location, map, unmount } = setup();
    move();
    await waitFor(() => expect(target).toHaveTextContent('X: 624 Y: 3552'));
    location.mockReturnValue(mapPositionToLatLng({ x: 700, y: 3600 }));
    act(() => map.fire('move'));
    await waitFor(() => expect(target).toHaveTextContent('X: 700 Y: 3600'));
    location.mockReturnValue(mapPositionToLatLng({ x: 710, y: 3620 }));
    act(() => map.fire('zoomend'));
    await waitFor(() => expect(target).toHaveTextContent('X: 710 Y: 3620'));
    move();
    unmount();
    expect(screen.queryByTestId('cursor')).toBeNull();
  });
});
