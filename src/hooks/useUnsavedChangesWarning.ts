import { useEffect } from 'react';

import { isDeveloperMode } from 'src/common/environment';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!isDeveloperMode || !hasUnsavedChanges) {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Support browsers that still require the legacy cancellation mechanism.
      event.returnValue = true;
    }

    window.addEventListener('beforeunload', warnBeforeUnload);

    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);
}
