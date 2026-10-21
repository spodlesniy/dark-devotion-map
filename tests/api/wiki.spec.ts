import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getWikiCodexDescription, getWikiDescription, getWikiImage, wikiPageExists } from 'src/api/wiki';

const fetchMock = vi.fn<typeof fetch>();

function respond(...bodies: unknown[]) {
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body)));
  }
}

function query(page: unknown) {
  return { query: { pages: { 155: page } } };
}

function requestUrl(index: number): URL {
  const input = fetchMock.mock.calls[index]?.[0];

  if (!(input instanceof URL)) {
    throw new Error('Expected a wiki URL');
  }

  return input;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Wiki page existence API', () => {
  it.each([
    [{ pageid: 155, title: 'Existing' }, true],
    [{ title: 'Missing', missing: '' }, false],
    [{ title: 'Invalid', invalid: '' }, false],
  ])('checks page existence without requesting content: %j', async (page, exists) => {
    respond(query(page));
    const controller = new AbortController();
    await expect(wikiPageExists(' Page name ', controller.signal)).resolves.toBe(exists);
    expect(requestUrl(0).searchParams.get('titles')).toBe('Page name');
    expect(requestUrl(0).searchParams.get('redirects')).toBe('1');
    expect(requestUrl(0).searchParams.has('prop')).toBe(false);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it('rejects malformed responses rather than reporting a missing page', async () => {
    respond({ query: { pages: {} } });
    await expect(wikiPageExists('Example')).rejects.toThrow('Invalid wiki API response');
  });
});

describe('Wiki description API', () => {
  it('finds Description by its current index and returns plain text with paragraph breaks', async () => {
    respond(
      {
        parse: {
          sections: [
            { line: 'Lore', index: '1' },
            { line: 'Description', index: '4' },
          ],
        },
      },
      {
        parse: {
          text: {
            '*': '<h2>Description <span class="mw-editsection">Edit</span></h2><p>First &amp; <a href="/wiki/Test">second</a>.</p><p>Another<br>line.</p><script>bad()</script>',
          },
        },
      }
    );
    const controller = new AbortController();

    await expect(getWikiDescription(' Hezek - The Baptized ', controller.signal)).resolves.toBe(
      'First & second.\n\nAnother\nline.'
    );
    expect(requestUrl(0).searchParams.get('page')).toBe('Hezek - The Baptized');
    expect(requestUrl(0).searchParams.get('prop')).toBe('sections');
    expect(requestUrl(1).searchParams.get('section')).toBe('4');
    expect(requestUrl(1).searchParams.get('disableeditsection')).toBe('1');
    for (const [input, options] of fetchMock.mock.calls) {
      expect(String(input)).toContain('origin=*');
      expect(options).toEqual({ credentials: 'omit', signal: controller.signal });
    }
  });

  it('encodes special characters in titles without adding query parameters', async () => {
    respond({ parse: { sections: [] } });
    const title = 'A & B # Test?origin=other/雪';

    await expect(getWikiDescription(title)).resolves.toBeNull();
    expect(requestUrl(0).searchParams.get('page')).toBe(title);
    expect(requestUrl(0).searchParams.get('origin')).toBe('*');
  });

  it('returns null without another request when Description is absent', async () => {
    respond({ parse: { sections: [{ line: 'Lore', index: '1' }] } });

    await expect(getWikiDescription('Example')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for an empty description', async () => {
    respond(
      { parse: { sections: [{ line: 'Description', index: '1' }] } },
      { parse: { text: { '*': '<h2>Description</h2><p> </p>' } } }
    );

    await expect(getWikiDescription('Example')).resolves.toBeNull();
  });
});

describe('Wiki image API', () => {
  it.each(['thumbnail', 'original'])('prefers the main %s over requesting an image list', async (field) => {
    respond(query({ [field]: { source: 'https://example.com/main.webp', width: 320, height: 289 } }));

    await expect(getWikiImage('Hezek - The Baptized')).resolves.toEqual({
      url: 'https://example.com/main.webp',
      width: 320,
      height: 289,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestUrl(0).searchParams.get('prop')).toBe('pageimages');
    expect(requestUrl(0).searchParams.get('redirects')).toBe('1');
  });

  it('prefers a thumbnail when both thumbnail and original are available', async () => {
    respond(
      query({
        thumbnail: { source: 'https://example.com/thumb', width: 320, height: 200 },
        original: { source: 'https://example.com/original', width: 1920, height: 1200 },
      })
    );

    expect((await getWikiImage('Example'))?.url).toBe('https://example.com/thumb');
  });

  it('falls back to the first image in parser order and resolves its thumbnail', async () => {
    respond(
      query({}),
      { parse: { images: ['First & image.jpg', 'Second.png'] } },
      query({
        imageinfo: [
          {
            thumburl: 'https://example.com/first.webp',
            thumbwidth: 320,
            thumbheight: 180,
            url: 'https://example.com/full.jpg',
            width: 1920,
            height: 1080,
          },
        ],
      })
    );
    const signal = new AbortController().signal;

    await expect(getWikiImage('Example', signal)).resolves.toEqual({
      url: 'https://example.com/first.webp',
      width: 320,
      height: 180,
    });
    expect(requestUrl(2).searchParams.get('titles')).toBe('File:First & image.jpg');
    expect(requestUrl(2).searchParams.get('iiurlwidth')).toBe('320');
    expect(fetchMock.mock.calls.every(([, options]) => options?.signal === signal)).toBe(true);
  });

  it('falls back to the original file when no thumbnail is returned', async () => {
    respond(
      query({}),
      { parse: { images: ['First.png'] } },
      query({ imageinfo: [{ url: 'https://example.com/first.png', width: 16, height: 16 }] })
    );

    await expect(getWikiImage('Example')).resolves.toEqual({
      url: 'https://example.com/first.png',
      width: 16,
      height: 16,
    });
  });

  it('returns null when no image exists', async () => {
    respond(query({}), { parse: { images: [] } });

    await expect(getWikiImage('Example')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Wiki request failures', () => {
  it.each([getWikiDescription, getWikiImage])('rejects empty titles before making requests', async (load) => {
    await expect(load('  ')).rejects.toThrow('page title');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an endpoint configuration', async () => {
    vi.stubEnv('VITE_WIKI_API_URL', undefined);

    await expect(getWikiImage('Example')).rejects.toThrow('VITE_WIKI_API_URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-HTTP endpoints', async () => {
    vi.stubEnv('VITE_WIKI_API_URL', 'file:///api.php');

    await expect(getWikiImage('Example')).rejects.toThrow('HTTP or HTTPS');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports HTTP failures', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429 }));

    await expect(getWikiImage('Example')).rejects.toThrow('HTTP 429');
  });

  it('reports API errors even with HTTP 200', async () => {
    respond({ error: { code: 'missingtitle', info: 'The page does not exist.' } });

    await expect(getWikiDescription('Missing')).rejects.toThrow('The page does not exist.');
  });

  it('reports missing pages in query responses', async () => {
    respond(query({ missing: '' }));

    await expect(getWikiImage('Missing')).rejects.toThrow('page does not exist');
  });

  it.each([{}, { parse: { sections: 'bad' } }, { parse: { sections: [{ line: 'Description' }] } }])(
    'rejects malformed section data: %j',
    async (body) => {
      respond(body);

      await expect(getWikiDescription('Example')).rejects.toThrow('Invalid wiki');
    }
  );

  it('rejects invalid image URLs', async () => {
    respond(query({ thumbnail: { source: 'javascript:bad()', width: 320, height: 200 } }));

    await expect(getWikiImage('Example')).rejects.toThrow('Invalid wiki image');
  });

  it('propagates network errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(getWikiImage('Example')).rejects.toThrow('Failed to fetch');
  });

  it('preserves cancellation errors', async () => {
    const aborted = new DOMException('Aborted', 'AbortError');
    fetchMock.mockRejectedValue(aborted);
    const controller = new AbortController();
    controller.abort();

    await expect(getWikiDescription('Example', controller.signal)).rejects.toBe(aborted);
  });
});

describe('Codex description API', () => {
  const root = { line: 'Codex Entry', index: '4', level: '2' };
  const first = { line: 'Different page title, 1/7', index: '10', level: '3' };
  const second = { line: 'Different page title, 2/7', index: '11', level: '3' };

  it.each([undefined, 2])('prioritizes a decoded URL anchor over template rules with part %j', async (part) => {
    respond(
      { parse: { sections: [root, first, { line: 'Legacy text', anchor: 'Entry,_2/4', index: '17' }] } },
      { parse: { text: { '*': '<p>Anchored text</p>' } } }
    );
    await expect(
      getWikiCodexDescription('Example', part, part === undefined ? undefined : 7, 'Entry%2C_2%2F4')
    ).resolves.toBe('Anchored text');
    expect(requestUrl(1).searchParams.get('section')).toBe('17');
  });

  it.each(['Missing', '%ZZ'])('does not fall back to template rules for unresolved anchor %s', async (anchor) => {
    respond({ parse: { sections: [root, first] } });
    await expect(getWikiCodexDescription('Example', 1, 7, anchor)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fall back when the anchored section has no text', async () => {
    respond(
      { parse: { sections: [{ ...root, anchor: 'Codex_Entry' }, first] } },
      { parse: { text: { '*': '<h2>Title only</h2>' } } }
    );
    await expect(getWikiCodexDescription('Example', undefined, undefined, 'Codex_Entry')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('selects the numbered subsection under Codex Entry by its actual index', async () => {
    respond(
      {
        parse: {
          sections: [{ line: 'Locations', index: '1', level: '2' }, { ...first, index: '2' }, root, first, second],
        },
      },
      {
        parse: {
          text: {
            '*': '<h3>Part title</h3><figure><figcaption>Image caption</figcaption></figure><p>Second<br>part.</p>',
          },
        },
      }
    );
    const controller = new AbortController();
    await expect(getWikiCodexDescription('Example', 2, 7, undefined, controller.signal)).resolves.toBe('Second\npart.');
    expect(requestUrl(0).searchParams.get('prop')).toBe('sections');
    expect(requestUrl(1).searchParams.get('section')).toBe('11');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, options]) => options?.signal === controller.signal)).toBe(true);
  });

  it.each([
    [root, { line: '11/7', index: '5', level: '3' }],
    [root, { line: '1/4', index: '5', level: '3' }],
    [root, { line: 'Other section', index: '5', level: '2' }, first],
    [{ line: 'Codex', index: '1', level: '2' }, first],
    [{ line: 'Transcript', index: '1', level: '2' }, first],
    [root, first, { ...first, index: '12' }],
  ])('returns null for a missing or ambiguous template part without other wiki lookups: %j', async (...sections) => {
    respond({ parse: { sections } });
    await expect(getWikiCodexDescription('Example', 1, 7)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('matches part numbers with whitespace and inline heading formatting', async () => {
    respond(
      { parse: { sections: [root, { ...first, line: '<i>Renamed entry</i>, 1 / 7 ' }] } },
      { parse: { text: { '*': '<p>Entry text</p>' } } }
    );
    await expect(getWikiCodexDescription('Example', 1, 7)).resolves.toBe('Entry text');
    expect(requestUrl(1).searchParams.get('section')).toBe('10');
  });

  it('does not try Codex when a template part is empty', async () => {
    respond(
      { parse: { sections: [root, first, { line: 'Codex', index: '20', level: '2' }] } },
      { parse: { text: { '*': '<h3>Title only</h3>' } } }
    );
    await expect(getWikiCodexDescription('Example', 1, 7)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('prefers Codex Entry over Codex when there is no part', async () => {
    respond(
      { parse: { sections: [{ line: 'Codex', index: '1' }, root] } },
      { parse: { text: { '*': '<p>Template text</p>' } } }
    );
    await expect(getWikiCodexDescription('Example')).resolves.toBe('Template text');
    expect(requestUrl(1).searchParams.get('section')).toBe('4');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses Codex when Codex Entry is absent and there is no part', async () => {
    respond(
      { parse: { sections: [{ line: 'Codex', index: '3' }] } },
      { parse: { text: { '*': '<p>Codex text</p>' } } }
    );
    await expect(getWikiCodexDescription('Example')).resolves.toBe('Codex text');
    expect(requestUrl(1).searchParams.get('section')).toBe('3');
  });

  it('uses Codex after empty template text when there is no part', async () => {
    respond(
      { parse: { sections: [root, { line: 'Codex', index: '20' }] } },
      { parse: { text: { '*': '<h2>Title only</h2>' } } },
      { parse: { text: { '*': '<p>Codex text</p>' } } }
    );
    await expect(getWikiCodexDescription('Example')).resolves.toBe('Codex text');
    expect(requestUrl(2).searchParams.get('section')).toBe('20');
  });

  it('returns null without requesting the introduction or Transcript when no eligible section exists', async () => {
    respond({ parse: { sections: [{ line: 'Transcript', index: '1' }] } });
    await expect(getWikiCodexDescription('Example')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates text errors without trying other sections', async () => {
    respond({ parse: { sections: [root, first] } }, { error: { code: 'nosuchsection', info: 'Section missing' } });
    await expect(getWikiCodexDescription('Example', 1, 7)).rejects.toThrow('Section missing');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [0, 7],
    [-1, 7],
    [1.5, 7],
    [NaN, 7],
    [1, Infinity],
    [2, 1],
    [1, undefined],
    [undefined, 7],
  ])('rejects invalid part pair %j before fetching', async (part, totalParts) => {
    await expect(getWikiCodexDescription('Example', part, totalParts)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([{ parse: { sections: {} } }, { parse: { sections: [{ line: 'Codex Entry' }] } }])(
    'rejects malformed section metadata: %j',
    async (body) => {
      respond(body);
      await expect(getWikiCodexDescription('Example')).rejects.toThrow('Invalid wiki');
    }
  );
});
