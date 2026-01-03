#!/usr/bin/env node

/**
 * Cursor Adapter - Convert workflows to Cursor Rules format
 *
 * Supports two modes:
 * - Modern: .cursor/rules/*.mdc (recommended for latest Cursor IDE)
 * - Legacy: .cursorrules (fallback for older versions)
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { AdapterError, FileOperationError } from '../../src/errors.js';
import { safeExecute } from '../../src/error-handler.js';
import { loadAllWorkflows, loadAllAgents, findCompoundDirectory } from './adapter-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Convert workflows and agents to Cursor Rules format
 * @param {object} options - Configuration options
 * @param {boolean} options.useLegacy - Use legacy .cursorrules format instead of .cursor/rules/
 * @param {string} options.projectRoot - Project root directory (default: process.cwd())
 * @param {string} options.sourceDir - Custom .compound directory path (optional, overrides findCompoundDirectory)
 * @returns {Promise<object>} - Result object with stats and paths
 *
 * @example
 * // Auto-detect paths and use modern format
 * await convertToCursorRules();
 *
 * @example
 * // Use legacy format with custom project root
 * await convertToCursorRules({
 *   useLegacy: true,
 *   projectRoot: '/path/to/project'
 * });
 */
export async function convertToCursorRules(options = {}) {
  const {
    useLegacy = false,
    projectRoot = process.cwd(),
    sourceDir: customSourceDir = null
  } = options;

  console.log('🔧 Converting to Cursor format...\n');

  // 1. Determine source directories using flexible path resolution
  let sourceWorkflowsDir, sourceAgentsDir;

  if (customSourceDir) {
    // Use custom source directory if provided
    sourceWorkflowsDir = path.join(customSourceDir, 'workflows');
    sourceAgentsDir = path.join(customSourceDir, 'agents');
    console.log(`📁 Using custom source: ${customSourceDir}\n`);
  } else {
    // Auto-detect using findCompoundDirectory (supports monorepo structure)
    sourceWorkflowsDir = findCompoundDirectory(projectRoot, 'workflows');
    sourceAgentsDir = findCompoundDirectory(projectRoot, 'agents');

    if (!sourceWorkflowsDir) {
      throw new AdapterError(
        'cursor',
        'Workflows directory not found',
        {
          projectRoot,
          hint: 'Ensure .compound/workflows exists in either project root or packages/core/',
          triedPaths: [
            path.join(projectRoot, '.compound/workflows'),
            path.join(projectRoot, 'packages/core/.compound/workflows')
          ]
        }
      );
    }

    if (!sourceAgentsDir) {
      throw new AdapterError(
        'cursor',
        'Agents directory not found',
        {
          projectRoot,
          hint: 'Ensure .compound/agents exists in either project root or packages/core/',
          triedPaths: [
            path.join(projectRoot, '.compound/agents'),
            path.join(projectRoot, 'packages/core/.compound/agents')
          ]
        }
      );
    }

    console.log(`📁 Workflows: ${sourceWorkflowsDir}`);
    console.log(`📁 Agents: ${sourceAgentsDir}\n`);
  }

  // 2. Load workflows and agents with proper error handling
  let workflows, agents;

  try {
    workflows = await loadAllWorkflows(sourceWorkflowsDir);
    agents = await loadAllAgents(sourceAgentsDir);

    console.log(`📋 Loaded ${workflows.length} workflows and ${agents.length} agents\n`);

    if (workflows.length === 0) {
      console.warn('⚠️  Warning: No workflows loaded. Generated files will be empty.');
    }

    if (agents.length === 0) {
      console.warn('⚠️  Warning: No agents loaded. Generated files will be empty.');
    }
  } catch (error) {
    // Enhance error with context
    if (error instanceof FileOperationError) {
      throw new AdapterError(
        'cursor',
        `Failed to load workflows or agents: ${error.message}`,
        {
          sourceWorkflowsDir,
          sourceAgentsDir,
          originalError: error.message,
          hint: 'Check that .compound/workflows and .compound/agents directories exist and contain .md files'
        }
      );
    }
    throw error;
  }

  // 3. Generate Cursor rules
  try {
    if (useLegacy) {
      await generateLegacyCursorRules(workflows, agents);
    } else {
      await generateCursorRulesDir(workflows, agents);
    }

    // Return success result
    return {
      success: true,
      format: useLegacy ? 'legacy' : 'modern',
      stats: {
        workflows: workflows.length,
        agents: agents.length,
        totalFiles: useLegacy ? 1 : workflows.length + agents.length + 1
      },
      paths: {
        output: useLegacy ? '.cursorrules' : '.cursor/rules/',
        source: {
          workflows: sourceWorkflowsDir,
          agents: sourceAgentsDir
        }
      }
    };
  } catch (error) {
    throw new AdapterError(
      'cursor',
      `Failed to generate Cursor rules: ${error.message}`,
      {
        useLegacy,
        projectRoot,
        originalError: error.message,
        stack: error.stack
      }
    );
  }
}

/**
 * Generate modern .cursor/rules/ directory structure
 * @param {Array} workflows - Array of workflow objects from loadAllWorkflows
 * @param {Array} agents - Array of agent objects from loadAllAgents
 * @returns {Promise<object>} - Generation result with file paths
 *
 * Expected workflow object structure:
 * {
 *   name: string,           // e.g., 'plan', 'work', 'review'
 *   content: string,        // Markdown content without frontmatter
 *   frontmatter: object,    // Parsed YAML frontmatter
 *   description: string,    // Description from frontmatter or default
 *   filePath: string        // Original file path
 * }
 *
 * Expected agent object structure:
 * {
 *   name: string,           // e.g., 'accessibility-reviewer' or 'plan-component-architect'
 *   content: string,        // Markdown content without frontmatter
 *   frontmatter: object,    // Parsed YAML frontmatter
 *   description: string,    // Description from frontmatter or default
 *   globs: array,           // Glob patterns from frontmatter or default array
 *   filePath: string        // Original file path
 * }
 */
async function generateCursorRulesDir(workflows, agents) {
  const rulesDir = '.cursor/rules';

  // Ensure directory exists
  await fs.ensureDir(rulesDir);
  console.log('📁 Generating .cursor/rules/ directory structure...\n');

  const generatedFiles = [];

  // 1. Generate workflow rules
  console.log('📋 Processing workflows...');
  for (const workflow of workflows) {
    // Validate workflow object structure
    if (!workflow.name || !workflow.content) {
      console.warn(`⚠️  Skipping invalid workflow object:`, workflow);
      continue;
    }

    const ruleContent = `---
description: ${workflow.description || `${workflow.name} workflow`}
globs: ["**/*"]
alwaysApply: false
---

# ${workflow.name}

${workflow.content}
`;

    const filename = `compound-${workflow.name.replace(':', '-')}.mdc`;
    const filePath = path.join(rulesDir, filename);

    await safeExecute(
      () => fs.writeFile(filePath, ruleContent),
      null,
      { operation: 'writeFile', path: filePath }
    );

    generatedFiles.push(filePath);
    console.log(`  ✓ Created ${filename}`);
  }

  // 2. Generate agent rules
  console.log('\n🤖 Processing agents...');
  for (const agent of agents) {
    // Validate agent object structure
    if (!agent.name || !agent.content) {
      console.warn(`⚠️  Skipping invalid agent object:`, agent);
      continue;
    }

    // Use globs from frontmatter or default
    const globs = agent.globs || ["**/*"];

    const ruleContent = `---
description: ${agent.description || `${agent.name} agent`}
globs: ${JSON.stringify(globs)}
alwaysApply: false
---

# ${agent.name}

${agent.content}
`;

    const filename = `agent-${agent.name}.mdc`;
    const filePath = path.join(rulesDir, filename);

    await safeExecute(
      () => fs.writeFile(filePath, ruleContent),
      null,
      { operation: 'writeFile', path: filePath }
    );

    generatedFiles.push(filePath);
    console.log(`  ✓ Created ${filename}`);
  }

  // 3. Generate main rule file (always enabled)
  const mainRule = `---
description: Compound Frontend Workflow - Main Configuration
globs: ["**/*"]
alwaysApply: true
---

# Compound Frontend Workflow

You are an expert frontend developer following a systematic workflow.

## Available Commands

${workflows.length > 0
  ? workflows.map(w => `- **${w.name}**: ${w.description || 'Execute workflow'}`).join('\n')
  : '(No workflows found)'
}

## Available Agents

${agents.length > 0
  ? agents.map(a => `- **${a.name}**: ${a.description || 'Review agent'}`).join('\n')
  : '(No agents found)'
}

## Usage

When the user mentions a workflow name (e.g., "plan", "review"),
activate the corresponding workflow rule.
`;

  const mainRulePath = path.join(rulesDir, 'compound-main.mdc');
  await safeExecute(
    () => fs.writeFile(mainRulePath, mainRule),
    null,
    { operation: 'writeFile', path: mainRulePath }
  );

  generatedFiles.push(mainRulePath);
  console.log(`  ✓ Created compound-main.mdc\n`);

  console.log(`✅ Generated ${generatedFiles.length} rules in ${rulesDir}/`);
  console.log('👉 Restart Cursor to apply changes\n');

  return { generatedFiles, rulesDir };
}

/**
 * Generate legacy .cursorrules file (fallback)
 * @param {Array} workflows - Array of workflow objects from loadAllWorkflows
 * @param {Array} agents - Array of agent objects from loadAllAgents
 * @returns {Promise<object>} - Generation result with file path
 */
async function generateLegacyCursorRules(workflows, agents) {
  console.log('📄 Generating .cursorrules (legacy mode)...\n');

  const cursorRules = `# Compound Frontend Workflow

You are an expert frontend developer following a systematic workflow.

## Available Workflows

${workflows.length > 0
  ? workflows.map(w => `
### ${w.name}
${w.description || 'No description'}

**When user says**: "${w.name}" or requests ${w.name.split(':')[1] || w.name}
**Then execute**:
${w.content.split('\n').filter(line => line.trim()).map((line, i) => `${i + 1}. ${line}`).join('\n')}
`).join('\n')
  : '(No workflows found)'
}

## Available Agents

${agents.length > 0
  ? agents.map(a => `- **${a.name}**: ${a.description || 'No description'}`).join('\n')
  : '(No agents found)'
}

## Usage

Activate workflows or agents based on user context and requests.
`;

  const cursorRulesPath = '.cursorrules';
  await safeExecute(
    () => fs.writeFile(cursorRulesPath, cursorRules),
    null,
    { operation: 'writeFile', path: cursorRulesPath }
  );

  console.log('✅ Generated .cursorrules (legacy mode)');
  console.log('👉 Restart Cursor to apply changes\n');

  return { generatedFiles: [cursorRulesPath], rulesDir: '.' };
}

/**
 * CLI entry point (when run directly)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const useLegacy = args.includes('--cursor-legacy');

  convertToCursorRules({ useLegacy })
    .then(result => {
      console.log('✅ Cursor adapter generation completed successfully!\n');
      console.log('Summary:');
      console.log(`  Format: ${result.format}`);
      console.log(`  Workflows: ${result.stats.workflows}`);
      console.log(`  Agents: ${result.stats.agents}`);
      console.log(`  Total files: ${result.stats.totalFiles}`);
    })
    .catch(error => {
      console.error('\n❌ Failed to generate Cursor adapter\n');

      if (error instanceof AdapterError) {
        console.error(`Error: ${error.message}`);
        if (error.details) {
          console.error('\nDetails:');
          console.error(JSON.stringify(error.details, null, 2));
        }
        if (error.details?.hint) {
          console.error(`\n💡 ${error.details.hint}`);
        }
      } else {
        console.error(error.message);
        if (process.env.DEBUG === 'true') {
          console.error('\nStack trace:');
          console.error(error.stack);
        }
      }

      process.exit(1);
    });
}
