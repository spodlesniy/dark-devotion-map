import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CircleMarker, CRS, type Map as LeafletMap, Marker } from 'leaflet';
import { createRef } from 'react';
import { MapContainer } from 'react-leaflet';
import { afterEach, expect, it, vi } from 'vitest';

import { getWikiDescription, getWikiImage } from 'src/api/wiki';
import { MapEntities } from 'src/components/MapEntities';
import type { MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapTitleSize } from 'src/types/MapTitleSize';

const mode = vi.hoisted(() => ({ isDeveloperMode: false }));
vi.mock('src/common/environment', () => mode);
vi.mock('src/helpers/pointIcons', () => ({ getPointIconUrl: () => null }));
vi.mock('src/api/wiki', () => ({
  getWikiDescription: vi.fn(),
  getWikiImage: vi.fn(),
  getWikiCodexDescription: vi.fn(),
}));

const title: MapPointEntity = {
  id: '11111111-0000-4000-8000-000000000000',
  type: MapEntityType.Title,
  title: 'Temple',
  size: MapTitleSize.Medium,
  color: '#123456',
  position: { x: 10, y: 20 },
  description: 'Local details',
  url: 'https://darkdevotion.fandom.com/wiki/Temple',
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

function setup(entity = title) {
  const mapRef = createRef<LeafletMap>();
  const onUpdate = vi.fn();
  const view = render(
    <MapContainer ref={mapRef} crs={CRS.Simple} center={[0, 0]} zoom={0}>
      <MapEntities entities={[entity]} entityToLocate={null} onUpdatePoint={onUpdate} onDeletePoint={vi.fn()} />
    </MapContainer>
  );

  return { ...view, map: mapRef.current, onUpdate };
}

it.each([false, true])('renders Title text rather than an icon at the point anchor (developer=%s)', (developer) => {
  mode.isDeveloperMode = developer;
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const { container, map } = setup({ ...title, size: MapTitleSize.Huge });
  const button = screen.getByRole('button', { name: 'Temple' });
  expect(button.querySelector('.map-title-label')).toHaveClass('map-title-label--huge');
  expect(button.querySelector('.map-title-label')).toHaveStyle({ color: '#123456' });
  expect(button.querySelector('img')).toBeNull();
  expect(button).not.toHaveClass('point-frame');
  expect(container.querySelector('.map-title-marker')).toBeInTheDocument();
  fireEvent.click(button);
  expect(screen.getByText('Local details')).toBeInTheDocument();

  if (developer) {
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  }

  const markers: Marker[] = [];
  map?.eachLayer((layer) => {
    if (layer instanceof Marker) {
      markers.push(layer);
    }
  });
  expect(markers).toHaveLength(1);
});

it('loads Title wiki content lazily, keeps the URL visible during loading, and caches the result', async () => {
  mode.isDeveloperMode = false;
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
  let resolveDescription: ((value: string | null) => void) | undefined;
  vi.mocked(getWikiDescription).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDescription = resolve;
      })
  );
  vi.mocked(getWikiImage).mockResolvedValue(null);
  const { map } = setup();
  expect(getWikiDescription).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Temple' }));
  expect(screen.getByText('Loading wiki data…')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'darkdevotion.fandom.com' })).toHaveAttribute('href', title.url);
  expect(screen.queryByText('Local details')).not.toBeInTheDocument();
  expect(getWikiDescription).toHaveBeenCalledWith('Temple');
  await act(async () => resolveDescription?.('Wiki details'));
  expect(screen.getByText('Wiki details')).toBeInTheDocument();
  act(() => map?.closePopup());
  fireEvent.click(screen.getByRole('button', { name: 'Temple' }));
  await waitFor(() => expect(screen.getByText('Wiki details')).toBeInTheDocument());
  expect(getWikiDescription).toHaveBeenCalledTimes(1);
});

it('falls back to Title description when the wiki has no description', async () => {
  mode.isDeveloperMode = false;
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
  vi.mocked(getWikiDescription).mockResolvedValue(null);
  vi.mocked(getWikiImage).mockResolvedValue(null);
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Temple' }));
  await waitFor(() => expect(screen.getByText('Local details')).toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'darkdevotion.fandom.com' })).toHaveAttribute('href', title.url);
});

it('renders missing Arrows icons as a dot in its distinct fallback color', () => {
  mode.isDeveloperMode = false;
  const arrows: MapPointEntity = {
    id: title.id,
    type: MapEntityType.Item,
    itemType: MapItemType.Arrows,
    position: title.position,
  };
  const { map } = setup(arrows);
  const dots: CircleMarker[] = [];
  map?.eachLayer((layer) => {
    if (layer instanceof CircleMarker) {
      dots.push(layer);
    }
  });
  expect(dots[0]?.options.color).toBe('var(--color-entity-arrows)');
});
