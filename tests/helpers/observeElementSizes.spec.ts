import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { observeElementSizes } from 'src/helpers/observeElementSizes';

class TestResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    observers.push(this);
  }

  notify(targets: readonly Element[]) {
    this.callback(
      targets.map((target) => ({ target }) as ResizeObserverEntry),
      this
    );
  }
}

const observers: TestResizeObserver[] = [];
const cleanups: Array<() => void> = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }

  vi.unstubAllGlobals();
});

function currentObserver() {
  const observer = observers.at(-1);

  if (!observer) {
    throw new Error('Expected a shared observer');
  }

  return observer;
}

describe('Shared size observation', () => {
  it('shares one observer and notifies each subscriber once per resize batch', () => {
    const viewport = document.createElement('span');
    const text = document.createElement('span');
    const another = document.createElement('span');
    const first = vi.fn();
    const second = vi.fn();
    cleanups.push(observeElementSizes([viewport, text], first));
    cleanups.push(observeElementSizes([another], second));
    expect(observers).toHaveLength(1);
    currentObserver().notify([viewport, text, another]);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('retains remaining subscribers, releases unused targets, and disconnects when empty', () => {
    const target = document.createElement('span');
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = observeElementSizes([target, target], first);
    const stopSecond = observeElementSizes([target], second);
    cleanups.push(stopFirst, stopSecond);
    const observer = currentObserver();
    expect(observer.observe).toHaveBeenCalledOnce();
    stopFirst();
    expect(observer.unobserve).not.toHaveBeenCalled();
    observer.notify([target]);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    stopSecond();
    expect(observer.unobserve).toHaveBeenCalledExactlyOnceWith(target);
    expect(observer.disconnect).toHaveBeenCalledOnce();
    observer.notify([target]);
    expect(second).toHaveBeenCalledOnce();
    cleanups.push(observeElementSizes([target], vi.fn()));
    expect(observers).toHaveLength(2);
  });
});
