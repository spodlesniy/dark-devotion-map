import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EntityMenu } from 'src/components/EntityMenu';
import { entityTreeNodes } from 'src/helpers/entityTree';
import { parseMapEntityDatabase } from 'src/helpers/mapEntityDatabase';
import { useEntityTreeVisibility } from 'src/hooks/useEntityTreeVisibility';
import type { MapEntity } from 'src/types/MapEntity';
import { expandEntityMenu } from '../utils/expandEntityMenu';

vi.mock('src/helpers/pointIcons', () => ({ getPointIconUrl: () => '/images/entities/point/enemy/boss.png' }));
vi.mock('src/helpers/entityTree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/helpers/entityTree')>();

  return { ...actual, entityTreeNodes: vi.fn(actual.entityTreeNodes) };
});

const entities = parseMapEntityDatabase({
  schemaVersion: 2,
  entities: [
    {
      id: '11111111-0000-4000-8000-000000000000',
      type: 'enemy',
      title: 'Boss one',
      isBoss: true,
      position: { x: 1, y: 2 },
    },
    { id: '22222222-0000-4000-8000-000000000000', type: 'npc', title: 'Test NPC', position: { x: 1, y: 2 } },
    {
      id: '33333333-0000-4000-8000-000000000000',
      type: 'enemy',
      title: 'Regular one',
      isBoss: false,
      position: { x: 1, y: 2 },
    },
    {
      id: '44444444-0000-4000-8000-000000000000',
      type: 'enemy',
      title: 'Regular two',
      isBoss: false,
      position: { x: 1, y: 2 },
    },
  ],
}).entities;

function row(title: string) {
  const result = screen
    .getByText(title, { selector: '.scrolling-text__static, .tree__title' })
    .closest<HTMLElement>('.tree__row');

  if (!result) {
    throw new Error('Expected a tree row');
  }

  return result;
}

function Harness({
  onLocate = vi.fn(),
  members = entities,
}: Readonly<{ onLocate?: (entity: MapEntity) => void; members?: readonly MapEntity[] }>) {
  const { hiddenIds, visibleEntities, toggleVisibility, showOnly, showEntity, resetVisibility } =
    useEntityTreeVisibility(members);

  return (
    <>
      <output aria-label="Visible entities">{visibleEntities.map((entity) => entity.title).join(',')}</output>
      <EntityMenu
        entities={members}
        hiddenIds={hiddenIds}
        onToggleVisibility={toggleVisibility}
        onShowOnly={showOnly}
        onResetVisibility={resetVisibility}
        onLocate={(entity) => {
          showEntity(entity.id);
          onLocate(entity);
        }}
      />
    </>
  );
}

describe('Entity tree menu', () => {
  it('preserves inherited NPC visibility while a title group becomes a singleton and grows again', async () => {
    const first = entities[1] as MapEntity;
    const second = { ...first, id: '55555555-0000-4000-8000-000000000000' };
    const { rerender } = render(<Harness members={[first, second]} />);
    const user = userEvent.setup();
    await user.click(row('NPCs'));
    await user.click(screen.getByRole('button', { name: 'Hide Test NPC' }));
    expect(screen.getByLabelText('Visible entities')).toBeEmptyDOMElement();
    rerender(<Harness members={[first]} />);
    expect(screen.getByRole('button', { name: 'Test NPC' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all Test NPC' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Test NPC' }));
    expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Test NPC');
    rerender(<Harness members={[first, second]} />);
    expect(screen.getByRole('button', { name: 'Show all Test NPC' })).toHaveAttribute('aria-pressed', 'mixed');
    expect(screen.getByLabelText('Visible entities').textContent).toBe('Test NPC');
  });

  it('isolates complete branches during search without changing the query or excluding unmatched descendants', async () => {
    vi.useFakeTimers();

    try {
      render(<Harness />);
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Regular one' } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      fireEvent.click(screen.getByRole('button', { name: 'Hide Regular' }), { shiftKey: true });
      expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Regular one,Regular two');
      expect(screen.getByRole('searchbox')).toHaveValue('Regular one');
      expect(screen.getByRole('button', { name: 'Show all Enemies' })).toHaveAttribute('aria-pressed', 'mixed');
      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Boss one,Test NPC,Regular one,Regular two');
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens matching paths after debounce and retains disclosure when non-empty short input disables filtering', async () => {
    vi.useFakeTimers();

    try {
      render(<EntityMenu entities={entities} onLocate={vi.fn()} />);
      fireEvent.click(row('Enemies'));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'regular' } });
      await act(() => vi.advanceTimersByTimeAsync(299));
      expect(row('Enemies').closest('details')).not.toHaveAttribute('open');
      await act(() => vi.advanceTimersByTimeAsync(1));
      expect(row('Enemies').closest('details')).toHaveAttribute('open');
      expect(row('Regular').closest('details')).toHaveAttribute('open');
      const grouped = screen.getByRole('button', { name: 'Hide Regular one' }).closest('summary');
      expect(grouped?.closest('details')).not.toHaveAttribute('open');

      if (!grouped) {
        throw new Error('Expected grouped enemy header');
      }

      fireEvent.click(grouped);
      expect(screen.getByRole('button', { name: 'Regular one' })).toBeInTheDocument();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 're' } });
      expect(row('Enemies').closest('details')).toHaveAttribute('open');
      expect(row('Regular').closest('details')).toHaveAttribute('open');
      expect(grouped.closest('details')).toHaveAttribute('open');
      fireEvent.click(row('Regular'));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'regular' } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(row('Regular').closest('details')).toHaveAttribute('open');
      expect(grouped.closest('details')).toHaveAttribute('open');
      fireEvent.click(row('Regular'));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'r' } });
      expect(row('Regular').closest('details')).not.toHaveAttribute('open');
      expect(row('Enemies').closest('details')).toHaveAttribute('open');
    } finally {
      vi.useRealTimers();
    }
  });

  it('automatically opens a matching initially closed root list and restores defaults when the input is cleared', async () => {
    vi.useFakeTimers();

    try {
      render(<EntityMenu entities={entities} onLocate={vi.fn()} />);
      expect(row('NPCs').closest('details')).not.toHaveAttribute('open');
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(screen.getByRole('button', { name: 'Test NPC' })).toBeInTheDocument();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
      expect(row('NPCs').closest('details')).not.toHaveAttribute('open');
      expect(row('Enemies').closest('details')).toHaveAttribute('open');
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['button', 'input'])('resets search, pending debounce, disclosure, and visibility via %s', async (source) => {
    vi.useFakeTimers();

    try {
      const onLocate = vi.fn();
      render(<Harness onLocate={onLocate} />);
      expandEntityMenu();
      fireEvent.click(screen.getByRole('button', { name: 'Hide Enemies' }));
      fireEvent.click(screen.getByRole('button', { name: 'Regular one' }));
      expect(screen.getByRole('button', { name: 'Show all Enemies' })).toHaveAttribute('aria-pressed', 'mixed');
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'regular' } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(row('Enemies').querySelector('.tree__count')).toHaveClass('tree__count--changed');
      fireEvent.click(row('Enemies'));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'boss' } });
      await act(() => vi.advanceTimersByTimeAsync(200));
      const reset = screen.getByRole('button', { name: 'Reset' });
      expect(reset).toHaveAttribute('title', 'Reset');
      if (source === 'input') {
        const input = screen.getByRole('searchbox');
        input.focus();
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.getByRole('searchbox')).toBe(input);
        expect(input).toHaveFocus();
      } else {
        fireEvent.click(reset);
      }

      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(row('Enemies').closest('details')).toHaveAttribute('open');
      expect(row('NPCs').closest('details')).not.toHaveAttribute('open');
      expect(row('Regular').closest('details')).not.toHaveAttribute('open');
      expect(row('Bosses').closest('details')).not.toHaveAttribute('open');
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('3');
      expect(row('Enemies').querySelector('.tree__count')).not.toHaveClass('tree__count--changed');
      expect(screen.getByRole('button', { name: 'Hide Enemies' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Boss one,Test NPC,Regular one,Regular two');
      expect(onLocate).toHaveBeenCalledOnce();
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('3');
      fireEvent.click(reset);
      expect(screen.getByRole('button', { name: 'Hide Enemies' })).toHaveAttribute('aria-pressed', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('retains the active query and matching group expansion across edits, additions, and deletion', async () => {
    vi.useFakeTimers();

    try {
      const onLocate = vi.fn();
      const { rerender } = render(<EntityMenu entities={entities} onLocate={onLocate} />);
      expandEntityMenu();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  REGULAR ONE  ' } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(screen.getAllByRole('button', { name: 'Regular one' })).toHaveLength(1);
      const edited = entities.map((entity) =>
        entity.id === '44444444-0000-4000-8000-000000000000' ? { ...entity, title: 'Regular one' } : entity
      );
      const added = parseMapEntityDatabase({
        schemaVersion: 2,
        entities: [
          ...edited,
          {
            id: '55555555-0000-4000-8000-000000000000',
            type: 'enemy',
            title: 'Regular one',
            isBoss: false,
            position: { x: 10, y: 20 },
          },
        ],
      }).entities;
      rerender(<EntityMenu entities={added} onLocate={onLocate} />);
      expect(screen.getByRole('searchbox')).toHaveValue('  REGULAR ONE  ');
      const eye = screen.getByRole('button', { name: 'Hide Regular one' });
      expect(eye.closest('details')).toHaveAttribute('open');
      expect(eye.closest('.tree__row')?.querySelector('.tree__count')).toHaveTextContent('3');
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('3');
      expect(row('Enemies').querySelector('.tree__count')).toHaveClass('tree__count--changed');
      const entries = screen.getAllByRole('button', { name: 'Regular one' });
      expect(entries).toHaveLength(3);
      fireEvent.click(entries[2] as HTMLElement);
      expect(onLocate).toHaveBeenCalledWith(added[4]);
      rerender(<EntityMenu entities={added.filter((entity) => entity.title !== 'Regular one')} onLocate={onLocate} />);
      expect(screen.queryByRole('button', { name: 'Hide Regular one' })).toBeNull();
      expect(row('Enemies')).toHaveAttribute('aria-disabled', 'true');
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('0');
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
      expect(row('Enemies')).not.toHaveAttribute('aria-disabled');
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('1');
      expect(row('Enemies').querySelector('.tree__count')).not.toHaveClass('tree__count--changed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reuses the complete tree across searches and visibility updates, rebuilding when entities change', async () => {
    vi.useFakeTimers();

    try {
      const onLocate = vi.fn();
      const { rerender } = render(<EntityMenu entities={entities} onLocate={onLocate} />);
      const initialBuildCount = vi.mocked(entityTreeNodes).mock.calls.length;
      expandEntityMenu();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'boss' } });
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(screen.getByRole('button', { name: 'Boss one' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Regular one' })).toBeNull();
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('1');
      rerender(
        <EntityMenu
          entities={entities}
          onLocate={onLocate}
          hiddenIds={new Set(['11111111-0000-4000-8000-000000000000'])}
        />
      );
      expect(screen.getByRole('button', { name: 'Show all Bosses' })).toHaveAttribute('aria-pressed', 'false');
      expect(vi.mocked(entityTreeNodes)).toHaveBeenCalledTimes(initialBuildCount);
      const updated = entities.map((entity) => ({ ...entity, title: `${entity.title} updated` }));
      rerender(<EntityMenu entities={updated} onLocate={onLocate} />);
      expect(vi.mocked(entityTreeNodes).mock.calls.length).toBeGreaterThan(initialBuildCount);
      expect(screen.getByRole('button', { name: 'Boss one updated' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the configured group order and initial disclosure states and supplies ordered entity rows', () => {
    const { container } = render(<EntityMenu entities={entities} onLocate={vi.fn()} />);
    const roots = container.querySelectorAll(
      '.tree > li > details > summary .tree__title, .tree > li > .tree__row > .tree__title'
    );
    expect(
      Array.from(
        roots,
        (element) => element.querySelector('.scrolling-text__static')?.textContent ?? element.textContent
      )
    ).toEqual(['Titles', 'NPCs', 'Codex', 'Items', 'Enemies', 'Places']);
    expect(row('Enemies').closest('details')).toHaveAttribute('open');
    expect(row('NPCs').closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByText('Search entities')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search entities' })).toHaveAttribute(
      'placeholder',
      'Search (3+ characters)'
    );
    expect(row('NPCs').querySelector('.tree__icon')).toBeNull();
    expect(row('Codex').querySelector('.tree__icon')).toBeNull();
    expandEntityMenu();
    expect(
      within(screen.getByRole('list', { name: 'Regular' }))
        .getAllByRole('button')
        .filter((button) => button.classList.contains('tree__entry'))
        .map((button) => button.querySelector('.scrolling-text__static')?.textContent ?? button.textContent)
    ).toEqual(['Regular one', 'Regular two']);
    expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('3');
  });

  it('keeps UUIDs and edit buttons out of entity rows and navigates on every activation', async () => {
    const onLocate = vi.fn();
    render(<EntityMenu entities={entities} onLocate={onLocate} />);
    expandEntityMenu();
    const user = userEvent.setup();
    const entry = screen.getByRole('button', { name: 'Test NPC' });
    expect(entry).not.toHaveAttribute('aria-pressed');
    expect(screen.queryByText(entities[1]?.id ?? '')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
    await user.click(entry);
    await user.click(entry);
    expect(onLocate).toHaveBeenCalledTimes(2);
    expect(onLocate).toHaveBeenLastCalledWith(entities[1]);
  });

  it('filters only menu rows after 300ms, highlights changed counts, and keeps visibility based on the full database', () => {
    vi.useFakeTimers();

    try {
      render(<Harness />);
      expandEntityMenu();
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'rEgUlAr' } });
      act(() => vi.advanceTimersByTime(299));
      expect(screen.getByRole('button', { name: 'Boss one' })).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.queryByRole('button', { name: 'Boss one' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Regular one' })).toBeInTheDocument();
      expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('2');
      expect(row('Enemies').querySelector('.tree__count')).toHaveClass('tree__count--changed');
      expect(row('Regular').querySelector('.tree__count')).not.toHaveClass('tree__count--changed');
      expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Boss one');
      fireEvent.click(screen.getByRole('button', { name: 'Hide Enemies' }));
      expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Test NPC');
      expect(screen.getByLabelText('Visible entities')).not.toHaveTextContent('Boss one');
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 're' } });
      expect(screen.getByRole('button', { name: 'Boss one' })).toBeInTheDocument();
      expect(row('Enemies').querySelector('.tree__count')).not.toHaveClass('tree__count--changed');
      expect(screen.getByRole('button', { name: 'Show all Enemies' })).toHaveAttribute('aria-pressed', 'false');
    } finally {
      vi.useRealTimers();
    }
  });

  it('derives mixed category and root eyes, enables a mixed subtree, and retains counts and open branches', async () => {
    render(<Harness />);
    expandEntityMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hide Regular one' }));
    expect(screen.getByRole('button', { name: 'Show all Regular' })).toHaveAttribute('aria-pressed', 'mixed');
    expect(screen.getByRole('button', { name: 'Show all Enemies' })).toHaveAttribute('aria-pressed', 'mixed');
    expect(row('Regular').closest('details')).toHaveAttribute('open');
    expect(row('Enemies').querySelector('.tree__count')).toHaveTextContent('3');
    expect(screen.getByLabelText('Visible entities')).not.toHaveTextContent('Regular one');
    expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Regular two');
    await user.click(screen.getByRole('button', { name: 'Show all Enemies' }));
    expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Regular one');
    await user.click(screen.getByRole('button', { name: 'Hide Regular' }));
    expect(screen.getByRole('button', { name: 'Show all Regular' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Boss one');
  });

  it('reveals only the located entity in a hidden category and leaves its siblings hidden', async () => {
    const onLocate = vi.fn();
    render(<Harness onLocate={onLocate} />);
    expandEntityMenu();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hide Enemies' }));
    await user.click(screen.getByRole('button', { name: 'Regular one' }));
    expect(onLocate).toHaveBeenCalledWith(entities[2]);
    expect(screen.getByLabelText('Visible entities')).toHaveTextContent('Regular one');
    expect(screen.getByLabelText('Visible entities')).not.toHaveTextContent('Regular two');
    expect(screen.getByRole('button', { name: 'Show all Enemies' })).toHaveAttribute('aria-pressed', 'mixed');
  });

  it('retains empty categories, disables empty disclosure, and reuses it when entities arrive', () => {
    const { container, rerender } = render(<EntityMenu entities={[]} onLocate={vi.fn()} />);
    expect(row('NPCs').querySelector('.tree__count')).toHaveTextContent('0');
    expect(row('Chests').querySelector('.tree__icon')).toBeInTheDocument();
    expect(container.querySelector('details[open]')).toBeNull();
    rerender(<EntityMenu entities={entities} onLocate={vi.fn()} />);
    expandEntityMenu();
    expect(row('NPCs').closest('details')).toHaveAttribute('open');
    rerender(<EntityMenu entities={[]} onLocate={vi.fn()} />);
    expect(container.querySelector('details[open]')).toBeNull();
  });
});

it('lists LostRoom entities by optional title with fallback names and preserves individual navigation', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      {
        id: '11111111-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'lost-room',
        title: 'Quiet chamber',
        position: { x: 1, y: 2 },
      },
      { id: '22222222-0000-4000-8000-000000000000', type: 'place', placeType: 'lost-room', position: { x: 3, y: 4 } },
    ],
  }).entities;
  const onLocate = vi.fn();
  render(<EntityMenu entities={members} onLocate={onLocate} />);
  const user = userEvent.setup();
  expect(row('Lost rooms').querySelector('.tree__count')).toHaveTextContent('2');
  expect(row('Lost rooms').closest('details')).not.toHaveAttribute('open');
  await user.click(row('Lost rooms'));
  await user.click(screen.getByRole('button', { name: 'Quiet chamber' }));
  expect(onLocate).toHaveBeenLastCalledWith(members[0]);
  await user.click(screen.getByRole('button', { name: 'Lost room' }));
  expect(onLocate).toHaveBeenLastCalledWith(members[1]);
});

it.each([
  { title: 'Teleporters', details: { type: 'place', placeType: 'altar', altarType: 'teleportation-altar' } },
  { title: 'Mirror teleporters', details: { type: 'place', placeType: 'mirror-teleporter' } },
  { title: 'Chests', details: { type: 'place', placeType: 'chest', variant: 1 } },
  { title: 'Levers', details: { type: 'place', placeType: 'switch', switchType: 'lever' } },
  { title: 'Buttons', details: { type: 'place', placeType: 'switch', switchType: 'button' } },
  { title: 'Prison cells', details: { type: 'place', placeType: 'prison-cell' } },
  { title: 'Blood donations', details: { type: 'place', placeType: 'switch', switchType: 'blood-donation' } },
  { title: 'Prison keys', details: { type: 'item', itemType: 'prison-key' } },
  { title: 'Arrows', details: { type: 'item', itemType: 'arrows' } },
])('keeps $title static but includes its entities in visibility and search counts', async ({ title, details }) => {
  const database = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [{ id: '11111111-0000-4000-8000-000000000000', ...details, position: { x: 1, y: 2 } }],
  });
  const onToggle = vi.fn();
  render(<EntityMenu entities={database.entities} onLocate={vi.fn()} onToggleVisibility={onToggle} />);
  expandEntityMenu();
  const heading = row(title);
  expect(heading).toHaveClass('tree__row--leaf');
  expect(heading.querySelector('.tree__count')).toHaveTextContent('1');
  expect(heading.querySelector('.tree__icon')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: title })).toBeNull();
  await userEvent.setup().click(within(heading).getByRole('button', { name: `Hide ${title}` }));
  expect(onToggle).toHaveBeenCalledOnce();
});

it('starts Enemies and Places expanded, keeps subgroups collapsed, and preserves user collapse across updates', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      ...entities,
      {
        id: '55555555-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'tablet',
        tabletType: 'faith',
        position: { x: 1, y: 2 },
      },
    ],
  }).entities;
  const { rerender } = render(<EntityMenu entities={members} onLocate={vi.fn()} />);
  expect(row('Enemies').closest('details')).toHaveAttribute('open');
  expect(row('Places').closest('details')).toHaveAttribute('open');
  expect(row('Regular').closest('details')).not.toHaveAttribute('open');
  expect(row('Tablets').closest('details')).not.toHaveAttribute('open');
  const user = userEvent.setup();
  const summary = row('Places');
  await user.click(summary);
  expect(summary.closest('details')).not.toHaveAttribute('open');
  rerender(<EntityMenu entities={[...members]} onLocate={vi.fn()} />);
  expect(row('Places').closest('details')).not.toHaveAttribute('open');
});

it('groups multipart Codex entries and retains the original entity for part navigation', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      {
        id: '11111111-0000-4000-8000-000000000000',
        type: 'codex',
        title: 'Entry',
        part: 2,
        totalParts: 4,
        position: { x: 1, y: 2 },
      },
      { id: '22222222-0000-4000-8000-000000000000', type: 'codex', title: 'Whole entry', position: { x: 1, y: 2 } },
      {
        id: '33333333-0000-4000-8000-000000000000',
        type: 'codex',
        title: 'Entry',
        part: 1,
        totalParts: 4,
        position: { x: 3, y: 4 },
      },
      {
        id: '44444444-0000-4000-8000-000000000000',
        type: 'codex',
        title: 'Entry',
        part: 4,
        totalParts: 4,
        position: { x: 5, y: 6 },
      },
    ],
  }).entities;
  const onLocate = vi.fn();
  render(<EntityMenu entities={members} onLocate={onLocate} />);
  fireEvent.click(row('Codex'));
  const group = screen.getByRole('button', { name: 'Hide Entry' }).closest('summary');
  expect(group?.closest('details')).not.toHaveAttribute('open');
  expect(group?.querySelector('.tree__title')).toHaveTextContent('Entry');
  expect(group?.querySelector('.tree__count')).toHaveTextContent('3');
  expandEntityMenu();
  expect(screen.getByRole('button', { name: 'Whole entry' })).toBeInTheDocument();
  expect(
    within(screen.getByRole('list', { name: 'Entry' }))
      .getAllByRole('button')
      .map((button) => button.querySelector('.scrolling-text__static')?.textContent)
  ).toEqual(['Entry 1/4', 'Entry 2/4', 'Entry 4/4']);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Entry 2/4' }));
  expect(onLocate).toHaveBeenCalledWith(members[0]);
  expect(members[0]?.title).toBe('Entry');
});

it('groups Tablets by subtype with collapsed lists, counts, group eyes, and title-only entity navigation', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      {
        id: '11111111-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'tablet',
        tabletType: 'faith',
        position: { x: 10, y: 20 },
      },
      {
        id: '22222222-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'tablet',
        tabletType: 'faith',
        position: { x: 30, y: 40 },
      },
      {
        id: '33333333-0000-4000-8000-000000000000',
        type: 'place',
        placeType: 'tablet',
        tabletType: 'damage',
        position: { x: 50, y: 60 },
      },
    ],
  }).entities;
  const onLocate = vi.fn();
  const onToggle = vi.fn();
  render(<EntityMenu entities={members} onLocate={onLocate} onToggleVisibility={onToggle} />);
  const user = userEvent.setup();
  await user.click(row('Tablets'));
  const faithHeader = screen.getByRole('button', { name: 'Hide Faith' }).closest('summary');
  expect(faithHeader).not.toBeNull();
  expect(faithHeader?.closest('details')).not.toHaveAttribute('open');
  expect(faithHeader?.querySelector('.tree__count')).toHaveTextContent('2');
  expect(screen.getByRole('button', { name: 'Hide Faith' })).toBeInTheDocument();

  const title = faithHeader?.querySelector('.tree__title');

  if (!title) {
    throw new Error('Expected group title');
  }

  await user.click(title);
  expect(onLocate).not.toHaveBeenCalled();
  expect(onToggle).not.toHaveBeenCalled();
  const faithList = screen.getByRole('list', { name: 'Faith' });
  expect(faithList).toBeVisible();
  expect(within(faithList).getAllByRole('button')).toHaveLength(2);
  expect(faithList.querySelector('.tree__visibility')).toBeNull();
  await user.click(within(faithList).getAllByRole('button', { name: 'Faith' })[1] as HTMLElement);
  expect(onLocate).toHaveBeenCalledWith(members[1]);
  await user.click(screen.getByRole('button', { name: 'Hide Faith' }));
  expect(onToggle).toHaveBeenCalledWith('place:tablet:group:faith');
  expect(row('Crit').querySelector('.tree__count')).toHaveTextContent('0');
  expect(row('Stamina').querySelector('.tree__count')).toHaveTextContent('0');
});

it.each([
  {
    placeType: 'trap',
    title: 'Traps',
    field: 'trapType',
    first: 'spear',
    firstTitle: 'Spear',
    second: 'axe',
    secondTitle: 'Axe',
    emptyTitle: 'Spikes',
  },
  {
    placeType: 'blocker',
    title: 'Blockers',
    field: 'blockerType',
    first: 'cracked-wall',
    firstTitle: 'Cracked Wall',
    second: 'door',
    secondTitle: 'Door',
    emptyTitle: 'Faith Lock',
  },
])(
  'groups $title by subtype into static rows with visibility and counts, including empty types',
  async ({ placeType, title, field, first, firstTitle, second, secondTitle, emptyTitle }) => {
    const members = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [first, first, second].map((subtype, index) => ({
        id: `${index + 1}1111111-0000-4000-8000-000000000000`,
        type: 'place',
        placeType,
        [field]: subtype,
        position: { x: index * 10, y: 20 },
      })),
    }).entities;
    const onLocate = vi.fn();
    const onToggle = vi.fn();
    const onShowOnly = vi.fn();
    render(<EntityMenu entities={members} onLocate={onLocate} onToggleVisibility={onToggle} onShowOnly={onShowOnly} />);
    const user = userEvent.setup();
    await user.click(row(title));
    const header = row(firstTitle);
    expect(header.tagName).toBe('DIV');
    expect(header.querySelector('.tree__count')).toHaveTextContent('2');
    expect(row(secondTitle).querySelector('.tree__count')).toHaveTextContent('1');
    expect(row(emptyTitle).querySelector('.tree__count')).toHaveTextContent('0');
    expect(row(emptyTitle).tagName).toBe('DIV');
    await user.click(screen.getByRole('button', { name: `Hide ${firstTitle}` }));
    expect(onToggle).toHaveBeenCalledWith(`place:${placeType}:group:${first}`);
    fireEvent.click(screen.getByRole('button', { name: `Show all ${firstTitle}` }), { shiftKey: true });
    expect(onShowOnly).toHaveBeenCalledWith(`place:${placeType}:group:${first}`);
    expect(header.tagName).toBe('DIV');
    await user.click(header);
    expect(onLocate).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: firstTitle })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: firstTitle })).not.toBeInTheDocument();
  }
);

it('groups Regular enemies by title with collapsed lists, group eyes, and title-only navigation', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [...entities, { ...entities[2], id: '55555555-0000-4000-8000-000000000000', position: { x: 50, y: 60 } }],
  }).entities;
  const onLocate = vi.fn();
  const onToggle = vi.fn();
  render(<EntityMenu entities={members} onLocate={onLocate} onToggleVisibility={onToggle} />);
  const user = userEvent.setup();
  await user.click(row('Regular'));
  const eye = screen.getByRole('button', { name: 'Hide Regular one' });
  const header = eye.closest('summary');
  expect(header?.closest('details')).not.toHaveAttribute('open');
  expect(header?.querySelector('.tree__count')).toHaveTextContent('2');
  expect(screen.getByRole('button', { name: 'Hide Regular two' })).toBeInTheDocument();
  await user.click(eye);
  expect(onToggle).toHaveBeenCalledWith('enemy:regular:group:Regular%20one');
  expect(header?.closest('details')).not.toHaveAttribute('open');

  if (!header) {
    throw new Error('Expected regular enemy group header');
  }

  await user.click(header);
  expect(onLocate).not.toHaveBeenCalled();
  const list = screen.getByRole('list', { name: 'Regular one' });
  expect(list.querySelector('.tree__visibility')).toBeNull();
  expect(within(list).getAllByRole('button')).toHaveLength(2);
  await user.click(within(list).getAllByRole('button', { name: 'Regular one' })[1] as HTMLElement);
  expect(onLocate).toHaveBeenCalledWith(members[4]);
});

it('groups NPCs by title with counts and group visibility, preserving navigation to individual instances', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: [
      { ...entities[1], title: 'Vlenn' },
      { ...entities[1], id: '55555555-0000-4000-8000-000000000000', title: 'Vlenn', position: { x: 50, y: 60 } },
      { ...entities[1], id: '66666666-0000-4000-8000-000000000000', title: 'Amaris' },
    ],
  }).entities;
  const onLocate = vi.fn();
  const onToggle = vi.fn();
  render(<EntityMenu entities={members} onLocate={onLocate} onToggleVisibility={onToggle} />);
  const user = userEvent.setup();
  await user.click(row('NPCs'));
  const header = row('Vlenn');
  expect(header.closest('details')).not.toHaveAttribute('open');
  expect(header.querySelector('.tree__count')).toHaveTextContent('2');
  expect(row('Amaris').querySelector('.tree__count')).toBeNull();
  expect(screen.getByRole('button', { name: 'Amaris' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Amaris' }));
  expect(onLocate).toHaveBeenCalledWith(members[2]);
  await user.click(screen.getByRole('button', { name: 'Hide Amaris' }));
  expect(onToggle).toHaveBeenCalledWith(members[2]?.id);
  await user.click(screen.getByRole('button', { name: 'Hide Vlenn' }));
  expect(onToggle).toHaveBeenCalledWith('npc:group:Vlenn');
  await user.click(header);
  const list = screen.getByRole('list', { name: 'Vlenn' });
  expect(list.querySelector('.tree__visibility')).toBeNull();
  await user.click(within(list).getAllByRole('button', { name: 'Vlenn' })[1] as HTMLElement);
  expect(onLocate).toHaveBeenCalledWith(members[1]);
});

it('groups Altars by subtype as static rows with counts and visibility, excluding Teleporters', async () => {
  const members = parseMapEntityDatabase({
    schemaVersion: 2,
    entities: ['runic-altar', 'runic-altar', 'healing-statue', 'teleportation-altar'].map((altarType, index) => ({
      id: `${index + 1}1111111-0000-4000-8000-000000000000`,
      type: 'place',
      placeType: 'altar',
      altarType,
      position: { x: index * 10, y: 20 },
    })),
  }).entities;
  const onLocate = vi.fn();
  const onToggle = vi.fn();
  render(<EntityMenu entities={members} onLocate={onLocate} onToggleVisibility={onToggle} />);
  const user = userEvent.setup();
  expect(row('Altars').querySelector('.tree__count')).toHaveTextContent('3');
  expect(row('Teleporters').querySelector('.tree__count')).toHaveTextContent('1');
  await user.click(row('Altars'));
  const eye = screen.getByRole('button', { name: 'Hide Runic Altar' });
  const header = eye.closest('.tree__row');
  expect(header?.tagName).toBe('DIV');
  expect(header?.querySelector('.tree__count')).toHaveTextContent('2');
  expect(screen.getByRole('button', { name: 'Hide Healing Statue' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Hide Teleportation Altar' })).toBeNull();
  await user.click(eye);
  expect(onToggle).toHaveBeenCalledWith('place:altar:group:runic-altar');

  if (!header) {
    throw new Error('Expected altar group header');
  }

  await user.click(header);
  expect(onLocate).not.toHaveBeenCalled();
  expect(screen.queryByRole('list', { name: 'Runic Altar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Runic Altar' })).not.toBeInTheDocument();
});

it('hides unmatched Tablet groups during search without changing their map visibility', async () => {
  vi.useFakeTimers();

  try {
    const members = parseMapEntityDatabase({
      schemaVersion: 2,
      entities: [
        {
          id: '11111111-0000-4000-8000-000000000000',
          type: 'place',
          placeType: 'tablet',
          tabletType: 'faith',
          position: { x: 10, y: 20 },
        },
        {
          id: '22222222-0000-4000-8000-000000000000',
          type: 'place',
          placeType: 'tablet',
          tabletType: 'damage',
          position: { x: 30, y: 40 },
        },
      ],
    }).entities;
    render(<EntityMenu entities={members} onLocate={vi.fn()} />);
    expandEntityMenu();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fai' } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(
      within(screen.getByRole('list', { name: 'Faith' })).getByRole('button', { name: 'Faith' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hide Damage' })).toBeNull();
    const damage = document.querySelector('[data-node-id="place:tablet:group:damage"]');
    expect(damage).not.toHaveAttribute('open');
    expect(damage?.parentElement).toHaveAttribute('hidden');
    expect(damage?.querySelector('.tree__count')).toHaveClass('tree__count--changed');
    expect(damage?.querySelector('.tree__visibility')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Hide Crit' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hide NPCs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide Enemies' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fa' } });
    expect(screen.getByRole('button', { name: 'Hide Damage' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide Crit' })).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
