# Project instructions

## Language policy

- Write all project documentation and agent instructions in English, including README files, architecture notes, development guides, and future AGENTS.md files.
- Keep documentation headings, tables, explanations, and example comments in English.
- Write all code comments in English.

## Repository access

- External repositories are read-only for now. Do not push changes or perform any other write operations against them.
- The Salt and Sanctuary map repository at https://github.com/Kaszub09/SSMap may be consulted as a read-only reference.

## Step-by-step workflow

- Follow the implementation plan in [ROADMAP.md](ROADMAP.md) in order and keep its progress up to date.
- Work in discrete steps. Each step must complete one task and produce one cohesive commit.
- Keep each commit focused on its step; do not include unrelated changes.
- Do not perform force updates, including force pushes, or rewrite existing commit history.

## Versioning

- Increment the patch version in `package.json` in every regular commit, including documentation, configuration, and test changes.
- Do not change version fields in `package-lock.json` for application version bumps, including minor releases, unless dependencies also change. The lockfile version may differ from `package.json`.
- Keep `package-lock.json` unchanged when dependencies have not changed. Its content hash will be used as a GitHub Actions dependency cache key.
- After completing a major task (a numbered stage) in `ROADMAP.md`, increment the minor version and reset the patch version to zero in a separate release commit.
- The minor release commit is the exception to the per-commit patch increment; do not increment both minor and patch in that commit.
- Apply this policy to new commits; do not rewrite existing commits to change their versions.
- End every commit message with a separate final line in the format `Version: <new_version_value>`, matching the new version in `package.json`.

## Enum values

- Use hyphens to separate words in string enum values (kebab-case), never underscores. For example, use `lost-room`, not `lost_room`.

## Component props

- Wrap component function props in `Readonly<Props>`, including destructured parameters: `function Component({ value }: Readonly<ComponentProps>)`.

## Code readability

- Always use braces for `if`, `else if`, and `else` bodies, with the body on separate lines, even when it contains only one statement. Do not write inline `if` statements.
- Add a blank line before a `return` statement when it follows other statements in the same block.
- Separate `if` blocks from surrounding statements with blank lines before and after them. Do not insert blank lines between connected `if` / `else if` / `else` branches or just inside block boundaries.
- Within a component, group related calls to the same kind of hook (`useState`, `useRef`, `useMemo`, etc.) and separate groups of different hook kinds with blank lines. Preserve hook execution order.
- These blank-line conventions do not apply to JSX markup. Use judgment to separate other logical groups and improve readability.
- Let Stylelint determine blank-line formatting in SCSS files; do not apply the TypeScript blank-line conventions to SCSS.
- After applying readability changes to files supported by Biome, run Biome as the final formatting pass. Keep its resulting line breaks and blank lines, including any lines it removes, adds, or wraps; do not manually override its output.

## Tests

- Create all tests and shared test utilities in the root `tests/` directory. Mirror the relevant `src/` subdirectory structure where practical.
- Name test files `*.spec.ts` or `*.spec.tsx` (or `*.test.ts` / `*.test.tsx`). Do not place tests alongside application code in `src/`.
- Keep shared test setup in `tests/setup.ts` and test-specific TypeScript settings in `tsconfig.test.json`.
- Use `npm test -- --run` to run tests and `npx tsc -b` to check application, test, and tooling types.
- Use browser verification when automated checks do not provide enough confidence or the relevant behavior is difficult to verify automatically, such as visual layout, hover interactions, or native browser behavior. Decide based on the change; browser verification is not required for every UI change.
