import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollingText } from 'src/components/ScrollingText';

let availableWidth = 120;
let textWidth = 200;
let notifyResize: () => void = vi.fn();
const observe = vi.fn();
const disconnect = vi.fn();
const targets = new Set<Element>();

beforeEach(() => {
  availableWidth = 120;
  textWidth = 200;
  vi.clearAllMocks();
  targets.clear();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => availableWidth);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() => textWidth);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = () =>
          callback(
            [...targets].map((target) => ({ target }) as ResizeObserverEntry),
            this
          );
      }

      observe(target: Element) {
        targets.add(target);
        observe(target);
      }

      unobserve(target: Element) {
        targets.delete(target);
      }

      disconnect() {
        targets.clear();
        disconnect();
      }
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function viewport(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>('.scrolling-text');

  if (!element) {
    throw new Error('Expected a scrolling text viewport');
  }

  return element;
}

describe('ScrollingText', () => {
  it('measures overflow and supplies a constant-speed round trip with fixed endpoint pauses', () => {
    const { container } = render(<ScrollingText text="A long title" />);
    const element = viewport(container);
    expect(element).toHaveClass('scrolling-text--overflowing');
    expect(element.style.getPropertyValue('--scrolling-text-distance')).toBe('80px');
    expect(element.style.getPropertyValue('--scrolling-text-duration')).toBe('5600ms');
    expect(Number.parseFloat(element.style.getPropertyValue('--scrolling-text-travel-end'))).toBeCloseTo(71.42857);
    expect(observe).toHaveBeenCalledWith(element);
    expect(observe).toHaveBeenCalledWith(container.querySelector('.scrolling-text__moving'));
  });

  it.each([80, 120])('does not enable motion when text width %s fits', (width) => {
    textWidth = width;
    const { container } = render(<ScrollingText text="Fits" />);
    expect(viewport(container)).not.toHaveClass('scrolling-text--overflowing');
    expect(viewport(container).style.getPropertyValue('--scrolling-text-distance')).toBe('0px');
  });

  it('responds to container resizing, hidden containers becoming visible, and font metric changes', () => {
    availableWidth = 0;
    const { container } = render(<ScrollingText text="Resizable title" />);
    expect(viewport(container)).not.toHaveClass('scrolling-text--overflowing');
    availableWidth = 120;
    act(() => notifyResize());
    expect(viewport(container)).toHaveClass('scrolling-text--overflowing');
    availableWidth = 240;
    act(() => notifyResize());
    expect(viewport(container)).not.toHaveClass('scrolling-text--overflowing');
    textWidth = 300;
    act(() => notifyResize());
    expect(viewport(container).style.getPropertyValue('--scrolling-text-distance')).toBe('60px');
  });

  it('remeasures changed text and disconnects observers on replacement and unmount', () => {
    const { container, rerender, unmount } = render(<ScrollingText text="Long title" />);
    textWidth = 50;
    rerender(<ScrollingText text="Short" />);
    expect(viewport(container)).not.toHaveClass('scrolling-text--overflowing');
    expect(disconnect).toHaveBeenCalledOnce();
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('supports custom speed, zero pause, and presentation classes', () => {
    const { container } = render(<ScrollingText text="Custom" pixelsPerSecond={80} pauseMs={0} className="custom" />);
    expect(viewport(container)).toHaveClass('custom');
    expect(viewport(container).style.getPropertyValue('--scrolling-text-duration')).toBe('2000ms');
    expect(viewport(container).style.getPropertyValue('--scrolling-text-travel-end')).toBe('100%');
  });

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY])('uses defaults for invalid speed %s and pause', (speed) => {
    const { container } = render(<ScrollingText text="Fallback" pixelsPerSecond={speed} pauseMs={-1} />);
    expect(viewport(container).style.getPropertyValue('--scrolling-text-duration')).toBe('5600ms');
  });

  it('keeps the full accessible text without duplicating the parent button name or adding tab stops', () => {
    const { container } = render(
      <button type="button">
        <ScrollingText text="Complete accessible title" />
      </button>
    );
    expect(screen.getByRole('button', { name: 'Complete accessible title' })).toBeInTheDocument();
    expect(container.querySelector('.scrolling-text__moving')).toHaveAttribute('aria-hidden', 'true');
    expect(viewport(container)).not.toHaveAttribute('tabindex');
  });
});
