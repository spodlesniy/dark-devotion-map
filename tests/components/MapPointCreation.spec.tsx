import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CRS, type Map as LeafletMap } from 'leaflet';
import { createRef, useState } from 'react';
import { MapContainer } from 'react-leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MapPointCreation } from 'src/components/MapPointCreation';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    }),
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

function setup(placement = false, suggestionEntities: readonly MapEntity[] = []) {
  const mapRef = createRef<LeafletMap>();
  const onAdd = vi.fn();
  function Harness() {
    const [placing, setPlacing] = useState(placement);

    return (
      <MapContainer ref={mapRef} crs={CRS.Simple} center={[-40, 25]} zoom={2}>
        <MapPointCreation
          onAdd={onAdd}
          suggestionEntities={suggestionEntities}
          placing={placing}
          onPlacementEnd={() => setPlacing(false)}
        />
      </MapContainer>
    );
  }

  const { unmount } = render(<Harness />);
  const map = mapRef.current;

  if (!map) {
    throw new Error('Expected a Leaflet map');
  }

  const rightClick = (x = 1234, y = 5678) => {
    act(() => {
      map.fire('contextmenu', {
        latlng: mapPositionToLatLng({ x, y }),
        originalEvent: new MouseEvent('contextmenu', { clientX: 200, clientY: 300 }),
      });
    });
  };

  return { map, onAdd, rightClick, unmount, user: userEvent.setup() };
}

describe('Point creation', () => {
  it('selects a clicked or tapped map position and reuses the point dialog', async () => {
    const { map, onAdd, user } = setup(true);
    expect(screen.getByRole('status')).toHaveTextContent('Click or tap the map');
    expect(map.getContainer()).toHaveClass('map-point-placement');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => {
      map.fire('click', { latlng: mapPositionToLatLng({ x: -1, y: 10 }) });
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      map.fire('movestart');
      map.fire('zoomstart');
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      map.fire('click', { latlng: mapPositionToLatLng({ x: 1200.4, y: 3400.6 }) });
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(map.getContainer()).not.toHaveClass('map-point-placement');
    expect(screen.getByRole('dialog', { name: 'Add point' })).toBeInTheDocument();
    expect(screen.getByText('Position: X 1200 · Y 3401 px')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Title'), 'Test point');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith({ title: 'Test point', type: 'npc' }, { x: 1200, y: 3401 });
  });

  it.each(['Cancel placement', 'Escape'])('cancels placement with %s without creating a point', async (action) => {
    const { map, onAdd, user, rightClick } = setup(true);
    rightClick();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    if (action === 'Escape') {
      await user.keyboard('{Escape}');
    } else {
      await user.click(screen.getByRole('button', { name: action }));
    }

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(map.getContainer()).not.toHaveClass('map-point-placement');
    act(() => {
      map.fire('click', { latlng: mapPositionToLatLng({ x: 100, y: 200 }) });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
    rightClick();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('cleans up placement state when unmounted', () => {
    const { map, unmount } = setup(true);
    const container = map.getContainer();
    unmount();
    expect(container).not.toHaveClass('map-point-placement');
  });

  it.each([
    {
      type: 'place',
      field: 'Place type',
      value: 'mirror-teleporter',
      details: { type: 'place', placeType: 'mirror-teleporter' },
    },
    { type: 'item', field: 'Item type', value: 'left-hand', details: { type: 'item', itemType: 'left-hand' } },
  ])('creates $type points with the selected subtype', async ({ type, field, value, details }) => {
    const { onAdd, rightClick, user } = setup();
    rightClick();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));
    expect(screen.queryByLabelText('Boss')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Place type')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Item type')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), type);
    await user.selectOptions(screen.getByLabelText(field), value);
    if (type !== 'place') {
      await user.type(screen.getByLabelText('Title'), 'Test point');
    }

    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(
      { ...details, ...(type === 'place' ? {} : { title: 'Test point' }) },
      { x: 1234, y: 5678 }
    );
  });

  it('creates a boss and omits its field when switching to NPC', async () => {
    const { onAdd, rightClick, user } = setup();
    rightClick();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'enemy');
    expect(screen.getByRole('checkbox', { name: 'Boss' })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Boss' }));
    await user.type(screen.getByLabelText('Title'), 'Test point');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenLastCalledWith(
      { title: 'Test point', type: 'enemy', isBoss: true, isElite: false },
      { x: 1234, y: 5678 }
    );
    rightClick();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'enemy');
    await user.click(screen.getByRole('checkbox', { name: 'Boss' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'npc');
    expect(screen.queryByRole('checkbox', { name: 'Boss' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Test point');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenLastCalledWith({ title: 'Test point', type: 'npc' }, { x: 1234, y: 5678 });
  });

  it('creates a Place point using the lowercase category value', async () => {
    const { onAdd, rightClick, user } = setup();
    rightClick();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(
      { type: 'place', placeType: 'tablet', tabletType: 'faith' },
      { x: 1234, y: 5678 }
    );
  });

  it('opens a native dialog at the clicked image coordinates and adds only on confirmation', async () => {
    const { onAdd, rightClick, user } = setup();
    rightClick();
    expect(screen.getByRole('menuitem', { name: 'Add Entity' })).toHaveFocus();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    const addPoint = screen.getByRole('menuitem', { name: 'Add point…' });
    expect(addPoint).toHaveFocus();
    await user.click(addPoint);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add point' })).toBeInTheDocument();
    expect(screen.getByText('Position: X 1234 · Y 5678 px')).toHaveTextContent('Position: X 1234 · Y 5678 px');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText('Type'), 'enemy');
    await user.type(screen.getByLabelText('Title'), 'Test point');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith(
      { title: 'Test point', type: 'enemy', isBoss: false, isElite: false },
      { x: 1234, y: 5678 }
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each(['Cancel', 'Close dialog', 'Escape'])('cancels with %s without adding data', async (action) => {
    const { onAdd, rightClick, user } = setup();
    rightClick();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));

    if (action === 'Escape') {
      fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    } else {
      await user.click(screen.getByRole('button', { name: action }));
    }

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves the form and map position when adding fails', async () => {
    const { onAdd, rightClick, user } = setup();
    rightClick();
    await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));
    onAdd.mockImplementation(() => {
      throw new Error('Rejected');
    });
    await user.type(screen.getByLabelText('Title'), 'Test point');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith({ title: 'Test point', type: 'npc' }, { x: 1234, y: 5678 });
    expect(screen.getByText('Position: X 1234 · Y 5678 px')).toHaveTextContent('X 1234 · Y 5678');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ignores clicks outside the image and dismisses the menu on Escape or map movement', async () => {
    const { map, rightClick, user } = setup();
    rightClick(-1, 100);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rightClick(100, 11601);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rightClick();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rightClick();
    act(() => {
      map.fire('movestart');
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

it.each([false, true])(
  'offers existing enemy titles when creating through the map (placement=%s)',
  async (placement) => {
    const enemy: MapEntity = {
      id: '11111111-0000-4000-8000-000000000000',
      type: MapEntityType.Enemy,
      isBoss: false,
      isElite: false,
      title: 'Decharmed',
      description: 'Enemy details',
      url: 'https://example.com/enemy',
      position: { x: 100, y: 200 },
    };
    const { map, rightClick, user, onAdd } = setup(placement, [enemy]);

    if (placement) {
      act(() => {
        map.fire('click', { latlng: mapPositionToLatLng({ x: 1200, y: 3400 }) });
      });
    } else {
      rightClick();
      await user.click(screen.getByRole('menuitem', { name: 'Add Entity' }));
      await user.click(screen.getByRole('menuitem', { name: 'Add point…' }));
    }

    await user.selectOptions(screen.getByLabelText('Type'), 'enemy');
    await user.type(screen.getByRole('combobox', { name: 'Title' }), 'dech');
    await user.click(screen.getByRole('option', { name: 'Decharmed' }));
    expect(screen.getByLabelText('Description')).toHaveValue('Enemy details');
    expect(screen.getByLabelText('URL')).toHaveValue('https://example.com/enemy');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: MapEntityType.Enemy,
        isBoss: false,
        isElite: false,
        title: 'Decharmed',
        description: 'Enemy details',
        url: 'https://example.com/enemy',
      }),
      expect.anything()
    );
  }
);
