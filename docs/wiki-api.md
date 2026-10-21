# Wiki API

`src/api/wiki.ts` provides a read-only MediaWiki client using the browser's native `fetch`. It has no React or HTTP-library dependency. The client is available in both application modes. Point title-only hover tooltips never request wiki data; detailed popups load it on the first click. Enemy, NPC, Codex, and Title popups load wiki data on demand; fetched content never changes the entity database.

## Configuration

Copy `.env.example` to `.env.local`, or add its variable to an existing environment file:

```dotenv
VITE_WIKI_API_URL=https://darkdevotion.fandom.com/api.php
```

Restart the development server after changing environment files. Vite exposes `VITE_*` variables publicly and replaces them during production builds; changing the deployed endpoint requires rebuilding. An unset, empty, or whitespace-only endpoint disables popup wiki integration: no requests, loading indicator, or wiki errors are shown, and local entity content remains available. Direct API method calls still reject missing configuration. Only absolute HTTP or HTTPS endpoints are accepted.

Requests use GET, JSON responses, `origin=*`, redirects, and omitted credentials. The wiki server must allow cross-origin requests. No API keys or login are used. Endpoint query parameters are replaced by the client's request parameters.

## Description

```ts
import { getWikiDescription } from 'src/api/wiki';

const controller = new AbortController();
const description = await getWikiDescription('Hezek - The Baptized', controller.signal);
```

The method first requests `action=parse&prop=sections`, finds the exact English heading `Description`, then fetches that section's current index using `prop=text`. Numeric section indices are never persisted. The returned value is `string | null`: missing or empty Description sections return `null`.

Returned HTML is parsed into a detached document and converted to plain text. Headings, edit controls, scripts, and styles are removed; links retain their text, entities are decoded, and paragraph/line breaks are preserved. Remote HTML is never rendered by this module. The text conversion requires browser DOM APIs; Node.js scripts need their own DOM implementation.

## Image

```ts
import { getWikiImage } from 'src/api/wiki';

const image = await getWikiImage('Hezek - The Baptized');
// image: { url: string; width: number; height: number } | null
```

The method prefers the main image chosen by `prop=pageimages`, requesting a thumbnail up to 320px wide and using the original when no thumbnail is returned. If the page has no main image, it requests `action=parse&prop=images`, selects the first filename in the returned order, and resolves it with `prop=imageinfo`. This fallback uses a thumbnail when available, otherwise the original file. It does not rank images or distinguish portraits from screenshots or animations.

Pages without images return `null`. Image results contain the URL and actual dimensions supplied by the API. No image bytes are downloaded by the client itself, and no files are saved. Content types may differ from the filename extension because the wiki image server can serve optimized formats.

## Enemy, NPC, and Codex popups

Enemy and Title point popups request Description and image concurrently when first opened, using the page name extracted from the entity URL. The URL origin must start with the configured API origin, and its path must begin with `/wiki/` followed by a non-empty page name. Percent encoding is decoded, underscores become spaces, and query parameters and fragments do not form part of the page name. The display title is independent of the wiki page name. Recognition is computed from current metadata, including loaded database entities; `hasWikiPage` is never persisted. Missing or unrelated URLs retain local title, description, and link content without wiki requests. NPCs request only the main or first image from their wiki URL; they always use the entity description rather than fetching wiki Description text. Codex popups request text using the rules below; other categories do not request wiki popup data. Until both API requests settle, the popup shows its title and loading indicators only; descriptions, entity links, and developer hints remain hidden, except that Title entities keep their URL links visible throughout loading. Afterwards, it displays the wiki description when present, otherwise the local description, and restores links and hints. Image-file loading has its own placeholder and does not delay the resolved text.

Wiki Description replaces the displayed local description when available; missing descriptions or failed requests retain the local text. The title always appears above the body. Successful image results appear in the body, in a right-hand column beside the description and supporting text. A themed square image frame is reserved while the API and image are loading, with a loading indicator until the image load event. The frame keeps the same dimensions after loading; images fit inside it without cropping. The two-column body has a stable width constrained by the popup and viewport. Missing images and image-load failures retain the text-only layout. Partial API failures preserve successful data and show a short status message. Existing entity links and developer hints remain available.

NPC popups use two columns when both a local description and an image are available. Without a description, the image uses a single column without empty text space; without an image, only local text is shown. If neither is available, no description or image is rendered. Titles, entity links, and developer hints remain available. The entity URL is a separate final row below the text/image body in all popups. Its hostname and external-link icon stay on one line; oversized hostnames are truncated with an ellipsis, while the link title retains the full URL. Missing images are normal results; failed image files remove the frame.

Popup images use `referrerPolicy="no-referrer"` in both developer mode and production. The Fandom image CDN can return HTTP 404 when an image request includes the application's external Referer, even though opening the same URL directly succeeds. Omitting Referer for these images avoids that difference without changing the API-provided URL or the referrer policy of other resources.

Each mounted point overlay caches pending and completed results by extracted page name, content mode (Enemy description/image, NPC image only, or Codex text), Codex part/totalParts pair, and URL fragment in memory, including failures. Closing a popup does not cancel its requests; reopening reuses the result. Changing the URL to a different wiki page or Codex fragment loads that content on its next opening (or immediately if already open), and late results for the old page are ignored. Changing only the display title does not reload wiki data. Removing and recreating a marker or reloading the page resets its cache. Data is not persisted or exported.

## Codex descriptions

getWikiCodexDescription(pageTitle, part?, totalParts?, anchor?, signal?) first retrieves the section list. If a Codex wiki URL includes a fragment, its percent-decoded value must match a section anchor exactly. That section takes priority over template and part rules. An unmatched anchor or empty section retains the local description without searching other sections. Arbitrary HTML anchors outside the section list are not supported. Without a fragment, the template rules below apply. Part and totalParts must be either both absent or a valid positive safe-integer pair with part <= totalParts. Numeric entity parts are never used directly as API section indices. The optional anchor argument is the URL fragment without its leading #.

With a part pair, the client finds the Codex Entry parent and searches only its descendants, stopping at the next heading of equal or higher level. A candidate heading must end in the matching part/totalParts pair; its preceding title is unrestricted. Exactly one match is required. The client requests the matching section's actual index, which can differ from the part number. Missing template parents, missing parts, ambiguous matches, or empty text return null: no Codex, Transcript, or introductory-section fallback is attempted for multipart entities.

Without parts, the client requests the whole Codex Entry section by its current index, including any child parts. If absent or empty, it tries Codex. If neither supplies text, the result is null. It never selects Transcript or section=0 automatically. Missing text and API errors leave the popup using its local description.

Returned HTML becomes plain text with paragraph and line breaks; headings, image figures/captions, scripts, and styles are removed. Codex does not request or render wiki images. Its first opening shows a text loading indicator; afterwards wiki text replaces local text when available. Page, URL-fragment, or part-pair changes load the corresponding cached or fresh result, and obsolete responses cannot replace current content. Reopening reuses pending/completed results, including failures, for the lifetime of the mounted popup. Changing only the display title does not reload content.

## Form URL validation

`wikiPageExists(pageTitle, signal?)` checks `action=query&titles=...&redirects=1` without fetching content. It returns false for missing or invalid pages and rejects network, HTTP, API, and malformed-response errors. A found page need not have a Description section or an image.

Point creation/editing forms show a disabled **Wiki Page** checkbox alongside the URL label, reflecting the origin-prefix recognition above. Recognized URLs are checked 500ms after the last input change, including prefilled URLs. Each URL change or form unmount aborts the previous request and cancels its timer; stale responses cannot override the current result. Saving is blocked during debounce and requests, for missing pages or unusable page paths, and after request failures. Failures show an explicit message and a Retry button. Unrelated URLs use local absolute-URL validation only. Missing endpoint configuration disables all wiki checks and recognition.

## Popup resizing

Point popup dimensions are measured from their content and transitioned over `--map-tooltip-transition-duration` (180ms). Content observation is attached after the React portal mounts, and each React commit schedules a fresh measurement for an open popup. ResizeObserver tracks further content changes as wiki data arrives and tracks the outer popup during resizing so placement stays within the viewport. A separate clipping wrapper preserves the Leaflet arrow and contains content during the transition; oversized content retains its internal scrollbar. Reduced-motion preferences disable the transition.

## Errors and cancellation

Description and image methods reject on missing configuration, blank page titles, HTTP failures, MediaWiki error responses, missing pages, malformed responses, or network failures. Missing Description or absent images are normal `null` results. The existence check shares these errors except that missing or invalid pages return false. HTTP failures are checked explicitly, because `fetch` does not reject automatically for error status codes. Abort errors propagate unchanged.

All four methods accept an optional `AbortSignal`, passed to every request in the operation. Call `controller.abort()` to cancel. The client does not add retries, timeouts, application caching, or persistent storage. Consumers implement these policies; form validation supplies cancellation and manual retries, while popups cache content. Results do not mutate entities or affect unsaved-change tracking.

When content is integrated into the UI or exported database, preserve source attribution and applicable content licensing separately from the project's code license.

## References

- [MediaWiki parsing API](https://www.mediawiki.org/wiki/API:Parsing_wikitext)
- [PageImages API](https://www.mediawiki.org/wiki/Extension:PageImages#API)
- [Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo)
- [Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

Tests in `tests/api/wiki.spec.ts` use mocked responses and do not depend on wiki availability.
