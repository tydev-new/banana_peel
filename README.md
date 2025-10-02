# Project Tooling

## Creating GitHub issues from `docs/issues.json`

This repository includes a helper script that can open GitHub issues based on
the contents of `docs/issues.json`.

### Prerequisites

- Node.js 18 or later (for the built-in `fetch` API used by the script)
- A [classic personal access token](https://github.com/settings/tokens) with
  the `repo` scope, exported as `GITHUB_TOKEN` when you want to create issues
  for real

### Usage

Run the npm script with the target repository in `owner/repo` form. Include the
`--dry-run` flag to preview the issues without creating them.

```bash
# Preview the issues that would be created
npm run create-issues -- my-org/my-repo --dry-run

# Create the issues for real (requires GITHUB_TOKEN to be set)
GITHUB_TOKEN=ghp_example npm run create-issues -- my-org/my-repo
```

By default the script uses the public GitHub API. To target a GitHub Enterprise
instance instead, set `GITHUB_API_URL` to your instance's REST API base URL.
