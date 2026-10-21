# Development conventions

See [AGENTS.md](../AGENTS.md) for language, workflow, versioning, and code conventions.

## Application modes and data

- `npm run dev` enables creation, editing, movement, deletion, JSON export, and Sync.
- `npm run build` produces the read-only application; `npm run preview` serves that build.
- Vite's `import.meta.env.DEV` determines the mode at build time. This is a UI capability boundary, not authentication.
- Developer tools is a draggable, collapsible window. Its Icon BG checkbox controls marker frames without changing the database.
- Repository JSON hot updates preserve working edits until Sync verifies them. The browser warns before leaving while unsaved changes exist.

See [Map entities](map-entities.md) for the schema and persistence workflow.

## Images and styling

- Map tiles: `public/images/map/tiles/{z}/{x}/{y}.png`.
- Point icons: `public/images/entities/point/`, indexed by filename. Missing or failed images use category-colored fallbacks. Restart development after adding files; see [Point icons](map-entities.md#point-icons).
- Theme colors, spacing aliases, and dimensions: `src/index.scss`.
- Shared spacing scale: `src/styles/sizes.scss`; scrollbar styling: `src/styles/scrollbar.scss`.
- Shared corner radii: `--border-radius: 2px` and `--border-radius-large: 4px`.

Biome controls supported code formatting. Stylelint controls CSS/SCSS formatting, including blank lines; use `npm run lint:styles -- --fix`.

Markdown has no pinned workspace formatter and is not included in Biome's configured patterns. `.editorconfig` defines basic whitespace rules; formatting on save otherwise depends on the editor and installed extensions.

## Tests and TypeScript

Keep tests and shared utilities in `tests/`, mirroring source directories, with setup in `tests/setup.ts`. Name tests `*.spec.ts`, `*.spec.tsx`, `*.test.ts`, or `*.test.tsx`.

| Command | Purpose |
| --- | --- |
| `npm test -- --run` | Run tests once |
| `npm test` | Watch tests |
| `npm run test:coverage` | Generate coverage |
| `npm run test:coverage:summary` | Generate a JSON coverage summary |
| `npx tsc -b` | Check all TypeScript projects |
| `npx tsc -p tsconfig.test.json` | Check test types separately |

The root `tsconfig.json` references application (`tsconfig.app.json`), test (`tsconfig.test.json`), and tooling (`tsconfig.node.json`) configurations.

Use browser verification when automated checks are insufficient, such as layout, hover interactions, or native browser behavior. It is not required for every UI change.

React Compiler healthcheck supplements build and test checks with diagnostics.
