/**
 * db-grid daily git push script
 * Run: node _daily_push.js
 * Uses SSH (no token needed) if SSH key is added to GitHub.
 */
import { execSync } from 'child_process';
import path from 'path';

const repoDir = 'C:\\Users\\will\\.qclaw\\workspace\\db-grid';
const today = new Date().toISOString().slice(0, 10);

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: repoDir, encoding: 'utf8', ...opts });
}

try {
  // 1. Ensure SSH remote
  const remote = run('git remote get-url origin').trim();
  if (!remote.includes('git@github.com')) {
    run('git remote set-url origin git@github.com:dlroot/db-grid.git');
    console.log('[db-grid] Switched to SSH remote');
  }

  // 2. Check uncommitted changes
  const status = run('git status --porcelain');
  if (!status.trim()) {
    console.log(`[db-grid] ${today} - No changes to commit.`);
    process.exit(0);
  }

  console.log(`[db-grid] ${today} - Changes detected, committing...`);
  console.log('Changes:', status.trim().slice(0, 200).replace(/\n/g, ' | '));

  // 3. Stage all
  run('git add -A');

  // 4. Commit
  const msg = `auto: daily push ${today}`;
  run(`git commit -m "${msg}"`);
  console.log(`[db-grid] Committed: "${msg}"`);

  // 5. Push
  const pushOut = run('git push origin master 2>&1');
  console.log('[db-grid] ✅ Pushed:', pushOut.trim());

} catch (e) {
  const err = (e.stderr || e.stdout || e.message || '').slice(0, 500);
  console.error('[db-grid] ❌ Failed:', err);
  process.exit(1);
}
