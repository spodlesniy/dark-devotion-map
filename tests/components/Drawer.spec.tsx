import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Drawer } from 'src/components/Drawer';

function renderDrawer() {
  render(
    <>
      <button type="button">Map control</button>
      <Drawer title="Map entities">
        <button type="button">Entity entry</button>
      </Drawer>
    </>
  );

  return userEvent.setup();
}

describe('Drawer', () => {
  it('starts collapsed and exposes the panel through its edge button', async () => {
    const user = renderDrawer();
    const trigger = screen.getByRole('button', { name: 'Open Map entities' });
    const panel = screen.getByRole('complementary', { hidden: true });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('inert');
    expect(screen.queryByRole('button', { name: 'Entity entry' })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole('complementary', { name: 'Map entities' })).not.toHaveAttribute('inert');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
  });

  it('closes with the close button and restores focus to the edge button', async () => {
    const user = renderDrawer();
    const trigger = screen.getByRole('button', { name: 'Open Map entities' });

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('inert');
  });

  it('supports keyboard opening, keeps map controls available, and closes with Escape', async () => {
    const user = renderDrawer();
    const trigger = screen.getByRole('button', { name: 'Open Map entities' });
    trigger.focus();

    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Map control' }));

    expect(screen.getByRole('button', { name: 'Map control' })).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});

it('keeps focus and calls the latest callback when an open drawer rerenders', async () => {
  const user = userEvent.setup();
  const previous = vi.fn();
  const current = vi.fn();
  const view = render(
    <Drawer title="Map entities" open onOpenChange={previous}>
      <button type="button">Entity entry</button>
    </Drawer>
  );
  await user.click(screen.getByRole('button', { name: 'Entity entry' }));
  view.rerender(
    <Drawer title="Map entities" open onOpenChange={current}>
      <button type="button">Entity entry</button>
    </Drawer>
  );
  expect(screen.getByRole('button', { name: 'Entity entry' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(current).toHaveBeenCalledExactlyOnceWith(false);
  expect(previous).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Close Map entities' })).toHaveFocus();
});
