import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Browser, CRS, CircleMarker as LeafletCircleMarker, type Map as LeafletMap } from 'leaflet';
import { createRef, useState } from 'react';
import { MapContainer } from 'react-leaflet';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getWikiDescription, getWikiImage } from 'src/api/wiki';
import { EntityMenu } from 'src/components/EntityMenu';
import { MapEntities } from 'src/components/MapEntities';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { mapPositionToLatLng } from 'src/helpers/mapEntityDisplay';
import { useEntityTreeVisibility } from 'src/hooks/useEntityTreeVisibility';
import type { MapEntity } from 'src/types/MapEntity';
import { expandEntityMenu } from '../utils/expandEntityMenu';

vi.mock('src/helpers/pointIcons', () => ({ getPointIconUrl: () => null }));
vi.mock('src/api/wiki', () => ({ getWikiDescription: vi.fn(), getWikiImage: vi.fn() }));

const entities = parseMapEntityDatabase({
  schemaVersion: 2,
  entities: [
    { id: '11111111-0000-4000-8000-000000000000', type: 'npc', title: 'NPC', position: { x: 3000, y: 4000 } },
    {
      id: '22222222-0000-4000-8000-000000000000',
      type: 'enemy',
      title: 'Enemy',
      isBoss: false,
      url: 'https://darkdevotion.fandom.com/wiki/Enemy',
      position: { x: 4000, y: 5000 },
    },
    {
      id: '33333333-0000-4000-8000-000000000000',
      type: 'item',
      itemType: 'weapon',
      title: 'Item',
      position: { x: 2000, y: 6000 },
    },
  ],
}).entities;

const supportsSvg = Browser.svg;

beforeEach(() => {
  // jsdom omits the SVG capability detection API that Leaflet checks.
  Object.defineProperty(Browser, 'svg', { value: true });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1280);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(720);
});

afterEach(() => {
  Object.defineProperty(Browser, 'svg', { value: supportsSvg });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function renderBrowser(databaseEntities = entities) {
  const mapRef = createRef<LeafletMap>();

  function BrowserHarness() {
    const [entityToLocate, setEntityToLocate] = useState<MapEntity | null>(null);

    const { visibleEntities, hiddenIds, toggleVisibility, showEntity, resetVisibility } =
      useEntityTreeVisibility(databaseEntities);

    function onLocate(entity: MapEntity) {
      showEntity(entity.id);
      setEntityToLocate({ ...entity });
    }

    return (
      <>
        <EntityMenu
          entities={databaseEntities}
          onLocate={onLocate}
          hiddenIds={hiddenIds}
          onToggleVisibility={toggleVisibility}
          onResetVisibility={resetVisibility}
        />
        <MapContainer ref={mapRef} crs={CRS.Simple} center={[-40, 25]} zoom={1} minZoom={0} maxZoom={7}>
          <MapEntities entities={visibleEntities} entityToLocate={entityToLocate} />
        </MapContainer>
      </>
    );
  }

  render(<BrowserHarness />);
  expandEntityMenu();
  const map = mapRef.current;

  if (!map) {
    throw new Error('Expected a Leaflet map');
  }

  const points: LeafletCircleMarker[] = [];
  map.eachLayer((layer) => {
    if (layer instanceof LeafletCircleMarker) {
      points.push(layer);
    }
  });

  return { map, points, user: userEvent.setup() };
}

describe('Entity browsing', () => {
  it('keeps actual map layers independent of search and reveals only a located member of a hidden title group', async () => {
    const members = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        ...entities,
        {
          id: '44444444-0000-4000-8000-000000000000',
          type: 'enemy',
          title: 'Enemy',
          isBoss: false,
          position: { x: 4500, y: 5500 },
        },
      ],
    }).entities;
    const { map, points, user } = renderBrowser(members);
    expect(points).toHaveLength(4);
    await user.type(screen.getByRole('searchbox'), 'enemy');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'NPC' })).toBeNull());
    expect(points.every((point) => map.hasLayer(point))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Hide Enemy' }));
    expect(map.hasLayer(points[1] as LeafletCircleMarker)).toBe(false);
    expect(map.hasLayer(points[3] as LeafletCircleMarker)).toBe(false);
    expect(map.hasLayer(points[0] as LeafletCircleMarker)).toBe(true);
    expect(map.hasLayer(points[2] as LeafletCircleMarker)).toBe(true);
    const entries = screen.getAllByRole('button', { name: 'Enemy' });
    expect(entries).toHaveLength(2);
    await user.click(entries[1] as HTMLElement);
    const position = mapPositionToLatLng({ x: 4500, y: 5500 });
    const visiblePoints: LeafletCircleMarker[] = [];
    map.eachLayer((layer) => {
      if (layer instanceof LeafletCircleMarker) {
        visiblePoints.push(layer);
      }
    });
    expect(visiblePoints).toHaveLength(3);
    expect(visiblePoints.find((point) => point.getLatLng().equals(position))?.isPopupOpen()).toBe(true);
    expect(map.getCenter().equals(position)).toBe(true);
    expect(map.hasLayer(points[1] as LeafletCircleMarker)).toBe(false);
    expect(screen.getByRole('button', { name: 'Show all Enemy' })).toHaveAttribute('aria-pressed', 'mixed');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'en' } });
    expandEntityMenu();
    expect(screen.getByRole('button', { name: 'NPC' })).toBeInTheDocument();
    expect(visiblePoints.every((point) => map.hasLayer(point))).toBe(true);
    expect(map.hasLayer(points[1] as LeafletCircleMarker)).toBe(false);
    expect(map.getCenter().equals(position)).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    let pointCount = 0;
    map.eachLayer((layer) => {
      if (layer instanceof LeafletCircleMarker) {
        pointCount += 1;
      }
    });
    expect(pointCount).toBe(4);
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Hide Enemies' })).toHaveAttribute('aria-pressed', 'true');
    expect(map.getCenter().equals(position)).toBe(true);
  });

  it('shows local description and an external link below the title', () => {
    const url = 'https://example.com/long/path';
    const { points } = renderBrowser(entities.map((entity) => ({ ...entity, description: 'Local details', url })));
    act(() => points[0]?.openPopup());
    const content = document.querySelector('.map-entity-tooltip__content');
    const link = screen.getByRole('link', { name: 'example.com' });

    expect(content?.firstElementChild).toHaveTextContent('NPC');
    expect(screen.getByText('Local details')).toBeInTheDocument();
    expect(content?.lastElementChild).toBe(link);
    expect(link).toHaveAttribute('title', url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('blocks native context menus and prevents popup right-clicks from reaching the map', () => {
    const { points, map } = renderBrowser();
    const mapContextMenu = vi.fn();
    map.on('contextmenu', mapContextMenu);
    act(() => points[0]?.openPopup());
    const content = document.querySelector('.map-entity-tooltip__content');

    if (!content) {
      throw new Error('Expected popup content');
    }

    expect(fireEvent.contextMenu(content)).toBe(false);
    expect(mapContextMenu).not.toHaveBeenCalled();
    expect(points[0]?.isPopupOpen()).toBe(true);
  });

  it('resizes an open tooltip when wiki text arrives without reopening or map events', async () => {
    vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
    let resolveDescription!: (value: string) => void;
    vi.mocked(getWikiDescription).mockReturnValue(
      new Promise((resolve) => {
        resolveDescription = resolve;
      })
    );
    vi.mocked(getWikiImage).mockResolvedValue(null);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('map-entity-tooltip__content')) {
        return this.textContent?.includes('Loaded wiki description')
          ? new DOMRect(0, 0, 260, 180)
          : new DOMRect(0, 0, 180, 80);
      }

      return new DOMRect(0, 0, 1280, 720);
    });
    const { points } = renderBrowser();
    const enemy = points[1];
    act(() => enemy?.openPopup());
    const tooltip = document.querySelector<HTMLElement>('.map-entity-tooltip');
    await waitFor(() => expect(tooltip?.style.width).toBe('180px'));
    expect(tooltip?.style.height).toBe('80px');
    await act(async () => {
      resolveDescription('Loaded wiki description');
    });
    await waitFor(() => expect(tooltip?.style.width).toBe('260px'));
    expect(tooltip?.style.height).toBe('180px');
    expect(enemy?.isPopupOpen()).toBe(true);
    expect(document.querySelector('.map-entity-tooltip')).toBe(tooltip);
  });

  it.each(['', undefined])('omits the link when URL is empty or absent: %j', (url) => {
    const { points } = renderBrowser(entities.map((entity) => ({ ...entity, ...(url === undefined ? {} : { url }) })));
    act(() => points[0]?.openPopup());
    expect(document.querySelector('.map-entity-tooltip__link')).not.toBeInTheDocument();
  });

  it.each([
    { url: 'mailto:someone@example.com', label: 'External Link' },
    { url: 'https://example.com:8443/long/path', label: 'example.com' },
  ])('uses a hostname or fallback label for $url', ({ url, label }) => {
    const { points } = renderBrowser(entities.map((entity) => ({ ...entity, url })));
    act(() => points[0]?.openPopup());
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', url);
  });

  it('fits an open tooltip to the visible map and recalculates after resize', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('map-entity-tooltip')) {
        return new DOMRect(700, -20, 300, 300);
      }

      return new DOMRect(0, 0, 1280, 720);
    });
    const { map, points } = renderBrowser();
    act(() => points[0]?.openPopup());
    const tooltip = document.querySelector<HTMLElement>('.map-entity-tooltip');
    await waitFor(() => expect(tooltip?.style.getPropertyValue('--tooltip-viewport-height')).toBe('720px'));
    expect(tooltip).toHaveClass('map-entity-tooltip--shifted');
    expect(Number.parseFloat(tooltip?.style.getPropertyValue('--tooltip-shift-y') ?? '')).toBeGreaterThan(0);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(500);
    act(() => map.fire('resize'));
    await waitFor(() => expect(tooltip?.style.getPropertyValue('--tooltip-viewport-height')).toBe('500px'));
  });

  it('updates explicit tooltip dimensions when its content size changes', async () => {
    const { points, map } = renderBrowser();
    vi.spyOn(map.getContainer(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1280, 720));
    act(() => points[0]?.openPopup());
    const tooltip = document.querySelector<HTMLElement>('.map-entity-tooltip');
    const content = tooltip?.querySelector<HTMLElement>('.map-entity-tooltip__content');

    if (!tooltip || !content) {
      throw new Error('Expected an open tooltip');
    }

    tooltip.style.padding = '16px';
    tooltip.style.border = '1px solid';
    const measure = vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 80));
    act(() => map.fire('resize'));
    await waitFor(() => expect(tooltip.style.width).toBe('234px'));
    expect(tooltip.style.height).toBe('114px');
    measure.mockReturnValue(new DOMRect(0, 0, 260, 140));
    act(() => map.fire('resize'));
    await waitFor(() => expect(tooltip.style.width).toBe('294px'));
    expect(tooltip.style.height).toBe('174px');
  });

  it('locates a point and opens its popup on every list activation', async () => {
    const { map, points, user } = renderBrowser();
    const button = screen.getByRole('button', { name: 'NPC' });
    button.focus();
    await user.keyboard('{Enter}');

    const location = mapPositionToLatLng({ x: 3000, y: 4000 });
    expect(map.getZoom()).toBe(7);
    expect(points[0]?.isPopupOpen()).toBe(true);
    expect(map.getCenter().equals(location)).toBe(true);
    expect(button).not.toHaveAttribute('aria-pressed');
    expect(points[0]?.options.color).toBe('var(--color-entity-npc)');
    expect(points[0]?.getRadius()).toBe(6);

    act(() => {
      map.panTo([0, 0], { animate: false });
    });
    await user.click(button);
    expect(button).not.toHaveAttribute('aria-pressed');
    expect(points[0]?.getRadius()).toBe(6);
    expect(points[0]?.options.color).toBe('var(--color-entity-npc)');
    expect(map.getCenter().equals(location)).toBe(true);
    await user.click(button);
    expect(map.getCenter().equals(location)).toBe(true);
  });
});

it('opens and toggles a fallback point Popup through actual clicks and keeps wiki data cached', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
  vi.mocked(getWikiDescription).mockResolvedValue('Wiki text');
  vi.mocked(getWikiImage).mockResolvedValue(null);
  const { points, user, map } = renderBrowser();
  const enemy = points[1];
  const element = enemy?.getElement();

  if (!enemy || !element) {
    throw new Error('Expected a point.');
  }

  act(() => enemy.fire('mouseover'));
  expect(enemy.isTooltipOpen()).toBe(true);
  expect(getWikiDescription).not.toHaveBeenCalled();
  fireEvent.click(element);
  expect(await screen.findByText('Wiki text')).toBeInTheDocument();
  expect(enemy.getTooltip()).toBeNull();
  act(() => {
    enemy.fire('mouseout');
    points[0]?.fire('mouseover');
    map.fire('move');
    map.fire('zoomend');
  });
  expect(enemy.isPopupOpen()).toBe(true);
  fireEvent.click(element);
  expect(enemy.isPopupOpen()).toBe(false);
  fireEvent.click(element);
  expect(await screen.findByText('Wiki text')).toBeInTheDocument();
  expect(getWikiDescription).toHaveBeenCalledTimes(1);
  await user.keyboard('{Escape}');
  expect(enemy.isPopupOpen()).toBe(false);
});

it('closes the previous Popup on another point click, background click, or close button', () => {
  const { points, map } = renderBrowser();
  const first = points[0];
  const second = points[1];
  const firstElement = first?.getElement();
  const secondElement = second?.getElement();

  if (!first || !second || !firstElement || !secondElement) {
    throw new Error('Expected points.');
  }

  fireEvent.click(firstElement);
  fireEvent.click(secondElement);
  expect(first.isPopupOpen()).toBe(false);
  expect(second.isPopupOpen()).toBe(true);
  fireEvent.click(map.getContainer());
  expect(second.isPopupOpen()).toBe(false);
  fireEvent.click(firstElement);
  fireEvent.click(screen.getByRole('button', { name: 'Close popup' }));
  expect(first.isPopupOpen()).toBe(false);
});
