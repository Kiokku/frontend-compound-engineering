#!/usr/bin/env node

/**
 * Test error handling for missing workflows directory
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simulate running from a directory without .compound/workflows
async function testMissingWorkflows() {
  console.log('=== Testing Error Handling for Missing Workflows ===\n');

  // Temporarily rename workflows directory
  const projectRoot = path.resolve(__dirname, '../..');
  const workflowsDir = path.join(projectRoot, '.compound/workflows');
  const tempDir = path.join(projectRoot, '.compound/workflows.backup');

  try {
    // Check if workflows directory exists
    if (await fs.pathExists(workflowsDir)) {
      console.log('📦 Backing up workflows directory...');
      await fs.move(workflowsDir, tempDir);
      console.log('✓ Backed up to:', tempDir);
    }

    // Try to run convertToQoderCommands
    console.log('\n🔧 Attempting to generate Qoder adapter without workflows...\n');

    const { convertToQoderCommands } = await import('./to-qoder.js');

    await convertToQoderCommands();

    console.log('\n❌ Test failed: Should have thrown an error!');
  } catch (error) {
    console.log('\n✅ Test passed: Error was caught');
    console.log('Error code:', error.code);
    console.log('Error handled:', error.handled);
  } finally {
    // Restore workflows directory
    if (await fs.pathExists(tempDir)) {
      console.log('\n📦 Restoring workflows directory...');
      await fs.move(tempDir, workflowsDir);
      console.log('✓ Restored');
    }
  }
}

testMissingWorkflows().catch(console.error);
