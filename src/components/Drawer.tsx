import {
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
} from 'react';

import './Drawer.scss';

type DrawerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  iconSrc?: string;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>;

export function Drawer({ title, subtitle, iconSrc, footer, children, open, onOpenChange }: Readonly<DrawerProps>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const setIsOpen = useCallback(
    (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  const panelId = useId();
  const titleId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeRef.current?.focus();

    const handleKeyDownListener = (event: KeyboardEvent) => handleKeyDown(event);
    document.addEventListener('keydown', handleKeyDownListener);

    return () => document.removeEventListener('keydown', handleKeyDownListener);
  }, [isOpen]);

  return (
    <div className={`drawer${isOpen ? ' drawer--open' : ''}`}>
      <aside id={panelId} className="drawer__panel" aria-labelledby={titleId} aria-hidden={!isOpen} inert={!isOpen}>
        <header className="drawer__header">
          <div className="drawer__heading">
            {iconSrc && <img className="drawer__icon" src={iconSrc} alt="" />}
            <div className="drawer__heading-text">
              <h2 id={titleId} className="drawer__title">
                {title}
              </h2>
              {subtitle && <p className="drawer__subtitle">{subtitle}</p>}
            </div>
          </div>
          <button ref={closeRef} className="drawer__close" type="button" aria-label="Close menu" onClick={close}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="drawer__content">{children}</div>
        {footer && <footer className="drawer__footer">{footer}</footer>}
      </aside>
      <button
        ref={triggerRef}
        className="drawer__handle"
        type="button"
        aria-label={`${isOpen ? 'Close' : 'Open'} ${title}`}
        aria-controls={panelId}
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            close();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <span className="drawer__arrow" aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  );
}
