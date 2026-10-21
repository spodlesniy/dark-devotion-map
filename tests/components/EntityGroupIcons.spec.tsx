import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { EntityMenu } from 'src/components/EntityMenu';
import type { PointIconDetails } from 'src/helpers/pointIcons';

const assets = vi.hoisted(() => ({ paths: [] as string[] }));
vi.mock('src/helpers/pointIcons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/helpers/pointIcons')>();

  return {
    ...actual,
    getPointIconUrl: (entity: PointIconDetails) => actual.createPointIconResolver(assets.paths, '/map/')(entity),
  };
});

afterEach(() => {
  assets.paths = [];
});

const cases = [
  { title: 'Traps', path: 'trap/spear.png', fallback: 'trap' },
  { title: 'Blockers', path: 'blocker/cracked-wall.png', fallback: 'blocker' },
  { title: 'Chests', path: 'chest/chest-1.png', fallback: 'chest' },
  { title: 'Teleporters', path: 'altar/teleportation-altar.png', fallback: null },
  { title: 'Mirror teleporters', path: 'mirror-teleporter.png', fallback: null },
];

it.each(cases)(
  'uses the requested $title heading icon and falls back if its image fails',
  ({ title, path, fallback }) => {
    assets.paths = [`/public/images/entities/point/place/${path}`];
    render(<EntityMenu entities={[]} onLocate={vi.fn()} />);
    const heading = screen.getByText(title).closest('.tree__row');
    const image = heading?.querySelector('img');
    expect(image).toHaveAttribute('src', `/map/images/entities/point/place/${path}`);

    if (!image) {
      throw new Error('Expected a subgroup icon');
    }

    fireEvent.error(image);
    expect(heading?.querySelector('.point-appearance--dot')).toBeInTheDocument();

    if (fallback) {
      expect(heading?.querySelector('.point-appearance--dot')).toHaveClass(`point-appearance--${fallback}`);
    }
  }
);

it.each(cases)('uses the $title fallback when its requested file is absent', ({ title, fallback }) => {
  render(<EntityMenu entities={[]} onLocate={vi.fn()} />);
  const heading = screen.getByText(title).closest('.tree__row');
  expect(heading?.querySelector('img')).toBeNull();
  expect(heading?.querySelector('.point-appearance--dot')).toBeInTheDocument();

  if (fallback) {
    expect(heading?.querySelector('.point-appearance--dot')).toHaveClass(`point-appearance--${fallback}`);
  }
});
