type SizeListener = () => void;

const subscriptions = new Map<Element, Set<SizeListener>>();
let observer: ResizeObserver | undefined;

export function observeElementSizes(elements: readonly Element[], listener: SizeListener): () => void {
  if (!observer) {
    observer = new ResizeObserver((entries) => {
      const listeners = new Set<SizeListener>();

      for (const entry of entries) {
        for (const callback of subscriptions.get(entry.target) ?? []) {
          listeners.add(callback);
        }
      }

      for (const callback of listeners) {
        callback();
      }
    });
  }

  const targets = new Set(elements);

  for (const element of targets) {
    let listeners = subscriptions.get(element);

    if (!listeners) {
      listeners = new Set();
      subscriptions.set(element, listeners);
      observer.observe(element);
    }

    listeners.add(listener);
  }

  return () => {
    for (const element of targets) {
      const listeners = subscriptions.get(element);
      listeners?.delete(listener);

      if (listeners?.size === 0) {
        observer?.unobserve(element);
        subscriptions.delete(element);
      }
    }

    if (subscriptions.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}
