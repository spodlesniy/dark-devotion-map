import { type LatLngBounds, latLngBounds, point } from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

type MapBoundsProps = {
  bounds: LatLngBounds;
};

export function MapBounds({ bounds }: Readonly<MapBoundsProps>) {
  const map = useMap();

  useEffect(() => {
    function updateBounds() {
      const zoom = map.getZoom();
      const topLeft = map.project(bounds.getNorthWest(), zoom);
      const bottomRight = map.project(bounds.getSouthEast(), zoom);
      const center = topLeft.add(bottomRight).divideBy(2);
      const imageHalfSize = bottomRight.subtract(topLeft).divideBy(2);
      const viewportHalfSize = map.getSize().divideBy(2);
      const styles = getComputedStyle(document.documentElement);
      const drawerWidth = Math.max(
        0,
        Math.min(
          Number.parseFloat(styles.getPropertyValue('--drawer-width')) || 0,
          map.getSize().x - (Number.parseFloat(styles.getPropertyValue('--control-size')) || 0)
        )
      );

      // Center smaller axes, allowing extra horizontal travel to reveal content behind the drawer.
      const halfSize = point(
        Math.max(imageHalfSize.x, viewportHalfSize.x),
        Math.max(imageHalfSize.y, viewportHalfSize.y)
      );
      const maxBounds = latLngBounds(
        map.unproject(center.subtract(halfSize).subtract(point(drawerWidth, 0)), zoom),
        map.unproject(center.add(halfSize), zoom)
      );

      map.setMaxBounds(maxBounds);
      map.panInsideBounds(maxBounds, { animate: false });
    }

    updateBounds();
    map.on('zoomend resize', updateBounds);

    return () => {
      map.off('zoomend resize', updateBounds);
    };
  }, [map, bounds]);

  return null;
}
