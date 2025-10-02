/**
 * Create GitHub issues from docs/issues.json
 */
const fs = require('fs');
const https = require('https');

const issues = JSON.parse(fs.readFileSync('docs/issues.json', 'utf8'));
const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
const token = process.env.GITHUB_TOKEN;

if (!repo || !token) {
  console.error('Missing GITHUB_REPOSITORY or GITHUB_TOKEN');
  process.exit(1);
}

function createIssue(issue) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      title: issue.title,
      body: issue.body,
      labels: issue.labels || []
    });
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${repo}/issues`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'codex-issue-bot',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let buf = '';
      res.on('data', d => (buf += d));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Created: ${issue.title}`);
          resolve();
        } else {
          console.error(`Failed (${res.statusCode}): ${issue.title} — ${buf}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const issue of issues) {
    try { await createIssue(issue); }
    catch (e) { /* continue making others */ }
  }
})();
