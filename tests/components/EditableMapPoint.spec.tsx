import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Browser, CRS, type Map as LeafletMap, Marker as LeafletMarker, point } from 'leaflet';
import { createRef } from 'react';
import { MapContainer } from 'react-leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditableMapPoint } from 'src/components/EditableMapPoint';
import { MapEntities } from 'src/components/MapEntities';
import { altarTitles } from 'src/helpers/altarTitles';
import { removeMapPoint, updateMapPoint } from 'src/helpers/editMapPoint';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import { useEntityDatabase } from 'src/hooks/useEntityDatabase';
import type { MapEntity, MapPointDetails, MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceType } from 'src/types/MapPlaceType';

const mode = vi.hoisted(() => ({ isDeveloperMode: true }));
vi.mock('src/common/environment', () => mode);
vi.mock('src/helpers/pointIcons', () => ({
  getPointIconUrl: (entity: { type: string; isBoss?: boolean }) =>
    entity.type === 'enemy' ? `/images/entities/point/enemy/${entity.isBoss ? 'boss.png' : 'enemy.png'}` : null,
}));

const supportsSvg = Browser.svg;

const id = 'abcdefab-cdef-4abc-abcd-abcdefabcdef';
const initial = {
  schemaVersion: 2,
  entities: [{ title: 'Test point', id, type: 'npc', position: { x: 100, y: 200 } }],
};

beforeEach(() => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  mode.isDeveloperMode = true;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Object.defineProperty(Browser, 'svg', { value: true });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open');
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Object.defineProperty(Browser, 'svg', { value: supportsSvg });
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

function setup(
  metadata: Pick<MapPointEntity, 'description' | 'url'> = {},
  details: MapPointDetails = { type: MapEntityType.Npc },
  suggestionEntities?: readonly MapEntity[]
) {
  const mapRef = createRef<LeafletMap>();

  function Harness() {
    const { database, setDatabase, hasUnsavedChanges } = useEntityDatabase({
      ...initial,
      entities: initial.entities.map((point) => ({
        ...point,
        ...details,
        ...metadata,
      })),
    });

    return (
      <>
        <output aria-label="Database">{JSON.stringify(database)}</output>
        <output aria-label="Dirty">{String(hasUnsavedChanges)}</output>
        <MapContainer ref={mapRef} crs={CRS.Simple} center={[-2, 1]} zoom={7}>
          <MapEntities
            entities={database.entities}
            {...(suggestionEntities ? { suggestionEntities } : {})}
            entityToLocate={null}
            onUpdatePoint={(point) => setDatabase((current) => updateMapPoint(current, point))}
            onDeletePoint={(pointId) => setDatabase((current) => removeMapPoint(current, pointId))}
          />
        </MapContainer>
      </>
    );
  }

  render(<Harness />);
  const map = mapRef.current;

  if (!map) {
    throw new Error('Expected a map.');
  }

  let marker: LeafletMarker | undefined;
  map.eachLayer((layer) => {
    if (layer instanceof LeafletMarker) {
      marker = layer;
    }
  });

  return { map, marker, user: userEvent.setup() };
}

describe('Developer point actions', () => {
  it('hides and unbinds its tooltip throughout Move mode, then restores it after moving ends', async () => {
    const { marker, user } = setup();
    act(() => marker?.openTooltip());
    expect(document.querySelector('.map-point-tooltip')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move' }));
    expect(document.querySelector('.map-point-tooltip')).not.toBeInTheDocument();
    expect(marker?.getTooltip()).toBeNull();
    act(() => marker?.fire('mouseover'));
    expect(document.querySelector('.map-point-tooltip')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    act(() => marker?.fire('mouseover'));
    expect(document.querySelector('.map-point-tooltip')).toBeInTheDocument();
  });
  it('keeps the Popup open while moving the pointer through nearby entities and its scrollable content', () => {
    const { marker, map } = setup({ description: 'A long description' });
    vi.useFakeTimers();

    try {
      act(() => marker?.openPopup());
      const tooltip = document.querySelector('.map-point-popup');
      expect(tooltip).toBeInTheDocument();
      act(() => marker?.fire('mouseout'));

      if (!tooltip) {
        throw new Error('Expected an open tooltip');
      }

      fireEvent.mouseEnter(tooltip);
      const onMapWheel = vi.fn();
      map.getContainer().addEventListener('wheel', onMapWheel);
      fireEvent.wheel(tooltip, { deltaY: 100 });
      expect(onMapWheel).not.toHaveBeenCalled();
      map.getContainer().removeEventListener('wheel', onMapWheel);
      act(() => vi.advanceTimersByTime(200));
      expect(tooltip).toBeInTheDocument();
      fireEvent.mouseLeave(tooltip);
      act(() => vi.advanceTimersByTime(200));
      expect(tooltip).toBeInTheDocument();
      act(() => marker?.closePopup());
      expect(tooltip).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([{ type: MapEntityType.Npc }, { type: MapEntityType.Enemy, isBoss: true }] as const)(
    'uses a Leaflet tooltip instead of a native title for $type points',
    async (details) => {
      const { user, marker } = setup({ description: 'Point description' }, details);
      const point = screen.getByRole('button', { name: /Test point/ });
      expect(point).not.toHaveAttribute('title');
      await user.hover(point);
      expect(document.querySelector('.leaflet-tooltip')).toHaveClass('leaflet-tooltip-top', 'map-point-tooltip');
      expect(document.querySelector('.leaflet-tooltip')).toHaveTextContent(point.getAttribute('aria-label') ?? '');
      expect(document.querySelector('.map-entity-tooltip__title')).toHaveTextContent('Test point');
      expect(document.querySelector('.map-entity-tooltip__description')).not.toBeInTheDocument();
      expect(marker?.isPopupOpen()).toBe(false);
      await user.unhover(point);
      await waitFor(() => expect(document.querySelector('.leaflet-tooltip')).not.toBeInTheDocument());
    }
  );

  it.each([
    { details: { type: MapEntityType.Enemy, isBoss: true }, field: 'Boss', value: true },
    {
      details: { type: MapEntityType.Place, placeType: MapPlaceType.MirrorTeleporter },
      field: 'Place type',
      value: 'mirror-teleporter',
    },
    { details: { type: MapEntityType.Item, itemType: MapItemType.LeftHand }, field: 'Item type', value: 'left-hand' },
    {
      details: { type: MapEntityType.Place, placeType: MapPlaceType.Tablet, tabletType: MapPlaceTabletType.Stamina },
      field: 'Tablet type',
      value: 'stamina',
    },
    {
      details: { type: MapEntityType.Place, placeType: MapPlaceType.Altar, altarType: MapPlaceAltarType.BlessingAltar },
      field: 'Altar type',
      value: 'blessing-altar',
    },
    {
      details: {
        type: MapEntityType.Place,
        placeType: MapPlaceType.Altar,
        altarType: MapPlaceAltarType.HealingStatue,
        faithCost: 0,
      },
      field: 'Faith cost',
      value: 0,
    },
    {
      details: { type: MapEntityType.Place, placeType: MapPlaceType.LostRoom },
      field: 'Place type',
      value: 'lost-room',
    },
  ] as const)(
    'preserves $details.type details on unchanged save and removes them on category change',
    async ({ details, field, value }) => {
      const { user } = setup({}, details);
      await user.click(
        screen.getByRole('button', {
          name:
            details.type === MapEntityType.Place && details.placeType === MapPlaceType.Tablet
              ? 'Stamina'
              : details.type === MapEntityType.Place && details.placeType === MapPlaceType.MirrorTeleporter
                ? 'Mirror Teleporter'
                : details.type === MapEntityType.Place && details.placeType === MapPlaceType.Altar
                  ? altarTitles[details.altarType]
                  : 'Test point',
        })
      );
      await user.click(screen.getByRole('button', { name: 'Edit' }));

      if (typeof value === 'boolean') {
        expect(screen.getByLabelText(field)).toBeChecked();
      } else {
        expect(screen.getByLabelText(field)).toHaveValue(value);
      }

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
      expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities[0]).toMatchObject(details);
      await user.click(screen.getByRole('button', { name: 'Edit' }));
      await user.selectOptions(screen.getByLabelText('Type'), 'npc');

      if (details.type === MapEntityType.Place && details.placeType !== MapPlaceType.LostRoom) {
        expect(screen.getByLabelText('Title')).toHaveValue('');
        await user.type(screen.getByLabelText('Title'), 'Test point');
      }

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities[0]).toEqual({
        title: 'Test point',
        id,
        type: 'npc',
        position: { x: 100, y: 200 },
      });
      expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
    }
  );

  it('clears all hidden metadata when changing to Tablet', async () => {
    const metadata = { description: 'A notable place.', url: 'https://example.com/details' };
    const { user } = setup(metadata);
    await user.click(screen.getByRole('button', { name: /Test point/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities).toEqual([
      {
        id,
        type: 'place',
        placeType: 'tablet',
        tabletType: 'faith',
        position: { x: 100, y: 200 },
      },
    ]);
    expect(screen.getByRole('button', { name: 'Faith' })).toBeInTheDocument();
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
  });

  it('removes an altar cost, restores its baseline, and replaces place-specific fields on subtype change', async () => {
    const { user } = setup(
      {},
      {
        type: MapEntityType.Place,
        placeType: MapPlaceType.Altar,
        altarType: MapPlaceAltarType.HealingStatue,
        faithCost: 25,
      }
    );
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Faith cost')).toHaveValue(25);
    await user.clear(screen.getByLabelText('Faith cost'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities[0]).not.toHaveProperty('faithCost');
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.type(screen.getByLabelText('Faith cost'), '25');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.selectOptions(screen.getByLabelText('Place type'), 'tablet');
    await user.selectOptions(screen.getByLabelText('Tablet type'), 'crit');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities[0]).toEqual({
      id,
      position: { x: 100, y: 200 },
      type: 'place',
      placeType: 'tablet',
      tabletType: 'crit',
    });
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
  });

  it('applies title and metadata edits to the working database and marker', async () => {
    const { user } = setup({ description: 'Old description', url: 'https://example.com/old' });
    await user.click(screen.getByRole('button', { name: /Test point/ }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated point');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'New description');
    await user.clear(screen.getByLabelText('URL'));
    await user.type(screen.getByLabelText('URL'), 'https://example.com/new');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities[0]).toMatchObject({
      id,
      title: 'Updated point',
      description: 'New description',
      url: 'https://example.com/new',
      position: { x: 100, y: 200 },
    });
    expect(screen.getByRole('button', { name: /Updated point/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
  });

  it('edits the working database, preserves the ID, and restores focus after cancel and save', async () => {
    const { user } = setup();
    const dot = screen.getByRole('button', { name: /Test point/ });
    await user.click(dot);
    expect(screen.getByRole('button', { name: /Test point/ })).not.toHaveAttribute('aria-pressed');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Type')).toHaveValue('npc');
    expect(screen.getByText('Position: X 100 · Y 200 px')).toHaveTextContent('Position: X 100 · Y 200 px');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(dot).toHaveFocus();
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'enemy');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities).toEqual([
      {
        title: 'Test point',
        id,
        type: 'enemy',
        isBoss: false,
        isElite: false,
        position: { x: 100, y: 200 },
      },
    ]);
    expect(screen.getByRole('button', { name: /Test point/ })).toHaveFocus();
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
    expect(screen.getByRole('button', { name: /Test point/ })).not.toHaveAttribute('aria-pressed');
  });

  it('renders custom icons in production without editing controls or selection', async () => {
    mode.isDeveloperMode = false;
    const { marker, user, map } = setup({}, { type: MapEntityType.Enemy, isBoss: true });
    expect(marker).toBeDefined();
    const button = screen.getByRole('button', { name: /Test point/ });
    expect(button.querySelector('img')).toHaveAttribute('src', '/images/entities/point/enemy/boss.png');
    await user.hover(button);
    expect(document.querySelector('.leaflet-tooltip')).toHaveClass('leaflet-tooltip-top', 'map-point-tooltip');
    expect(document.querySelector('.leaflet-tooltip')).toHaveTextContent('Test point');
    expect(button).not.toHaveAttribute('title');
    await user.unhover(button);
    const center = map.getCenter();
    const zoom = map.getZoom();
    await user.click(button);
    expect(map.getCenter().equals(center)).toBe(true);
    expect(map.getZoom()).toBe(zoom);
    expect(screen.getByRole('button', { name: /Test point/ })).not.toHaveAttribute('aria-pressed');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('requires confirmation for deletion and leaves cancel unchanged', async () => {
    const { user, map } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(map.getContainer()).toHaveFocus());
    expect(screen.queryByRole('button', { name: /Test point/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
  });

  it('enables dragging only with Move, clamps coordinates, and commits only on drag end', async () => {
    const { marker, user } = setup();

    if (!marker) {
      throw new Error('Expected an HTML marker.');
    }

    expect(marker.dragging?.enabled()).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Move' }));
    expect(marker.dragging?.enabled()).toBe(true);
    act(() => {
      marker.setLatLng(mapPositionToLatLng({ x: 7500, y: -100 }));
      marker.fire('drag');
    });
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
    act(() => {
      marker.fire('dragend');
    });
    expect(JSON.parse(screen.getByLabelText('Database').textContent ?? '').entities[0]).toEqual({
      title: 'Test point',
      id,
      type: 'npc',
      position: { x: 7400, y: 0 },
    });
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('true');
    await user.keyboard('{Escape}');
    expect(marker.dragging?.enabled()).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Position: X 7400 · Y 0 px')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('cancels an uncommitted movement with Escape', async () => {
    const { marker, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Move' }));
    act(() => {
      marker?.setLatLng(mapPositionToLatLng({ x: 500, y: 600 }));
    });
    await user.keyboard('{Escape}');
    expect(marker?.getLatLng()).toEqual(mapPositionToLatLng({ x: 100, y: 200 }));
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
  });

  it('does not render editing controls in production', () => {
    mode.isDeveloperMode = false;
    const { marker } = setup();
    expect(marker).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Move' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('does not commit an active Leaflet drag canceled with Escape', async () => {
    const { marker, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Move' }));
    const dot = screen.getByRole('button', { name: /Test point/ });
    fireEvent.mouseDown(dot, { clientX: 100, clientY: 200, button: 0, buttons: 1, which: 1 });
    fireEvent.mouseMove(dot, { clientX: 160, clientY: 240, buttons: 1 });
    await waitFor(() => expect(marker?.getLatLng()).not.toEqual(mapPositionToLatLng({ x: 100, y: 200 })));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseUp(dot, { clientX: 160, clientY: 240 });
    expect(marker?.getLatLng()).toEqual(mapPositionToLatLng({ x: 100, y: 200 }));
    expect(screen.getByLabelText('Dirty')).toHaveTextContent('false');
  });
});

it.each([
  { developer: true, framed: true },
  { developer: false, framed: true },
  { developer: true, framed: false },
  { developer: false, framed: false },
])('opens an icon Popup and highlights only its frame: %j', async ({ developer, framed }) => {
  mode.isDeveloperMode = developer;
  const { marker, user } = setup({ description: 'Details' }, { type: MapEntityType.Enemy, isBoss: framed });
  const button = screen.getByRole('button', { name: 'Test point' });
  await user.hover(button);
  expect(screen.queryByText('Details')).not.toBeInTheDocument();
  await user.click(button);
  expect(document.querySelector('.map-point-popup')).toHaveTextContent('Details');
  expect(marker?.getTooltip()).toBeNull();
  expect(button.classList.contains('point-frame--popup-open')).toBe(framed);
  await user.unhover(button);
  expect(marker?.isPopupOpen()).toBe(true);
  await user.click(button);
  expect(marker?.isPopupOpen()).toBe(false);
  expect(button).not.toHaveClass('point-frame--popup-open');
  act(() => button.focus());
  await user.keyboard('{Enter}');
  expect(marker?.isPopupOpen()).toBe(true);
  expect(button.classList.contains('point-frame--popup-open')).toBe(framed);
  await user.keyboard('{Escape}');
  expect(button).not.toHaveClass('point-frame--popup-open');
});

it.each(['Move', 'Edit', 'Delete'])('closes the Popup before starting %s', async (action) => {
  const { marker, user } = setup({ description: 'Details' });
  await user.click(screen.getByRole('button', { name: 'Test point' }));
  expect(marker?.isPopupOpen()).toBe(true);
  await user.click(screen.getByRole('button', { name: action }));
  expect(marker?.isPopupOpen()).toBe(false);
});

it.each(['moveend', 'zoomend', 'resize'])('updates the toolbar side after Leaflet %s', (event) => {
  const { map } = setup();
  const button = screen.getByRole('button', { name: 'Test point' });
  const toolbarHost = button.closest('.editable-point');
  vi.spyOn(map, 'getSize').mockReturnValue(point(400, 300));
  const project = vi.spyOn(map, 'latLngToContainerPoint').mockReturnValue(point(100, 150));
  act(() => {
    map.fire(event);
  });
  expect(toolbarHost).not.toHaveClass('editable-point--right');
  project.mockReturnValue(point(300, 150));
  act(() => {
    map.fire(event);
  });
  expect(toolbarHost).toHaveClass('editable-point--right');
  project.mockReturnValue(point(200, 150));
  act(() => {
    map.fire(event);
  });
  expect(toolbarHost).not.toHaveClass('editable-point--right');
});

it('updates the toolbar side when point coordinates change without a map event', () => {
  const mapRef = createRef<LeafletMap>();
  function content(x: number) {
    return (
      <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={7}>
        <EditableMapPoint
          entity={{ id, type: MapEntityType.Npc, title: 'Test point', position: { x, y: 200 } }}
          color="red"
          menuSuppressed={false}
          tooltipDisabled
          moving={false}
          onOpenMenu={vi.fn()}
          onMovingChange={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      </MapContainer>
    );
  }
  const view = render(content(100));
  const map = mapRef.current;

  if (!map) {
    throw new Error('Expected a map.');
  }

  vi.spyOn(map, 'getSize').mockReturnValue(point(400, 300));
  vi.spyOn(map, 'latLngToContainerPoint').mockImplementation((latlng) => CRS.Simple.latLngToPoint(latlng, 7));
  view.rerender(content(100));
  const host = screen.getByRole('button', { name: 'Test point' }).closest('.editable-point');
  expect(host).not.toHaveClass('editable-point--right');
  view.rerender(content(300));
  expect(host).toHaveClass('editable-point--right');
  view.rerender(content(100));
  expect(host).not.toHaveClass('editable-point--right');
});

it('offers enemies from the full database when they are absent from the rendered map', async () => {
  const hidden: MapEntity = {
    id: '11111111-0000-4000-8000-000000000000',
    type: MapEntityType.Enemy,
    isBoss: false,
    title: 'Hidden guard',
    description: 'Hidden enemy description',
    position: { x: 500, y: 600 },
  };
  const { user } = setup({}, { type: MapEntityType.Enemy, isBoss: false }, [hidden]);
  expect(screen.queryByRole('button', { name: 'Hidden guard' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  const title = screen.getByRole('combobox', { name: 'Title' });
  await user.clear(title);
  await user.type(title, 'hidden');
  await user.click(screen.getByRole('option', { name: 'Hidden guard' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  const database = JSON.parse(screen.getByLabelText('Database').textContent ?? '{}');
  expect(database.entities[0]).toMatchObject({
    id,
    title: 'Hidden guard',
    description: 'Hidden enemy description',
    position: { x: 100, y: 200 },
  });
});

it.each([false, true])(
  'opens and highlights framed point details for repeated list requests (developer=%s)',
  (developer) => {
    mode.isDeveloperMode = developer;
    const entity: MapPointEntity = {
      id,
      type: MapEntityType.Enemy,
      isBoss: true,
      title: 'Boss details',
      description: 'Requested description',
      position: { x: 100, y: 200 },
    };
    const mapRef = createRef<LeafletMap>();
    function content(request: MapEntity | null) {
      return (
        <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={1} maxZoom={7}>
          <MapEntities entities={[entity]} entityToLocate={request} onUpdatePoint={vi.fn()} onDeletePoint={vi.fn()} />
        </MapContainer>
      );
    }
    const view = render(content(null));
    expect(document.querySelector('.map-point-popup')).not.toBeInTheDocument();
    view.rerender(content({ ...entity }));
    expect(document.querySelector('.map-point-popup')).toHaveTextContent('Requested description');
    expect(screen.getByRole('button', { name: 'Boss details' })).toHaveClass('point-frame--popup-open');
    act(() => mapRef.current?.closePopup());
    expect(document.querySelector('.map-point-popup')).not.toBeInTheDocument();
    view.rerender(content({ ...entity }));
    expect(document.querySelector('.map-point-popup')).toHaveTextContent('Requested description');
    expect(mapRef.current?.getCenter().equals(mapPositionToLatLng(entity.position))).toBe(true);
  }
);
