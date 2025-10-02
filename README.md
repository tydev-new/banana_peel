# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

While this project uses React, Vite supports many popular JS frameworks. [See all the supported frameworks](https://vitejs.dev/guide/#scaffolding-your-first-vite-project).

## Deploy Your Own

Deploy your own Vite project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/framework-boilerplates/vite-react&template=vite-react)

_Live Example: https://vite-react-example.vercel.app_

### Deploying From Your Terminal

You can deploy your new Vite project with a single command from your terminal using [Vercel CLI](https://vercel.com/download):

```shell
$ vercel
```

## Debugging the "Create GitHub Issues" workflow

When the `Create GitHub Issues` workflow fails, the full runtime error is available in the workflow logs:

1. Open **Actions** in the GitHub repository sidebar.
2. Select the failed **Create GitHub Issues** run.
3. Expand the **Create issues from docs/issues.json** step to read the Node.js output (look for stack traces or HTTP errors).

For local reproduction you can execute the script directly. Set `GITHUB_REPOSITORY` and `GITHUB_TOKEN` in your environment before running the command below. The token must have the `repo` scope (for forks) or use `${{ secrets.GITHUB_TOKEN }}` when running inside GitHub Actions.

```bash
GITHUB_REPOSITORY=owner/name \
GITHUB_TOKEN=ghp_your_token \
node .github/scripts/create_issues.js
```

If you only need to inspect the behavior without calling the API, run with a fake token and expect `HTTP 401` failures. For full request/response logging, temporarily add `NODE_DEBUG=https` to the environment.
