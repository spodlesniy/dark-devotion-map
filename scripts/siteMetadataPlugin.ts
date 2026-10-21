import type { HtmlTagDescriptor, Plugin } from 'vite';

export function siteMetadataPlugin(appUrl: string | undefined): Plugin {
  const value = appUrl?.trim();
  let canonicalUrl: string | undefined;

  if (value) {
    const message =
      'VITE_APP_URL must be an absolute HTTP(S) URL without credentials, query parameters, or a fragment.';
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(message);
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error(message);
    }

    url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
    canonicalUrl = url.href;
  }

  return {
    name: 'site-metadata',
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];

      if (canonicalUrl) {
        tags.push(
          { tag: 'link', attrs: { rel: 'canonical', href: canonicalUrl } },
          { tag: 'meta', attrs: { property: 'og:url', content: canonicalUrl } }
        );
      }

      return tags;
    },
  };
}
