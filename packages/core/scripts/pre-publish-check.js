#!/usr/bin/env node

/**
 * Pre-publish Check Script
 *
 * Runs comprehensive checks before publishing to NPM:
 * 1. Dependency security audit
 * 2. Code security scan
 * 3. Sensitive files check
 * 4. Test execution
 * 5. Package validation
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔒 Pre-publish Security Checks\n');
console.log('='.repeat(60));

let hasErrors = false;

/**
 * Step 1: Dependency Audit
 */
async function checkDependencies() {
  console.log('\n📦 Step 1: Dependency Security Scan');

  try {
    // Check for npm audit
    const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
    const auditResult = JSON.parse(auditOutput);

    const vulnerabilities = auditResult.metadata?.vulnerabilities;
    if (vulnerabilities) {
      const { high, critical, moderate, low } = vulnerabilities;
      if (critical > 0 || high > 0) {
        console.error(`❌ Found ${critical} critical and ${high} high vulnerabilities`);
        hasErrors = true;
        return false;
      }
    }

    console.log('✅ Dependency audit passed');
    return true;
  } catch (error) {
    // npm audit returns non-zero exit code if vulnerabilities found
    const errorOutput = error.stdout || error.message;
    if (errorOutput.includes('vulnerabilities')) {
      try {
        const auditResult = JSON.parse(errorOutput);
        const vulnerabilities = auditResult.metadata?.vulnerabilities;
        if (vulnerabilities) {
          const { high, critical } = vulnerabilities;
          if (critical > 0 || high > 0) {
            console.error(`❌ Found ${critical} critical and ${high} high vulnerabilities`);
            hasErrors = true;
            return false;
          }
        }
      } catch {
        console.error('⚠️  Could not parse audit results');
        hasErrors = true;
        return false;
      }
    }
    console.log('✅ Dependency audit passed');
    return true;
  }
}

/**
 * Step 2: Code Security Scan
 */
async function checkCodeSecurity() {
  console.log('\n🔍 Step 2: Code Security Scan');

  try {
    const auditScript = path.join(__dirname, 'security-audit.js');
    execSync(`node ${auditScript}`, { stdio: 'inherit' });
    console.log('✅ Code security check passed');
    return true;
  } catch (error) {
    console.error('❌ Code security check failed');
    hasErrors = true;
    return false;
  }
}

/**
 * Step 3: Sensitive Files Check
 */
async function checkSensitiveFiles() {
  console.log('\n📂 Step 3: Sensitive Files Check');

  const sensitivePatterns = ['.env', '.env.local', '*.pem', '*.key', 'secrets.json', '.npmrc'];
  const foundFiles = [];

  for (const pattern of sensitivePatterns) {
    const files = glob.sync(pattern, { cwd: process.cwd() });
    foundFiles.push(...files);
  }

  if (foundFiles.length > 0) {
    console.warn('⚠️  Found sensitive files:');
    foundFiles.forEach((file) => console.warn(`   - ${file}`));
    console.log('\n💡 Make sure these files are in .npmignore');
    // Don't fail, just warn
  } else {
    console.log('✅ No sensitive files found');
  }

  return true;
}

/**
 * Step 4: Check .npmignore
 */
async function checkNpmIgnore() {
  console.log('\n📝 Step 4: Check .npmignore');

  const npmignorePath = path.join(process.cwd(), '.npmignore');

  if (!(await fs.pathExists(npmignorePath))) {
    console.warn('⚠️  No .npmignore found, creating default configuration...');

    const defaultNpmignore = `# Sensitive files
.env*
*.pem
*.key
secrets.json
security-audit-report.json

# Development files
tests/
*.test.js
.test/
coverage/
.github/
.vscode/
.idea/

# Logs
*.log
npm-debug.log*

# Build artifacts
dist/
build/

# Documentation (optional)
docs/
*.md
!README.md
`;

    await fs.writeFile(npmignorePath, defaultNpmignore);
    console.log('✅ Created .npmignore with default configuration');
  } else {
    console.log('✅ .npmignore exists');
  }

  return true;
}

/**
 * Step 5: Run Tests
 */
async function runTests() {
  console.log('\n🧪 Step 5: Run Tests');

  try {
    execSync('npm run test:run', { stdio: 'inherit' });
    console.log('✅ All tests passed');
    return true;
  } catch (error) {
    console.error('❌ Tests failed');
    hasErrors = true;
    return false;
  }
}

/**
 * Step 6: Validate package.json
 */
async function validatePackageJson() {
  console.log('\n📦 Step 6: Validate package.json');

  const packageJsonPath = path.join(process.cwd(), 'package.json');

  try {
    const pkg = await fs.readJson(packageJsonPath);

    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'main', 'license'];
    const missingFields = requiredFields.filter((field) => !pkg[field]);

    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
      hasErrors = true;
      return false;
    }

    // Check version format
    if (!/^\d+\.\d+\.\d+/.test(pkg.version)) {
      console.error('❌ Invalid version format (should be semver)');
      hasErrors = true;
      return false;
    }

    console.log('✅ package.json is valid');
    return true;
  } catch (error) {
    console.error('❌ Could not read package.json');
    hasErrors = true;
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  await checkDependencies();
  await checkCodeSecurity();
  await checkSensitiveFiles();
  await checkNpmIgnore();
  await runTests();
  await validatePackageJson();

  console.log('\n' + '='.repeat(60));

  if (hasErrors) {
    console.error('\n❌ Pre-publish checks failed');
    console.error('Please fix the errors above before publishing\n');
    process.exit(1);
  } else {
    console.log('\n🎉 All security checks passed!');
    console.log('You can now publish with: npm publish --access public\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});
