# Compound Workflow - Complete Usage Guide

## Table of Contents

1. [Installation](#installation)
2. [Initialization](#initialization)
3. [Core Workflows](#core-workflows)
4. [Agent System](#agent-system)
5. [Configuration](#configuration)
6. [AI Tool Integration](#ai-tool-integration)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Installation

### Option 1: Complete Toolkit

Install all packages including framework-specific agents:

```bash
npm install @compound-workflow/frontend
```

**Includes:**
- @compound-workflow/core
- @compound-workflow/frontend-base
- @compound-workflow/react
- @compound-workflow/vue
- @compound-workflow/design-tools

### Option 2: Core Only

Start minimal and add packages as needed:

```bash
npm install @compound-workflow/core
```

### Option 3: Framework-Specific

Add only the frameworks you use:

```bash
# Core + React
npm install @compound-workflow/core @compound-workflow/react

# Core + Vue
npm install @compound-workflow/core @compound-workflow/vue
```

---

## Initialization

### Basic Initialization

```bash
npx compound init
```

**This will:**
1. Auto-detect your AI coding tool (Claude/Cursor/Qoder)
2. Create `.compound/` directory structure
3. Copy core workflows and agents
4. Generate tool-specific adapters
5. Create configuration file

### Directory Structure Created

```
your-project/
├── .compound/
│   ├── workflows/          # 4 core workflows
│   ├── agents/             # Custom agents (empty initially)
│   ├── docs/               # Knowledge base (auto-generated)
│   ├── logs/               # Execution logs
│   ├── adapters/           # Generated adapters
│   └── config.json         # Configuration
├── .cursor/                # Cursor rules (if detected)
│   └── rules/
└── .claude/                # Claude plugins (if detected)
    └── plugins/
```

### Advanced Initialization Options

```bash
# Force override existing files
npx compound init --force

# Use legacy Cursor format (.cursorrules instead of .cursor/rules/)
npx compound init --cursor-legacy

# Skip project setup, only configure adapter
npx compound init --adapter-only

# Only run project setup (skip adapter generation)
npx compound init --setup-only
```

---

## Core Workflows

### 1. Plan Workflow

**Purpose:** Create detailed implementation plans for new features.

**When to use:**
- Starting a new feature
- Designing component architecture
- Planning refactoring
- Analyzing requirements

**Usage Examples:**

**Claude Code:**
```
I need to add a user profile page with avatar, bio, and activity feed.
Please help me plan this feature.
```

**Cursor IDE:**
```
Plan the implementation of a shopping cart with checkout flow.
```

**Qoder CLI:**
```bash
qoder /compound:plan "Add search functionality with filters"
```

**Output:**
- `.compound/docs/plans/user-profile-page.md` - Detailed plan
- Component hierarchy diagram
- Technology stack recommendations
- Dependency list
- Testing strategy
- Performance targets

---

### 2. Work Workflow

**Purpose:** Execute implementation plans and generate code.

**When to use:**
- Implementing planned features
- Creating new components
- Writing tests
- Adding documentation

**Usage Examples:**

**Claude Code:**
```
Implement the user profile page based on the plan we created.
Use React with TypeScript and Tailwind CSS.
```

**Cursor IDE:**
```
Create the shopping cart component with:
- Add/remove items
- Quantity controls
- Price calculation
- Checkout button
```

**Output:**
- React components with TypeScript
- Styled components or CSS
- Unit tests (Vitest/Jest)
- Storybook stories (if applicable)
- Component documentation

---

### 3. Review Workflow

**Purpose:** Comprehensive code review across multiple dimensions.

**When to use:**
- Before committing code
- During pull request reviews
- Performance optimization
- Security audits
- Accessibility checks

**Usage Examples:**

**General Review:**
```
Review my UserProfile component for:
- Accessibility (WCAG 2.1 AA)
- Performance
- Security vulnerabilities
- React best practices
```

**Specific Focus:**
```
Check my LoginForm for accessibility issues.
Focus on keyboard navigation and ARIA labels.
```

**Performance Review:**
```
Analyze my Dashboard component for performance optimization opportunities.
```

**Review Checks:**

**Accessibility:**
- ✅ Semantic HTML
- ✅ ARIA attributes
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast (WCAG AA)
- ✅ Focus indicators

**Performance:**
- ✅ Bundle size impact
- ✅ Lazy loading opportunities
- ✅ Rendering optimization
- ✅ Memoization usage
- ✅ Image optimization

**Security:**
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Input validation
- ✅ Authentication checks
- ✅ Data sanitization

**Best Practices:**
- ✅ Component design patterns
- ✅ State management
- ✅ Error handling
- ✅ Code consistency
- ✅ Documentation

---

### 4. Compound Workflow

**Purpose:** Record solutions and grow your knowledge base.

**When to use:**
- After solving a complex problem
- Documenting patterns and solutions
- Sharing knowledge with team
- Creating reusable snippets

**Usage Examples:**

**Record Pattern:**
```
I just implemented a custom useDebounce hook.
Record this pattern for future reference.
```

**Document Solution:**
```
We fixed a memory leak by properly cleaning up event listeners.
Record this solution in the knowledge base.
```

**Save Optimization:**
```
Optimized the initial load time by 40% using code splitting.
Save this optimization technique.
```

**Output:**
- `.compound/docs/react/custom-hooks/use-debounce.md`
- Auto-categorization by technology
- Tagging for easy search
- Related agent suggestions

**Knowledge Base Structure:**
```
.compound/docs/
├── react/
│   ├── custom-hooks/
│   │   └── use-debounce.md
│   ├── performance/
│   └── patterns/
├── accessibility/
│   └── keyboard-navigation.md
├── security/
│   └── auth-patterns.md
└── performance/
    └── code-splitting.md
```

---

## Agent System

### Understanding Agents

**Agents** are specialized AI assistants that help with specific tasks. They are organized by:

1. **Category** - Plan, Work, Review, Compound
2. **Framework** - Universal, React, Vue, Angular, etc.
3. **Priority** - Project > User > Package

### Universal Agents (Core Package)

**Plan Phase:**
- `requirements-analyzer` - Analyze requirements
- `component-architect` - Design component architecture
- `dependency-advisor` - Recommend dependencies

**Work Phase:**
- `code-generator` - Generate code scaffolds
- `style-implementer` - Implement styles
- `test-writer` - Write tests

**Review Phase:**
- `accessibility-reviewer` - WCAG compliance
- `performance-reviewer` - Performance optimization
- `security-reviewer` - Security audit

**Compound Phase:**
- `tech-stack-detector` - Detect technology
- `agent-suggester` - Suggest relevant agents
- `knowledge-recorder` - Record knowledge

### Framework-Specific Agents

**React Package (@compound-workflow/react):**
- `react-reviewer` - React best practices
- `react-hooks-specialist` - Hooks expertise
- `react-performance` - React optimization

**Vue Package (@compound-workflow/vue):**
- `vue-reviewer` - Vue best practices
- `vue-composition-api` - Composition API expert
- `vue-reactivity` - Reactivity system

### Agent Management

#### List All Agents

```bash
npx compound agents list
```

**Output:**
```
📦 Active Agents:

📌 Project Level (.compound/agents/):
   my-team-reviewer
   custom-accessibility-check

👤 User Level (~/.compound/agents/):
   (empty)

📦 Package Level (node_modules/):
   📋 [plan] requirements-analyzer (@compound-workflow/core)
   🏗️  [plan] component-architect (@compound-workflow/core)
   ...
   ♿ [review] accessibility-reviewer (@compound-workflow/core)
   ⚡ [review] performance-reviewer (@compound-workflow/core)
   ...
```

#### Add Agent

**From installed package:**
```bash
# Add React performance reviewer to project
npx compound agents add react-performance

# Add globally (available to all projects)
npx compound agents add react-performance --global
```

**Create custom agent:**
```bash
# Create .compound/agents/my-reviewer.md
# Edit with your custom rules
```

#### Remove Agent

```bash
npx compound agents remove my-team-reviewer
```

#### Update Agent

```bash
# Update from package (get latest version)
npx compound agents update react-performance
```

---

## Configuration

### Configuration File

Location: `.compound/config.json`

```json
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
    "cursor": { "enabled": true, "useLegacy": false },
    "qoder": { "enabled": true }
  }
}
```

### Configuration Options

#### `tool`

AI tool to use.

**Values:**
- `"auto"` - Auto-detect (default)
- `"claude"` - Claude Code
- `"cursor"` - Cursor IDE
- `"qoder"` - Qoder CLI

**Example:**
```json
{
  "tool": "claude"
}
```

#### `disabledAgents`

Array of agent names to disable.

**Example:**
```json
{
  "disabledAgents": ["agent-suggester"]
}
```

#### `preferences`

##### `autoSuggestAgents`

Enable automatic agent suggestions.

- **Type:** Boolean
- **Default:** `true`

When enabled, Compound will suggest relevant agents based on:
- Your technology stack
- Problem type
- Context

##### `verboseLogging`

Enable detailed logging.

- **Type:** Boolean
- **Default:** `false`

When enabled, logs to `.compound/logs/` with detailed information.

##### `recordSolutions`

Auto-record solutions during compound workflow.

- **Type:** Boolean
- **Default:** `true`

#### `adapters`

Tool-specific adapter settings.

**Claude:**
```json
{
  "adapters": {
    "claude": { "enabled": true }
  }
}
```

**Cursor:**
```json
{
  "adapters": {
    "cursor": {
      "enabled": true,
      "useLegacy": false  // true for .cursorrules, false for .cursor/rules/
    }
  }
}
```

**Qoder:**
```json
{
  "adapters": {
    "qoder": { "enabled": true }
  }
}
```

---

## AI Tool Integration

### Claude Code

#### Setup

```bash
npx compound init
```

This creates:
- `~/.claude/plugins/compound-frontend/` - Plugin directory
- Plugin manifest and commands

#### Usage

**Workflows as slash commands:**
```
/compound:plan I need to add a dark mode toggle
/compound:work Implement the theme switcher
/compound:review Check accessibility
/compound:compound Record the pattern
```

**Agents as skills:**
```
Review my component using the accessibility-reviewer agent
```

#### Automatic Activation

Claude automatically activates workflows based on keywords:

- "plan", "design", "architect" → Plan workflow
- "implement", "create", "build" → Work workflow
- "review", "check", "audit" → Review workflow
- "record", "save", "document" → Compound workflow

---

### Cursor IDE

#### Setup

```bash
npx compound init
```

This creates:
- `.cursor/rules/` - Rules directory
- `compound-main.mdc` - Main configuration
- `compound-*.mdc` - Workflow and agent rules

#### Usage

**Rules auto-activate based on:**
- File type (`.tsx` → React agents)
- File path (`/components/` → component reviewers)
- Context keywords ("performance" → performance reviewer)

#### Rule Files

**Main Rule (`compound-main.mdc`):**
Always active, provides:
- Available commands list
- Agent overview
- Usage instructions

**Workflow Rules (`compound-*.mdc`):**
Activate when you mention workflow names.

**Agent Rules (`agent-*.mdc`):**
Activate based on context and keywords.

---

### Qoder CLI

#### Setup

```bash
npx compound init
```

This creates:
- `~/.qoder/commands/compound/` - Commands directory
- Workflow commands (`plan.md`, `work.md`, etc.)

#### Usage

```bash
# Plan workflow
qoder /compound:plan "Add user authentication"

# Work workflow
qoder /compound:work "Implement login form"

# Review workflow
qoder /compound:review "Check for security issues"

# Compound workflow
qoder /compound:compound "Record the auth pattern"
```

---

## Advanced Features

### Custom Workflows

Create `.compound/workflows/custom-workflow.md`:

```markdown
---
name: compound:custom
description: My custom workflow
argument-hint: "[task description]"
framework: universal
---

# My Custom Workflow

## Purpose
Describe what this workflow does...

## Steps

1. **Step 1**: Description
2. **Step 2**: Description
3. **Step 3**: Description

## Output
- Output 1
- Output 2
```

**Usage:**
```
Run the custom workflow for "my task"
```

### Custom Agents

Create `.compound/agents/my-agent.md`:

```markdown
---
name: my-agent
description: My custom agent
category: review
frameworks: [react, vue, next.js]
globs: ["**/*.tsx", "**/*.jsx"]
---

# My Custom Agent

## Your Role
You are a specialist in...

## Review Focus

### Area 1
- [ ] Check 1
- [ ] Check 2

### Area 2
- [ ] Check 1
- [ ] Check 2

## Common Issues

### Issue 1
**Problem:** Description
**Solution:** Solution

### Issue 2
**Problem:** Description
**Solution:** Solution
```

**Priority:** Custom agents override package agents!

### Team Knowledge Base

Share `.compound/docs/` with your team:

```bash
# Add to git
git add .compound/docs/
git commit -m "Add team knowledge base"

# Push to repository
git push
```

**Team members can:**
- Reference documented solutions
- Learn from past problems
- Reuse proven patterns
- Avoid repeating mistakes

### CI/CD Integration

**GitHub Actions - Automated Review:**

```yaml
# .github/workflows/compound-review.yml
name: Compound Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Compound
        run: npm install @compound-workflow/core

      - name: Run Review
        run: npx compound review --output markdown > review.md

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: review
            });
```

---

## Best Practices

### 1. Start with Core

Install only what you need:

```bash
# Start minimal
npm install @compound-workflow/core

# Add frameworks as needed
npm install @compound-workflow/react
```

### 2. Customize Gradually

1. Use default workflows first
2. Identify what needs customization
3. Copy and modify specific workflows
4. Create custom agents for team standards

### 3. Leverage Knowledge Base

Always use compound workflow to record:
- Solutions to complex problems
- Performance optimizations
- Security fixes
- Design patterns

### 4. Team Collaboration

- Share `.compound/` directory (except `logs/`)
- Create team-specific agents
- Document team conventions
- Review knowledge base regularly

### 5. Regular Updates

```bash
# Check for updates
npm outdated @compound-workflow/core

# Update packages
npm update @compound-workflow/*

# Update custom agents
npx compound agents update react-performance
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

### Common Issues

**Issue: "Agent not found"**
```bash
# Check installed agents
npx compound agents list

# Install missing package
npm install @compound-workflow/react
```

**Issue: "Adapter not working"**
```bash
# Reinitialize
npx compound init --force
```

**Issue: "Configuration conflicts"**
```bash
# Check config
cat .compound/config.json

# Reset to defaults
npx compound init --setup-only --force
```

---

## Additional Resources

- [Main Documentation](https://compound-workflow.dev)
- [API Reference](https://compound-workflow.dev/api)
- [Examples](https://compound-workflow.dev/examples)
- [Community Discord](https://discord.gg/compound-workflow)
- [GitHub Issues](https://github.com/your-org/compound-workflow/issues)

---

**Last Updated:** 2026-01-21
**Version:** 0.1.0
