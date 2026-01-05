#!/usr/bin/env node

/**
 * sync-agents.js
 *
 * Syncs agent files from library/ directory to their respective npm packages.
 * This ensures that framework-specific agents are properly packaged for distribution.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Framework mapping configuration
 * Maps library/ directories to their npm package locations
 */
const FRAMEWORKS = [
  { name: 'react', source: 'library/react', target: 'packages/react/agents' },
  { name: 'vue', source: 'library/vue', target: 'packages/vue/agents' },
  { name: 'angular', source: 'library/angular', target: 'packages/angular/agents' },
  { name: 'svelte', source: 'library/svelte', target: 'packages/svelte/agents' },
  { name: 'css', source: 'library/css', target: 'packages/design-tools/agents' }
];

/**
 * Sync agents from library/ to package directories
 */
async function syncAgents() {
  console.log('📦 Syncing agent files to npm packages...\n');

  const rootDir = path.resolve(__dirname, '..');
  let totalSynced = 0;

  for (const framework of FRAMEWORKS) {
    const sourceDir = path.join(rootDir, framework.source);
    const targetDir = path.join(rootDir, framework.target);

    // Check if source directory exists
    const sourceExists = await fs.pathExists(sourceDir);

    if (!sourceExists) {
      console.log(`⏭️  Skipping ${framework.name} (source directory not found: ${framework.source})`);
      console.log();
      continue;
    }

    // Create target directory if it doesn't exist
    await fs.ensureDir(targetDir);

    // Clear target directory (ensure clean sync)
    await fs.emptyDir(targetDir);

    // Copy all .md files from source to target
    const files = await fs.readdir(sourceDir);
    const agentFiles = files.filter(file => file.endsWith('.md'));

    if (agentFiles.length === 0) {
      console.log(`⚠️  No agent files found in ${framework.source}`);
      console.log();
      continue;
    }

    // Copy each agent file
    for (const file of agentFiles) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);

      await fs.copy(sourcePath, targetPath);
    }

    console.log(`✅ ${framework.name}: Synced ${agentFiles.length} agent(s)`);
    for (const file of agentFiles) {
      console.log(`   - ${file}`);
    }
    totalSynced += agentFiles.length;
    console.log();
  }

  console.log(`🎉 Agent sync complete! Total: ${totalSynced} agent(s) synced`);
  return totalSynced;
}

/**
 * Validate sync by checking target directories
 */
async function validateSync() {
  console.log('\n🔍 Validating sync...\n');

  const rootDir = path.resolve(__dirname, '..');
  let isValid = true;

  for (const framework of FRAMEWORKS) {
    const targetDir = path.join(rootDir, framework.target);
    const exists = await fs.pathExists(targetDir);

    if (!exists) {
      console.log(`❌ ${framework.name}: Target directory not found`);
      isValid = false;
      continue;
    }

    const files = await fs.readdir(targetDir);
    const agentFiles = files.filter(file => file.endsWith('.md'));

    console.log(`✅ ${framework.name}: ${agentFiles.length} agent(s) in target`);
  }

  return isValid;
}

// Main execution
(async () => {
  try {
    const args = process.argv.slice(2);
    const shouldValidate = args.includes('--validate') || args.includes('-v');

    const synced = await syncAgents();

    if (shouldValidate) {
      await validateSync();
    }

    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
