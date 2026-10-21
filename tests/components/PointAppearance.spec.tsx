import { fireEvent, render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { PointAppearance } from 'src/components/PointAppearance';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceAltarType } from 'src/types/MapPlaceAltarType';
import { MapPlaceBlockerType } from 'src/types/MapPlaceBlockerType';
import { MapPlaceSwitchType } from 'src/types/MapPlaceSwitchType';
import { MapPlaceTrapType } from 'src/types/MapPlaceTrapType';
import { MapPlaceType } from 'src/types/MapPlaceType';

vi.mock('src/helpers/pointIcons', () => ({
  getPointIconUrl: (entity: {
    type: string;
    isBoss?: boolean;
    placeType?: string;
    switchType?: string;
    blockerType?: string;
    trapType?: string;
    itemType?: string;
  }) => {
    if (entity.type === 'item' && entity.itemType === 'arrows') {
      return '/images/entities/point/item/arrows.png';
    }

    if (entity.type === 'item' && entity.itemType === 'prison-key') {
      return '/images/entities/point/item/prison-key.png';
    }

    if (entity.type === 'place' && entity.placeType === 'prison-cell') {
      return `/images/entities/point/place/${entity.placeType}.png`;
    }

    if (entity.type === 'place' && entity.placeType === 'switch' && entity.switchType === 'button') {
      return '/images/entities/point/place/switch/button.png';
    }

    if (entity.type === 'place' && entity.placeType === 'blocker' && entity.blockerType) {
      return `/images/entities/point/place/blocker/${entity.blockerType}.png`;
    }

    if (entity.type === 'place' && entity.placeType === 'trap' && entity.trapType) {
      return `/images/entities/point/place/trap/${entity.trapType}.png`;
    }

    return entity.type === 'enemy' ? `/images/entities/point/enemy/${entity.isBoss ? 'boss' : 'enemy'}.png` : null;
  },
}));

it('falls back for missing and failed images and retries when the derived URL changes', () => {
  const { container, rerender } = render(<PointAppearance entity={{ type: MapEntityType.Npc }} />);
  expect(container.querySelector('.point-appearance--dot')).toBeInTheDocument();
  rerender(
    <PointAppearance
      entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Altar, altarType: MapPlaceAltarType.RunicAltar }}
    />
  );
  expect(container.querySelector('.point-appearance--dot')).toBeInTheDocument();
  rerender(<PointAppearance entity={{ type: MapEntityType.Enemy, isBoss: false }} />);
  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', '/images/entities/point/enemy/enemy.png');

  if (!image) {
    throw new Error('Expected an image.');
  }

  fireEvent.error(image);
  expect(container.querySelector('img')).not.toBeInTheDocument();
  expect(container.querySelector('.point-appearance--dot')).toBeInTheDocument();
  rerender(<PointAppearance entity={{ type: MapEntityType.Enemy, isBoss: true }} />);
  expect(container.querySelector('img')).toHaveAttribute('src', '/images/entities/point/enemy/boss.png');
  rerender(<PointAppearance entity={{ type: MapEntityType.Enemy, isBoss: false }} />);
  expect(container.querySelector('img')).toHaveAttribute('src', '/images/entities/point/enemy/enemy.png');
});

it('uses the distinct Blocker fallback for missing icons, including the drawer subgroup icon', () => {
  const { container } = render(
    <PointAppearance entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Blocker }} />
  );
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--blocker');
});

it('uses the Blocker color after image failure and retries when its subtype changes', () => {
  const { container, rerender } = render(
    <PointAppearance
      entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Blocker, blockerType: MapPlaceBlockerType.Door }}
    />
  );
  const image = container.querySelector('img');

  if (!image) {
    throw new Error('Expected a Blocker image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--blocker');
  rerender(
    <PointAppearance
      entity={{
        type: MapEntityType.Place,
        placeType: MapPlaceType.Blocker,
        blockerType: MapPlaceBlockerType.TreeTrunk,
      }}
    />
  );
  expect(container.querySelector('img')).toHaveAttribute('src', '/images/entities/point/place/blocker/tree-trunk.png');
});

it('uses the distinct Trap color for missing and failed images', () => {
  const { container, rerender } = render(
    <PointAppearance entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Trap }} />
  );
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--trap');
  rerender(
    <PointAppearance
      entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Trap, trapType: MapPlaceTrapType.Spear }}
    />
  );
  const image = container.querySelector('img');

  if (!image) {
    throw new Error('Expected a Trap image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--trap');
});

it('uses the Button color after image failure', () => {
  const { container } = render(
    <PointAppearance
      entity={{ type: MapEntityType.Place, placeType: MapPlaceType.Switch, switchType: MapPlaceSwitchType.Button }}
    />
  );
  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', '/images/entities/point/place/switch/button.png');

  if (!image) {
    throw new Error('Expected a Button image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--button');
});

it.each([MapPlaceType.PrisonCell])('uses the %s color after image failure', (placeType) => {
  const { container } = render(<PointAppearance entity={{ type: MapEntityType.Place, placeType }} />);
  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', `/images/entities/point/place/${placeType}.png`);

  if (!image) {
    throw new Error('Expected a prison place image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass(`point-appearance--${placeType}`);
});

it('retains the Prison Key fallback color after an item image fails', () => {
  const { container } = render(
    <PointAppearance entity={{ type: MapEntityType.Item, itemType: MapItemType.PrisonKey }} />
  );
  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', '/images/entities/point/item/prison-key.png');

  if (!image) {
    throw new Error('Expected a key image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--prison-key');
});

it('uses the Arrows color when its image fails', () => {
  const { container } = render(<PointAppearance entity={{ type: MapEntityType.Item, itemType: MapItemType.Arrows }} />);
  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', '/images/entities/point/item/arrows.png');

  if (!image) {
    throw new Error('Expected an Arrows image');
  }

  fireEvent.error(image);
  expect(container.querySelector('.point-appearance--dot')).toHaveClass('point-appearance--arrows');
});
