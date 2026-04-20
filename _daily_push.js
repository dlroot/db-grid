/**
 * db-grid daily git push script
 * Run from db-grid directory, pushes all changes to GitHub
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoDir = 'C:\\Users\\will\\.qclaw\\workspace\\db-grid';
const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

try {
  // Check if there are uncommitted changes
  const status = execSync('git status --porcelain', { cwd: repoDir, encoding: 'utf8' });
  
  if (!status.trim()) {
    console.log('[db-grid-push] No changes to commit.');
    process.exit(0);
  }

  console.log('[db-grid-push] Changes detected, committing and pushing...');
  console.log('Status:', status.trim().slice(0, 200));

  // Stage all changes
  execSync('git add -A', { cwd: repoDir });
  
  // Commit with date
  const commitMsg = `auto: daily push ${today}`;
  execSync(`git commit -m "${commitMsg}"`, { cwd: repoDir });
  console.log(`[db-grid-push] Committed: "${commitMsg}"`);
  
  // Push
  execSync('git push', { cwd: repoDir });
  console.log('[db-grid-push] ✅ Pushed to GitHub successfully!');
  
} catch (e) {
  const err = e.stderr || e.stdout || e.message;
  console.error('[db-grid-push] ❌ Failed:', err.slice(0, 500));
  process.exit(1);
}
