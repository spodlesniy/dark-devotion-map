# Dark Devotion Map

An unofficial interactive map for [Dark Devotion](https://store.steampowered.com/app/718590/Dark_Devotion/), covering NPCs, enemies, items, places, and Codex entries.

The entity database is still being populated and corrected. See the [roadmap](ROADMAP.md).

## Using the map

- Drag to pan and scroll to zoom.
- Open the left drawer to browse entities. Click a title to locate it and open its details.
- Hover over a marker for its title; click it for a popup with descriptions, links, and available wiki content.
- Use eye buttons to toggle map visibility. **Shift-click** an eye to show only that branch.
- Search titles with at least **3 characters**. Search filters the menu, not the map.
- **Reset** restores the menu and map visibility. Clearing search also resets them.

The published application is read-only. Editing tools are available only during local development.

## Development

Requires Node.js **24.18.0 or newer 24.x**. The project records npm **11.16.0** in `package.json`.

```sh
npm ci
npm run dev
```

The development server runs on port **3001**. Copy `.env.example` to `.env.local` to configure optional integrations.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the map with developer tools |
| `npm run build` | Check TypeScript and build the read-only app into `build/` |
| `npm run preview` | Preview the production build locally |
| `npm test -- --run` | Run all tests once; use `npm test` for watch mode |
| `npx tsc -b` | Check application, test, and tooling types |
| `npm run lint` | Check code and formatting with Biome |
| `npm run lint:styles` | Check CSS/SCSS; append `-- --fix` to format |
| `npm run healthcheck` | Run React Compiler diagnostics |

Tests and shared test utilities belong in `tests/`. Use browser verification when automated checks are insufficient, particularly for layout, hover interactions, or native browser behavior.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_WIKI_API_URL` | MediaWiki endpoint, such as `https://darkdevotion.fandom.com/api.php`. Blank or unset disables wiki integration. |
| `VITE_AUTHOR_URL` | Optional author attribution URL. GitHub Actions uses the repository owner's GitHub profile. |
| `VITE_APP_VERSION` | Set automatically from `package.json`. |

`VITE_*` values are public and embedded at build time. Restart development after changing them; rebuild and redeploy to update the published app.

### Editing the database

1. Run `npm run dev`. Right-click the map and choose **Add Entity → Add point…**, or use a marker's toolbar to move, edit, or delete it.
2. Click **Export JSON** in Developer tools.
3. Replace `src/data/entities.json` with the exported file.
4. Click **Sync** to confirm that the repository file matches the working data.

Edits stay in memory until exported and saved manually. Export alone does not clear **Unsaved changes**; Sync verifies the file without writing or merging it. Reloading can discard unsaved work. The production build excludes creation, editing, export, and synchronization controls.

### Documentation

CI runs healthcheck, tests, and builds on branch pushes and pull requests. Only `v*` tag pushes deploy to GitHub Pages.

- [Project instructions](AGENTS.md) and [roadmap](ROADMAP.md)
- [Entity schema, validation, and icon naming](docs/map-entities.md)
- [Menu tree, grouping, search, and visibility](docs/tree.md)
- [Wiki API and popup content](docs/wiki-api.md)
- [Scrolling text](docs/scrolling-text.md)
- [GitHub Actions and Pages deployment](docs/deployment.md)
- [Development conventions](docs/development.md)

## License and attribution

Original code and documentation are covered by the [MIT License](LICENSE.md). Game-derived map imagery, tiles, and icons are excluded and remain the property of their respective owners; this project grants no permission to reuse or redistribute them. Extracted game fonts are not used.

Dark Devotion © 2019 [The Arcade Crew](https://www.thearcadecrew.com/) and [Hibernian Workshop](https://hibernian-workshop.com/). All rights reserved. Game assets are credited to their creators; no ownership of the original artwork is claimed.

This is an unofficial fan project and is not affiliated with or endorsed by the game's developer or publisher.

## Credits

- Inspired by the [Salt & Sanctuary Interactive Map](https://kaszub09.github.io/SSMap/) by [Kaszub09](https://github.com/Kaszub09): [source repository](https://github.com/Kaszub09/SSMap).
- Thanks to the [Dark Devotion Wiki](https://darkdevotion.fandom.com/) community for documenting the game.
- Developed with assistance from OpenAI Codex.
