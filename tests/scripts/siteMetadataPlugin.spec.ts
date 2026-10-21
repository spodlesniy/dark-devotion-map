// @vitest-environment node
import { createServer, type ViteDevServer } from 'vite';
import { afterEach, expect, it } from 'vitest';

import { siteMetadataPlugin } from '../../scripts/siteMetadataPlugin';

let server: ViteDevServer | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function renderPage(appUrl: string | undefined) {
  server = await createServer({
    configFile: false,
    logLevel: 'silent',
    plugins: [siteMetadataPlugin(appUrl)],
    server: { middlewareMode: true, hmr: false, watch: null },
  });

  return server.transformIndexHtml('/', '<html><head></head><body></body></html>');
}

it.each([
  ['https://example.com/map', 'https://example.com/map/'],
  [' https://example.com/map/// ', 'https://example.com/map/'],
  ['https://example.com', 'https://example.com/'],
  ['http://localhost:3001/map/', 'http://localhost:3001/map/'],
])('renders matching canonical and Open Graph URLs for %s', async (input, expected) => {
  const html = await renderPage(input);
  expect(html).toContain(`<link rel="canonical" href="${expected}">`);
  expect(html).toContain(`<meta property="og:url" content="${expected}">`);
  expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  expect(html.match(/property="og:url"/g)).toHaveLength(1);
});

it.each([undefined, '', '   '])('omits URL metadata when the site URL is %j', async (appUrl) => {
  const html = await renderPage(appUrl);
  expect(html).not.toContain('canonical');
  expect(html).not.toContain('og:url');
  expect(html).not.toContain('%VITE_APP_URL%');
});

it.each([
  '/map/',
  'not a URL',
  'ftp://example.com/map',
  'https://user:password@example.com/',
  'https://example.com/?token=example',
  'https://example.com/#map',
])('rejects an invalid public site URL %s', (appUrl) => {
  expect(() => siteMetadataPlugin(appUrl)).toThrow('VITE_APP_URL');
});
