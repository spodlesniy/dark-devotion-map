import { useEffect, useId, useRef } from 'react';

import './PointCreation.scss';

type DeleteEntityDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteEntityDialog({ onConfirm, onCancel }: Readonly<DeleteEntityDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="point-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
        }
      }}
    >
      <div className="point-dialog__form">
        <header className="point-dialog__header">
          <h2 id={titleId}>Delete point?</h2>
          <button type="button" aria-label="Close dialog" onClick={onCancel}>
            ×
          </button>
        </header>
        <p>This removes the point from the working database. Changes stay in memory until exported.</p>
        <footer className="point-dialog__actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Delete
          </button>
        </footer>
      </div>
    </dialog>
  );
}
