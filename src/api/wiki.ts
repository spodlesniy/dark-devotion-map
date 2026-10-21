import { codexPartsError } from 'src/helpers/codexPartsError';

export type WikiImage = Readonly<{
  url: string;
  width: number;
  height: number;
}>;

type WikiObject = Record<string, unknown>;

const thumbnailWidth = 320;

function readObject(value: unknown): WikiObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid wiki API response.');
  }

  return value as WikiObject;
}

function readPageTitle(pageTitle: string): string {
  const title = pageTitle.trim();

  if (!title) {
    throw new Error('Enter a wiki page title.');
  }

  return title;
}

async function request(parameters: Record<string, string>, signal?: AbortSignal): Promise<WikiObject> {
  const endpoint = import.meta.env.VITE_WIKI_API_URL?.trim();

  if (!endpoint) {
    throw new Error('Set VITE_WIKI_API_URL to use the wiki API.');
  }

  const url = new URL(endpoint);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('VITE_WIKI_API_URL must be an HTTP or HTTPS URL.');
  }

  url.search = new URLSearchParams({ ...parameters, format: 'json', origin: '*' }).toString();
  const response = await fetch(url, { credentials: 'omit', ...(signal ? { signal } : {}) });

  if (!response.ok) {
    throw new Error(`Wiki API request failed (HTTP ${response.status}).`);
  }

  const payload: unknown = await response.json();
  const data = readObject(payload);

  if (data.error) {
    const error = readObject(data.error);

    throw new Error(`Wiki API error: ${String(error.info ?? error.code ?? 'Unknown error')}`);
  }

  return data;
}

function readPage(data: WikiObject): WikiObject {
  const query = readObject(data.query);
  const pages = readObject(query.pages);
  const page = readObject(Object.values(pages)[0]);

  if ('missing' in page || 'invalid' in page) {
    throw new Error('Wiki page does not exist.');
  }

  return page;
}

function readImage(value: unknown): WikiImage {
  const image = readObject(value);
  const { url, width, height } = image;

  if (
    typeof url !== 'string' ||
    !/^https?:\/\//i.test(url) ||
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error('Invalid wiki image response.');
  }

  return { url, width, height };
}

function descriptionText(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');

  for (const element of document.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,.mw-editsection,script,style,noscript,figure,.thumb,img'
  )) {
    element.remove();
  }

  for (const element of document.querySelectorAll('br')) {
    element.replaceWith('\n');
  }

  for (const element of document.querySelectorAll('p,li,div,blockquote')) {
    element.append('\n\n');
  }

  return (document.body.textContent ?? '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function getWikiDescription(pageTitle: string, signal?: AbortSignal): Promise<string | null> {
  const page = readPageTitle(pageTitle);
  const data = await request({ action: 'parse', page, prop: 'sections', redirects: '1' }, signal);
  const parsed = readObject(data.parse);

  if (!Array.isArray(parsed.sections)) {
    throw new Error('Invalid wiki sections response.');
  }

  const section = parsed.sections.map(readObject).find((entry) => entry.line === 'Description');

  if (!section) {
    return null;
  }

  if (typeof section.index !== 'string') {
    throw new Error('Invalid wiki section index.');
  }

  return getWikiSectionDescription(page, section.index, signal);
}

async function getWikiSectionDescription(page: string, section: string, signal?: AbortSignal): Promise<string | null> {
  const content = await request(
    { action: 'parse', page, prop: 'text', section, redirects: '1', disableeditsection: '1' },
    signal
  );
  const text = readObject(readObject(content.parse).text)['*'];

  if (typeof text !== 'string') {
    throw new Error('Invalid wiki description response.');
  }

  return descriptionText(text) || null;
}

export async function getWikiCodexDescription(
  pageTitle: string,
  part?: number,
  totalParts?: number,
  anchor?: string,
  signal?: AbortSignal
): Promise<string | null> {
  const page = readPageTitle(pageTitle);
  const error = codexPartsError(part, totalParts);

  if (error) {
    throw new Error(error);
  }

  const data = await request({ action: 'parse', page, prop: 'sections', redirects: '1' }, signal);
  const parsed = readObject(data.parse);

  if (!Array.isArray(parsed.sections)) {
    throw new Error('Invalid wiki sections response.');
  }

  const sections = parsed.sections.map(readObject);
  if (anchor) {
    let decodedAnchor: string;

    try {
      decodedAnchor = decodeURIComponent(anchor);
    } catch {
      return null;
    }

    const matches = sections.filter((section) => section.anchor === decodedAnchor);
    const section = matches.length === 1 ? matches[0] : undefined;

    if (!section) {
      return null;
    }

    if (typeof section.index !== 'string') {
      throw new Error('Invalid wiki section index.');
    }

    return getWikiSectionDescription(page, section.index, signal);
  }

  const rootIndex = sections.findIndex((entry) => entry.line === 'Codex Entry');
  const root = sections[rootIndex];

  if (part !== undefined) {
    if (!root) {
      return null;
    }

    const rootLevel = Number(root.level);

    if (!Number.isInteger(rootLevel) || rootLevel < 1 || rootLevel > 6) {
      throw new Error('Invalid wiki section level.');
    }

    const candidates: WikiObject[] = [];

    for (const section of sections.slice(rootIndex + 1)) {
      const level = Number(section.level);

      if (!Number.isInteger(level) || level < 1 || level > 6) {
        throw new Error('Invalid wiki section level.');
      }

      if (level <= rootLevel) {
        break;
      }

      const title = typeof section.line === 'string' ? descriptionText(section.line) : '';
      const numbers = title.match(/(?:^|[\s,])(\d+)\s*\/\s*(\d+)\s*$/);

      if (numbers && Number(numbers[1]) === part && Number(numbers[2]) === totalParts) {
        candidates.push(section);
      }
    }

    const section = candidates.length === 1 ? candidates[0] : undefined;

    if (!section) {
      return null;
    }

    if (typeof section.index !== 'string') {
      throw new Error('Invalid wiki section index.');
    }

    return getWikiSectionDescription(page, section.index, signal);
  }

  for (const section of [root, sections.find((entry) => entry.line === 'Codex')]) {
    if (!section) {
      continue;
    }

    if (typeof section.index !== 'string') {
      throw new Error('Invalid wiki section index.');
    }

    const description = await getWikiSectionDescription(page, section.index, signal);

    if (description) {
      return description;
    }
  }

  return null;
}

export async function wikiPageExists(pageTitle: string, signal?: AbortSignal): Promise<boolean> {
  const data = await request({ action: 'query', titles: readPageTitle(pageTitle), redirects: '1' }, signal);
  const pages = readObject(readObject(data.query).pages);
  const page = readObject(Object.values(pages)[0]);

  return !('missing' in page || 'invalid' in page);
}

export async function getWikiImage(pageTitle: string, signal?: AbortSignal): Promise<WikiImage | null> {
  const pageTitleValue = readPageTitle(pageTitle);
  const data = await request(
    {
      action: 'query',
      titles: pageTitleValue,
      prop: 'pageimages',
      piprop: 'thumbnail|original',
      pithumbsize: String(thumbnailWidth),
      redirects: '1',
    },
    signal
  );
  const page = readPage(data);
  const primary = page.thumbnail ?? page.original;

  if (primary) {
    const image = readObject(primary);

    return readImage({ url: image.source, width: image.width, height: image.height });
  }

  const imagesData = await request({ action: 'parse', page: pageTitleValue, prop: 'images', redirects: '1' }, signal);
  const images = readObject(imagesData.parse).images;

  if (!Array.isArray(images) || images.some((name) => typeof name !== 'string')) {
    throw new Error('Invalid wiki image list.');
  }

  const firstImage = images[0];

  if (!firstImage) {
    return null;
  }

  const file = readPage(
    await request(
      {
        action: 'query',
        titles: `File:${firstImage}`,
        prop: 'imageinfo',
        iiprop: 'url|size',
        iiurlwidth: String(thumbnailWidth),
        redirects: '1',
      },
      signal
    )
  );

  if (!Array.isArray(file.imageinfo) || file.imageinfo.length === 0) {
    return null;
  }

  const image = readObject(file.imageinfo[0]);

  return readImage(
    image.thumburl ? { url: image.thumburl, width: image.thumbwidth, height: image.thumbheight } : image
  );
}
