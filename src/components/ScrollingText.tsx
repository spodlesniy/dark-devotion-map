import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';

import './ScrollingText.scss';

import { observeElementSizes } from 'src/helpers/observeElementSizes';

export type ScrollingTextProps = {
  text: string;
  pixelsPerSecond?: number;
  pauseMs?: number;
  className?: string;
};

const defaultPixelsPerSecond = 40;
const defaultPauseMs = 800;

export function ScrollingText({
  text,
  pixelsPerSecond = defaultPixelsPerSecond,
  pauseMs = defaultPauseMs,
  className = '',
}: Readonly<ScrollingTextProps>) {
  const [distance, setDistance] = useState(0);

  const viewportRef = useRef<HTMLSpanElement>(null);
  const movingRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const moving = movingRef.current;

    if (!viewport || !moving) {
      return;
    }

    function measure() {
      const width = viewport?.clientWidth ?? 0;
      const nextDistance = text.length > 0 && width > 0 ? Math.max(0, (moving?.scrollWidth ?? 0) - width) : 0;
      setDistance(nextDistance);
    }

    measure();

    return observeElementSizes([viewport, moving], measure);
  }, [text]);

  const speed = Number.isFinite(pixelsPerSecond) && pixelsPerSecond > 0 ? pixelsPerSecond : defaultPixelsPerSecond;
  const pause = Number.isFinite(pauseMs) && pauseMs >= 0 ? pauseMs : defaultPauseMs;
  const travelMs = (distance / speed) * 1000;
  const halfCycleMs = travelMs + pause;
  const style = {
    '--scrolling-text-distance': `${distance}px`,
    '--scrolling-text-duration': `${halfCycleMs * 2}ms`,
    '--scrolling-text-travel-end': `${halfCycleMs > 0 ? (travelMs / halfCycleMs) * 100 : 100}%`,
  } as CSSProperties;
  const classes = ['scrolling-text', distance > 0 && 'scrolling-text--overflowing', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span ref={viewportRef} className={classes} style={style}>
      <span className="scrolling-text__static">{text}</span>
      <span ref={movingRef} className="scrolling-text__moving" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
