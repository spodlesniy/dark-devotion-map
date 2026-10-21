import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, type PropsWithChildren, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AddPointDialog } from 'src/components/AddPointDialog';
import { MapViewRoute } from 'src/routes/MapViewRoute';
import { MapEntityType } from 'src/types/MapEntityType';
import { expandEntityMenu } from '../utils/expandEntityMenu';

const mode = vi.hoisted(() => ({ isDeveloperMode: false, entities: [] as unknown[] }));

vi.mock('src/common/environment', () => mode);
vi.mock('src/data/entities.json', () => ({
  default: {
    schemaVersion: 2,
    get entities() {
      return mode.entities;
    },
  },
}));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: Readonly<PropsWithChildren>) => <section aria-label="Map">{children}</section>,
  TileLayer: () => null,
  Marker: () => null,
  Tooltip: () => null,
  CircleMarker: () => null,
  useMap: () => ({
    fitBounds: vi.fn(),
    setView: vi.fn(),
    getContainer: () => document.createElement('div'),
    getZoom: () => 0,
    on: vi.fn(),
    off: vi.fn(),
  }),
  useMapEvents: () => ({ getContainer: () => document.createElement('div') }),
}));
vi.mock('src/components/MapBounds', () => ({ MapBounds: () => null }));
vi.mock('src/components/MapPointCreation', () => ({
  MapPointCreation: ({
    onAdd,
  }: Readonly<ComponentProps<typeof import('src/components/MapPointCreation').MapPointCreation>>) => (
    <button type="button" onClick={() => onAdd({ type: MapEntityType.Npc, title: 'Created NPC' }, { x: 50, y: 60 })}>
      Create test point
    </button>
  ),
}));
vi.mock('src/components/EditableMapPoint', () => ({
  EditableMapPoint: function MockPoint({
    entity,
    onUpdate,
  }: Readonly<ComponentProps<typeof import('src/components/EditableMapPoint').EditableMapPoint>>) {
    const [editing, setEditing] = useState(false);

    return (
      <>
        <button type="button" aria-label={`Map edit point ${entity.title}`} onClick={() => setEditing(true)}>
          Edit point on map
        </button>
        {editing && (
          <AddPointDialog
            editing
            initialDetails={entity}
            position={entity.position}
            onCancel={() => setEditing(false)}
            onAdd={(details, position) => {
              onUpdate({ ...entity, ...details, position });
              setEditing(false);
            }}
          />
        )}
      </>
    );
  },
}));

beforeEach(() => {
  mode.isDeveloperMode = false;
  mode.entities = [];
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
  vi.unstubAllEnvs();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

describe('Point editing from the map', () => {
  const point = {
    title: 'NPC',
    id: '22222222-0000-4000-8000-000000000000',
    type: 'npc',
    position: { x: 100, y: 200 },
  };

  it('shows a newly created point from a hidden category while keeping existing siblings hidden', async () => {
    mode.isDeveloperMode = true;
    mode.entities = [point];
    render(<MapViewRoute />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open Dark Devotion Map' }));
    await user.click(screen.getByRole('button', { name: 'Hide NPCs' }));
    expect(screen.queryByRole('button', { name: 'Map edit point NPC' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create test point' }));
    expect(screen.getByRole('button', { name: 'Map edit point Created NPC' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Map edit point NPC' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all NPCs' })).toHaveAttribute('aria-pressed', 'mixed');
    expect(screen.getByRole('button', { name: 'Expand developer tools' })).toHaveClass('tool-window__toggle--warning');
    await user.click(screen.getByRole('button', { name: 'Expand developer tools' }));
    expect(screen.getByRole('button', { name: 'Collapse developer tools' })).not.toHaveClass(
      'tool-window__toggle--warning'
    );
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
  });

  it('opens the point form without selecting it and saves its title and metadata', async () => {
    mode.isDeveloperMode = true;
    mode.entities = [point];
    render(<MapViewRoute />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open Dark Devotion Map' }));
    expandEntityMenu();
    await user.click(screen.getByRole('button', { name: 'Map edit point NPC' }));
    expect(screen.getByRole('dialog', { name: 'Edit point' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NPC' })).not.toHaveAttribute('aria-pressed');
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), '  A named NPC  ');
    await user.type(screen.getByLabelText('Description'), 'Point details');
    await user.type(screen.getByLabelText('URL'), 'https://example.com/point');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Expand developer tools' }));
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    const loaded = screen.getByText('1 entity loaded.');
    expect(loaded.closest('.tool-window__status')).toBeInTheDocument();
    expect(loaded.closest('.drawer')).toBeNull();
    expandEntityMenu();
    expect(screen.getByRole('button', { name: 'A named NPC' })).not.toHaveAttribute('aria-pressed');
    await user.click(screen.getByRole('button', { name: 'Hide NPCs' }));
    expect(screen.queryByRole('button', { name: 'Map edit point A named NPC' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox'), 'missing');
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
    expect(screen.getByText('1 entity loaded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide NPCs' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Map edit point A named NPC' }));
    expect(screen.getByLabelText('Title')).toHaveValue('A named NPC');
    expect(screen.getByLabelText('Description')).toHaveValue('Point details');
    expect(screen.getByLabelText('URL')).toHaveValue('https://example.com/point');
  });

  it('does not offer point editing in read-only mode', async () => {
    mode.entities = [point];
    render(<MapViewRoute />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open Dark Devotion Map' }));
    expandEntityMenu();
    expect(screen.queryByText('1 entity loaded.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NPC' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit point NPC', hidden: true })).not.toBeInTheDocument();
  });
});

it.each([false, true])(
  'offers a default-enabled icon background toggle only in developer mode (%s)',
  async (developer) => {
    mode.isDeveloperMode = developer;
    render(<MapViewRoute />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open Dark Devotion Map' }));
    const container = screen.getByRole('region', { name: 'Map' }).parentElement;
    expect(container).not.toHaveClass('map-container--icons-bare');

    if (!developer) {
      expect(screen.queryByRole('checkbox', { name: 'Icon BG', hidden: true })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Developer tools' })).not.toBeInTheDocument();

      return;
    }

    expect(screen.queryByRole('checkbox', { name: 'Icon BG' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand developer tools' }));
    const toggle = screen.getByRole('checkbox', { name: 'Icon BG' });
    expect(screen.getByRole('region', { name: 'Developer tools' })).toContainElement(toggle);
    expect(toggle.closest('.drawer')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(toggle).toBeVisible();
    expect(toggle).toBeChecked();
    expect(toggle.closest('.entity-database-export__status-row')).toContainElement(
      screen.getByText('No unsaved changes')
    );
    expect(screen.queryByRole('button', { name: 'Add point' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add area' })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(container).toHaveClass('map-container--icons-bare');
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
    await user.click(toggle);
    expect(container).not.toHaveClass('map-container--icons-bare');
  }
);
