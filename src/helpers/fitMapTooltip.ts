type Rectangle = { left: number; top: number; width: number; height: number };
type Anchor = { x: number; y: number; clearance: number };

export function fitMapTooltip(tooltip: Rectangle, viewport: Rectangle, anchor: Anchor) {
  const right = viewport.left + viewport.width;
  const bottom = viewport.top + viewport.height;
  let left = tooltip.left;
  let top = tooltip.top;

  // Prefer a side placement when the tooltip cannot fit above its anchor.
  if (top < viewport.top) {
    if (anchor.x + anchor.clearance + tooltip.width <= right) {
      left = anchor.x + anchor.clearance;
      top = anchor.y - tooltip.height / 2;
    } else if (anchor.x - anchor.clearance - tooltip.width >= viewport.left) {
      left = anchor.x - anchor.clearance - tooltip.width;
      top = anchor.y - tooltip.height / 2;
    }
  }

  left = Math.max(viewport.left, Math.min(left, right - tooltip.width));
  top = Math.max(viewport.top, Math.min(top, bottom - tooltip.height));

  return { x: left - tooltip.left, y: top - tooltip.top };
}
