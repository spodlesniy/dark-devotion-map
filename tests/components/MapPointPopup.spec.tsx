import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Popup as LeafletPopup } from 'leaflet';
import { type PropsWithChildren, type Ref, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getWikiCodexDescription, getWikiDescription, getWikiImage } from 'src/api/wiki';
import { MapPointPopup } from 'src/components/MapPointOverlays';
import type { MapPointEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceType } from 'src/types/MapPlaceType';

const environment = vi.hoisted(() => ({ isDeveloperMode: true }));
vi.mock('src/common/environment', () => environment);

vi.mock('src/api/wiki', () => ({
  getWikiCodexDescription: vi.fn(),
  getWikiDescription: vi.fn(),
  getWikiImage: vi.fn(),
}));
vi.mock('src/hooks/useTooltipViewport', () => ({ useTooltipViewport: vi.fn() }));
vi.mock('react-leaflet', () => ({
  useMap: () => ({ eachLayer: vi.fn(), on: vi.fn(), off: vi.fn() }),
  Tooltip: ({ ref, children }: PropsWithChildren<{ ref: Ref<LeafletPopup> }>) => {
    useImperativeHandle(ref, () => popup);
    return <div>{children}</div>;
  },
  Popup: ({ ref, children }: PropsWithChildren<{ ref: Ref<LeafletPopup> }>) => {
    useImperativeHandle(ref, () => popup);

    return <div>{children}</div>;
  },
}));

let popup: LeafletPopup;
const enemy: MapPointEntity = {
  id: 'e3a3860b-9116-40c6-8d31-05b40ec6038e',
  title: 'Hezek - The Baptized',
  type: MapEntityType.Enemy,
  isBoss: true,
  position: { x: 1, y: 2 },
  description: 'Local description',
  url: 'https://darkdevotion.fandom.com/wiki/Hezek_-_The_Baptized',
};
const image = { url: 'https://example.com/enemy.png', width: 320, height: 289 };

describe('LostRoom wiki popups', () => {
  const room: MapPointEntity = {
    id: enemy.id,
    type: MapEntityType.Place,
    placeType: MapPlaceType.LostRoom,
    position: enemy.position,
    description: 'Local room description',
    url: 'https://darkdevotion.fandom.com/wiki/Lost_Room',
  };

  it.each(['found', 'missing', 'error'])('loads description only and handles %s wiki content', async (outcome) => {
    if (outcome === 'error') {
      vi.mocked(getWikiDescription).mockRejectedValue(new Error('Network error'));
    } else {
      vi.mocked(getWikiDescription).mockResolvedValue(outcome === 'found' ? 'Wiki room description' : null);
    }

    const { container } = render(<MapPointPopup entity={room} />);
    expect(getWikiDescription).not.toHaveBeenCalled();
    open();
    expect(screen.getByText('Loading wiki data…')).toBeInTheDocument();
    expect(screen.queryByText('Local room description')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading image…')).not.toBeInTheDocument();
    await screen.findByText(outcome === 'found' ? 'Wiki room description' : 'Local room description');
    expect(getWikiDescription).toHaveBeenCalledWith('Lost Room');
    expect(getWikiImage).not.toHaveBeenCalled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', room.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(container.querySelector('.map-entity-tooltip__content')?.lastElementChild).toBe(link);
    open();
    expect(getWikiDescription).toHaveBeenCalledTimes(1);
  });

  it.each(['unrelated', 'disabled', 'absent'])('uses local content when wiki is %s', (reason) => {
    if (reason === 'disabled') {
      vi.stubEnv('VITE_WIKI_API_URL', '');
    }

    render(
      <MapPointPopup
        entity={{
          ...room,
          url: reason === 'unrelated' ? 'https://example.com/room' : reason === 'absent' ? '' : (room.url ?? ''),
        }}
      />
    );
    open();
    expect(screen.getByText('Local room description')).toBeInTheDocument();
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(getWikiImage).not.toHaveBeenCalled();
    if (reason === 'absent') {
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        reason === 'unrelated' ? 'https://example.com/room' : room.url
      );
    }
  });
});

function open() {
  act(() => {
    popup.fire('add');
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  environment.isDeveloperMode = true;
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
  popup = new LeafletPopup();
  vi.mocked(getWikiCodexDescription).mockResolvedValue('Wiki Codex text');
  vi.mocked(getWikiDescription).mockResolvedValue('Wiki description');
  vi.mocked(getWikiImage).mockResolvedValue(image);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Enemy wiki popups', () => {
  it.each([undefined, 'https://example.com/enemy'])(
    'keeps local content for an enemy without a wiki URL: %j',
    (url) => {
      const { url: _url, ...withoutUrl } = enemy;
      render(<MapPointPopup entity={url ? { ...enemy, url } : withoutUrl} />);
      open();
      expect(getWikiDescription).not.toHaveBeenCalled();
      expect(getWikiImage).not.toHaveBeenCalled();
      expect(screen.getByText('Local description')).toBeInTheDocument();
      expect(screen.getByText(enemy.title)).toBeInTheDocument();
    }
  );

  it('uses the URL page independently of the display title and does not reload for title changes', async () => {
    const { rerender } = render(<MapPointPopup entity={{ ...enemy, title: 'Short title' }} />);
    open();
    expect(getWikiDescription).toHaveBeenCalledWith('Hezek - The Baptized');
    await screen.findByText('Wiki description');
    rerender(<MapPointPopup entity={{ ...enemy, title: 'Another display title' }} />);
    open();
    expect(getWikiDescription).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Another display title')).toBeInTheDocument();
  });

  it.each(['description', 'missing', 'error'])('hides entity text while loading, then handles %s', async (outcome) => {
    let resolveDescription!: (value: string | null) => void;
    let rejectDescription!: (reason: Error) => void;
    vi.mocked(getWikiDescription).mockReturnValue(
      new Promise((resolve, reject) => {
        resolveDescription = resolve;
        rejectDescription = reject;
      })
    );
    vi.mocked(getWikiImage).mockResolvedValue(null);
    render(<MapPointPopup entity={enemy}>Developer hint</MapPointPopup>);
    open();
    expect(screen.getByText(enemy.title)).toBeInTheDocument();
    expect(screen.getByText('Loading wiki data…')).toBeInTheDocument();
    expect(screen.queryByText('Local description')).not.toBeInTheDocument();
    expect(screen.queryByText('Developer hint')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await act(async () => {
      if (outcome === 'error') {
        rejectDescription(new Error('Network error'));
      } else {
        resolveDescription(outcome === 'description' ? 'Wiki description' : null);
      }
    });
    expect(screen.queryByText('Loading wiki data…')).not.toBeInTheDocument();
    expect(screen.getByText(outcome === 'description' ? 'Wiki description' : 'Local description')).toBeInTheDocument();
    expect(screen.getByText('Developer hint')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', enemy.url);
  });

  it('reserves the image frame through API and image loading', async () => {
    render(<MapPointPopup entity={enemy} />);
    open();
    const placeholder = screen.getByText('Loading image…');
    const frame = placeholder.parentElement;
    expect(frame).toHaveAttribute('aria-busy', 'true');
    expect(frame?.parentElement).toHaveClass('map-entity-tooltip__body--image');
    const picture = await screen.findByRole('img');
    expect(picture.parentElement).toBe(frame);
    expect(screen.getByText('Loading image…')).toBeInTheDocument();
    fireEvent.load(picture);
    expect(frame).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByText('Loading image…')).not.toBeInTheDocument();
    expect(picture.parentElement).toBe(frame);
  });

  it('retains the browser referrer policy outside developer mode', async () => {
    environment.isDeveloperMode = false;
    render(<MapPointPopup entity={enemy} />);
    open();
    expect(await screen.findByRole('img')).not.toHaveAttribute('referrerpolicy');
  });

  it.each([undefined, '', '   '])('disables wiki loading when the endpoint is %j', (endpoint) => {
    vi.stubEnv('VITE_WIKI_API_URL', endpoint);
    render(<MapPointPopup entity={enemy} />);
    open();
    open();
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(getWikiImage).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Local description')).toBeInTheDocument();
  });

  it('loads a changed wiki URL immediately while the popup is open', async () => {
    const { rerender } = render(<MapPointPopup entity={enemy} />);
    open();
    await screen.findByText('Wiki description');
    vi.spyOn(popup, 'isOpen').mockReturnValue(true);
    vi.mocked(getWikiDescription).mockResolvedValue('New page description');
    rerender(<MapPointPopup entity={{ ...enemy, url: 'https://darkdevotion.fandom.com/wiki/Another_enemy' }} />);
    expect(getWikiDescription).toHaveBeenLastCalledWith('Another enemy');
    expect(await screen.findByText('New page description')).toBeInTheDocument();
  });

  it('loads only on first opening and reuses the result after reopening', async () => {
    render(<MapPointPopup entity={enemy} />);
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(getWikiImage).not.toHaveBeenCalled();
    open();
    expect(screen.getByText('Loading wiki data…')).toBeInTheDocument();
    expect(getWikiDescription).toHaveBeenCalledWith(enemy.title);
    expect(getWikiImage).toHaveBeenCalledWith(enemy.title);
    expect(await screen.findByText('Wiki description')).toBeInTheDocument();
    const picture = screen.getByRole('img', { name: enemy.title });
    expect(picture).toHaveAttribute('src', image.url);
    expect(picture).toHaveAttribute('referrerpolicy', 'no-referrer');
    const body = picture.closest('.map-entity-tooltip__body');
    expect(body).toHaveClass('map-entity-tooltip__body--image');
    const title = screen.getByText(enemy.title);
    expect(title.parentElement?.firstElementChild).toBe(title);
    expect(body?.previousElementSibling).toBe(title);
    const link = screen.getByRole('link');
    expect(link.previousElementSibling).toBe(body);
    expect(link.parentElement?.lastElementChild).toBe(link);
    expect(screen.getByText('Wiki description').parentElement?.parentElement).toBe(body);
    expect(screen.queryByText('Local description')).not.toBeInTheDocument();
    act(() => {
      popup.fire('remove');
    });
    open();
    expect(getWikiDescription).toHaveBeenCalledTimes(1);
    expect(getWikiImage).toHaveBeenCalledTimes(1);
  });

  it('does not repeat pending requests when reopened', async () => {
    let resolveDescription!: (value: string) => void;
    vi.mocked(getWikiDescription).mockReturnValue(
      new Promise((resolve) => {
        resolveDescription = resolve;
      })
    );
    render(<MapPointPopup entity={enemy} />);
    open();
    open();
    expect(getWikiDescription).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveDescription('Finished');
    });
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('keeps a text-only layout when no wiki data exists', async () => {
    vi.mocked(getWikiDescription).mockResolvedValue(null);
    vi.mocked(getWikiImage).mockResolvedValue(null);
    render(<MapPointPopup entity={enemy} />);
    open();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByText('Local description')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('retains successful data and local fallback after partial errors', async () => {
    vi.mocked(getWikiDescription).mockRejectedValue(new Error('Network error'));
    render(<MapPointPopup entity={enemy} />);
    open();
    expect(await screen.findByText('Some wiki data could not be loaded.')).toBeInTheDocument();
    expect(screen.getByText('Local description')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
    open();
    expect(getWikiDescription).toHaveBeenCalledTimes(1);
  });

  it('falls back to text when the image fails to load', async () => {
    render(<MapPointPopup entity={enemy} />);
    open();
    const picture = await screen.findByRole('img');
    fireEvent.error(picture);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Wiki description').closest('.map-entity-tooltip__body')).not.toHaveClass(
      'map-entity-tooltip__body--image'
    );
  });

  it('loads a changed wiki URL and ignores a previous pending result', async () => {
    let resolveOld!: (value: string) => void;
    vi.mocked(getWikiDescription).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    const { rerender } = render(<MapPointPopup entity={enemy} />);
    open();
    rerender(<MapPointPopup entity={{ ...enemy, url: 'https://darkdevotion.fandom.com/wiki/Another_enemy' }} />);
    open();
    expect(await screen.findByText('Wiki description')).toBeInTheDocument();
    await act(async () => {
      resolveOld('Old description');
    });
    expect(screen.queryByText('Old description')).not.toBeInTheDocument();
    expect(getWikiDescription).toHaveBeenLastCalledWith('Another enemy');
  });
});

describe('NPC wiki images', () => {
  const npc: MapPointEntity = {
    id: enemy.id,
    type: MapEntityType.Npc,
    title: 'Friendly NPC',
    position: enemy.position,
    url: 'https://darkdevotion.fandom.com/wiki/NPC_page',
  };

  it.each([
    { description: 'Local NPC description', picture: image },
    { description: '', picture: image },
    { description: 'Local NPC description', picture: null },
    { description: '', picture: null },
  ])('renders only available local description and image: %j', async ({ description, picture }) => {
    vi.mocked(getWikiImage).mockResolvedValue(picture);
    render(<MapPointPopup entity={{ ...npc, description }} />);
    expect(getWikiImage).not.toHaveBeenCalled();
    open();
    expect(screen.getByText('Loading wiki data…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading wiki data…')).not.toBeInTheDocument());
    expect(getWikiImage).toHaveBeenCalledWith('NPC page');
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(screen.queryByText('Wiki description')).not.toBeInTheDocument();
    expect(screen.queryByText('Local NPC description') !== null).toBe(Boolean(description));
    expect(screen.queryByRole('img') !== null).toBe(Boolean(picture));

    if (picture) {
      const body = screen.getByRole('img').closest('.map-entity-tooltip__body');
      expect(body).toHaveClass(
        description ? 'map-entity-tooltip__body--image' : 'map-entity-tooltip__body--image-only'
      );
      const link = screen.getByRole('link');
      expect(link.parentElement?.lastElementChild).toBe(link);
      expect(link.previousElementSibling).toBe(body);
      expect(link.closest('.map-entity-tooltip__body')).toBeNull();
      fireEvent.load(screen.getByRole('img'));
    }

    open();
    expect(getWikiImage).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'https://example.com/npc'])('skips wiki images for unrelated or missing URLs: %j', (url) => {
    const { url: _url, ...withoutUrl } = npc;
    render(<MapPointPopup entity={{ ...withoutUrl, ...(url ? { url } : {}), description: 'Local NPC description' }} />);
    open();
    expect(getWikiImage).not.toHaveBeenCalled();
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(screen.getByText('Local NPC description')).toBeInTheDocument();
  });

  it('disables NPC image loading without a configured endpoint', () => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    render(<MapPointPopup entity={npc} />);
    open();
    expect(getWikiImage).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('removes the image layout when the file cannot load', async () => {
    render(<MapPointPopup entity={{ ...npc, description: 'Local NPC description' }} />);
    open();
    fireEvent.error(await screen.findByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Local NPC description').closest('.map-entity-tooltip__body')).not.toHaveClass(
      'map-entity-tooltip__body--image'
    );
  });

  it('keeps the local description on API errors', async () => {
    vi.mocked(getWikiImage).mockRejectedValue(new Error('Network error'));
    render(<MapPointPopup entity={{ ...npc, description: 'Local NPC description' }} />);
    open();
    await screen.findByText('Some wiki data could not be loaded.');
    expect(screen.getByText('Local NPC description')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not reuse enemy descriptions when switching to NPC on the same page', async () => {
    const { rerender } = render(<MapPointPopup entity={enemy} />);
    open();
    await screen.findByText('Wiki description');
    rerender(<MapPointPopup entity={{ ...npc, url: enemy.url ?? '', description: 'Local NPC description' }} />);
    open();
    await screen.findByText('Local NPC description');
    expect(screen.queryByText('Wiki description')).not.toBeInTheDocument();
    expect(getWikiDescription).toHaveBeenCalledTimes(1);
    expect(getWikiImage).toHaveBeenCalledTimes(2);
  });
});

it.each([{ part: 2, totalParts: 10, expected: 'Codex entry 2/10' }, { expected: 'Codex entry' }])(
  'shows the Codex title with optional part numbers: %j',
  ({ expected, ...parts }) => {
    render(
      <MapPointPopup
        entity={{
          id: enemy.id,
          type: MapEntityType.Codex,
          title: 'Codex entry',
          position: enemy.position,
          ...parts,
        }}
      />
    );
    expect(screen.getByText(expected)).toHaveClass('map-entity-tooltip__title');
    open();
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(getWikiImage).not.toHaveBeenCalled();
  }
);

describe('Codex wiki popups', () => {
  const codex: MapPointEntity = {
    id: enemy.id,
    type: MapEntityType.Codex,
    title: 'Codex entry',
    description: 'Local Codex text',
    url: 'https://darkdevotion.fandom.com/wiki/Initiation#Initiation,_1/4',
    position: enemy.position,
  };

  it.each([undefined, 1])('loads text lazily with part %j and no image request or placeholder', async (part) => {
    render(<MapPointPopup entity={{ ...codex, ...(part === undefined ? {} : { part, totalParts: 4 }) }} />);
    expect(getWikiCodexDescription).not.toHaveBeenCalled();
    open();
    expect(screen.getByText('Loading wiki data…')).toBeInTheDocument();
    expect(screen.queryByText('Local Codex text')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading image…')).not.toBeInTheDocument();
    expect(await screen.findByText('Wiki Codex text')).toBeInTheDocument();
    expect(getWikiCodexDescription).toHaveBeenCalledWith(
      'Initiation',
      part,
      part === undefined ? undefined : 4,
      'Initiation,_1/4'
    );
    expect(getWikiDescription).not.toHaveBeenCalled();
    expect(getWikiImage).not.toHaveBeenCalled();
    open();
    expect(getWikiCodexDescription).toHaveBeenCalledTimes(1);
  });

  it.each(['missing', 'error'])('uses local description for %s wiki text', async (outcome) => {
    if (outcome === 'error') {
      vi.mocked(getWikiCodexDescription).mockRejectedValue(new Error('Missing section'));
    } else {
      vi.mocked(getWikiCodexDescription).mockResolvedValue(null);
    }

    render(<MapPointPopup entity={codex} />);
    open();
    expect(await screen.findByText('Local Codex text')).toBeInTheDocument();
  });

  it('caches distinct parts separately and reuses a previously loaded part', async () => {
    vi.mocked(getWikiCodexDescription).mockImplementation(async (_page, part) => `Part ${part}`);
    const { rerender } = render(<MapPointPopup entity={{ ...codex, part: 1, totalParts: 4 }} />);
    open();
    await screen.findByText('Part 1');
    vi.spyOn(popup, 'isOpen').mockReturnValue(true);
    rerender(<MapPointPopup entity={{ ...codex, part: 2, totalParts: 4 }} />);
    await screen.findByText('Part 2');
    rerender(<MapPointPopup entity={{ ...codex, part: 1, totalParts: 4, title: 'New title' }} />);
    await screen.findByText('Part 1');
    expect(getWikiCodexDescription).toHaveBeenCalledTimes(2);
  });

  it('ignores an obsolete response after changing parts', async () => {
    let resolveOld!: (text: string) => void;
    vi.mocked(getWikiCodexDescription).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    const { rerender } = render(<MapPointPopup entity={{ ...codex, part: 1, totalParts: 4 }} />);
    open();
    rerender(<MapPointPopup entity={{ ...codex, part: 2, totalParts: 4 }} />);
    open();
    await screen.findByText('Wiki Codex text');
    await act(async () => {
      resolveOld('Obsolete part text');
    });
    expect(screen.queryByText('Obsolete part text')).not.toBeInTheDocument();
  });

  it.each(['disabled', 'unrelated'])('keeps local text when wiki integration is %s', (reason) => {
    if (reason === 'disabled') {
      vi.stubEnv('VITE_WIKI_API_URL', '');
    }

    render(
      <MapPointPopup
        entity={{ ...codex, url: reason === 'unrelated' ? 'https://example.com/codex' : (codex.url ?? '') }}
      />
    );
    open();
    expect(screen.getByText('Local Codex text')).toBeInTheDocument();
    expect(getWikiCodexDescription).not.toHaveBeenCalled();
  });
});

it('reloads Codex text when totalParts changes and reuses the previous pair', async () => {
  const entity: MapPointEntity = {
    id: enemy.id,
    type: MapEntityType.Codex,
    title: 'Entry',
    url: 'https://darkdevotion.fandom.com/wiki/Example',
    position: enemy.position,
    part: 1,
    totalParts: 4,
  };
  vi.mocked(getWikiCodexDescription).mockImplementation(
    async (_page, part, totalParts) => `Text ${part}/${totalParts}`
  );
  const { rerender } = render(<MapPointPopup entity={entity} />);
  open();
  await screen.findByText('Text 1/4');
  vi.spyOn(popup, 'isOpen').mockReturnValue(true);
  rerender(<MapPointPopup entity={{ ...entity, totalParts: 7 }} />);
  await screen.findByText('Text 1/7');
  rerender(<MapPointPopup entity={entity} />);
  await screen.findByText('Text 1/4');
  expect(getWikiCodexDescription).toHaveBeenCalledTimes(2);
});

it('reloads Codex text for a changed URL anchor and caches each anchor independently', async () => {
  const entity: MapPointEntity = {
    ...enemy,
    type: MapEntityType.Codex,
    part: 1,
    totalParts: 4,
    url: 'https://darkdevotion.fandom.com/wiki/Initiation#Initiation,_1/4',
  };
  vi.mocked(getWikiCodexDescription).mockImplementation(async (_page, _part, _total, anchor) => anchor ?? 'Template');
  const { rerender } = render(<MapPointPopup entity={entity} />);
  open();
  expect(await screen.findByText('Initiation,_1/4')).toBeInTheDocument();
  rerender(
    <MapPointPopup entity={{ ...entity, url: 'https://darkdevotion.fandom.com/wiki/Initiation#Initiation,_2/4' }} />
  );
  open();
  expect(await screen.findByText('Initiation,_2/4')).toBeInTheDocument();
  rerender(<MapPointPopup entity={entity} />);
  open();
  expect(await screen.findByText('Initiation,_1/4')).toBeInTheDocument();
  expect(getWikiCodexDescription).toHaveBeenCalledTimes(2);
});
