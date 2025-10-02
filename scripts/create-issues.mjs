import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , ownerRepo, ...args] = process.argv;

if (!ownerRepo || !ownerRepo.includes('/')) {
  console.error('Usage: node scripts/create-issues.mjs <owner>/<repo> [--dry-run]');
  process.exitCode = 1;
  process.exit();
}

const dryRun = args.includes('--dry-run');
const token = process.env.GITHUB_TOKEN;

if (!dryRun && !token) {
  console.error('GITHUB_TOKEN environment variable is required when not running in dry-run mode.');
  process.exitCode = 1;
  process.exit();
}

const [owner, repo] = ownerRepo.split('/');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const issuesPath = path.resolve(__dirname, '../docs/issues.json');

let issues;
try {
  const file = await readFile(issuesPath, 'utf8');
  issues = JSON.parse(file);
} catch (error) {
  console.error(`Failed to load issues from ${issuesPath}:`, error);
  process.exitCode = 1;
  process.exit();
}

if (!Array.isArray(issues)) {
  console.error('Issues file must contain an array.');
  process.exitCode = 1;
  process.exit();
}

const apiBase = process.env.GITHUB_API_URL ?? 'https://api.github.com';

for (const issue of issues) {
  const { title, body, labels } = issue;
  if (!title) {
    console.warn('Skipping issue without a title:', issue);
    continue;
  }

  if (dryRun) {
    console.log(`[dry-run] Would create issue: ${title}`);
    continue;
  }

  const response = await fetch(`${apiBase}/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'create-issues-script',
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({ title, body, labels })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create issue "${title}": ${response.status} ${response.statusText}`);
    console.error(errorText);
    process.exitCode = 1;
    process.exit();
  }

  const data = await response.json();
  console.log(`Created issue #${data.number}: ${data.title}`);
}
