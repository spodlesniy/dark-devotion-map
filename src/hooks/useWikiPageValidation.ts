import { useEffect, useState } from 'react';

import { wikiPageExists } from 'src/api/wiki';
import { entityWikiPage } from 'src/helpers/entityWikiPage';

export type WikiPageStatus = 'idle' | 'checking' | 'found' | 'missing' | 'error' | 'invalid';

export function useWikiPageValidation(url: string) {
  const [result, setResult] = useState<{ url: string; attempt: number; status: WikiPageStatus } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const { hasWikiPage, pageTitle } = entityWikiPage(url);

  useEffect(() => {
    setResult(null);

    if (!hasWikiPage || !pageTitle) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void wikiPageExists(pageTitle, controller.signal).then(
        (exists) => {
          if (!controller.signal.aborted) {
            setResult({ url, attempt, status: exists ? 'found' : 'missing' });
          }
        },
        () => {
          if (!controller.signal.aborted) {
            setResult({ url, attempt, status: 'error' });
          }
        }
      );
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, hasWikiPage, pageTitle, attempt]);

  const status: WikiPageStatus = !hasWikiPage
    ? 'idle'
    : !pageTitle
      ? 'invalid'
      : result?.url === url && result.attempt === attempt
        ? result.status
        : 'checking';

  return {
    hasWikiPage,
    wikiStatus: status,
    wikiValid: status === 'idle' || status === 'found',
    onWikiRetry: () => setAttempt((current) => current + 1),
  };
}
