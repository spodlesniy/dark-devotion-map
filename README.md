# Dark Devotion Map

An interactive map for [Dark Devotion](https://store.steampowered.com/app/718590/Dark_Devotion/).

Open the **Dark Devotion Map** drawer and click an entity title: the map locates it and opens its popup. Every activation repeats navigation and opens the details, even after manual movement or closing the popup. Hidden entries are made visible when activated without enabling their hidden siblings. Titles appear as clickable text without button backgrounds, borders, or separate edit buttons. Hover over a point for its title, click it for details. NPC icons are selected from images/entities/point/npc/ using lowercase titles with each non-alphanumeric character replaced by a hyphen; missing icons retain the existing fallback. Tablet titles and colored icon borders are derived from their subtype; tablet and mirror teleporter forms omit Title, Description, and URL. Lost room forms expose optional Title, Description, and URL fields; their popups can load wiki descriptions without images and show the URL at the bottom. Mirror teleporters display Mirror Teleporter; lost rooms use their trimmed title or Lost room when blank. Altar titles are derived from their subtype; Description and URL remain editable. Teleportation altars are counted under Teleporters rather than Altars. Teleportation altars and Faith statues have no Faith cost input. Arrows items display a derived title and use `images/entities/point/item/arrows.png`. Title points render their text on the map with one of four sizes and a custom color; the developer form uses the native browser color picker. Title popup links remain visible while wiki data loads. An open point popup highlights an existing icon frame.
Entities are loaded from the repository database.
The list groups entities under **Titles**, **NPCs**, **Codex**, **Items**, **Enemies**, and **Places**, in that order, with counts beside group titles. NPCs sharing a title are grouped into collapsed lists with group eyes and counts; a unique title remains an ordinary entity action with its own eye and no count; member titles locate individual instances without individual eyes. Enemies have **Bosses** and **Regular** subgroups; Regular enemies are further grouped by title, with collapsed lists, group eyes and counts, and title-only member navigation; places and items have subgroups by subtype. Tablets are further grouped by tablet type, with collapsed lists, visibility controls and counts; their entity lists show clickable titles without individual eyes. Traps and Blockers are grouped by subtype into static title, visibility eye and count rows without expandable member lists. Altars are grouped by altar subtype into static rows showing the subtype title, visibility eye and count, without expandable member lists. Teleportation altars remain in Teleporters. Switches is an expandable subgroup containing static Levers, Buttons and Blood donations rows; their icons, titles, eyes and counts align with the parent row. Subgroups use native collapsible lists, initially collapsed, with their own counts, except Teleporters, Mirror teleporters, Chests, Prison cells, Prison keys, and Arrows, plus the three Switch subtype rows, which show static rows with visibility controls and counts. All main groups are collapsible; Enemies and Places start expanded when non-empty, while the others start collapsed, with disclosure arrows after their counts. Entity rows also have visibility controls; parent eyes show a mixed state when only some descendants are visible. Clicking a mixed eye enables its entire subtree. Shift-click an eye to show only that node and its descendants, including members hidden by search; holding Shift highlights the hovered eye and changes its tooltip. Reset restores all map visibility. Icons appear before group titles for plain lists and before subgroup titles for collapsible lists, rather than on entity rows. Without active search, empty groups and subgroups remain visible with zero counts and their category icons, but cannot be expanded and show no disclosure arrow. During search, branches with zero matches are hidden unless showWhenNoMatches is true; all first-level groups explicitly retain their headings. Lists close automatically when their last entry is removed. NPCs, Codex, Titles, Bosses and Regular title groups sort by title in ascending, case-insensitive natural order. Other lists retain their configured or database order. Codex entries use a non-empty optional Group as their grouping key and label; otherwise multipart entries group by title. Groups start collapsed and member labels show title plus part/totalParts when present, sorted by numeric part. Entries without parts remain individual actions unless Group is set.

The drawer handle aligns with the full header height and forms its right-hand extension. While the drawer is closed, a subtle highlight sweeps across the handle every five seconds; reduced-motion preferences disable it. The search field uses its placeholder without a visible label. Search and Reset stay together in a sticky row at the top of the drawer content while the entity list scrolls underneath. The adjacent Reset icon button clears search, cancels pending input, restores initial disclosure (Enemies and Places expanded when non-empty; other lists collapsed), and shows all map entities again. It preserves the working database, unsaved-change status, map position, and developer tool settings. Its standalone SearchInput component owns typing state and applies normalized queries after a 300ms pause at three or more characters; shorter input clears filtering immediately. Typing does not update the entity menu until the applied query changes. The menu reuses its complete entity tree across search and visibility updates, rebuilding it when the entities array changes. Applied search opens matching category paths at any depth; generated groups (such as Regular enemy titles, Tablet types, and Altar titles) retain their current disclosure by default. The expandOnSearch node option can override this behavior. Emptying the search field performs the same reset, while keeping input focus. Non-empty input below three characters only removes text filtering and preserves disclosure and map visibility.

The drawer header displays the application version below its title in both modes. Vite sets `VITE_APP_VERSION` from `package.json` for development and production builds.

## Getting started

Use Node.js 24.18.0 or a newer 24.x release. The project records npm 11.16.0 as its package manager version in `package.json`.

```sh
npm ci
npm run dev
```

The development server starts on port 3001 by default. Run `npm run build` to check all TypeScript projects and create the production application in `build/`, then `npm run preview` to inspect it locally.

The `private: true` setting prevents npm package publication; it does not prevent publishing the repository or hosting the built map. License details and game-asset exclusions are documented in [LICENSE.md](LICENSE.md).

## GitHub Actions and Pages

The [Check and deploy workflow](.github/workflows/ci.yml) runs on pushes to every branch and tags matching `v*`. It installs dependencies with `npm ci`, runs React Compiler healthcheck, runs all tests once, and builds the production application. Branch pushes do not deploy. Tag pushes upload `build/` and deploy it to GitHub Pages only after all preceding steps succeed.

Node.js is selected from `engines.node` in `package.json`. `actions/setup-node` caches npm downloads using `package-lock.json` as the dependency cache key; `node_modules` and build outputs are not cached. New pushes cancel older runs for the same event and full branch/tag ref. Deployments share an additional `github-pages` concurrency group and do not interrupt an active deployment.

After creating and connecting your GitHub repository:

1. Open **Settings → Pages** and select **GitHub Actions** as the build and deployment source.
2. In **Settings → Environments → github-pages**, allow deployment from tags matching `v*`. A policy permitting only the default branch will reject tag deployments.
3. Optionally add the repository Actions variable `VITE_WIKI_API_URL` with value `https://darkdevotion.fandom.com/api.php` under **Settings → Secrets and variables → Actions → Variables**. Leaving it unset disables wiki integration in CI builds; local `.env` files are not uploaded.
4. Push a release tag, for example `git tag v0.4.111` followed by `git push origin v0.4.111`. The tag must point to a commit containing the workflow. This workflow does not bump versions or create tags automatically.

The workflow sets `VITE_AUTHOR_URL` to the repository owner's GitHub profile (`https://github.com/<owner>`). For tag builds, `configure-pages` supplies the Pages base path, including support for a repository subdirectory or a custom domain. Branch builds use the standard repository Pages path (or `/` for `<owner>.github.io`). The router, map tiles, entity icons and built asset URLs use Vite's base path. Only the map's root route is currently published; adding nested routes will require a static-host routing strategy for direct navigation.

The workflow uses the built-in `GITHUB_TOKEN` and the `github-pages` environment; no personal access token or deployment branch is needed. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Environment variables

Copy `.env.example` to `.env.local` and set the optional values for your deployment:

| Variable            | Purpose                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_AUTHOR_URL`   | Author profile or website URL for the map attribution. A non-empty trimmed value adds a copyright notice with an **Author** link that opens in a new tab; an unset, empty, or whitespace-only value omits the author attribution. |
| `VITE_WIKI_API_URL` | MediaWiki API endpoint. An unset or blank value disables wiki integration; see [Wiki API](docs/wiki-api.md).                                                                                                                      |
| `VITE_APP_VERSION`  | Set automatically by Vite from `package.json`; no manual environment setting is needed.                                                                                                                                           |

Restart the development server after changing environment files. `VITE_*` values are public and embedded in the client build; changing them for a deployed map requires rebuilding.

## Entity database

The database lives in `src/data/entities.json`. When running `npm run dev`, click **Export JSON** in the Developer tools window to download the current working database.
See [Map entities](docs/map-entities.md) for the format, validation rules, and instructions for updating the repository database.

## Wiki API

Point hover tooltips show only the title. Click a point to open its detailed popup; close it with another click on the same point, a click on the map background, Escape, or the close button. Opening another point closes the previous popup. While a point popup is open, other entities' developer toolbars are suppressed.

A standalone client in `src/api/wiki.ts` can retrieve a page's Description text and main or first image using native `fetch`. Configure `VITE_WIKI_API_URL` using `.env.example`. See [Wiki API](docs/wiki-api.md) for configuration, return values, errors, and cancellation. Enemy and Title popups load wiki descriptions and images on first opening, using the page name from the entity's wiki URL. NPC popups load only wiki images and retain local descriptions, showing available text and images side by side. Codex popups prioritize the section anchor in their wiki URL, falling back to local descriptions if that anchor is missing or empty. Without an anchor, they follow the Codex Entry template, selecting a matching part subsection when needed. Without parts, Codex is the fallback section; missing wiki text retains the local description. Developer forms check recognized wiki URLs after a 500ms debounce and require a successful page check before saving. Without the endpoint, wiki integration is disabled.

## Images

Map tiles live in `public/images/map/tiles/{z}/{x}/{y}.png`.
Point icons are PNG files under `public/images/entities/point`, with filenames derived from the point category and subtype. The application indexes matching paths automatically and falls back to a colored dot when an icon is unavailable. Restart the development server after adding files. See [Point icons](docs/map-entities.md#point-icons) for naming and storage details.

Font files extracted from Dark Devotion are not used in this project.

## Application modes

- `npm run build` produces a read-only map for browsing entities and navigating the map. Creation, editing, JSON export, and synchronization controls are excluded.
- `npm run dev` enables developer mode, including point creation, editing and deletion, JSON export, and repository synchronization. Coordinates are shown for reference; use **Move** on the map to change a point's position. Hover over a point to access its editing toolbar. Point tooltips and popups stay hidden during Move mode.
- `npm run preview` serves the built application and keeps it read-only.

The mode is determined by Vite's `import.meta.env.DEV` at build time, not by a URL parameter or a browser setting. This is a UI capability boundary, not an authentication mechanism.

In developer mode, the **Icon BG** checkbox beside the unsaved-change status toggles map icon backgrounds and borders without changing entity data. It starts enabled.

In developer mode, right-click the map and choose **Add Entity → Add point…**, to open the point form.

New entities stay in memory and appear immediately in the drawer and on the map. The developer tools window shows **Unsaved changes** whenever the working database differs from its last synchronized snapshot (initially the loaded repository database). Export JSON to retain changes before leaving or reloading the page; downloading does not clear the status. Replace `src/data/entities.json` with the exported file, then click **Sync** to verify that it matches the current working database. Sync clears the status only on a match and never writes or replaces working data. Repository JSON hot updates preserve the working state until this check. In developer mode, the browser asks for confirmation before closing, reloading, or leaving the page while unsaved changes exist. Successful Sync or restoring the synchronized contents disables the warning; export alone does not. See [unload warning limitations](docs/map-entities.md#unload-warning).

The **Developer tools** window is available only in developer mode and stays above the map and drawer. It starts collapsed to its header. Drag its header to reposition it; use the header button to collapse it to a bar or expand it. Its header stays within the viewport, including after resizing; the content may extend below it. A bottom status bar, separated by a border, shows the loaded entity count and right-aligned cursor coordinates while the pointer is over the map image. Position and collapsed state last until reload. Native editing and confirmation dialogs remain above the tool window.

The menu uses the reusable [tree component](docs/tree.md), with recursive category configuration and a pure search projection for hidden rows, matching counts, and disclosure flags, and a separate rendering adapter for icons and navigation. Hierarchical map visibility remains independent of menu search.

## Styling

Menu titles use the reusable [ScrollingText component](docs/scrolling-text.md) for ellipsis and hover/focus scrolling with fixed endpoint pauses. Only shown rows mount it; active instances share one ResizeObserver.

Define theme colors, spacing aliases, and component dimensions in `src/index.scss` and reuse their CSS custom properties in component styles.
Shared corner radii are `--border-radius: 2px` and `--border-radius-large: 4px`, derived from the size scale. The drawer handle uses the large radius for its bottom-right corner.
Spacing aliases derive from the shared scale in `src/styles/sizes.scss`. The drawer always reserves and displays its vertical scrollbar. Scrollbar rules live in `src/styles/scrollbar.scss` and use the same theme.

Run `npm run lint:styles -- --fix` to format all project CSS/SCSS according to `.stylelintrc.json`. Stylelint controls spacing, including blank lines before at-rules and rule blocks; keep its output unchanged.

Markdown is not included in the current Biome file patterns. `.editorconfig` defines basic whitespace and line-ending settings, but no Markdown formatter is pinned in the workspace. Formatting on save therefore depends on the editor's selected formatter and installed extensions, which can align tables, adjust lists, and reflow paragraphs differently.

## Testing

Place all tests and shared test utilities in `tests/`, mirroring the relevant `src/` directories.
Use `*.spec.ts` / `*.spec.tsx` or `*.test.ts` / `*.test.tsx` for test files.
Shared test setup lives in `tests/setup.ts`.

Use browser verification when automated checks do not provide enough confidence or the relevant behavior is difficult to verify automatically, for example visual layout, hover interactions, or native browser behavior. Choose this based on the change; it is not required for every UI change.

- Run tests once: `npm run test:run` (equivalent to `npm test -- --run`).
- Watch tests: `npm test`.
- Generate a coverage report: `npm run test:coverage`.
- Generate a JSON coverage summary: `npm run test:coverage:summary`.
- Check all TypeScript projects: `npx tsc -b`.
- Check test types separately: `npx tsc -p tsconfig.test.json`.

TypeScript configuration is split between `tsconfig.app.json` (application),
`tsconfig.test.json` (tests and the source code they import), and `tsconfig.node.json` (tooling).
The root `tsconfig.json` includes all three in the build checks.

Run `npm run lint` for Biome checks, `npm run lint:styles` for SCSS checks, and `npm run healthcheck` for React Compiler diagnostics. The health check supplements the build and tests.

## License

The original source code and documentation of this project are licensed under the [MIT License](LICENSE.md).
Dark Devotion assets, including map imagery, map tiles, and icons taken from the game, are excluded from the MIT License and remain the property of their respective owners. This applies to game-derived assets under `public/images/map` and `public/images/entities`, as well as any copies or adapted versions elsewhere in the project.
The project grants no permission to reuse or redistribute these assets. Attribution and inclusion in this repository do not constitute permission from their owners.

## Copyright Notice

Dark Devotion © 2019 [The Arcade Crew](https://www.thearcadecrew.com/)
and [Hibernian Workshop](https://hibernian-workshop.com/). All rights reserved.

All rights to the game and its assets belong to their respective owners.

Map imagery, map tiles, and any icons taken from Dark Devotion are credited to the game's creators and respective rights holders identified above. These materials are used to identify locations and entities in the fan-made interactive map; no ownership of the original game artwork is claimed.

This is an unofficial fan project and is not affiliated with or endorsed by the game's developer or publisher.

## Credits

Inspired by the [Salt & Sanctuary Interactive Map](https://kaszub09.github.io/SSMap/)
by [Kaszub09](https://github.com/Kaszub09).

[Salt & Sanctuary map source repository](https://github.com/Kaszub09/SSMap).

[Dark Devotion Wiki](https://darkdevotion.fandom.com/). Thanks to the wiki community for documenting the game.

Developed with assistance from OpenAI Codex.
