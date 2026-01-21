# Troubleshooting Guide

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Initialization Problems](#initialization-problems)
3. [Agent Issues](#agent-issues)
4. [Workflow Issues](#workflow-issues)
5. [Adapter Issues](#adapter-issues)
6. [Configuration Issues](#configuration-issues)
7. [Performance Issues](#performance-issues)
8. [Platform-Specific Issues](#platform-specific-issues)
9. [Getting Help](#getting-help)

---

## Installation Issues

### Issue: "Cannot find package '@compound-workflow/core'"

**Symptoms:**
```bash
npm install @compound-workflow/core
# Error: Could not find dependency
```

**Causes:**
- Package not yet published to npm
- Network connectivity issues
- Incorrect npm registry

**Solutions:**

1. **Check npm registry:**
```bash
npm config get registry
# Should be: https://registry.npmjs.org/
```

2. **Install from local tarball (if testing):**
```bash
cd packages/core
npm pack
npm install /path/to/compound-workflow-core-0.1.0.tgz
```

3. **Clear npm cache:**
```bash
npm cache clean --force
npm install @compound-workflow/core
```

4. **Use a different registry:**
```bash
npm install @compound-workflow/core --registry=https://registry.npmjs.org/
```

---

### Issue: "Version conflicts with peer dependencies"

**Symptoms:**
```bash
npm ERR! peer dep missing: @compound-workflow/core@^0.1.0
```

**Solutions:**

1. **Install missing peer dependency:**
```bash
npm install @compound-workflow/core
npm install @compound-workflow/react
```

2. **Use legacy peer deps (not recommended):**
```bash
npm install @compound-workflow/react --legacy-peer-deps
```

3. **Check installed versions:**
```bash
npm ls @compound-workflow/core @compound-workflow/react
```

---

### Issue: "Postinstall script failed"

**Symptoms:**
```bash
npm ERR! @compound-workflow/core@0.1.0 postinstall: `node scripts/init.js`
```

**Note:** This package doesn't use postinstall hooks. This error suggests an old version or corrupted installation.

**Solutions:**

1. **Uninstall and reinstall:**
```bash
npm uninstall @compound-workflow/core
npm install @compound-workflow/core
```

2. **Clear node_modules:**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Use npx to run init manually:**
```bash
npx compound init
```

---

## Initialization Problems

### Issue: "compound: command not found"

**Symptoms:**
```bash
compound --version
# command not found: compound
```

**Causes:**
- npm bin directory not in PATH
- Package not installed correctly
- Using npx without local installation

**Solutions:**

1. **Use npx:**
```bash
npx compound --version
```

2. **Check npm bin directory:**
```bash
npm bin
# Add to PATH if needed
export PATH=$(npm bin):$PATH
```

3. **Install globally (if preferred):**
```bash
npm install -g @compound-workflow/core
```

4. **Verify installation:**
```bash
npm ls @compound-workflow/core
```

---

### Issue: "Init script hangs or freezes"

**Symptoms:**
```bash
npx compound init
# Hangs, no output
```

**Causes:**
- File permission issues
- Antivirus software blocking
- Interactive prompt awaiting input

**Solutions:**

1. **Run with verbose logging:**
```bash
DEBUG=true npx compound init
```

2. **Check file permissions:**
```bash
ls -la .compound/
# Should be writable by current user
```

3. **Use non-interactive flags:**
```bash
npx compound init --setup-only --force
```

4. **Check antivirus logs:**
- Temporarily disable antivirus
- Add npm/node to antivirus exclusions

---

### Issue: "Cannot detect AI tool"

**Symptoms:**
```
⚠️  Could not detect AI coding tool
? Select your AI coding tool: (Use arrow keys)
```

**Causes:**
- No AI tool installed
- Custom installation location
- Unsupported tool version

**Solutions:**

1. **Manually select tool:**
- Choose from the interactive prompt
- Or set in config:
```json
{
  "tool": "claude"  // or "cursor" or "qoder"
}
```

2. **Verify tool installation:**

**Claude Code:**
```bash
ls -la ~/.claude/
# Should exist if Claude Code is installed
```

**Cursor IDE:**
```bash
ls -la ~/.cursor/
# Should exist if Cursor is installed
```

**Qoder CLI:**
```bash
which qoder
# Should return qoder path
```

3. **Set environment variable:**
```bash
export CLAUDE_CODE=1  # For Claude
export CURSOR_WORKSPACE=1  # For Cursor
export QODER_CLI=1  # For Qoder
```

---

## Agent Issues

### Issue: "Agent not found"

**Symptoms:**
```bash
npx compound agents add react-performance
❌ Agent 'react-performance' not found in installed packages.
```

**Causes:**
- Agent doesn't exist
- Package not installed
- Incorrect agent name

**Solutions:**

1. **List available agents:**
```bash
npx compound agents list
```

2. **Install framework package:**
```bash
npm install @compound-workflow/react
```

3. **Check agent name:**
```bash
# Correct names:
react-reviewer
react-hooks-specialist
react-performance

# NOT:
react-performance-reviewer  # Wrong
performance  # Too generic
```

4. **Search in package:**
```bash
ls node_modules/@compound-workflow/react/agents/
```

---

### Issue: "Custom agent not loading"

**Symptoms:**
- Custom agent in `.compound/agents/` not appearing in list
- Package agent loads instead of custom

**Causes:**
- Incorrect file format
- Missing frontmatter
- Wrong file extension

**Solutions:**

1. **Check file format:**
```bash
# Must be .md file
.compound/agents/my-agent.md  # ✅ Correct
.compound/agents/my-agent.txt  # ❌ Wrong
```

2. **Verify YAML frontmatter:**
```markdown
---
name: my-agent
description: My custom agent
category: review
frameworks: [react, vue]
---

# Agent content here...
```

3. **Check file location:**
```bash
# Project level (highest priority)
.compound/agents/my-agent.md

# User level (medium priority)
~/.compound/agents/my-agent.md

# Package level (lowest priority)
node_modules/@compound-workflow/core/agents/my-agent.md
```

4. **Validate frontmatter:**
```bash
# Test YAML parsing
node -e "const yaml = require('yaml'); const fs = require('fs'); const content = fs.readFileSync('.compound/agents/my-agent.md', 'utf8'); console.log(yaml.parse(content.split('---')[1]));"
```

---

### Issue: "Agent priority not working"

**Symptoms:**
- Package agent loads instead of custom
- Expected agent override not happening

**Solutions:**

1. **Verify agent location:**
```bash
# Custom must be in .compound/agents/
ls -la .compound/agents/my-agent.md

# Check it's not in node_modules
ls node_modules/@compound-workflow/*/agents/my-agent.md
```

2. **Same name for override:**
```bash
# Custom agent
.compound/agents/react-reviewer.md

# Will override
node_modules/@compound-workflow/react/agents/react-reviewer.md
```

3. **Check for typos:**
```bash
# Names must match exactly (case-sensitive)
React-Reviewer.md  # ❌ Won't match
react-reviewer.md  # ✅ Correct
```

---

## Workflow Issues

### Issue: "Workflow not activating"

**Symptoms:**
- Mentioning workflow name doesn't activate it
- AI tool doesn't recognize workflow

**Solutions:**

**Claude Code:**

1. **Refresh plugins:**
```
/plugin refresh
```

2. **Check plugin installation:**
```bash
ls -la ~/.claude/plugins/compound-frontend/
```

3. **Verify workflow file:**
```bash
cat .compound/workflows/plan.md
# Should have valid YAML frontmatter
```

**Cursor IDE:**

1. **Restart Cursor:**
   - Cursor loads rules on startup
   - Changes require restart

2. **Check rule files:**
```bash
ls -la .cursor/rules/compound-*.mdc
```

3. **Verify rule format:**
```bash
cat .cursor/rules/compound-plan.mdc
# Should have YAML frontmatter with globs
```

**Qoder CLI:**

1. **Check command files:**
```bash
ls -la ~/.qoder/commands/compound/
```

2. **Verify command syntax:**
```bash
qoder /compound:plan "test"
```

---

### Issue: "Workflow not following my custom process"

**Symptoms:**
- Default workflow doesn't match team's process
- Need to customize workflow steps

**Solutions:**

1. **Copy default workflow:**
```bash
cp node_modules/@compound-workflow/core/.compound/workflows/plan.md \
   .compound/workflows/plan.md
```

2. **Edit custom workflow:**
```bash
vim .compound/workflows/plan.md
```

3. **Verify customization:**
```bash
# Custom takes precedence
cat .compound/workflows/plan.md
```

---

## Adapter Issues

### Issue: "Claude adapter not working"

**Symptoms:**
- Claude doesn't recognize `/compound:` commands
- Plugin not loading

**Solutions:**

1. **Check plugin directory:**
```bash
ls -la ~/.claude/plugins/compound-frontend/
```

2. **Verify plugin.json:**
```bash
cat ~/.claude/plugins/compound-frontend/plugin.json
# Should be valid JSON
```

3. **Refresh plugins in Claude:**
```
I need to refresh plugins.
/plugin refresh
```

4. **Check Claude version:**
```
/version
# Requires Claude Code with plugin support
```

5. **Reinitialize adapter:**
```bash
npx compound init --adapter-only --force
```

---

### Issue: "Cursor adapter not working"

**Symptoms:**
- Cursor rules not activating
- No `.cursor/rules/` directory created

**Solutions:**

1. **Check Cursor version:**
- Requires Cursor with `.cursor/rules/` support
- Old versions use `.cursorrules` file

2. **Use legacy format:**
```bash
npx compound init --cursor-legacy --force
```

3. **Restart Cursor:**
- Cursor loads rules on startup
- Changes require restart

4. **Check rule files:**
```bash
ls -la .cursor/rules/compound-*.mdc
```

5. **Verify rule syntax:**
```bash
cat .cursor/rules/compound-main.mdc
# Should have:
# ---
# description: ...
# globs: ["**/*"]
# alwaysApply: true
# ---
```

---

### Issue: "Qoder adapter not working"

**Symptoms:**
- `/compound:` commands not recognized
- Commands not in `~/.qoder/commands/`

**Solutions:**

1. **Check Qoder installation:**
```bash
which qoder
qoder --version
```

2. **Verify command files:**
```bash
ls -la ~/.qoder/commands/compound/
```

3. **Test command:**
```bash
qoder /compound:plan "test"
```

4. **Reinitialize adapter:**
```bash
npx compound init --adapter-only --force
```

---

## Configuration Issues

### Issue: "Config file not found"

**Symptoms:**
```bash
cat .compound/config.json
# No such file or directory
```

**Solutions:**

1. **Run initialization:**
```bash
npx compound init --setup-only
```

2. **Create manually:**
```bash
mkdir -p .compound
cat > .compound/config.json << EOF
{
  "version": "0.1.0",
  "tool": "auto",
  "disabledAgents": [],
  "preferences": {
    "autoSuggestAgents": true,
    "verboseLogging": false,
    "recordSolutions": true
  },
  "adapters": {
    "claude": { "enabled": true },
    "cursor": { "enabled": true },
    "qoder": { "enabled": true }
  }
}
EOF
```

---

### Issue: "Config changes not taking effect"

**Symptoms:**
- Modified config but behavior unchanged
- Disabled agents still running

**Solutions:**

1. **Validate JSON syntax:**
```bash
cat .compound/config.json | jq .
# or
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('.compound/config.json')), null, 2))"
```

2. **Restart AI tool:**
- Claude: `/plugin refresh`
- Cursor: Restart application
- Qoder: Commands reload automatically

3. **Clear caches:**
```bash
rm -rf .compound/logs/
```

4. **Verify config location:**
```bash
# Must be in project root
ls -la .compound/config.json

# Not in parent or subdirectory
```

---

## Performance Issues

### Issue: "Slow agent loading"

**Symptoms:**
- `compound agents list` takes > 10 seconds
- Workflow activation delayed

**Solutions:**

1. **Reduce agent count:**
```json
{
  "disabledAgents": [
    "agent-suggester",
    "tech-stack-detector"
  ]
}
```

2. **Use local agents only:**
```bash
# Copy frequently used agents to project
cp node_modules/@compound-workflow/react/agents/react-reviewer.md \
   .compound/agents/
```

3. **Exclude large directories:**
```bash
# Add to .gitignore
node_modules/
dist/
build/
```

---

### Issue: "High memory usage"

**Symptoms:**
- Node process using > 500MB
- System slowdowns

**Solutions:**

1. **Update Node.js:**
```bash
node --version  # Should be 18+ or 20+
```

2. **Clear npm cache:**
```bash
npm cache clean --force
```

3. **Limit concurrent operations:**
```json
{
  "preferences": {
    "maxConcurrentAgents": 3
  }
}
```

---

## Platform-Specific Issues

### Windows

#### Issue: "Path too long"

**Symptoms:**
```
ENAMETOOLONG: name too long
```

**Solutions:**

1. **Enable long paths in Windows:**
- Run regedit
- Go to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
- Add: `LongPathsEnabled` = 1

2. **Use shorter paths:**
```bash
# Instead of:
C:\very\long\path\to\project

# Use:
C:\projects\compound-test
```

---

#### Issue: "Permission denied"

**Symptoms:**
```
Error: EPERM: operation not permitted
```

**Solutions:**

1. **Run as administrator:**
- Right-click Command Prompt
- "Run as Administrator"

2. **Check folder permissions:**
- Right-click folder → Properties → Security
- Ensure "Full control" for your user

---

### macOS

#### Issue: "Command not found after install"

**Symptoms:**
```bash
compound --version
# command not found
```

**Solutions:**

1. **Check npm bin:**
```bash
npm config get prefix
# Add to PATH: /usr/local
```

2. **Update shell profile:**
```bash
# For zsh (macOS Catalina+)
echo 'export PATH=$(npm prefix -g)/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# For bash
echo 'export PATH=$(npm prefix -g)/bin:$PATH' >> ~/.bash_profile
source ~/.bash_profile
```

---

### Linux

#### Issue: "EACCES permission denied"

**Symptoms:**
```
Error: EACCES: permission denied
```

**Solutions:**

1. **Fix npm permissions:**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

2. **Use sudo (not recommended):**
```bash
sudo npm install -g @compound-workflow/core
```

---

## Getting Help

If none of the solutions work:

### 1. Gather Information

```bash
# System info
node --version
npm --version
npm ls @compound-workflow/core

# Config
cat .compound/config.json

# Logs
cat .compound/logs/*.log

# Error details
npx compound --version 2>&1
```

### 2. Search Issues

- [GitHub Issues](https://github.com/your-org/compound-workflow/issues)
- [Discord Community](https://discord.gg/compound-workflow)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/compound-workflow)

### 3. Create Bug Report

Include:
- OS and version
- Node.js version
- Package versions
- Error messages
- Steps to reproduce
- Expected vs actual behavior

### 4. Get Live Help

- Discord: https://discord.gg/compound-workflow
- Email: support@compound-workflow.dev

---

## Quick Reference

### Common Commands

```bash
# Diagnose installation
npm ls @compound-workflow/core

# List agents
npx compound agents list

# Reinitialize
npx compound init --force

# Check config
cat .compound/config.json

# View logs
cat .compound/logs/*.log

# Clear cache
npm cache clean --force
```

### Useful Flags

```bash
--force          # Override existing files
--adapter-only   # Skip project setup
--setup-only     # Skip adapter generation
--cursor-legacy  # Use old Cursor format
```

---

**Last Updated:** 2026-01-21
**Version:** 0.1.0
