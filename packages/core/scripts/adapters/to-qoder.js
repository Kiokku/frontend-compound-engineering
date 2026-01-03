#!/usr/bin/env node

/**
 * Qoder Adapter Generator
 *
 * Converts core workflows to Qoder CLI command format
 * Implements comprehensive error handling with Phase 0.4 error classes
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  FileOperationError,
  AdapterError
} from '../../src/errors.js';
import {
  ErrorHandler,
  safeExecute,
  withRetry
} from '../../src/error-handler.js';
import {
  extractFrontmatter,
  removeFrontmatter,
  isMarkdownFile
} from './adapter-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find project root directory by looking for package.json
 * @returns {string} - Project root directory path
 */
function findProjectRoot() {
  let currentDir = __dirname;

  // Traverse up to find project root (where package.json exists)
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      // If we're in packages/core, go up to monorepo root
      if (currentDir.endsWith('packages/core') || currentDir.endsWith('packages\\core')) {
        return path.dirname(currentDir);
      }

      // If parent has pnpm-workspace.yaml or lerna.json, it's monorepo root
      const parentDir = path.dirname(currentDir);
      if (fs.existsSync(path.join(parentDir, 'pnpm-workspace.yaml')) ||
          fs.existsSync(path.join(parentDir, 'lerna.json'))) {
        return parentDir;
      }

      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Load all workflows from source directory
 * @param {object} options - Configuration options
 * @param {string} options.projectRoot - Project root directory (defaults to monorepo root)
 * @throws {FileOperationError} When workflow directory doesn't exist or cannot be read
 * @throws {ConfigError} When workflow file has invalid frontmatter
 */
export async function loadAllWorkflows(options = {}) {
  const { projectRoot = findProjectRoot() } = options;

  // Try multiple possible paths for workflows directory
  const possiblePaths = [
    // Monorepo structure: projectRoot/packages/core/.compound/workflows
    path.join(projectRoot, 'packages/core/.compound/workflows'),
    // Standalone package structure: projectRoot/.compound/workflows
    path.join(projectRoot, '.compound/workflows'),
    // Relative to script: ../../.compound/workflows (legacy fallback)
    path.join(__dirname, '../../.compound/workflows')
  ];

  let workflowsDir = null;
  for (const testPath of possiblePaths) {
    const exists = await safeExecute(
      () => fs.pathExists(testPath),
      false,
      { operation: 'checkDirectory', path: testPath }
    );

    if (exists) {
      workflowsDir = testPath;
      break;
    }
  }

  if (!workflowsDir) {
    throw new FileOperationError(
      'Workflows directory not found',
      possiblePaths[0],
      'read',
      {
        hint: 'Ensure .compound/workflows exists in either project root or packages/core/',
        triedPaths: possiblePaths
      }
    );
  }

  // Read directory with retry
  const files = await withRetry(
    () => fs.readdir(workflowsDir),
    { maxRetries: 2, delay: 500 }
  );

  const workflows = [];

  for (const file of files) {
    if (!isMarkdownFile(file)) continue;

    const filePath = path.join(workflowsDir, file);

    // Read file content with error handling
    const content = await safeExecute(
      () => fs.readFile(filePath, 'utf8'),
      null,
      { operation: 'readFile', path: filePath }
    );

    if (!content) {
      console.warn(`⚠️  Skipped ${file}: Unable to read`);
      continue;
    }

    // Parse frontmatter with error handling
    let frontmatter;
    try {
      frontmatter = extractFrontmatter(content);
    } catch (error) {
      if (error instanceof ConfigError) {
        console.warn(`⚠️  Skipped ${file}: ${error.message}`);
        continue;
      }
      throw error;
    }

    workflows.push({
      name: file.replace('.md', ''),
      content: removeFrontmatter(content),
      frontmatter
    });
  }

  if (workflows.length === 0) {
    throw new AdapterError(
      'qoder',
      'No valid workflow files found in the workflows directory',
      { workflowsDir, filesFound: files.length }
    );
  }

  return workflows;
}

/**
 * Convert workflow to Qoder command format
 */
export function convertToQoderCommand(workflow) {
  const { content, frontmatter } = workflow;

  // Qoder command format - uses YAML frontmatter instead of # headers
  // Command name is derived from the filename (e.g., plan.md -> /plan)
  // Reference: https://docs.qoder.com/zh/cli/using-cli#命令
  const qoderCommand = `---
description: "${frontmatter?.description || 'Compound workflow command'}"
---

${content.trim()}
`;

  return qoderCommand;
}

/**
 * Generate Qoder configuration
 * @param {Array} commandFiles - Array of objects with {path, frontmatter}
 */
export function generateQoderConfig(commandFiles) {
  const config = {
    version: '1.0.0',
    commands: commandFiles.map(({ path: filePath, frontmatter }) => ({
      name: path.basename(filePath, '.md'),
      path: filePath,
      description: frontmatter?.description || 'Compound workflow command'
    }))
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Main conversion function
 * @param {object} options - Configuration options
 * @param {string} options.projectRoot - Project root directory
 * @param {string} options.outputDir - Output directory for Qoder commands
 * @throws {AdapterError} When conversion fails
 * @throws {FileOperationError} When output directory cannot be created
 */
export async function convertToQoderCommands(options = {}) {
  const {
    projectRoot,
    outputDir = '.compound/adapters/qoder/commands'
  } = options;

  const errorHandler = new ErrorHandler({
    logDir: '.compound/logs',
    verbose: process.env.DEBUG === 'true'
  });

  try {
    console.log('🔧 Converting workflows to Qoder commands...\n');

    // Ensure output directory exists with error handling
    await withRetry(
      () => fs.ensureDir(outputDir),
      { maxRetries: 2, delay: 500 }
    );

    // Load all workflows with project root
    let workflows;
    try {
      workflows = await loadAllWorkflows({ projectRoot });
      console.log(`✓ Found ${workflows.length} workflows`);
    } catch (error) {
      if (error.code === 'FILE_OPERATION_ERROR' || error.message.includes('Workflows directory not found')) {
        console.error('\n❌ Workflows directory not found!\n');
        console.error('💡 Please initialize compound workflow first:\n');
        console.error('   compound init\n');
        console.error('📁 Expected directory: .compound/workflows/\n');
        // Mark error as handled to avoid duplicate messages in CLI
        error.handled = true;
      }
      throw error;
    }

    // Convert each workflow to Qoder command
    const commandFiles = [];
    for (const workflow of workflows) {
      try {
        const commandContent = convertToQoderCommand(workflow);
        const outputPath = path.join(outputDir, `${workflow.name}.md`);

        // Write with retry
        await withRetry(
          () => fs.writeFile(outputPath, commandContent, 'utf8'),
          { maxRetries: 2, delay: 500 }
        );

        // Store both path and frontmatter for config generation
        commandFiles.push({
          path: outputPath,
          frontmatter: workflow.frontmatter
        });
        console.log(`✓ Generated: ${workflow.name}.md`);
      } catch (error) {
        // Log error but continue with other workflows
        await errorHandler.handle(error, {
          workflow: workflow.name,
          operation: 'generateCommand'
        });
        console.warn(`⚠️  Skipped ${workflow.name} due to error`);
      }
    }

    if (commandFiles.length === 0) {
      throw new AdapterError(
        'qoder',
        'Failed to generate any command files',
        { workflowsAttempted: workflows.length }
      );
    }

    // Generate Qoder configuration file
    const configPath = path.join(path.dirname(outputDir), 'config.json');
    const config = generateQoderConfig(commandFiles);
    await withRetry(
      () => fs.writeFile(configPath, config, 'utf8'),
      { maxRetries: 2, delay: 500 }
    );
    console.log(`✓ Generated: config.json`);

    // Generate installation instructions
    const instructionsPath = path.join(path.dirname(outputDir), 'README.md');
    const instructions = generateInstallationInstructions();
    await withRetry(
      () => fs.writeFile(instructionsPath, instructions, 'utf8'),
      { maxRetries: 2, delay: 500 }
    );
    console.log(`✓ Generated: README.md`);

    console.log(`\n✅ Successfully generated ${commandFiles.length} Qoder commands in ${outputDir}/`);

    return {
      commandFiles,
      configPath,
      instructionsPath,
      successCount: commandFiles.length,
      skippedCount: workflows.length - commandFiles.length
    };

  } catch (error) {
    // Handle any uncaught errors
    await errorHandler.handle(error, {
      operation: 'convertToQoderCommands',
      outputDir
    });

    // Re-throw for caller to handle
    throw error;
  }
}

/**
 * Generate installation instructions
 */
export function generateInstallationInstructions() {
  return `# Compound Frontend Workflow - Qoder Integration

## Installation

### Method 1: Copy Commands Manually

\`\`\`bash
# Copy commands to Qoder commands directory
cp .compound/adapters/qoder/commands/* ~/.qoder/commands/
\`\`\`

### Method 2: Symbolic Link (Recommended)

\`\`\`bash
# Create symbolic link for easier updates
ln -s $(pwd)/.compound/adapters/qoder/commands ~/.qoder/commands/compound
\`\`\`

## Usage

After installation, you can use compound workflows in Qoder CLI:

\`\`\`bash
# Plan a new feature
qoder /compound:plan "Add user login form"

# Work on implementation
qoder /compound:work

# Review your code
qoder /compound:review

# Compound knowledge
qoder /compound:compound "Solved authentication issue"
\`\`\`

## Command Reference

- **compound:plan** - Create detailed implementation plans for frontend features
- **compound:work** - Execute plans and create components
- **compound:review** - Review code for accessibility, performance, and best practices
- **compound:compound** - Document solutions and suggest relevant agents

## Updating

To update commands after modifying workflows:

\`\`\`bash
# Re-generate commands
npx compound-init --tool qoder

# Or manually re-run
node packages/core/scripts/adapters/to-qoder.js
\`\`\`

## Troubleshooting

### Commands not found

1. Check Qoder commands directory:
   \`\`\`bash
   ls ~/.qoder/commands/
   \`\`\`

2. Verify symbolic link (if used):
   \`\`\`bash
   ls -la ~/.qoder/commands/compound
   \`\`\`

3. Restart Qoder CLI

### Commands not working

1. Ensure command files are readable
2. Check Qoder CLI version compatibility
3. Review Qoder CLI documentation for command format requirements

## Support

For issues or questions, please visit:
- GitHub: [compound-workflow/frontend]
- Docs: [compound-workflow.dev/docs]
`;
}

// Allow running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const errorHandler = new ErrorHandler({
    logDir: '.compound/logs',
    verbose: process.env.DEBUG === 'true',
    exitOnCritical: true
  });

  convertToQoderCommands()
    .then(result => {
      console.log('\n📊 Summary:');
      console.log(`   ✅ Successfully generated: ${result.successCount}`);
      if (result.skippedCount > 0) {
        console.log(`   ⚠️  Skipped: ${result.skippedCount}`);
      }
      console.log(`   📁 Output directory: .compound/adapters/qoder/`);
    })
    .catch(async (error) => {
      await errorHandler.handle(error, {
        script: 'to-qoder.js',
        mode: 'standalone'
      });

      // Exit with error code if not already handled by ErrorHandler
      if (errorHandler.exitOnCritical && !error.recoverable) {
        process.exit(1);
      }
    });
}
