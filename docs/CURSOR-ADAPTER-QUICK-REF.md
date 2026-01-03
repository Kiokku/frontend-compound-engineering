# Cursor Adapter - Quick Reference

## Installation & Usage

### Quick Start

```bash
# Auto-detect and setup (recommended)
cd packages/core
node bin/cli.js init

# Manual generation - Modern format
node bin/cli.js adapters generate cursor

# Manual generation - Legacy format
node bin/cli.js adapters generate cursor --legacy
```

## What Gets Generated

### Modern Format (Default)
```
.cursor/rules/
├── compound-main.mdc              # Main config (always active)
├── compound-plan.mdc              # Plan workflow
├── compound-work.mdc              # Work workflow
├── compound-review.mdc            # Review workflow
├── compound-compound.mdc          # Compound workflow
├── agent-accessibility-reviewer.mdc
├── agent-performance-reviewer.mdc
├── agent-security-reviewer.mdc
├── agent-code-generator.mdc
├── agent-test-writer.mdc
├── agent-style-implementer.mdc
├── agent-requirements-analyzer.mdc
├── agent-component-architect.mdc
└── agent-dependency-advisor.mdc
```

### Legacy Format (--cursor-legacy)
```
.cursorrules                        # Single file with all workflows
```

## Using in Cursor IDE

After generation, **restart Cursor IDE** and try:

### Workflows
```
"Create a plan for adding user authentication"
"Help me work on the login component"
"Review this code for performance issues"
"Compound this solution into knowledge base"
```

### Agents
```
"Use the component-architect agent to design the dashboard"
"Check accessibility with the accessibility-reviewer"
"Use the performance-reviewer to optimize this code"
"Apply the security-reviewer to check for vulnerabilities"
```

## File Structure

### .cursor/rules/compound-main.mdc
```yaml
---
description: Compound Frontend Workflow - Main Configuration
globs: ["**/*"]
alwaysApply: true  <-- Always active
---

# Compound Frontend Workflow

You are an expert frontend developer...

## Available Commands
- compound:plan
- compound:work
- compound:review
- compound:compound

## Available Agents
- accessibility-reviewer
- performance-reviewer
- security-reviewer
...
```

### .cursor/rules/compound-plan.mdc
```yaml
---
description: compound:plan workflow
globs: ["**/*"]
alwaysApply: false  <-- Activated on demand
---

# compound:plan

<workflow content>
```

## Troubleshooting

### Rules not showing?
1. Restart Cursor IDE completely
2. Check `.cursor/rules/` directory exists
3. Verify files have valid YAML frontmatter

### Agents not found?
1. Check `.compound/agents/` directory exists
2. Run `node bin/cli.js agents list`
3. Verify agent files are present

### Want to switch formats?
```bash
# Remove existing
rm -rf .cursor/rules/
rm -f .cursorrules

# Generate new format
node bin/cli.js adapters generate cursor [--legacy]
```

## Advanced Usage

### Custom globs for specific file types
Edit individual `.mdc` files to modify `globs:` field:
```yaml
---
globs: ["src/**/*.jsx", "src/**/*.tsx"]  # Only React files
---
```

### Disable specific agents
Move agent files out of `.cursor/rules/`:
```bash
mv .cursor/rules/agent-security-reviewer.mdc .cursor/rules/disabled/
```

## Integration with Development Workflow

### Before committing
```bash
# Generate latest adapter
node bin/cli.js adapters generate cursor

# Commit both .compound/ and .cursor/
git add .compound/ .cursor/
git commit -m "Update compound workflows and cursor rules"
```

### Team collaboration
Add `.cursor/rules/` to `.gitignore` if each team member
generates their own, or commit it for shared configuration.

## Related Commands

```bash
# List all agents
node bin/cli.js agents list

# Show installation info
node bin/cli.js info

# Initialize from scratch
node bin/cli.js init --force

# Regenerate adapters
node bin/cli.js adapters generate cursor
```

## Support & Documentation

- Full workflow guide: `../compound-workflow.md`
- Testing guide: `packages/core/scripts/adapters/__tests__/test-cursor-adapter.md`
- Phase completion: `../PHASE-2.3-COMPLETION.md`
