import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as wikiApi from 'src/api/wiki';
import { AddPointDialog } from 'src/components/AddPointDialog';
import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import { MapPlaceTabletType } from 'src/types/MapPlaceTabletType';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import { MapPlaceType } from 'src/types/MapPlaceType';

beforeEach(() => {
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
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

const initial = { description: 'Existing description', url: 'https://example.com/original' };

it.each([false, true])(
  'creates and edits optional Codex group, clears it and drops it on category changes (editing=%s)',
  async (editing) => {
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing={editing}
        initialDetails={{ type: MapEntityType.Codex, title: 'Entry', ...(editing ? { group: 'Records' } : {}) }}
        position={{ x: 1, y: 2 }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const user = userEvent.setup();
    const group = screen.getByLabelText('Group');
    const submit = screen.getByRole('button', { name: editing ? 'Save' : 'Add' });
    expect(group).not.toBeRequired();
    expect(group).toHaveValue(editing ? 'Records' : '');
    expect(screen.getByLabelText('Title').closest('label')).toHaveClass('point-dialog__codex-title');
    expect(group.closest('label')).toHaveClass('point-dialog__codex-group');
    await user.clear(group);
    await user.type(group, '  Temple records  ');
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0].group).toBe('Temple records');
    await user.clear(group);
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).not.toHaveProperty('group');
    await user.type(group, 'Discard this group');
    await user.selectOptions(screen.getByLabelText('Type'), 'npc');
    expect(screen.queryByLabelText('Group')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), 'codex');
    expect(screen.getByLabelText('Group')).toHaveValue('');
  }
);

function setup(editing: boolean) {
  const onAdd = vi.fn();
  const onCancel = vi.fn();

  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      editing={editing}
      initialDetails={{ title: 'Test point', type: MapEntityType.Npc, ...(editing ? initial : {}) }}
      onAdd={onAdd}
      onCancel={onCancel}
    />
  );

  return {
    onAdd,
    onCancel,
    user: userEvent.setup(),
    submit: screen.getByRole('button', { name: editing ? 'Save' : 'Add' }),
  };
}

describe('Point metadata form', () => {
  it.each([false, true])(
    'checks wiki URLs and blocks submission until a page is found (editing=%s)',
    async (editing) => {
      vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
      vi.useFakeTimers();
      const check = vi.spyOn(wikiApi, 'wikiPageExists').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const { onAdd, submit } = setup(editing);
      const input = screen.getByLabelText('URL');
      const checkbox = screen.getByRole('checkbox', { name: 'Wiki Page' });
      expect(checkbox).toBeDisabled();
      expect(checkbox).not.toBeChecked();
      fireEvent.change(input, { target: { value: 'https://darkdevotion.fandom.com/wiki/Missing' } });
      expect(checkbox).toBeChecked();
      expect(submit).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent('Checking wiki page');
      const form = submit.closest('form');

      if (!form) {
        throw new Error('Expected a form.');
      }

      fireEvent.submit(form);
      expect(onAdd).not.toHaveBeenCalled();
      await act(() => vi.advanceTimersByTimeAsync(500));
      expect(check).toHaveBeenCalledOnce();
      expect(screen.getByRole('alert')).toHaveTextContent('Wiki page not found');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(submit).toBeDisabled();
      fireEvent.submit(form);
      expect(onAdd).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: 'https://darkdevotion.fandom.com/wiki/Existing' } });
      await act(() => vi.advanceTimersByTimeAsync(500));
      expect(submit).toBeEnabled();
      expect(screen.getByRole('status')).toHaveTextContent('Wiki page found');
      fireEvent.submit(form);
      const metadata = onAdd.mock.calls[0]?.[0];
      expect(metadata.url).toBe('https://darkdevotion.fandom.com/wiki/Existing');
      expect(metadata).not.toHaveProperty('hasWikiPage');
    }
  );

  it.each([false, true])('requires a title and trims it on submission (editing=%s)', async (editing) => {
    const { onAdd, user, submit } = setup(editing);
    const title = screen.getByLabelText('Title');
    expect(title).toBeRequired();
    expect(title).toHaveValue('Test point');
    await user.clear(title);
    await user.click(submit);
    expect(onAdd).not.toHaveBeenCalled();
    await user.type(title, '   ');
    await user.click(submit);
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/title/i);
    await user.clear(title);
    await user.type(title, '  Updated title  ');
    await user.click(submit);

    expect(onAdd).toHaveBeenCalledOnce();
    expect(onAdd.mock.calls[0]?.[0].title).toBe('Updated title');
  });

  it.each([false, true])('validates URL live and submits metadata (editing=%s)', async (editing) => {
    const { onAdd, user, submit } = setup(editing);
    const description = screen.getByLabelText('Description');
    const url = screen.getByLabelText('URL');
    expect(description).toHaveAttribute('rows', '5');
    expect(description).toHaveValue(editing ? initial.description : '');
    expect(url).toHaveValue(editing ? initial.url : '');
    await user.clear(description);
    await user.type(description, 'First line{Enter}Second line');
    await user.clear(url);
    await user.type(url, '/relative');
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(submit).toBeDisabled();
    const form = submit.closest('form');

    if (!form) {
      throw new Error('Expected a form');
    }

    fireEvent.submit(form);
    expect(onAdd).not.toHaveBeenCalled();
    await user.clear(url);
    expect(url).toHaveAttribute('aria-invalid', 'false');
    expect(submit).toBeEnabled();
    await user.type(url, 'https://example.com/new?x=1#part');
    expect(url).toHaveAttribute('aria-invalid', 'false');
    await user.click(submit);
    const metadata = onAdd.mock.calls[0]?.[0];
    expect(metadata).toMatchObject({ description: 'First line\nSecond line', url: 'https://example.com/new?x=1#part' });
  });

  it('clears existing metadata to empty strings', async () => {
    const { onAdd, user, submit } = setup(true);
    await user.clear(screen.getByLabelText('Description'));
    await user.clear(screen.getByLabelText('URL'));
    await user.click(submit);
    const metadata = onAdd.mock.calls[0]?.[0];
    expect(metadata).toMatchObject({ description: '', url: '' });
  });

  it('allows cancellation with an invalid URL without submitting', async () => {
    const { onAdd, onCancel, user } = setup(true);
    await user.clear(screen.getByLabelText('URL'));
    await user.type(screen.getByLabelText('URL'), 'invalid');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe('Place creation details', () => {
  it.each([
    ...Object.values(MapPlaceAltarType).map((altarType) => ({
      placeType: 'altar',
      field: 'Altar type',
      value: altarType,
      details: { altarType },
    })),
    ...Object.values(MapPlaceTabletType).map((tabletType) => ({
      placeType: 'tablet',
      field: 'Tablet type',
      value: tabletType,
      details: { tabletType },
    })),
  ])('creates $placeType with subtype $value', async ({ placeType, field, value, details }) => {
    const { onAdd, user, submit } = setup(false);
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    await user.selectOptions(screen.getByLabelText('Place type'), placeType);
    await user.selectOptions(screen.getByLabelText(field), value);

    await user.click(submit);

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({ type: 'place', placeType, ...details }, { x: 10, y: 20 });
  });

  it('distinguishes omitted faith cost from zero and clears it without introducing a default', async () => {
    const { onAdd, user, submit } = setup(false);
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    await user.selectOptions(screen.getByLabelText('Place type'), 'altar');
    const cost = screen.getByLabelText('Faith cost');
    expect(cost).toHaveValue(null);
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).not.toHaveProperty('faithCost');
    await user.type(cost, '0');
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).toHaveProperty('faithCost', 0);
    await user.clear(cost);
    await user.type(cost, '12.5');
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).toHaveProperty('faithCost', 12.5);
    await user.clear(cost);
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).not.toHaveProperty('faithCost');
  });

  it('drops fields belonging to the previous place subtype or point category', async () => {
    const { onAdd, user, submit } = setup(false);
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    expect(screen.getByLabelText('Tablet type')).toHaveValue('faith');
    await user.selectOptions(screen.getByLabelText('Place type'), 'altar');
    expect(screen.queryByLabelText('Tablet type')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Altar type')).toHaveValue('runic-altar');
    await user.type(screen.getByLabelText('Faith cost'), '25');
    await user.selectOptions(screen.getByLabelText('Place type'), 'tablet');
    expect(screen.queryByLabelText('Faith cost')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Tablet type'), 'damage');
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).toEqual({
      type: 'place',
      placeType: 'tablet',
      tabletType: 'damage',
    });

    for (const placeType of ['lost-room', 'mirror-teleporter']) {
      await user.selectOptions(screen.getByLabelText('Place type'), placeType);
      expect(screen.queryByLabelText('Tablet type')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Altar type')).not.toBeInTheDocument();

      await user.click(submit);
      expect(onAdd.mock.lastCall?.[0]).toEqual({
        type: 'place',
        placeType,
      });
    }

    await user.selectOptions(screen.getByLabelText('Type'), 'npc');
    await user.type(screen.getByLabelText('Title'), 'Test point');
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).toEqual({ title: 'Test point', type: 'npc' });
  });
});

it.each([false, true])(
  'hides and clears Tablet fields and requires a new title after switching back (editing=%s)',
  async (editing) => {
    const { user, onAdd, submit } = setup(editing);
    const title = screen.getByLabelText('Title');
    const description = screen.getByLabelText('Description');
    expect(title.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('URL')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Wiki Page' })).not.toBeInTheDocument();
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).not.toHaveProperty('title');
    expect(onAdd.mock.lastCall?.[0]).not.toHaveProperty('description');
    expect(onAdd.mock.lastCall?.[0]).not.toHaveProperty('url');
    await user.selectOptions(screen.getByLabelText('Type'), 'npc');
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('URL')).toHaveValue('');
    onAdd.mockClear();
    await user.click(submit);
    expect(onAdd).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Title'), 'New altar');
    await user.type(screen.getByLabelText('Description'), 'New description');
    await user.selectOptions(screen.getByLabelText('Type'), 'place');
    await user.selectOptions(screen.getByLabelText('Type'), 'npc');
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  }
);

it('opens Tablet editing without metadata or wiki checks and drops legacy values on save', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
  const check = vi.spyOn(wikiApi, 'wikiPageExists');
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      editing
      position={{ x: 10, y: 20 }}
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Tablet,
        tabletType: MapPlaceTabletType.Faith,
        title: 'Legacy title',
        description: 'Legacy description',
        url: 'https://darkdevotion.fandom.com/wiki/Legacy',
      }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  const user = userEvent.setup();
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('URL')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(check).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledExactlyOnceWith(
    { type: MapEntityType.Place, placeType: MapPlaceType.Tablet, tabletType: MapPlaceTabletType.Faith },
    { x: 10, y: 20 }
  );
  await user.selectOptions(screen.getByLabelText('Type'), 'npc');
  expect(screen.getByLabelText('Title')).toHaveValue('');
  expect(screen.getByLabelText('Description')).toHaveValue('');
  expect(screen.getByLabelText('URL')).toHaveValue('');
});

it.each(
  [false, true].flatMap((editing) => [MapPlaceType.MirrorTeleporter].map((placeType) => ({ editing, placeType })))
)('hides and clears $placeType metadata in forms (editing=$editing)', async ({ editing, placeType }) => {
  const { user, onAdd, submit } = setup(editing);
  await user.selectOptions(screen.getByLabelText('Type'), 'place');
  await user.selectOptions(screen.getByLabelText('Place type'), 'altar');
  await user.type(screen.getByLabelText('Description'), 'Discard this text');
  await user.type(screen.getByLabelText('URL'), 'https://example.com/new');
  await user.selectOptions(screen.getByLabelText('Place type'), placeType);
  for (const field of ['Title', 'Description', 'URL']) {
    expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
  }
  await user.click(submit);
  expect(onAdd).toHaveBeenCalledExactlyOnceWith({ type: MapEntityType.Place, placeType }, { x: 10, y: 20 });
  await user.selectOptions(screen.getByLabelText('Place type'), 'altar');
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  for (const field of ['Description', 'URL']) {
    expect(screen.getByLabelText(field)).toHaveValue('');
  }
});

it.each([false, true])(
  'validates optional LostRoom metadata and places wiki status beside the checkbox (editing=%s)',
  async (editing) => {
    vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
    vi.useFakeTimers();
    vi.spyOn(wikiApi, 'wikiPageExists')
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(true);
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing={editing}
        initialDetails={{ type: MapEntityType.Place, placeType: MapPlaceType.LostRoom }}
        position={{ x: 10, y: 20 }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const url = screen.getByLabelText('URL');
    const description = screen.getByLabelText('Description');
    const submit = screen.getByRole('button', { name: editing ? 'Save' : 'Add' });
    expect(description).not.toBeRequired();
    expect(url).not.toBeRequired();
    fireEvent.change(description, { target: { value: 'Room description' } });
    fireEvent.change(url, { target: { value: 'https://darkdevotion.fandom.com/wiki/Lost_Room' } });
    expect(submit).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(500));
    const missing = screen.getByRole('alert');
    expect(missing).toHaveTextContent('Wiki page not found');
    expect(missing).toHaveClass('point-dialog__wiki-status--warning');
    expect(missing.parentElement).toContainElement(screen.getByRole('checkbox', { name: 'Wiki Page' }));
    expect(url).toHaveAttribute('aria-describedby', missing.id);
    fireEvent.change(url, { target: { value: 'https://darkdevotion.fandom.com/wiki/Another_Room' } });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByRole('alert')).toHaveClass('point-dialog__wiki-status--error');
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByRole('status')).toHaveTextContent('Wiki page found');
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(
      {
        type: 'place',
        placeType: 'lost-room',
        description: 'Room description',
        url: 'https://darkdevotion.fandom.com/wiki/Another_Room',
      },
      { x: 10, y: 20 }
    );
  }
);

it.each([false, true])(
  'supports an optional LostRoom title and clears it when switching to a hidden-title subtype (editing=%s)',
  async (editing) => {
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing={editing}
        initialDetails={{
          type: MapEntityType.Place,
          placeType: MapPlaceType.LostRoom,
          ...(editing ? { title: 'Quiet chamber' } : {}),
        }}
        position={{ x: 10, y: 20 }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const user = userEvent.setup();
    const title = screen.getByLabelText('Title');
    const submit = screen.getByRole('button', { name: editing ? 'Save' : 'Add' });
    expect(title).not.toBeRequired();
    expect(title).toHaveValue(editing ? 'Quiet chamber' : '');
    expect(screen.getByLabelText('Description')).not.toBeRequired();
    expect(screen.getByLabelText('URL')).not.toBeRequired();
    await user.clear(title);
    await user.type(title, '  Quiet chamber  ');
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).toEqual({ type: 'place', placeType: 'lost-room', title: 'Quiet chamber' });
    await user.clear(title);
    await user.click(submit);
    expect(onAdd.mock.lastCall?.[0]).toEqual({ type: 'place', placeType: 'lost-room' });
    await user.type(title, 'Discard this name');
    await user.selectOptions(screen.getByLabelText('Place type'), 'tablet');
    await user.selectOptions(screen.getByLabelText('Place type'), 'lost-room');
    expect(screen.getByLabelText('Title')).toHaveValue('');
  }
);

it.each([false, true])(
  'omits Altar title while preserving editable metadata and cost (editing=%s)',
  async (editing) => {
    const onAdd = vi.fn();
    const initialDetails = {
      type: MapEntityType.Place as const,
      placeType: MapPlaceType.Altar as const,
      altarType: MapPlaceAltarType.RunicAltar,
      title: 'Legacy title',
      description: 'Altar description',
      url: 'https://example.com/altar',
      faithCost: 5,
    };
    render(
      <AddPointDialog
        editing={editing}
        position={{ x: 10, y: 20 }}
        initialDetails={initialDetails}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const user = userEvent.setup();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveValue('Altar description');
    expect(screen.getByLabelText('URL')).toHaveValue(initialDetails.url);
    await user.selectOptions(screen.getByLabelText('Altar type'), MapPlaceAltarType.HealingStatue);
    await user.click(screen.getByRole('button', { name: editing ? 'Save' : 'Add' }));
    expect(onAdd).toHaveBeenCalledExactlyOnceWith(
      {
        type: MapEntityType.Place,
        placeType: MapPlaceType.Altar,
        altarType: MapPlaceAltarType.HealingStatue,
        description: initialDetails.description,
        url: initialDetails.url,
        faithCost: 5,
      },
      { x: 10, y: 20 }
    );
    await user.selectOptions(screen.getByLabelText('Type'), 'npc');
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue(initialDetails.description);
    expect(screen.getByLabelText('URL')).toHaveValue(initialDetails.url);
  }
);

describe('Codex forms', () => {
  it('creates a Codex with default library status and unchanged shared fields', () => {
    const onAdd = vi.fn();
    render(<AddPointDialog position={{ x: 10, y: 20 }} onAdd={onAdd} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'codex' } });
    expect(screen.getByLabelText('Saved to library')).not.toBeChecked();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Entry' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Description' } });
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://example.com/entry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledWith(
      {
        type: MapEntityType.Codex,
        title: 'Entry',
        description: 'Description',
        url: 'https://example.com/entry',
        isSavedToLibrary: false,
      },
      { x: 10, y: 20 }
    );
  });

  it('validates both parts together and prevents saving inconsistent values', () => {
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        position={{ x: 10, y: 20 }}
        initialDetails={{ type: MapEntityType.Codex, title: 'Entry' }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const add = screen.getByRole('button', { name: 'Add' });
    fireEvent.change(screen.getByLabelText('Part'), { target: { value: '2' } });
    expect(add).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter both');
    fireEvent.change(screen.getByLabelText('Total parts'), { target: { value: '1' } });
    expect(add).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('cannot exceed');
    fireEvent.change(screen.getByLabelText('Total parts'), { target: { value: '2' } });
    expect(add).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Saved to library'));
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ part: 2, totalParts: 2, isSavedToLibrary: true }), {
      x: 10,
      y: 20,
    });
  });

  it('edits existing values, can remove both parts and drops Codex fields after a category switch', () => {
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing
        position={{ x: 10, y: 20 }}
        initialDetails={{ type: MapEntityType.Codex, title: 'Entry', isSavedToLibrary: true, part: 1, totalParts: 2 }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Part')).toHaveValue(1);
    expect(screen.getByLabelText('Total parts')).toHaveValue(2);
    expect(screen.getByLabelText('Saved to library')).toBeChecked();
    fireEvent.change(screen.getByLabelText('Part'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Total parts'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onAdd).toHaveBeenLastCalledWith(
      { type: MapEntityType.Codex, title: 'Entry', isSavedToLibrary: true },
      { x: 10, y: 20 }
    );
    fireEvent.change(screen.getByLabelText('Part'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'npc' } });
    expect(screen.queryByLabelText('Part')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onAdd).toHaveBeenLastCalledWith({ type: MapEntityType.Npc, title: 'Entry' }, { x: 10, y: 20 });
  });
});

const enemySuggestions: readonly MapEntity[] = [
  {
    id: 'enemy-a',
    type: MapEntityType.Enemy,
    isBoss: false,
    title: 'Temple Guard',
    description: 'Guard description',
    url: 'https://example.com/guard',
    position: { x: 1, y: 2 },
  },
  {
    id: 'enemy-duplicate',
    type: MapEntityType.Enemy,
    isBoss: false,
    title: 'Temple Guard',
    description: 'Duplicate',
    position: { x: 3, y: 4 },
  },
  {
    id: 'enemy-b',
    type: MapEntityType.Enemy,
    isBoss: false,
    title: 'Temple Archer',
    position: { x: 5, y: 6 },
  },
  {
    id: 'boss',
    type: MapEntityType.Enemy,
    isBoss: true,
    title: 'Temple Boss',
    position: { x: 1, y: 2 },
  },
  { id: 'npc', type: MapEntityType.Npc, title: 'Temple NPC', position: { x: 1, y: 2 } },
];

function editRegularEnemy() {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(
    <AddPointDialog
      editing
      initialDetails={{ type: MapEntityType.Enemy, isBoss: false, title: 'Original', ...initial }}
      suggestionEntities={enemySuggestions}
      position={{ x: 10, y: 20 }}
      onAdd={onAdd}
      onCancel={onCancel}
    />
  );

  return { user: userEvent.setup(), onAdd, onCancel };
}

it('suggests unique matching regular enemies and copies their metadata before saving', async () => {
  const { user, onAdd } = editRegularEnemy();
  const title = screen.getByRole('combobox', { name: 'Title' });
  expect(title).toHaveAttribute('autocomplete', 'off');
  expect(screen.getByLabelText('Description')).toHaveAttribute('autocomplete', 'off');
  expect(screen.getByLabelText('URL', { exact: true })).toHaveAttribute('autocomplete', 'off');
  await user.clear(title);
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  await user.type(title, 'tEmPlE');
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2);
  expect(screen.queryByRole('option', { name: 'Temple Boss' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Temple NPC' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: 'Temple Guard' }));
  expect(title).toHaveValue('Temple Guard');
  expect(screen.getByLabelText('Description')).toHaveValue('Guard description');
  expect(screen.getByLabelText('URL', { exact: true })).toHaveValue('https://example.com/guard');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(onAdd).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledWith(
    {
      type: MapEntityType.Enemy,
      isBoss: false,
      isElite: false,
      title: 'Temple Guard',
      description: 'Guard description',
      url: 'https://example.com/guard',
    },
    { x: 10, y: 20 }
  );
});

it('selects a suggestion with the keyboard and clears absent metadata', async () => {
  const { user, onAdd } = editRegularEnemy();
  const title = screen.getByRole('combobox', { name: 'Title' });
  await user.clear(title);
  await user.type(title, 'arch');
  await user.keyboard('{ArrowDown}{Enter}');
  expect(title).toHaveValue('Temple Archer');
  expect(title).toHaveFocus();
  expect(screen.getByLabelText('Description')).toHaveValue('');
  expect(screen.getByLabelText('URL', { exact: true })).toHaveValue('');
  expect(onAdd).not.toHaveBeenCalled();
});

it('dismisses suggestions with Escape or blur and disables them for bosses', async () => {
  const { user, onCancel } = editRegularEnemy();
  const title = screen.getByRole('combobox', { name: 'Title' });
  await user.clear(title);
  await user.type(title, 'temple');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(onCancel).not.toHaveBeenCalled();
  await user.keyboard('{ArrowUp}');
  expect(screen.getByRole('option', { name: 'Temple Archer' })).toHaveAttribute('aria-selected', 'true');
  await user.tab();
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  await user.click(screen.getByLabelText('Boss', { exact: true }));
  expect(screen.queryByRole('combobox', { name: 'Title' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('temple');
});

it('offers suggestions in regular enemy creation forms', async () => {
  render(
    <AddPointDialog
      initialDetails={{ type: MapEntityType.Enemy, isBoss: false }}
      suggestionEntities={enemySuggestions}
      position={{ x: 1, y: 2 }}
      onAdd={vi.fn()}
      onCancel={vi.fn()}
    />
  );
  const user = userEvent.setup();
  const title = screen.getByRole('combobox', { name: 'Title' });
  expect(title).toHaveAttribute('autocomplete', 'off');
  await user.type(title, 'guard');
  await user.click(screen.getByRole('option', { name: 'Temple Guard' }));
  expect(title).toHaveValue('Temple Guard');
  expect(screen.getByLabelText('Description')).toHaveValue('Guard description');
});

it('disables Boss for Elite enemies and disables Elite for bosses', async () => {
  const { user, onAdd } = editRegularEnemy();
  const elite = screen.getByLabelText('Elite', { exact: true });
  const boss = screen.getByLabelText('Boss', { exact: true });
  expect(elite).not.toBeChecked();
  expect(boss).toBeEnabled();
  await user.click(elite);
  expect(elite).toBeChecked();
  expect(boss).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ isElite: true, isBoss: false }), expect.anything());
  await user.click(elite);
  await user.click(boss);
  expect(elite).toBeDisabled();
  expect(boss).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ isElite: false, isBoss: true }), expect.anything());
});

it('restores Elite when editing an existing enemy', () => {
  render(
    <AddPointDialog
      editing
      initialDetails={{ type: MapEntityType.Enemy, isBoss: false, isElite: true, title: 'Elite guard' }}
      position={{ x: 1, y: 2 }}
      onAdd={vi.fn()}
      onCancel={vi.fn()}
    />
  );
  expect(screen.getByLabelText('Elite', { exact: true })).toBeChecked();
  expect(screen.getByLabelText('Boss', { exact: true })).toBeDisabled();
});

it('requires Faith Lock cost and omits it when switching to another blocker subtype', async () => {
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Blocker,
        blockerType: MapPlaceBlockerType.CrackedWall,
      }}
      position={{ x: 10, y: 20 }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  const user = userEvent.setup();
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Faith cost')).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Blocker type'), 'faith-lock');
  const cost = screen.getByLabelText('Faith cost');
  expect(cost).toBeRequired();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).not.toHaveBeenCalled();
  await user.type(cost, '0');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenLastCalledWith(
    {
      type: MapEntityType.Place,
      placeType: MapPlaceType.Blocker,
      blockerType: MapPlaceBlockerType.FaithLock,
      faithCost: 0,
    },
    { x: 10, y: 20 }
  );
  await user.selectOptions(screen.getByLabelText('Blocker type'), 'door');
  expect(screen.queryByLabelText('Faith cost')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenLastCalledWith(
    { type: MapEntityType.Place, placeType: MapPlaceType.Blocker, blockerType: MapPlaceBlockerType.Door },
    { x: 10, y: 20 }
  );
});

it('initializes Faith Lock editing with the existing subtype and cost', async () => {
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      editing
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Blocker,
        blockerType: MapPlaceBlockerType.FaithLock,
        faithCost: 25,
        description: 'Locked gate',
      }}
      position={{ x: 10, y: 20 }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  expect(screen.getByLabelText('Blocker type')).toHaveValue('faith-lock');
  expect(screen.getByLabelText('Faith cost')).toHaveValue(25);
  expect(screen.getByLabelText('Description')).toHaveValue('Locked gate');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ blockerType: MapPlaceBlockerType.FaithLock, faithCost: 25 }),
    { x: 10, y: 20 }
  );
});

it('switches from Faith Lock to Trap without retaining its subtype or Faith cost', async () => {
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Blocker,
        blockerType: MapPlaceBlockerType.FaithLock,
        faithCost: 25,
      }}
      position={{ x: 10, y: 20 }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Place type'), 'trap');
  expect(screen.getByLabelText('Trap type')).toHaveValue('spear');
  expect(screen.queryByLabelText('Blocker type')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Faith cost')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Description')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Trap type'), 'stalagtight');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenLastCalledWith(
    { type: MapEntityType.Place, placeType: MapPlaceType.Trap, trapType: MapPlaceTrapType.Stalagtight },
    { x: 10, y: 20 }
  );
  await user.selectOptions(screen.getByLabelText('Place type'), 'blocker');
  await user.selectOptions(screen.getByLabelText('Blocker type'), 'tree-trunk');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenLastCalledWith(
    { type: MapEntityType.Place, placeType: MapPlaceType.Blocker, blockerType: MapPlaceBlockerType.TreeTrunk },
    { x: 10, y: 20 }
  );
});

it('initializes trap editing with its current subtype and preserves metadata', async () => {
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      editing
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Trap,
        trapType: MapPlaceTrapType.BloodExplosion,
        description: 'Blood trap',
      }}
      position={{ x: 10, y: 20 }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  expect(screen.getByLabelText('Trap type')).toHaveValue('blood-explosion');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledWith(
    {
      type: MapEntityType.Place,
      placeType: MapPlaceType.Trap,
      trapType: MapPlaceTrapType.BloodExplosion,
      description: 'Blood trap',
    },
    { x: 10, y: 20 }
  );
});

it('saves Chest variants as numbers and omits them when switching to Lever', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      editing
      initialDetails={{ type: MapEntityType.Place, placeType: MapPlaceType.Chest, variant: 3 }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  expect(
    screen.getByRole('combobox', { name: 'Variant' }).closest('form')?.querySelector('input[name="variant"]')
  ).toHaveValue('3');
  await user.click(screen.getByRole('combobox', { name: 'Variant' }));
  await user.click(screen.getByRole('option', { name: '5' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ placeType: MapPlaceType.Chest, variant: 5 }), {
    x: 10,
    y: 20,
  });
  await user.selectOptions(screen.getByLabelText('Place type'), MapPlaceType.Switch);
  await user.selectOptions(screen.getByLabelText('Switch type'), 'lever');
  expect(screen.queryByRole('combobox', { name: 'Variant' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ placeType: MapPlaceType.Switch }));
  expect(onAdd.mock.calls.at(-1)?.[0]).not.toHaveProperty('variant');
});

it('creates a Chest with required variant 1 by default', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<AddPointDialog position={{ x: 10, y: 20 }} onAdd={onAdd} onCancel={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText('Type'), MapEntityType.Place);
  await user.selectOptions(screen.getByLabelText('Place type'), MapPlaceType.Chest);
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ placeType: MapPlaceType.Chest, variant: 1 }), {
    x: 10,
    y: 20,
  });
});

it('saves Button fields and removes the Chest variant when switching Place type', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      editing
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Chest,
        variant: 3,
        description: 'Button details',
        url: 'https://example.com/button',
      }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  await user.selectOptions(screen.getByLabelText('Place type'), MapPlaceType.Switch);
  await user.selectOptions(screen.getByLabelText('Switch type'), 'button');
  expect(screen.queryByRole('combobox', { name: 'Variant' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledWith(
    {
      type: MapEntityType.Place,
      placeType: MapPlaceType.Switch,
      switchType: MapPlaceSwitchType.Button,
      description: 'Button details',
      url: 'https://example.com/button',
    },
    { x: 10, y: 20 }
  );
});

it.each([MapPlaceType.PrisonCell])('saves %s metadata without unrelated Place fields', async (placeType) => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      editing
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Chest,
        variant: 3,
        description: 'Prison details',
        url: 'https://example.com/prison',
      }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  await user.selectOptions(screen.getByLabelText('Place type'), placeType);
  expect(screen.queryByRole('combobox', { name: 'Variant' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledWith(
    { type: MapEntityType.Place, placeType, description: 'Prison details', url: 'https://example.com/prison' },
    { x: 10, y: 20 }
  );
});

it('edits Prison Key items with an optional title and keeps their item subtype', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      editing
      initialDetails={{
        type: MapEntityType.Item,
        itemType: MapItemType.PrisonKey,
        title: 'Prison Key',
        description: 'Cell key',
      }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  expect(screen.getByLabelText('Item type')).toHaveValue(MapItemType.PrisonKey);
  const title = screen.getByLabelText('Title');
  expect(title).not.toBeRequired();
  await user.clear(title);
  await user.type(title, 'Cell Key');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({
      type: MapEntityType.Item,
      itemType: MapItemType.PrisonKey,
      title: 'Cell Key',
      description: 'Cell key',
    }),
    { x: 10, y: 20 }
  );
});

it.each([false, true])(
  'saves Prison Keys without titles and updates title requirements when switching subtype (editing=%s)',
  async (editing) => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        position={{ x: 10, y: 20 }}
        editing={editing}
        initialDetails={{ type: MapEntityType.Item, itemType: MapItemType.PrisonKey, description: 'Cell key' }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const title = screen.getByLabelText('Title');
    expect(title).not.toBeRequired();
    expect(title).toHaveValue('');
    await user.type(title, '   ');
    const submit = screen.getByRole('button', { name: editing ? 'Save' : 'Add' });
    await user.click(submit);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: MapEntityType.Item, itemType: MapItemType.PrisonKey, description: 'Cell key' }),
      { x: 10, y: 20 }
    );
    expect(onAdd.mock.calls.at(-1)?.[0]).not.toHaveProperty('title');
    onAdd.mockClear();
    await user.selectOptions(screen.getByLabelText('Item type'), MapItemType.Weapon);
    expect(title).toBeRequired();
    await user.click(submit);
    expect(onAdd).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Item type'), MapItemType.PrisonKey);
    expect(title).not.toBeRequired();
    await user.click(submit);
    expect(onAdd).toHaveBeenCalled();
  }
);

it('hides and clears Title for Arrows while retaining other metadata', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      initialDetails={{
        type: MapEntityType.Item,
        itemType: MapItemType.Weapon,
        title: 'Old title',
        description: 'Ammo',
      }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  await user.selectOptions(screen.getByLabelText('Item type'), MapItemType.Arrows);
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ itemType: MapItemType.Arrows, description: 'Ammo' }), {
    x: 10,
    y: 20,
  });
  expect(onAdd.mock.calls.at(-1)?.[0]).not.toHaveProperty('title');
  await user.selectOptions(screen.getByLabelText('Item type'), MapItemType.Weapon);
  expect(screen.getByLabelText('Title')).toHaveValue('');
  expect(screen.getByLabelText('Title')).toBeRequired();
});

it('creates Title points with default styling and accepts native color selection', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<AddPointDialog position={{ x: 10, y: 20 }} onAdd={onAdd} onCancel={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText('Type'), 'title');
  expect(screen.getByLabelText('Font size')).toHaveValue('medium');
  expect(screen.getByLabelText('Color')).toHaveAttribute('type', 'color');
  expect(screen.getByLabelText('Color')).toHaveValue('#c5bfb2');
  expect(screen.getByLabelText('Title')).toBeRequired();
  await user.type(screen.getByLabelText('Title'), 'Temple');
  await user.selectOptions(screen.getByLabelText('Font size'), 'huge');
  fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#123456' } });
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'title', title: 'Temple', size: 'huge', color: '#123456' }),
    { x: 10, y: 20 }
  );
  await user.selectOptions(screen.getByLabelText('Type'), MapEntityType.Npc);
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd.mock.calls.at(-1)?.[0]).not.toHaveProperty('color');
  expect(onAdd.mock.calls.at(-1)?.[0]).not.toHaveProperty('size');
});

it('offers Slumping Floor without a Title field and saves its trap subtype', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      initialDetails={{ type: MapEntityType.Place, placeType: MapPlaceType.Trap, trapType: MapPlaceTrapType.Spear }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  await user.selectOptions(screen.getByLabelText('Trap type'), MapPlaceTrapType.SlumpingFloor);
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenCalledWith(
    { type: MapEntityType.Place, placeType: MapPlaceType.Trap, trapType: MapPlaceTrapType.SlumpingFloor },
    { x: 10, y: 20 }
  );
});

it.each([MapPlaceAltarType.TeleportationAltar, MapPlaceAltarType.FaithStatue])(
  'hides and clears Faith cost for %s when creating and editing',
  async (altarType) => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing
        position={{ x: 10, y: 20 }}
        initialDetails={{
          type: MapEntityType.Place,
          placeType: MapPlaceType.Altar,
          altarType: MapPlaceAltarType.RunicAltar,
          faithCost: 25,
        }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    await user.selectOptions(screen.getByLabelText('Altar type'), altarType);
    expect(screen.queryByLabelText('Faith cost')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onAdd).toHaveBeenCalledWith(
      { type: MapEntityType.Place, placeType: MapPlaceType.Altar, altarType },
      { x: 10, y: 20 }
    );
    await user.selectOptions(screen.getByLabelText('Altar type'), MapPlaceAltarType.RunicAltar);
    expect(screen.getByLabelText('Faith cost')).toHaveValue(null);
  }
);

it.each([MapPlaceAltarType.TeleportationAltar, MapPlaceAltarType.FaithStatue])(
  'opens %s for editing without a legacy Faith cost',
  async (altarType) => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing
        position={{ x: 10, y: 20 }}
        initialDetails={{
          type: MapEntityType.Place,
          placeType: MapPlaceType.Altar,
          altarType,
          faithCost: 25,
          description: 'Altar details',
        }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Faith cost')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onAdd).toHaveBeenCalledWith(
      { type: MapEntityType.Place, placeType: MapPlaceType.Altar, altarType, description: 'Altar details' },
      { x: 10, y: 20 }
    );
  }
);

it('creates Blood Donation without Title and preserves its metadata', async () => {
  vi.stubEnv('VITE_WIKI_API_URL', '');
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(
    <AddPointDialog
      position={{ x: 10, y: 20 }}
      initialDetails={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Switch,
        switchType: MapPlaceSwitchType.Button,
        title: 'Old title',
        description: 'Donation details',
        url: 'https://example.com',
      }}
      onAdd={onAdd}
      onCancel={vi.fn()}
    />
  );
  await user.selectOptions(screen.getByLabelText('Place type'), MapPlaceType.Switch);
  await user.selectOptions(screen.getByLabelText('Switch type'), 'blood-donation');
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAdd).toHaveBeenCalledWith(
    {
      type: MapEntityType.Place,
      placeType: MapPlaceType.Switch,
      switchType: 'blood-donation',
      description: 'Donation details',
      url: 'https://example.com',
    },
    { x: 10, y: 20 }
  );
});

describe('NPC title suggestions', () => {
  const npcSuggestions: readonly MapEntity[] = [
    ...enemySuggestions,
    {
      id: 'npc-a',
      type: MapEntityType.Npc,
      title: 'Temple Guide',
      description: 'Other description',
      url: 'https://example.com/guide',
      position: { x: 1, y: 2 },
    },
    {
      id: 'npc-duplicate',
      type: MapEntityType.Npc,
      title: 'Temple Guide',
      url: 'https://example.com/duplicate',
      position: { x: 3, y: 4 },
    },
  ];

  it.each([false, true])('copies only NPC title and URL in creation/editing (%s)', async (editing) => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    const onAdd = vi.fn();
    render(
      <AddPointDialog
        editing={editing}
        initialDetails={{ type: MapEntityType.Npc, title: 'Original', ...initial }}
        suggestionEntities={npcSuggestions}
        position={{ x: 10, y: 20 }}
        onAdd={onAdd}
        onCancel={vi.fn()}
      />
    );
    const user = userEvent.setup();
    const title = screen.getByRole('combobox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'tEmPlE');
    expect(within(screen.getByRole('listbox', { name: 'Existing NPCs' })).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('option', { name: 'Temple Guard' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Temple Guide' }));
    expect(title).toHaveValue('Temple Guide');
    expect(screen.getByLabelText('Description')).toHaveValue(initial.description);
    expect(screen.getByLabelText('URL', { exact: true })).toHaveValue('https://example.com/guide');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: editing ? 'Save' : 'Add' }));
    expect(onAdd).toHaveBeenCalledWith(
      {
        type: MapEntityType.Npc,
        title: 'Temple Guide',
        description: initial.description,
        url: 'https://example.com/guide',
      },
      { x: 10, y: 20 }
    );
  });

  it('supports keyboard selection and clears missing NPC URLs while preserving description', async () => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    render(
      <AddPointDialog
        editing
        initialDetails={{ type: MapEntityType.Npc, title: 'Original', ...initial }}
        suggestionEntities={npcSuggestions}
        position={{ x: 10, y: 20 }}
        onAdd={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const user = userEvent.setup();
    const title = screen.getByRole('combobox', { name: 'Title' });
    await user.clear(title);
    await user.type(title, 'temple npc');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(title).toHaveValue('Temple NPC');
    expect(title).toHaveFocus();
    expect(screen.getByLabelText('URL', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue(initial.description);
  });
});

it.each([false, true])(
  'places the unsaved notice in the header and coordinates beside the form actions (editing=%s)',
  (editing) => {
    setup(editing);
    const dialog = screen.getByRole('dialog', { name: editing ? 'Edit point' : 'Add point' });
    const notice = screen.getByText('Changes stay in memory until exported.');
    expect(notice.closest('header')).toContainElement(
      within(dialog).getByRole('heading', { name: editing ? 'Edit point' : 'Add point' })
    );
    expect(notice).toHaveClass('point-dialog__notice');
    const position = screen.getByText('Position: X 10 · Y 20 px');
    expect(position.closest('footer')).toContainElement(screen.getByRole('button', { name: 'Cancel' }));
    expect(position.closest('footer')).toContainElement(screen.getByRole('button', { name: editing ? 'Save' : 'Add' }));
  }
);
