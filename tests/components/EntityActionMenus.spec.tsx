import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CRS, type Map as LeafletMap, Marker } from 'leaflet';
import { createRef, useState } from 'react';
import { MapContainer } from 'react-leaflet';
import { expect, it, vi } from 'vitest';

import { MapEntities } from 'src/components/MapEntities';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

vi.mock('src/common/environment', () => ({ isDeveloperMode: true }));

const entities: readonly MapEntity[] = [0, 1].map((index) => ({
  id: `11111111-0000-4000-8000-00000000000${index}`,
  type: MapEntityType.Npc,
  title: `Point ${index}`,
  position: { x: 100 + index * 100, y: 100 },
}));

function setup() {
  const mapRef = createRef<LeafletMap>();
  const onUpdate = vi.fn();

  function Harness() {
    const [database, setDatabase] = useState(entities);
    const [editingDisabled, setEditingDisabled] = useState(false);

    return (
      <>
        <button type="button" onClick={() => setEditingDisabled((current) => !current)}>
          Toggle editing
        </button>
        <MapContainer ref={mapRef} crs={CRS.Simple} center={[-2, 1]} zoom={7}>
          <MapEntities
            entities={database}
            entityToLocate={null}
            editingDisabled={editingDisabled}
            onUpdatePoint={(updated) => {
              onUpdate(updated);
              setDatabase((current) => current.map((entity) => (entity.id === updated.id ? updated : entity)));
            }}
            onDeletePoint={vi.fn()}
          />
        </MapContainer>
      </>
    );
  }

  render(<Harness />);
  const points: Marker[] = [];
  mapRef.current?.eachLayer((layer) => {
    if (layer instanceof Marker) {
      points.push(layer);
    }
  });

  function open(index: number) {
    fireEvent.mouseEnter(screen.getByRole('button', { name: `Point ${index}` }));

    return screen.getByRole('group', { name: 'Point actions' });
  }

  return { open, points, onUpdate };
}

it('keeps only one action menu active when switching points or using keyboard focus', () => {
  const { open } = setup();
  const first = open(0);
  act(() => within(first).getByRole('button', { name: 'Edit' }).focus());
  const second = open(1);
  expect(first.parentElement).toHaveAttribute('hidden');
  expect(screen.getAllByRole('group')).toEqual([second]);
  act(() => screen.getByRole('button', { name: 'Point 0' }).focus());
  expect(screen.getAllByRole('group')).toEqual([first]);
});

it('blocks other tooltips and menus during Move and restores them after Escape', () => {
  const { open, points } = setup();
  const menu = open(0);
  fireEvent.click(within(menu).getByRole('button', { name: 'Move' }));
  expect(points[0]?.dragging?.enabled()).toBe(true);

  for (const point of points) {
    expect(point.getTooltip()).toBeNull();
  }

  fireEvent.mouseEnter(screen.getByRole('button', { name: 'Point 1' }));
  expect(screen.getAllByRole('group')).toEqual([menu]);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(points[0]?.dragging?.enabled()).toBe(false);
  expect(points[1]?.getTooltip()).not.toBeNull();
});

it('commits drag coordinates and exits Move when spatial editing is suppressed', () => {
  const { open, points, onUpdate } = setup();
  const marker = points[0];
  fireEvent.click(within(open(0)).getByRole('button', { name: 'Move' }));
  const position = { x: 500, y: 600 };
  act(() => {
    marker?.setLatLng(mapPositionToLatLng(position));
    marker?.fire('dragend');
  });
  expect(onUpdate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ position }));
  fireEvent.click(screen.getByRole('button', { name: 'Toggle editing' }));
  expect(screen.queryByRole('group', { name: 'Point actions' })).not.toBeInTheDocument();
});
