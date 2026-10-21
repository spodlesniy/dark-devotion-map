import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { compile } from 'sass';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { PointAppearance } from 'src/components/PointAppearance';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';

vi.mock('src/helpers/pointIcons', () => ({ getPointIconUrl: () => '/images/entities/point/item/arrows.png' }));

const leafletCss = readFileSync(resolve('node_modules/leaflet/dist/leaflet.css'), 'utf8');
const appearanceCss = compile(resolve('src/components/PointAppearance.scss')).css;
let stylesheet: HTMLStyleElement;

beforeEach(() => {
  stylesheet = document.createElement('style');
  stylesheet.textContent = `${leafletCss}\n${appearanceCss}`;
  document.head.append(stylesheet);
});

afterEach(() => stylesheet.remove());

it.each(['map-point-icon__button', 'editable-point__dot'])(
  'keeps non-square images inside the marker box despite Leaflet width:auto (%s)',
  (className) => {
    render(
      <div className="leaflet-container">
        <div className="leaflet-marker-pane">
          <button type="button" aria-label="Arrows" className={className} style={{ width: '32px', height: '32px' }}>
            <PointAppearance entity={{ type: MapEntityType.Item, itemType: MapItemType.Arrows }} />
          </button>
        </div>
      </div>
    );
    const image = screen.getByRole('button', { name: 'Arrows' }).querySelector('img');

    if (!image) {
      throw new Error('Expected an Arrows image');
    }

    const style = getComputedStyle(image);
    expect(style.width).toBe('100%');
    expect(style.height).toBe('100%');
    expect(style.objectFit).toBe('scale-down');
  }
);
