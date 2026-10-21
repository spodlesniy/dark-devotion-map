import { afterEach, describe, expect, it, vi } from 'vitest';

import { entityWikiPage } from 'src/helpers/entityWikiPage';

afterEach(() => vi.unstubAllEnvs());

describe('Entity wiki page recognition', () => {
  it('derives the page from the URL, ignoring fragments and query parameters', () => {
    vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
    expect(entityWikiPage('https://darkdevotion.fandom.com/wiki/Hezek_%2D_The_Baptized?x=1#Description')).toEqual({
      hasWikiPage: true,
      pageTitle: 'Hezek - The Baptized',
      anchor: 'Description',
    });
  });

  it('uses the requested origin prefix comparison', () => {
    vi.stubEnv('VITE_WIKI_API_URL', 'https://wiki.example/api.php');
    expect(entityWikiPage('https://wiki.example:8443/wiki/Test').hasWikiPage).toBe(true);
    expect(entityWikiPage('http://wiki.example/wiki/Test').hasWikiPage).toBe(false);
    expect(entityWikiPage('https://other.example/wiki/Test').hasWikiPage).toBe(false);
  });

  it.each([undefined, '', '  ', 'invalid', 'file:///api.php'])('disables recognition for endpoint %j', (endpoint) => {
    vi.stubEnv('VITE_WIKI_API_URL', endpoint);
    expect(entityWikiPage('https://darkdevotion.fandom.com/wiki/Test')).toEqual({
      hasWikiPage: false,
      pageTitle: null,
    });
  });

  it.each(['/wiki/', '/api.php', '/'])('recognizes the origin but rejects a missing page path: %s', (path) => {
    vi.stubEnv('VITE_WIKI_API_URL', 'https://wiki.example/api.php');
    expect(entityWikiPage(`https://wiki.example${path}`)).toEqual({ hasWikiPage: true, pageTitle: null });
  });
});
