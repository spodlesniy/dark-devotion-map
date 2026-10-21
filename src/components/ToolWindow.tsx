import { type PropsWithChildren, type ReactNode, useEffect, useEffectEvent, useId, useRef, useState } from 'react';

import './ToolWindow.scss';

type ToolWindowProps = PropsWithChildren<{ title: string; status?: ReactNode; warning?: boolean }>;
type Position = { x: number; y: number };
type Drag = { pointerId: number; offsetX: number; offsetY: number };

export function ToolWindow({ title, status, warning = false, children }: Readonly<ToolWindowProps>) {
  const [position, setPosition] = useState<Position | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const windowRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const titleId = useId();
  const contentId = useId();

  function move(x: number, y: number) {
    const header = headerRef.current?.getBoundingClientRect();
    const rectangle = windowRef.current?.getBoundingClientRect();

    if (!header || !rectangle) {
      return;
    }

    setPosition({
      x: Math.max(0, Math.min(x, window.innerWidth - rectangle.width)),
      y: Math.max(0, Math.min(y, window.innerHeight - (header.bottom - rectangle.top))),
    });
  }

  const fitHeader = useEffectEvent(() => {
    const rectangle = windowRef.current?.getBoundingClientRect();

    if (rectangle) {
      move(rectangle.left, rectangle.top);
    }
  });

  useEffect(() => {
    fitHeader();
    const onResize = () => fitHeader();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <section
      ref={windowRef}
      className="tool-window"
      aria-labelledby={titleId}
      style={position ? { left: position.x, top: position.y, right: 'auto' } : undefined}
    >
      <header
        ref={headerRef}
        className="tool-window__header"
        onPointerDown={(event) => {
          if (event.button !== 0 || dragRef.current || (event.target as HTMLElement).closest('button')) {
            return;
          }

          event.preventDefault();
          const rectangle = windowRef.current?.getBoundingClientRect();

          if (!rectangle) {
            return;
          }

          dragRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - rectangle.left,
            offsetY: event.clientY - rectangle.top,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;

          if (!drag || drag.pointerId !== event.pointerId) {
            return;
          }

          move(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) {
            return;
          }

          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
      >
        <h2 id={titleId} className="tool-window__title">
          {title}
        </h2>
        <button
          className={`tool-window__toggle${collapsed && warning ? ' tool-window__toggle--warning' : ''}`}
          type="button"
          title={collapsed ? 'Expand developer tools' : 'Collapse developer tools'}
          aria-label={collapsed ? 'Expand developer tools' : 'Collapse developer tools'}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? '+' : '−'}</span>
        </button>
      </header>
      <div id={contentId} className="tool-window__content" hidden={collapsed}>
        {children}
      </div>
      {status && (
        <footer className="tool-window__status" hidden={collapsed}>
          {status}
        </footer>
      )}
    </section>
  );
}
