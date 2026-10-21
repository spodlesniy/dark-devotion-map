import { act, fireEvent, render } from '@testing-library/react';
import { CRS, Map as LeafletMap, latLngBounds, type Point, point } from 'leaflet';
import { MapContainer } from 'react-leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapBounds } from 'src/components/MapBounds';

const bounds = latLngBounds([-11600 / 128, 0], [0, 7400 / 128]);

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('--drawer-width');
  document.documentElement.style.removeProperty('--control-size');
});

function renderMap(size: Point) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => size.x);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => size.y);
  const setMaxBounds = vi.spyOn(LeafletMap.prototype, 'setMaxBounds');

  render(
    <MapContainer crs={CRS.Simple} bounds={bounds} minZoom={0} maxZoom={7} maxBoundsViscosity={1} inertia={false}>
      <MapBounds bounds={bounds} />
    </MapContainer>
  );

  const map = setMaxBounds.mock.contexts[0];

  if (!(map instanceof LeafletMap)) {
    throw new Error('The map did not initialize');
  }

  return map;
}

function expectWithinImage(map: LeafletMap, leftPadding = 0) {
  const topLeft = map.latLngToContainerPoint(bounds.getNorthWest());
  const bottomRight = map.latLngToContainerPoint(bounds.getSouthEast());
  const size = map.getSize();

  for (const axis of ['x', 'y'] as const) {
    if (bottomRight[axis] - topLeft[axis] <= size[axis]) {
      const offset = (topLeft[axis] + bottomRight[axis]) / 2 - size[axis] / 2;
      expect(offset).toBeGreaterThanOrEqual(-1);
      expect(offset).toBeLessThanOrEqual((axis === 'x' ? leftPadding : 0) + 1);
    } else {
      expect(topLeft[axis]).toBeLessThanOrEqual((axis === 'x' ? leftPadding : 0) + 1);
      expect(bottomRight[axis]).toBeGreaterThanOrEqual(size[axis] - 1);
    }
  }
}

describe('Map bounds', () => {
  it.each([1280, 390, 280])('allows drawer-width travel to the right at every zoom for viewport width %i', (width) => {
    document.documentElement.style.setProperty('--drawer-width', '320px');
    document.documentElement.style.setProperty('--control-size', '44px');
    const map = renderMap(point(width, 720));
    const padding = Math.min(320, width - 44);
    expect(map.getCenter().equals(bounds.getCenter())).toBe(true);

    for (let zoom = 0; zoom <= 7; zoom += 1) {
      act(() => {
        map.setZoom(zoom, { animate: false });
        map.panTo([1000, -1000], { animate: false });
      });
      const imageWidth = map.project(bounds.getSouthEast()).x - map.project(bounds.getNorthWest()).x;
      const expectedLeft = Math.max(0, (width - imageWidth) / 2) + padding;
      expect(Math.abs(map.latLngToContainerPoint(bounds.getNorthWest()).x - expectedLeft)).toBeLessThanOrEqual(1);
      expectWithinImage(map, padding);
      act(() => map.panTo([-1000, 1000], { animate: false }));
      expectWithinImage(map, padding);
    }
  });

  it('updates the drawer allowance when the viewport becomes narrower than the drawer', () => {
    document.documentElement.style.setProperty('--drawer-width', '320px');
    document.documentElement.style.setProperty('--control-size', '44px');
    const size = point(1280, 720);
    const map = renderMap(size);
    act(() => {
      map.setZoom(7, { animate: false });
      map.panTo([1000, -1000], { animate: false });
    });
    expect(map.latLngToContainerPoint(bounds.getNorthWest()).x).toBe(320);
    act(() => {
      size.x = 280;
      map.invalidateSize({ animate: false });
      map.panTo([1000, -1000], { animate: false });
    });
    expect(map.latLngToContainerPoint(bounds.getNorthWest()).x).toBe(236);
    expectWithinImage(map, 236);
  });

  it.each([
    [1280, 720],
    [390, 844],
    [2560, 1080],
  ])('centers the initial image and constrains every zoom at %i × %i', (width, height) => {
    const map = renderMap(point(width, height));

    expect(map.getCenter().equals(bounds.getCenter())).toBe(true);
    expectWithinImage(map);

    for (let zoom = 0; zoom <= 7; zoom++) {
      act(() => {
        map.setZoom(zoom, { animate: false });
      });

      for (const target of [
        [-1000, -1000],
        [1000, 1000],
        [-1000, 1000],
        [1000, -1000],
      ] as const) {
        act(() => {
          map.panTo([target[0], target[1]], { animate: false });
        });
        expectWithinImage(map);
      }
    }
  });

  it('recalculates limits after the viewport grows or shrinks', () => {
    const size = point(390, 844);
    const map = renderMap(size);

    act(() => {
      map.setZoom(4, { animate: false });
      map.panTo([0, 0], { animate: false });
      size.x = 2560;
      size.y = 1440;
      map.invalidateSize({ animate: false });
    });
    expectWithinImage(map);

    act(() => {
      size.x = 320;
      size.y = 480;
      map.invalidateSize({ animate: false });
      map.panTo([-1000, 1000], { animate: false });
    });
    expectWithinImage(map);
  });

  it('prevents leaving the image bounds while the mouse is still held down', () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const map = renderMap(point(1280, 720));
    const dragged = vi.fn();
    map.on('drag', dragged);

    for (const zoom of [0, 4, 7]) {
      act(() => {
        map.setZoom(zoom, { animate: false });
      });

      for (const offset of [point(-20000, 0), point(20000, 0), point(0, -20000), point(0, 20000)]) {
        fireEvent.mouseDown(map.getContainer(), { clientX: 100, clientY: 100, button: 0, which: 1 });
        fireEvent.mouseMove(map.getContainer(), { clientX: 100 + offset.x, clientY: 100 + offset.y, buttons: 1 });
        expectWithinImage(map);
        fireEvent.mouseUp(document);
        expectWithinImage(map);
      }
    }

    expect(dragged).toHaveBeenCalledTimes(12);
  });
});
