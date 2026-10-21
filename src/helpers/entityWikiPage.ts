export function entityWikiPage(value: string | undefined): {
  hasWikiPage: boolean;
  pageTitle: string | null;
  anchor?: string;
} {
  const endpoint = import.meta.env.VITE_WIKI_API_URL?.trim();

  if (!endpoint || !value) {
    return { hasWikiPage: false, pageTitle: null };
  }

  try {
    const api = new URL(endpoint);
    const url = new URL(value);
    const hasWikiPage = (api.protocol === 'https:' || api.protocol === 'http:') && url.origin.startsWith(api.origin);

    if (!hasWikiPage || !url.pathname.startsWith('/wiki/')) {
      return { hasWikiPage, pageTitle: null };
    }

    try {
      const pageTitle = decodeURIComponent(url.pathname.slice('/wiki/'.length)).replaceAll('_', ' ').trim();

      return { hasWikiPage, pageTitle: pageTitle || null, ...(url.hash ? { anchor: url.hash.slice(1) } : {}) };
    } catch {
      return { hasWikiPage, pageTitle: null };
    }
  } catch {
    return { hasWikiPage: false, pageTitle: null };
  }
}
