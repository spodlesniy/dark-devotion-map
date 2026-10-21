# GitHub Actions and Pages

## CI

The [Check and deploy workflow](../.github/workflows/ci.yml) runs on pushes to every branch, tags matching `v*`, and pull requests targeting any branch. Pull requests run when opened, reopened, or updated with new commits, using GitHub's test merge commit.

Each run installs dependencies with `npm ci`, runs React Compiler healthcheck and tests, and builds the production application. Branch pushes and pull requests do not deploy. Only tag pushes upload `build/` and deploy it to GitHub Pages after validation succeeds. A branch with an open pull request can produce both a push run and a pull request run; their concurrency groups remain independent.

Node.js is selected from `engines.node` in `package.json`. `actions/setup-node` caches npm downloads using `package-lock.json` as the dependency key. It does not cache `node_modules` or build outputs.

New runs cancel older runs for the same workflow, event, and full branch/tag/PR ref. Deployments share a `github-pages` concurrency group and do not interrupt an active deployment.

## Repository setup

1. In **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
2. In **Settings → Environments → github-pages**, allow deployment from tags matching `v*`. A default-branch-only policy rejects tag deployments.
3. Optionally add the Actions repository variable `VITE_WIKI_API_URL` with value `https://darkdevotion.fandom.com/api.php` under **Settings → Secrets and variables → Actions → Variables**. Without it, CI builds disable wiki integration. Local `.env` files are ignored by Git.

GitHub Pages availability depends on repository visibility and your GitHub plan. See [publishing source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Releases

Push a `v*` tag pointing to a verified commit containing the workflow. Match the tag to the version in `package.json`; for example, version `1.2.3` uses:

```sh
git tag v1.2.3
git push origin v1.2.3
```

The workflow does not create tags or bump versions. Deployments use the built-in `GITHUB_TOKEN` and the `github-pages` environment; no personal access token or deployment branch is required.

## Build configuration

- `VITE_AUTHOR_URL` is set to the repository owner's GitHub profile: `https://github.com/<owner>`.
- Tag builds use the Pages base path from `configure-pages`, supporting repository subdirectories and custom domains.
- Branch and pull request builds use `/<repository>/`, or `/` for `<owner>.github.io` repositories.
- The router, tiles, icons, and built asset URLs respect Vite's base path.

Only the map's root route is published. Additional nested routes would require a static-host strategy for direct navigation.

See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
