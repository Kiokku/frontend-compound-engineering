#!/usr/bin/env node

/**
 * Security Audit Script for Compound Workflow
 *
 * Performs comprehensive security checks before publishing to NPM:
 * - Dangerous code patterns (eval, dynamic requires, etc.)
 * - Sensitive information leaks (API keys, passwords)
 * - Path traversal vulnerabilities
 * - Unsafe shell command execution
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Auditor
 */
class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.patterns = [
      // Dangerous code patterns
      { regex: /eval\s*\(/g, severity: 'critical', message: 'Forbidden use of eval()' },
      { regex: /new Function\s*\(/g, severity: 'critical', message: 'Forbidden use of new Function()' },
      { regex: /child_process\.exec\s*\(/g, severity: 'high', message: 'Use execFile instead of exec' },
      {
        regex: /\$\{.*\}/g,
        severity: 'medium',
        message: 'Check template string for injection risks',
        context: 'shell'
      },

      // Sensitive information leaks
      {
        regex: /api[_-]?key\s*[:=]/gi,
        severity: 'critical',
        message: 'Possible API key detected'
      },
      {
        regex: /password\s*[:=]\s*['"][^'"]+['"]/gi,
        severity: 'critical',
        message: 'Hardcoded password detected'
      },
      { regex: /secret\s*[:=]/gi, severity: 'high', message: 'Possible secret information detected' },

      // Path traversal risks
      { regex: /\.\.\/|\.\.\\./g, severity: 'medium', message: 'Check for path traversal vulnerabilities' },

      // Unsafe dependency usage
      {
        regex: /require\s*\([^)]*\+/g,
        severity: 'high',
        message: 'Dynamic require may have security risks'
      }
    ];
  }

  /**
   * Scan specified directory
   */
  async scan(directory) {
    console.log('🔍 Starting security scan...\n');

    const files = glob.sync(path.join(directory, '**/*.js'), {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.js',
        '**/coverage/**',
        '**/security-audit.js',
        '**/pre-publish-check.js'
      ]
    });

    if (files.length === 0) {
      console.log('⚠️  No JavaScript files found to scan');
      return true;
    }

    console.log(`📂 Scanning ${files.length} files...\n`);

    for (const file of files) {
      await this.scanFile(file);
    }

    return this.generateReport();
  }

  /**
   * Scan single file
   */
  async scanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      for (const pattern of this.patterns) {
        let match;
        // Reset regex lastIndex
        pattern.regex.lastIndex = 0;

        while ((match = pattern.regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          this.issues.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNumber,
            severity: pattern.severity,
            message: pattern.message,
            code: lines[lineNumber - 1]?.trim() || ''
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read file: ${filePath}`);
    }
  }

  /**
   * Generate audit report
   */
  generateReport() {
    const criticalCount = this.issues.filter((i) => i.severity === 'critical').length;
    const highCount = this.issues.filter((i) => i.severity === 'high').length;
    const mediumCount = this.issues.filter((i) => i.severity === 'medium').length;

    console.log('📊 Security Audit Report\n');
    console.log('='.repeat(60));
    console.log(`🚨 Critical: ${criticalCount}`);
    console.log(`⚠️  High:     ${highCount}`);
    console.log(`📝 Medium:   ${mediumCount}`);
    console.log('='.repeat(60));

    if (this.issues.length > 0) {
      console.log('\n📋 Detailed Issues:\n');

      for (const issue of this.issues) {
        const icon = {
          critical: '🚨',
          high: '⚠️',
          medium: '📝'
        }[issue.severity];

        console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
        console.log(`   ${issue.message}`);
        console.log(`   Code: ${issue.code.substring(0, 80)}${issue.code.length > 80 ? '...' : ''}`);
        console.log();
      }
    }

    // Write report file
    const report = {
      timestamp: new Date().toISOString(),
      summary: { critical: criticalCount, high: highCount, medium: mediumCount },
      issues: this.issues
    };

    const reportPath = path.join(process.cwd(), 'security-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);

    // Return false if there are critical issues
    return criticalCount === 0;
  }
}

// Execute audit
const auditor = new SecurityAuditor();
const packageRoot = path.resolve(__dirname, '..');
const passed = await auditor.scan(packageRoot);

if (!passed) {
  console.error('\n❌ Security audit failed: Critical security issues found');
  console.error('Please fix these issues before publishing\n');
  process.exit(1);
} else {
  console.log('\n✅ Security audit passed\n');
  process.exit(0);
}
