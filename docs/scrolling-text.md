# ScrollingText

`src/components/ScrollingText.tsx` is a standalone, single-line text component. The entity menu uses it for category, subgroup, and entity titles through the generic Tree renderTitle callback. It has no dependency on entities, the drawer, or the tree.

```tsx
<ScrollingText text="A long title" />
```

| Prop | Default | Behavior |
| --- | --- | --- |
| text | Required | Full text to display. |
| pixelsPerSecond | 40 | Positive, finite horizontal travel speed in pixels per second. |
| pauseMs | 800 | Non-negative, finite pause at each endpoint, in milliseconds. Zero disables pauses. |
| className | Empty | Additional class for caller-owned layout and presentation. |

Invalid speed or pause values fall back to their defaults. The component inherits typography and colors.

## Behavior

At rest, overflowing text uses ellipsis. Text that fits never animates. Hovering overflowing text, or focusing a containing button, link, or element with `tabindex` through the keyboard, replaces ellipsis with the moving text. Each cycle travels left until the end is fully visible, pauses, returns to the start, pauses again, and repeats. Leaving hover and keyboard focus stops the animation and restores the initial ellipsis view. The component does not create an additional keyboard tab stop.

A shared `ResizeObserver` from src/helpers/observeElementSizes.ts watches the viewport and the intrinsic text width, so container changes, font metric changes, and previously hidden containers becoming visible update the travel distance. Text changes also trigger immediate remeasurement. Subscriptions are released when text changes or the component unmounts. The shared observer disconnects when its last subscription is removed.

JavaScript only measures geometry and supplies CSS custom properties. CSS transforms animate the text; no animation timers or per-frame React updates are used. Each half-cycle lasts `distance / speed + pause`. A CSS `linear()` easing stop reaches the endpoint before the pause, preserving constant movement speed and a fixed pause on both legs. The animation is enabled only under `prefers-reduced-motion: no-preference`; reduced motion keeps static ellipsis.

The static copy supplies the full accessible text even when visually transparent during motion. The animated copy uses `aria-hidden="true"`, avoiding duplicate text in containing control names.

## Layout

The root is a block-level span with `width: 100%`, `min-width: 0`, and clipped overflow. It works inside constrained block, flex, and grid layouts without choosing the parent's display mode. Apply padding to the containing element rather than the text viewport.

Parents must provide a finite available width. Flex wrappers may need `min-width: 0`; grid layouts should use `minmax(0, 1fr)` for a shrinking text column beside other controls. A parent that grows to fit its content does not produce overflow to animate.

## Menu integration and workload

Tree keeps disclosure state mounted but renders ScrollingText only for shown rows. Collapsed ancestors and search-hidden branches use plain text, so their scrolling components and size subscriptions are unmounted. A single ResizeObserver serves all active instances, deduplicating callbacks when both measured elements resize in one batch. Unused targets are unobserved and subscriptions are released on collapse, search changes, reset, or unmount.

Only hovered or keyboard-focused overflowing titles animate. Idle titles use no animation timers or per-frame React updates. The remaining cost scales with expanded rows and DOM size; this does not virtualize very large expanded lists. Native title tooltips are omitted for custom menu titles so they do not obscure scrolling text. Boss visibility controls retain their aligned count-column space.

## Verification

`tests/components/ScrollingText.spec.tsx` covers fitting and overflowing text, travel timing, custom and invalid parameters, resizing, hidden containers, font metrics, text changes, observer cleanup, and accessible control names. A temporary browser fixture verified flex/grid layouts, movement in both directions, endpoint pauses, resizing, keyboard activation, and restoration of ellipsis. The fixture was removed after verification. Integration was also checked in the real menu, including a large Codex list, search, Reset, title scrolling, keyboard focus, and visibility-eye alignment. tests/helpers/observeElementSizes.spec.ts verifies shared observation, batch deduplication, target cleanup, and observer recreation; Tree tests verify conditional title mounting and preservation of nested disclosure.
