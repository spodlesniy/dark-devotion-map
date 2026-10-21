import { describe, expect, it } from 'vitest';

import { fitMapTooltip } from 'src/helpers/fitMapTooltip';

const viewport = { left: 10, top: 10, width: 800, height: 600 };

describe('Tooltip viewport placement', () => {
  it('preserves an above-anchor placement when it fits', () => {
    expect(
      fitMapTooltip({ left: 200, top: 200, width: 300, height: 100 }, viewport, { x: 350, y: 320, clearance: 20 })
    ).toEqual({ x: 0, y: 0 });
  });

  it.each([
    { left: -100, top: 200, x: 110, y: 0 },
    { left: 700, top: 200, x: -190, y: 0 },
    { left: 200, top: 580, x: 0, y: -70 },
  ])('clamps a tooltip crossing a viewport edge: %j', ({ left, top, x, y }) => {
    expect(fitMapTooltip({ left, top, width: 300, height: 100 }, viewport, { x: 350, y: 320, clearance: 20 })).toEqual({
      x,
      y,
    });
  });

  it.each([
    { anchorX: 100, expectedLeft: 120 },
    { anchorX: 750, expectedLeft: 430 },
  ])('uses a side near the top edge and clears the icon: %j', ({ anchorX, expectedLeft }) => {
    const rectangle = { left: anchorX - 150, top: -70, width: 300, height: 100 };
    const shift = fitMapTooltip(rectangle, viewport, { x: anchorX, y: 50, clearance: 20 });
    expect(rectangle.left + shift.x).toBe(expectedLeft);
    expect(rectangle.top + shift.y).toBe(10);
  });

  it('fits a viewport-sized tooltip on a narrow screen with no space at either side', () => {
    expect(
      fitMapTooltip(
        { left: -100, top: -200, width: 300, height: 400 },
        { left: 10, top: 10, width: 300, height: 400 },
        { x: 150, y: 100, clearance: 20 }
      )
    ).toEqual({ x: 110, y: 210 });
  });
});
