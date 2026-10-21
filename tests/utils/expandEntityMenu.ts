import { fireEvent } from '@testing-library/react';

export function expandEntityMenu() {
  for (const summary of document.querySelectorAll(
    '.entity-menu details:not([open]) > summary:not([aria-disabled="true"])'
  )) {
    fireEvent.click(summary);
  }
}
