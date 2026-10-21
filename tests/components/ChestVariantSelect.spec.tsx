import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';

import { ChestVariantSelect } from 'src/components/ChestVariantSelect';
import { PointAppearance } from 'src/components/PointAppearance';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceType } from 'src/types/MapPlaceType';

vi.mock('src/helpers/pointIcons', () => ({
  getPointIconUrl: (entity: { variant?: number }) => (entity.variant === 2 ? '/chest-2.png' : null),
}));

afterEach(cleanup);

it('shows images or numbers, selects a numeric variant and closes on blur', async () => {
  const user = userEvent.setup();
  const { container } = render(<ChestVariantSelect initialValue={1} />);
  const select = screen.getByRole('combobox', { name: 'Variant' });
  expect(select).toHaveAttribute('aria-required', 'true');
  await user.click(select);
  expect(screen.getAllByRole('option')).toHaveLength(5);
  expect(screen.getByRole('option', { name: '2' }).querySelector('img')).toHaveAttribute('src', '/chest-2.png');
  expect(screen.getByRole('option', { name: '3' })).toHaveTextContent('3');
  await user.click(screen.getByRole('option', { name: '2' }));
  expect(container.querySelector('input[name="variant"]')).toHaveValue('2');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  fireEvent.error(screen.getByRole('img'));
  expect(select).toHaveTextContent('2');
  await user.click(select);
  await user.tab();
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
});

it('prefills edited variants and supports keyboard selection and Escape', async () => {
  const user = userEvent.setup();
  const { container } = render(<ChestVariantSelect initialValue={4} />);
  const select = screen.getByRole('combobox', { name: 'Variant' });
  select.focus();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(container.querySelector('input[name="variant"]')).toHaveValue('5');
  await user.keyboard('{Home}{Enter}');
  expect(container.querySelector('input[name="variant"]')).toHaveValue('1');
  await user.click(select);
  await user.keyboard('{ArrowDown}{Escape}');
  expect(container.querySelector('input[name="variant"]')).toHaveValue('1');
  expect(select).toHaveAttribute('aria-expanded', 'false');
});

it.each([MapPlaceType.Chest, MapPlaceType.Switch, MapPlaceType.PrisonCell])(
  'uses a distinct standard fallback for %s',
  (placeType) => {
    const { container } = render(<PointAppearance entity={{ type: MapEntityType.Place, placeType }} />);
    expect(container.querySelector('.point-appearance--dot')).toHaveClass(`point-appearance--${placeType}`);
  }
);

it('uses the same Chest color after an image fails and for missing variants', () => {
  const { container, rerender } = render(
    <PointAppearance entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Chest, variant: 2 }} />
  );
  const image = container.querySelector('img');

  if (!image) {
    throw new Error('Expected a chest image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--chest');
  rerender(<PointAppearance entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Chest, variant: 5 }} />);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--chest');
});
