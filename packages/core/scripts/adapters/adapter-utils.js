/**
 * @fileoverview Shared utility functions for adapter generators
 *
 * This module contains common functions used by multiple adapters
 * (Claude, Cursor, Qoder) to avoid code duplication.
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { ConfigError } from '../../src/errors.js';

/**
 * Extract YAML frontmatter from markdown content
 * @param {string} content - Markdown file content
 * @param {string} filename - Filename for error messages (optional)
 * @returns {object|null} - Parsed frontmatter object or null if not found
 * @throws {ConfigError} When YAML parsing fails
 *
 * @example
 * const content = `---
 * name: test-workflow
 * description: A test workflow
 * ---
 * # Content here`;
 * const frontmatter = extractFrontmatter(content);
 * // Returns: { name: 'test-workflow', description: 'A test workflow' }
 */
export function extractFrontmatter(content, filename = 'unknown') {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  try {
    return yaml.parse(match[1]);
  } catch (error) {
    throw new ConfigError(
      `Failed to parse YAML frontmatter${filename !== 'unknown' ? ` in ${filename}` : ''}: ${error.message}`,
      {
        filename,
        yamlContent: match[1],
        originalError: error.message,
        lineNumber: error.lineNumber,
        columnNumber: error.columnNumber
      }
    );
  }
}

/**
 * Extract YAML frontmatter with graceful fallback
 * Unlike extractFrontmatter, this returns an empty object on error instead of throwing
 * @param {string} content - Markdown file content
 * @param {string} filename - Filename for warning messages (optional)
 * @returns {object} - Parsed frontmatter object or empty object on error
 *
 * @example
 * const frontmatter = extractFrontmatterSafe(content, 'workflow.md');
 * // Returns parsed object or {} if parsing fails
 */
export function extractFrontmatterSafe(content, filename = 'unknown') {
  try {
    return extractFrontmatter(content, filename) || {};
  } catch (error) {
    // Log warning but don't throw
    if (error instanceof ConfigError) {
      console.warn(`⚠️  ${error.message}`);
      if (error.details?.lineNumber) {
        console.warn(`   Line: ${error.details.lineNumber}, Column: ${error.details.columnNumber}`);
      }
      if (error.details?.yamlContent) {
        const lines = error.details.yamlContent.split('\n');
        const errorLine = error.details.lineNumber ? lines[error.details.lineNumber - 1] : '';
        if (errorLine) {
          console.warn(`   Content: ${errorLine.trim()}`);
        }
      }
    }
    return {};
  }
}

/**
 * Remove YAML frontmatter from content
 * @param {string} content - Markdown file content with frontmatter
 * @returns {string} - Content without frontmatter
 *
 * @example
 * const content = `---
 * name: test
 * ---
 * # Actual content`;
 * const clean = removeFrontmatter(content);
 * // Returns: '# Actual content'
 */
export function removeFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

/**
 * Extract name from frontmatter or fallback to filename
 * @param {string} content - Markdown file content
 * @param {string} filePath - File path for fallback
 * @returns {string} - Workflow name
 *
 * @example
 * const name = extractNameFromFrontmatter(content, '/path/to/workflow.md');
 * // Returns name from frontmatter or 'workflow'
 */
export function extractNameFromFrontmatter(content, filePath) {
  const frontmatter = extractFrontmatterSafe(content, filePath);
  const filename = filePath.split('/').pop().replace('.md', '');
  return frontmatter.name || filename;
}

/**
 * Validate frontmatter has required fields
 * @param {object} frontmatter - Parsed frontmatter object
 * @param {string[]} requiredFields - Array of required field names
 * @returns {object} - { valid: boolean, missing: string[] }
 *
 * @example
 * const result = validateFrontmatter(frontmatter, ['name', 'description']);
 * if (!result.valid) {
 *   console.warn('Missing fields:', result.missing);
 * }
 */
export function validateFrontmatter(frontmatter, requiredFields = []) {
  const missing = requiredFields.filter(field => !frontmatter[field]);
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Format workflow metadata for display
 * @param {object} metadata - Workflow metadata object
 * @returns {string} - Formatted string
 *
 * @example
 * const metadata = { name: 'plan', description: 'Plan workflow', framework: 'universal' };
 * const formatted = formatWorkflowMetadata(metadata);
 * // Returns: "plan - Plan workflow [universal]"
 */
export function formatWorkflowMetadata(metadata) {
  const parts = [
    metadata.name || 'unnamed',
    metadata.description ? `- ${metadata.description}` : ''
  ];

  if (metadata.framework) {
    parts.push(`[${metadata.framework}]`);
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Read and parse package.json
 * @param {string} projectRoot - Project root directory
 * @returns {object} - Package.json content with defaults
 *
 * @example
 * const pkg = readPackageJson('/path/to/project');
 * console.log(pkg.version); // '0.1.0' or actual version
 */
export async function readPackageJson(projectRoot) {
  const path = await import('path');

  const packageJsonPath = path.join(projectRoot, 'package.json');

  try {
    return await fs.readJson(packageJsonPath);
  } catch (error) {
    console.warn(`⚠️  Failed to read package.json: ${error.message}`);
    return {
      name: '@compound-workflow/core',
      version: '0.1.0',
      description: 'Compound Workflow'
    };
  }
}

/**
 * Check if file is a markdown file
 * @param {string} filename - Filename to check
 * @returns {boolean} - True if file ends with .md
 *
 * @example
 * isMarkdownFile('workflow.md'); // true
 * isMarkdownFile('README.txt');  // false
 */
export function isMarkdownFile(filename) {
  return filename.endsWith('.md');
}

/**
 * Filter markdown files from array of filenames
 * @param {string[]} files - Array of filenames
 * @returns {string[]} - Array of markdown filenames
 *
 * @example
 * const files = ['plan.md', 'README.txt', 'work.md'];
 * const mdFiles = filterMarkdownFiles(files);
 * // Returns: ['plan.md', 'work.md']
 */
export function filterMarkdownFiles(files) {
  return files.filter(isMarkdownFile);
}

/**
 * Generate adapter output directory path
 * @param {string} adapterName - Name of the adapter (claude, cursor, qoder)
 * @param {string} projectRoot - Project root directory
 * @param {string} subDir - Optional subdirectory within adapter
 * @returns {string} - Full path to adapter output directory
 *
 * @example
 * const dir = getAdapterOutputDir('claude', '/project', 'commands');
 * // Returns: '/project/.compound/adapters/claude/commands'
 */
export function getAdapterOutputDir(adapterName, projectRoot, subDir = '') {
  const parts = [
    projectRoot,
    '.compound',
    'adapters',
    adapterName
  ];

  if (subDir) {
    parts.push(subDir);
  }

  return path.join(...parts);
}

/**
 * Count agents in directory recursively
 * @param {string} agentsDir - Path to agents directory
 * @returns {Promise<number>} - Total count of .md files
 *
 * @example
 * const count = await countAgents('/path/to/agents');
 * console.log(`Found ${count} agents`);
 */
export async function countAgents(agentsDir) {
  const path = await import('path');
  const { glob } = await import('glob');

  try {
    const files = await glob(`${agentsDir}/**/*.md`);
    return files.length;
  } catch (error) {
    console.warn(`⚠️  Failed to count agents: ${error.message}`);
    return 0;
  }
}

/**
 * Default workflow metadata for missing frontmatter
 * @param {string} name - Workflow name
 * @returns {object} - Default metadata object
 */
export function getDefaultWorkflowMetadata(name) {
  return {
    name: `compound:${name}`,
    description: `Compound ${name} workflow`,
    'argument-hint': '[input]',
    framework: 'universal'
  };
}

/**
 * Find .compound directory by trying multiple possible paths
 * @param {string} projectRoot - Project root directory
 * @param {string} subPath - Sub path within .compound (e.g., 'workflows', 'agents')
 * @returns {string|null} - Absolute path to the directory, or null if not found
 *
 * @example
 * const workflowsDir = findCompoundDirectory('/project', 'workflows');
 * // Returns: '/project/packages/core/.compound/workflows' or '/project/.compound/workflows'
 */
export function findCompoundDirectory(projectRoot, subPath = '') {
  const possiblePaths = [
    // Monorepo structure: projectRoot/packages/core/.compound/
    path.join(projectRoot, 'packages/core/.compound', subPath),
    // Standalone package structure: projectRoot/.compound/
    path.join(projectRoot, '.compound', subPath)
  ];

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return null;
}

/**
 * Load all workflows from a directory
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {Promise<Array>} - Array of workflow objects { name, content, frontmatter }
 *
 * @example
 * const workflows = await loadAllWorkflows('.compound/workflows');
 * // Returns: [{ name: 'plan', content: '...', frontmatter: { ... } }, ...]
 */
export async function loadAllWorkflows(workflowsDir) {
  const path = await import('path');
  const { FileOperationError } = await import('../../src/errors.js');
  const { safeExecute, withRetry } = await import('../../src/error-handler.js');

  // Check if directory exists
  const exists = await safeExecute(
    () => fs.pathExists(workflowsDir),
    false,
    { operation: 'checkDirectory', path: workflowsDir }
  );

  if (!exists) {
    throw new FileOperationError(
      'Workflows directory not found',
      workflowsDir,
      'read',
      {
        hint: `Ensure ${workflowsDir} exists`
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
      frontmatter = extractFrontmatter(content, file);
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
      frontmatter,
      description: frontmatter?.description || '',
      filePath
    });
  }

  if (workflows.length === 0) {
    console.warn(`⚠️  No valid workflow files found in ${workflowsDir}`);
  }

  return workflows;
}

/**
 * Load all agents from a directory (including subdirectories)
 * @param {string} agentsDir - Path to agents directory
 * @returns {Promise<Array>} - Array of agent objects { name, content, frontmatter, globs }
 *
 * @example
 * const agents = await loadAllAgents('.compound/agents');
 * // Returns: [{ name: 'accessibility-reviewer', content: '...', frontmatter: { ... } }, ...]
 */
export async function loadAllAgents(agentsDir) {
  const path = await import('path');
  const { glob } = await import('glob');
  const { FileOperationError } = await import('../../src/errors.js');
  const { safeExecute } = await import('../../src/error-handler.js');

  // Check if directory exists
  const exists = await safeExecute(
    () => fs.pathExists(agentsDir),
    false,
    { operation: 'checkDirectory', path: agentsDir }
  );

  if (!exists) {
    throw new FileOperationError(
      'Agents directory not found',
      agentsDir,
      'read',
      {
        hint: `Ensure ${agentsDir} exists`
      }
    );
  }

  // Find all markdown files recursively
  const files = await safeExecute(
    () => glob(`${agentsDir}/**/*.md`),
    [],
    { operation: 'glob', pattern: `${agentsDir}/**/*.md` }
  );

  const agents = [];

  for (const filePath of files) {
    // Read file content with error handling
    const content = await safeExecute(
      () => fs.readFile(filePath, 'utf8'),
      null,
      { operation: 'readFile', path: filePath }
    );

    if (!content) {
      console.warn(`⚠️  Skipped ${filePath}: Unable to read`);
      continue;
    }

    // Parse frontmatter with error handling
    let frontmatter;
    try {
      frontmatter = extractFrontmatter(content, filePath);
    } catch (error) {
      if (error instanceof ConfigError) {
        console.warn(`⚠️  Skipped ${filePath}: ${error.message}`);
        continue;
      }
      throw error;
    }

    // Extract agent name from relative path (preserves directory structure)
    const relativePath = path.relative(agentsDir, filePath);
    const agentName = relativePath.replace('.md', '').replace(/\//g, '-');

    agents.push({
      name: agentName,
      content: removeFrontmatter(content),
      frontmatter,
      description: frontmatter?.description || `${agentName} agent`,
      globs: frontmatter?.globs || ['**/*'],
      filePath
    });
  }

  if (agents.length === 0) {
    console.warn(`⚠️  No valid agent files found in ${agentsDir}`);
  }

  return agents;
}

export default {
  extractFrontmatter,
  extractFrontmatterSafe,
  removeFrontmatter,
  extractNameFromFrontmatter,
  validateFrontmatter,
  formatWorkflowMetadata,
  readPackageJson,
  isMarkdownFile,
  filterMarkdownFiles,
  getAdapterOutputDir,
  countAgents,
  getDefaultWorkflowMetadata,
  findCompoundDirectory,
  loadAllWorkflows,
  loadAllAgents
};
