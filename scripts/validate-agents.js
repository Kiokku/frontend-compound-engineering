#!/usr/bin/env node

/**
 * validate-agents.js
 *
 * Validates agent files in library/ and packages/* /agents/ directories.
 * Ensures all agent files have correct YAML frontmatter and required fields.
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validation errors and warnings
 */
class ValidationError {
  constructor(file, message, severity = 'error') {
    this.file = file;
    this.message = message;
    this.severity = severity;
  }
}

/**
 * Agent validator
 */
class AgentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredFields = ['name', 'description', 'category', 'frameworks'];
    this.validCategories = ['plan', 'work', 'review', 'compound'];
    this.validFrameworks = [
      'react', 'vue', 'angular', 'svelte',
      'next.js', 'nuxt', 'remix', 'quasar',
      'javascript', 'typescript'
    ];
  }

  /**
   * Validate a single agent file
   */
  async validateAgent(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);

    // Check for YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);

    if (!frontmatterMatch) {
      this.errors.push(new ValidationError(
        relativePath,
        'Missing YAML frontmatter (must start with ---\\n...\\n---)',
        'error'
      ));
      return false;
    }

    // Parse YAML
    let frontmatter;
    try {
      frontmatter = yaml.parse(frontmatterMatch[1]);
    } catch (error) {
      this.errors.push(new ValidationError(
        relativePath,
        `YAML parsing error: ${error.message}`,
        'error'
      ));
      return false;
    }

    // Validate required fields
    for (const field of this.requiredFields) {
      if (!frontmatter[field]) {
        this.errors.push(new ValidationError(
          relativePath,
          `Missing required field: '${field}'`,
          'error'
        ));
      }
    }

    // Validate category
    if (frontmatter.category && !this.validCategories.includes(frontmatter.category)) {
      this.errors.push(new ValidationError(
        relativePath,
        `Invalid category: '${frontmatter.category}'. Must be one of: ${this.validCategories.join(', ')}`,
        'error'
      ));
    }

    // Validate frameworks array
    if (frontmatter.frameworks) {
      if (!Array.isArray(frontmatter.frameworks)) {
        this.errors.push(new ValidationError(
          relativePath,
          'Field "frameworks" must be an array',
          'error'
        ));
      } else {
        for (const framework of frontmatter.frameworks) {
          if (!this.validFrameworks.includes(framework)) {
            this.warnings.push(new ValidationError(
              relativePath,
              `Unknown framework: '${framework}'. Consider adding to valid frameworks list`,
              'warning'
            ));
          }
        }
      }
    }

    // Validate content length
    const contentBody = content.replace(/^---[\s\S]*?---/, '').trim();
    if (contentBody.length < 100) {
      this.warnings.push(new ValidationError(
        relativePath,
        'Agent content is very short (< 100 chars). Add more details.',
        'warning'
      ));
    }

    // Check for common sections
    const requiredSections = ['## Your Role', '## Review Checklist'];
    for (const section of requiredSections) {
      if (!contentBody.includes(section)) {
        this.warnings.push(new ValidationError(
          relativePath,
          `Missing recommended section: '${section}'`,
          'warning'
        ));
      }
    }

    return this.errors.filter(e => e.file === relativePath).length === 0;
  }

  /**
   * Validate all agent files in a pattern
   */
  async validatePattern(pattern) {
    const files = glob.sync(pattern);

    if (files.length === 0) {
      console.log(`⚠️  No files found matching pattern: ${pattern}`);
      return;
    }

    for (const file of files) {
      await this.validateAgent(file);
    }
  }

  /**
   * Print validation report
   */
  printReport() {
    console.log('\n📊 Validation Report\n');
    console.log('='.repeat(60));

    // Print errors
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):\n`);
      for (const error of this.errors) {
        console.log(`   ${error.file}`);
        console.log(`   → ${error.message}\n`);
      }
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):\n`);
      for (const warning of this.warnings) {
        console.log(`   ${warning.file}`);
        console.log(`   → ${warning.message}\n`);
      }
    }

    console.log('='.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All agent files are valid!\n');
      return true;
    } else if (this.errors.length === 0) {
      console.log(`\n⚠️  Validation passed with ${this.warnings.length} warning(s)\n`);
      return true;
    } else {
      console.log(`\n❌ Validation failed with ${this.errors.length} error(s)\n`);
      return false;
    }
  }
}

/**
 * Main validation function
 */
async function validateAgents() {
  console.log('🔍 Validating agent files...\n');

  const validator = new AgentValidator();

  // Validate library/ agents
  console.log('Checking library/ agents...');
  await validator.validatePattern('library/**/*.md');

  // Validate packaged agents
  console.log('Checking packages/*/agents/...');
  await validator.validatePattern('packages/*/agents/**/*.md');

  // Print report
  const passed = validator.printReport();

  return passed;
}

// CLI interface
(async () => {
  try {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');

    const passed = await validateAgents();

    if (!passed) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
