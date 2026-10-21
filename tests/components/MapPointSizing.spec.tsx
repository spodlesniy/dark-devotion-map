import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CRS, type Map as LeafletMap, Marker } from 'leaflet';
import { createRef } from 'react';
import { MapContainer } from 'react-leaflet';
import { expect, it, vi } from 'vitest';

import { MapEntities } from 'src/components/MapEntities';
import { PointAppearance } from 'src/components/PointAppearance';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import type { MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import { MapPlaceType } from 'src/types/MapPlaceType';

const mode = vi.hoisted(() => ({ isDeveloperMode: false, iconUrl: '/test-icon.png' as string | null }));
vi.mock('src/common/environment', () => mode);
vi.mock('src/helpers/pointIcons', () => ({ getPointIconUrl: () => mode.iconUrl }));

const entity: MapPointEntity = {
  title: 'Test point',
  id: '11111111-0000-4000-8000-000000000000',
  type: MapEntityType.Enemy,
  isBoss: true,
  position: { x: 100, y: 200 },
};

it.each([
  { developer: false, type: MapEntityType.Enemy },
  { developer: true, type: MapEntityType.Enemy },
  { developer: false, type: MapEntityType.Place },
  { developer: true, type: MapEntityType.Place },
])(
  'updates $type image sizing through every zoom without replacing or moving the marker (developer=$developer)',
  ({ developer, type }) => {
    const point: MapPointEntity =
      type === MapEntityType.Place
        ? {
            id: entity.id,
            title: entity.title,
            type,
            placeType: MapPlaceType.LostRoom,
            position: entity.position,
          }
        : entity;
    mode.isDeveloperMode = developer;
    mode.iconUrl = '/test-icon.png';
    const mapRef = createRef<LeafletMap>();
    const onUpdate = vi.fn();
    render(
      <>
        <div data-testid="drawer-icon">
          <PointAppearance entity={point} />
        </div>
        <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={0} minZoom={0} maxZoom={7}>
          <MapEntities entities={[point]} entityToLocate={null} onUpdatePoint={onUpdate} onDeletePoint={vi.fn()} />
        </MapContainer>
      </>
    );
    const map = mapRef.current;

    if (!map) {
      throw new Error('Expected a map');
    }

    const markers: Marker[] = [];
    map.eachLayer((layer) => {
      if (layer instanceof Marker) {
        markers.push(layer);
      }
    });
    const marker = markers[0];

    if (!marker) {
      throw new Error('Expected a point marker');
    }

    act(() => marker.openTooltip());
    expect(marker.getTooltip()?.options.direction).toBe('top');
    expect(document.querySelector('.leaflet-tooltip')).toHaveClass('map-point-tooltip');
    const container = map.getContainer();
    expect(container.style.getPropertyValue('--point-hit-size')).toBe('var(--point-icon-size-small)');
    const sizes = ['small', 'small', 'medium', 'medium', 'medium', 'large', 'large', 'large', 'small'];
    for (const [index, size] of sizes.entries()) {
      act(() => {
        map.setZoom(index === 8 ? 0 : index, { animate: false });
      });
      expect(container.style.getPropertyValue('--point-hit-size')).toBe(`var(--point-icon-size-${size})`);
      expect(marker.getLatLng().equals(mapPositionToLatLng(entity.position))).toBe(true);
      expect(map.hasLayer(marker)).toBe(true);
    }
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByTestId('drawer-icon').closest('.leaflet-container')).toBeNull();
    expect(screen.getByTestId('drawer-icon').style.getPropertyValue('--point-hit-size')).toBe('');
    expect(container.querySelector('img')).toHaveAttribute('src', '/test-icon.png');
  }
);

it.each([false, true])(
  'keeps Place frames and tooltip anchors when images fail or are missing (developer=%s)',
  (developer) => {
    mode.isDeveloperMode = developer;
    mode.iconUrl = '/test-icon.png';
    const place: MapPointEntity = {
      id: entity.id,
      title: 'Test place',
      type: MapEntityType.Place,
      placeType: MapPlaceType.LostRoom,
      position: entity.position,
    };
    const mapRef = createRef<LeafletMap>();
    const view = render(
      <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={0}>
        <MapEntities entities={[place]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
      </MapContainer>
    );
    const map = mapRef.current;

    if (!map) {
      throw new Error('Expected a map');
    }

    const frame = screen.getByRole('button', { name: 'Test place' });
    expect(frame).toHaveClass('point-frame');
    expect(frame.closest('.point-frame-marker')).toBeInTheDocument();
    const image = frame.querySelector('img');

    if (!image) {
      throw new Error('Expected a Place image');
    }

    fireEvent.error(image);
    expect(frame.querySelector('.point-appearance--dot')).toBeInTheDocument();
    map.eachLayer((layer) => {
      if (layer instanceof Marker) {
        act(() => layer.openTooltip());
      }
    });
    expect(document.querySelector('.leaflet-tooltip')).toHaveClass('map-point-tooltip--place');
    expect(document.querySelector('.leaflet-tooltip')).toHaveTextContent('Test place');
    view.unmount();
    mode.iconUrl = null;
    const missing = render(
      <MapContainer crs={CRS.Simple} center={[0, 0]} zoom={0}>
        <MapEntities entities={[place]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
      </MapContainer>
    );
    expect(screen.getByRole('button', { name: 'Test place' })).toHaveClass('point-frame');
    expect(missing.container.querySelector('.point-appearance--dot')).toBeInTheDocument();
  }
);

it.each(
  [false, true].flatMap((developer) => [
    { developer, tabletType: MapPlaceTabletType.Damage, label: 'Damage', color: 'var(--color-tablet-damage)' },
    { developer, tabletType: MapPlaceTabletType.Faith, label: 'Faith', color: 'var(--color-tablet-faith)' },
    { developer, tabletType: MapPlaceTabletType.Crit, label: 'Crit', color: 'var(--color-tablet-crit)' },
    { developer, tabletType: MapPlaceTabletType.Stamina, label: 'Stamina', color: 'var(--color-tablet-stamina)' },
  ])
)('uses derived $label and border color (developer=$developer)', ({ developer, tabletType, label, color }) => {
  mode.isDeveloperMode = developer;
  mode.iconUrl = '/test-icon.png';
  const tablet: MapPointEntity = {
    id: entity.id,
    type: MapEntityType.Place,
    placeType: MapPlaceType.Tablet,
    tabletType,
    position: entity.position,
  };
  const mapRef = createRef<LeafletMap>();
  render(
    <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={0}>
      <MapEntities entities={[tablet]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
    </MapContainer>
  );
  const button = screen.getByRole('button', { name: label });
  const coloredElement = developer ? button.parentElement : button;
  expect(coloredElement?.style.getPropertyValue('--point-frame-border-color')).toBe(color);
  mapRef.current?.eachLayer((layer) => {
    if (layer instanceof Marker) {
      act(() => layer.openTooltip());
    }
  });
  expect(document.querySelector('.map-entity-tooltip__title')).toHaveTextContent(label);
  expect(document.querySelector('.map-entity-tooltip__description')).not.toBeInTheDocument();
});

it.each([false, true])(
  'frames bosses with the Enemy color and preserves normal enemies (developer=%s)',
  (developer) => {
    mode.isDeveloperMode = developer;
    mode.iconUrl = '/test-icon.png';
    const normal: MapPointEntity = {
      ...entity,
      id: '22222222-0000-4000-8000-000000000000',
      title: 'Normal enemy',
      isBoss: false,
    };
    const mapRef = createRef<LeafletMap>();
    const view = render(
      <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={0}>
        <MapEntities
          entities={[entity, normal]}
          entityToLocate={null}
          onUpdatePoint={vi.fn()}
          onDeletePoint={vi.fn()}
        />
      </MapContainer>
    );
    const boss = screen.getByRole('button', { name: entity.title });
    expect(boss).toHaveClass('point-frame');
    expect(boss.closest('.point-frame-marker')).toBeInTheDocument();
    const colored = developer ? boss.parentElement : boss;
    expect(colored?.style.getPropertyValue('--point-frame-border-color')).toBe('var(--color-entity-enemy)');
    expect(screen.getByRole('button', { name: 'Normal enemy' })).not.toHaveClass('point-frame');
    view.unmount();
    mode.iconUrl = null;
    const missing = render(
      <MapContainer crs={CRS.Simple} center={[0, 0]} zoom={0}>
        <MapEntities entities={[entity]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
      </MapContainer>
    );
    expect(screen.getByRole('button', { name: entity.title })).toHaveClass('point-frame');
    expect(missing.container.querySelector('.point-appearance--dot')).toBeInTheDocument();
  }
);

it.each(
  [false, true].flatMap((developer) => [false, true].map((isSavedToLibrary) => ({ developer, isSavedToLibrary })))
)(
  'frames Codex entries and keeps their frame when the image fails (developer=$developer, saved=$isSavedToLibrary)',
  ({ developer, isSavedToLibrary }) => {
    mode.isDeveloperMode = developer;
    mode.iconUrl = '/test-icon.png';
    const codex: MapPointEntity = {
      id: entity.id,
      type: MapEntityType.Codex,
      title: 'Test codex',
      isSavedToLibrary,
      position: entity.position,
    };
    render(
      <MapContainer crs={CRS.Simple} center={[0, 0]} zoom={7}>
        <MapEntities entities={[codex]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
      </MapContainer>
    );
    const frame = screen.getByRole('button', { name: 'Test codex' });
    expect(frame).toHaveClass('point-frame');
    expect(frame.closest('.point-frame-marker')).toBeInTheDocument();
    const colored = developer ? frame.parentElement : frame;
    expect(colored?.style.getPropertyValue('--point-frame-border-color')).toBe(
      'var(--point-frame-default-border-color)'
    );
    const image = frame.querySelector('img');

    if (!image) {
      throw new Error('Expected a Codex image');
    }

    fireEvent.error(image);
    expect(frame.querySelector('.point-appearance--dot')).toBeInTheDocument();
    expect(frame).toHaveClass('point-frame');
  }
);

it.each([false, true])('renders a named Blocker with its distinct fallback on the map (developer=%s)', (developer) => {
  mode.isDeveloperMode = developer;
  mode.iconUrl = null;
  const blocker: MapPointEntity = {
    id: entity.id,
    type: MapEntityType.Place,
    placeType: MapPlaceType.Blocker,
    blockerType: MapPlaceBlockerType.FaithLock,
    faithCost: 25,
    position: entity.position,
  };
  render(
    <MapContainer crs={CRS.Simple} center={[0, 0]} zoom={0}>
      <MapEntities entities={[blocker]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
    </MapContainer>
  );
  const frame = screen.getByRole('button', { name: 'Faith Lock' });
  expect(frame).toHaveClass('point-frame');
  expect(frame.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--blocker');
});

it.each([false, true])('renders a Trap with its distinct fallback on the map (developer=%s)', (developer) => {
  mode.isDeveloperMode = developer;
  mode.iconUrl = null;
  const trap: MapPointEntity = {
    id: entity.id,
    type: MapEntityType.Place,
    placeType: MapPlaceType.Trap,
    trapType: MapPlaceTrapType.SpinningBlade,
    position: entity.position,
  };
  render(
    <MapContainer crs={CRS.Simple} center={[0, 0]} zoom={0}>
      <MapEntities entities={[trap]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
    </MapContainer>
  );
  const frame = screen.getByRole('button', { name: 'Spinning Blade' });
  expect(frame).toHaveClass('point-frame');
  expect(frame.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--trap');
});

it('clears popup highlights when Move removes the overlay and does not leave highlights on other points', () => {
  mode.isDeveloperMode = true;
  mode.iconUrl = '/test-icon.png';
  const second: MapPointEntity = { ...entity, id: '22222222-0000-4000-8000-000000000000', title: 'Second boss' };
  const mapRef = createRef<LeafletMap>();
  render(
    <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={0}>
      <MapEntities entities={[entity, second]} entityToLocate={null} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
    </MapContainer>
  );
  const firstFrame = screen.getByRole('button', { name: 'Test point' });
  const secondFrame = screen.getByRole('button', { name: 'Second boss' });
  const pointContainer = firstFrame.closest('.editable-point');

  if (!(pointContainer instanceof HTMLElement)) {
    throw new Error('Expected an editable point');
  }

  fireEvent.click(firstFrame);
  expect(firstFrame).toHaveClass('point-frame--popup-open');
  const move = within(pointContainer).getByRole('button', { name: 'Move' });
  fireEvent.click(move);
  expect(document.querySelector('.map-point-popup')).not.toBeInTheDocument();
  expect(firstFrame).not.toHaveClass('point-frame--popup-open');
  fireEvent.click(move);
  fireEvent.click(mapRef.current?.getContainer() ?? document.body);
  expect(firstFrame).not.toHaveClass('point-frame--popup-open');
  fireEvent.click(secondFrame);
  expect(secondFrame).toHaveClass('point-frame--popup-open');
  expect(firstFrame).not.toHaveClass('point-frame--popup-open');
  fireEvent.click(mapRef.current?.getContainer() ?? document.body);
  expect(document.querySelector('.point-frame--popup-open')).not.toBeInTheDocument();
});

it('clears a read-only marker highlight when its open popup is suppressed and does not restore it on remount', () => {
  mode.isDeveloperMode = false;
  mode.iconUrl = '/test-icon.png';
  function view(disabled: boolean) {
    return (
      <MapContainer crs={CRS.Simple} center={[0, 0]} zoom={0}>
        <MapEntities entities={[entity]} entityToLocate={null} editingDisabled={disabled} />
      </MapContainer>
    );
  }
  const { rerender } = render(view(false));
  const frame = screen.getByRole('button', { name: 'Test point' });
  fireEvent.click(frame);
  expect(frame).toHaveClass('point-frame--popup-open');
  rerender(view(true));
  expect(document.querySelector('.map-point-popup')).not.toBeInTheDocument();
  expect(frame).not.toHaveClass('point-frame--popup-open');
  rerender(view(false));
  expect(frame).not.toHaveClass('point-frame--popup-open');
  fireEvent.click(frame);
  expect(frame).toHaveClass('point-frame--popup-open');
});
