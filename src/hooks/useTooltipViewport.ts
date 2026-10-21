import { type Tooltip as LeafletTooltip, Popup } from 'leaflet';
import { type RefObject, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

import { fitMapTooltip } from 'src/helpers/fitMapTooltip';

export function useTooltipViewport(tooltipRef: RefObject<LeafletTooltip | Popup | null>) {
  const map = useMap();

  const refreshRef = useRef<(() => void) | null>(null);

  // React mounts portal content after Leaflet opens the tooltip and updates it asynchronously.
  useEffect(() => {
    refreshRef.current?.();
  });

  useEffect(() => {
    const tooltip = tooltipRef.current;

    if (!tooltip) {
      return;
    }

    let frame = 0;
    let observedContent: Element | null = null;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    const inputEvents = ['wheel', 'mousedown', 'dblclick', 'touchstart', 'touchmove', 'click', 'contextmenu'];

    function fit() {
      const element = tooltip?.getElement();
      const location = tooltip?.getLatLng();

      if (!element || !location || !tooltip?.isOpen()) {
        return;
      }

      const container = map.getContainer().getBoundingClientRect();
      const styles = getComputedStyle(element);
      const margin = Number.parseFloat(styles.paddingTop) || 0;
      const left = Math.max(0, container.left) + margin;
      const top = Math.max(0, container.top) + margin;
      const width = Math.max(0, Math.min(window.innerWidth, container.right) - margin - left);
      const height = Math.max(0, Math.min(window.innerHeight, container.bottom) - margin - top);

      if (!width || !height) {
        return;
      }

      element.style.setProperty('--tooltip-viewport-width', `${width}px`);
      element.style.setProperty('--tooltip-viewport-height', `${height}px`);
      element.style.setProperty('--tooltip-shift-x', '0px');
      element.style.setProperty('--tooltip-shift-y', '0px');
      const content = element.querySelector('.map-entity-tooltip__content');

      if (content !== observedContent) {
        if (observedContent) {
          observer?.unobserve(observedContent);
        }

        if (content) {
          observer?.observe(content);
        }

        observedContent = content;
      }

      const contentSize = content?.getBoundingClientRect();

      if (contentSize?.width && contentSize.height) {
        const horizontalFrame =
          (Number.parseFloat(styles.paddingLeft) || 0) +
          (Number.parseFloat(styles.paddingRight) || 0) +
          (Number.parseFloat(styles.borderLeftWidth) || 0) +
          (Number.parseFloat(styles.borderRightWidth) || 0);
        const verticalFrame =
          2 * margin +
          (Number.parseFloat(styles.borderTopWidth) || 0) +
          (Number.parseFloat(styles.borderBottomWidth) || 0);
        element.style.width = `${Math.ceil(contentSize.width + horizontalFrame)}px`;
        element.style.height = `${Math.ceil(contentSize.height + verticalFrame)}px`;
      }

      tooltip.update();
      const rectangle = element.getBoundingClientRect();
      const point = map.latLngToContainerPoint(location);
      const clearance = Math.max(margin, container.top + point.y - rectangle.bottom);
      const shift = fitMapTooltip(
        rectangle,
        { left, top, width, height },
        {
          x: container.left + point.x,
          y: container.top + point.y,
          clearance,
        }
      );
      element.style.setProperty('--tooltip-shift-x', `${shift.x}px`);
      element.style.setProperty('--tooltip-shift-y', `${shift.y}px`);
      element.classList.toggle('map-entity-tooltip--shifted', shift.x !== 0 || shift.y !== 0);
    }

    function schedule() {
      if (!tooltip?.isOpen()) {
        return;
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    }

    function opened() {
      const element = tooltip?.getElement();

      if (element) {
        observer?.observe(element);

        if (tooltip instanceof Popup) {
          window.addEventListener('keydown', closeOnEscape);

          for (const event of inputEvents) {
            element.addEventListener(event, stopMapInput);
          }
        }
      }

      schedule();
    }

    function stopMapInput(event: Event) {
      event.stopPropagation();

      if (event.type === 'contextmenu') {
        event.preventDefault();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        tooltip?.close();
      }
    }

    function closed() {
      window.removeEventListener('keydown', closeOnEscape);
      const element = tooltip?.getElement();

      for (const event of inputEvents) {
        element?.removeEventListener(event, stopMapInput);
      }

      observer?.disconnect();
      observedContent = null;
      cancelAnimationFrame(frame);
    }

    refreshRef.current = schedule;
    tooltip.on('add', opened);
    tooltip.on('move', schedule);
    tooltip.on('remove', closed);
    map.on('move zoomend resize', schedule);
    window.addEventListener('resize', schedule);

    return () => {
      refreshRef.current = null;
      closed();
      tooltip.off('add', opened);
      tooltip.off('move', schedule);
      tooltip.off('remove', closed);
      map.off('move zoomend resize', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [map, tooltipRef]);
}
