# Compound Workflow

<div align="center">

**Cross-Platform Frontend Workflow Automation for AI Coding Tools**

[![npm version](https://badge.fury.io/js/%40compound-workflow%2Ffrontend.svg)](https://www.npmjs.com/package/@compound-workflow/frontend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@compound-workflow/core.svg)](https://nodejs.org)

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Examples](#examples)

</div>

---

## 🌟 What is Compound Workflow?

**Compound Workflow** is a universal frontend development toolkit designed for AI-powered coding tools like **Claude Code**, **Cursor IDE**, and **Qoder CLI**. It provides systematic workflows (`plan` → `work` → `review` → `compound`) and intelligent agents to streamline frontend development.

### 🎯 Core Philosophy

```
Plan → Work → Review → Compound
  ↓      ↓       ↓         ↓
设计   实现   审查      固化知识
```

1. **Plan**: Analyze requirements and create implementation plans
2. **Work**: Execute code generation and implementation
3. **Review**: Comprehensive code review (accessibility, performance, security)
4. **Compound**: Record solutions and grow your knowledge base

---

## ✨ Key Features

### 🔌 Cross-Platform Compatibility
Works seamlessly with multiple AI coding tools:
- ✅ **Claude Code** - Native plugin support
- ✅ **Cursor IDE** - Rules-based integration
- ✅ **Qoder CLI** - Command adapter

### 🧩 Modular Architecture

```
@compound-workflow/core         # Core workflows (12 universal agents)
@compound-workflow/frontend-base  # Base frontend agents
@compound-workflow/react        # React-specific agents
@compound-workflow/vue          # Vue-specific agents
@compound-workflow/design-tools # Design tool integrations
```

### 🤖 Intelligent Agents

**Universal Agents (Core)**:
- 📋 `requirements-analyzer` - Analyze and break down requirements
- 🏗️ `component-architect` - Design component architecture
- 📦 `dependency-advisor` - Dependency management advice
- 💻 `code-generator` - Generate code scaffolds
- 🎨 `style-implementer` - Implement styles
- ✅ `test-writer` - Write test cases
- ♿ `accessibility-reviewer` - WCAG compliance checks
- ⚡ `performance-reviewer` - Performance optimization
- 🔒 `security-reviewer` - Security audit
- 🔍 `tech-stack-detector` - Detect technology stack
- 💡 `agent-suggester` - Smart agent recommendations
- 📚 `knowledge-recorder` - Knowledge base management

**Framework-Specific Agents**:
- ⚛️ React hooks specialist, component reviewer
- 🟢 Vue composition API expert, reactivity checker
- And more for Angular, Svelte, etc.

### 🌱 Seed & Growth Architecture

Start minimal, grow as needed:
- **Seed**: Core package (64KB) - 12 universal agents
- **Growth**: Add framework-specific agents on demand
- **Customize**: Create project-specific agents with priority override

---

## 🚀 Quick Start

### 1. Installation

```bash
# Install the complete toolkit
npm install @compound-workflow/frontend

# Or install only the core package
npm install @compound-workflow/core
```

### 2. Initialize

```bash
# Initialize for your AI tool (auto-detects Claude/Cursor/Qoder)
npx compound init
```

The init script will:
- ✅ Detect your AI coding tool automatically
- ✅ Create `.compound/` directory structure
- ✅ Generate tool-specific adapters
- ✅ Set up configuration files

### 3. Use in Your AI Tool

**In Claude Code:**
```
I need to add a user login form. Please help me plan this feature.
```
Claude will activate the `plan` workflow automatically.

**In Cursor IDE:**
```
Help me review my React component for performance issues.
```
Cursor will activate the `review` workflow with the performance agent.

**In Qoder CLI:**
```bash
qoder /compound:plan "Implement shopping cart"
```

---

## 📖 Documentation

### Core Workflows

#### 🔵 Plan Workflow
Create detailed implementation plans for new features.

**Usage:**
```
Please plan the implementation of a dashboard with data visualization.
```

**Output:**
- `plans/dashboard.md` - Detailed plan
- Component hierarchy
- Technology recommendations
- Testing strategy

#### 🟢 Work Workflow
Execute implementation plans and generate code.

**Usage:**
```
Execute the plan for the dashboard feature.
```

**Output:**
- React components with TypeScript
- Styled components or CSS modules
- Unit tests with Vitest
- Storybook stories (if applicable)

#### 🟡 Review Workflow
Comprehensive code review across multiple dimensions.

**Usage:**
```
Review my Dashboard component for accessibility and performance.
```

**Checks:**
- ✅ WCAG 2.1 AA compliance
- ✅ React best practices
- ✅ Performance optimization opportunities
- ✅ Security vulnerabilities
- ✅ Code consistency

#### 🟣 Compound Workflow
Record solutions and grow your knowledge base.

**Usage:**
```
I just optimized the lazy loading. Record this solution.
```

**Output:**
- `.compound/docs/performance/lazy-loading.md` - Structured knowledge
- Suggestions for related agents
- Auto-categorization by technology stack

---

## 🔧 Configuration

### Project Structure

```
your-project/
├── .compound/
│   ├── workflows/          # Custom workflows (override package)
│   ├── agents/             # Project-specific agents (highest priority)
│   ├── docs/               # Knowledge base (auto-generated)
│   ├── logs/               # Execution logs
│   └── config.json         # Configuration
├── .cursor/                # Cursor rules (auto-generated)
│   └── rules/
└── package.json
```

### Configuration Options

Edit `.compound/config.json`:

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

---

## 📚 Examples

### Example 1: React Component Development

```bash
# 1. Plan
npx compound plan "Create a user profile card component"

# 2. Work (implement based on plan)
npx compound work "Implement the profile card with avatar and stats"

# 3. Review
npx compound review "Check the profile card for accessibility"

# 4. Compound (save to knowledge base)
npx compound compound "Record the responsive card layout pattern"
```

### Example 2: Performance Optimization

```
I have a React app with slow initial load. Help me optimize it.
```

**Compound will:**
1. Detect the tech stack (React, bundler)
2. Suggest relevant agents:
   - `performance-reviewer`
   - `react-performance` (from @compound-workflow/react)
3. Analyze bundle size, lazy loading, code splitting
4. Provide specific recommendations
5. Record the solution to `.compound/docs/performance/`

---

## 🎨 Customization

### Creating Custom Agents

Create `.compound/agents/my-team-reviewer.md`:

```markdown
---
name: my-team-reviewer
description: Enforce team-specific coding standards
category: review
frameworks: [react, vue]
---

# My Team Code Reviewer

## Your Role
Enforce our team's coding standards and best practices.

## Checklist

### Naming Conventions
- [ ] Components use PascalCase
- [ ] Files use kebab-case
- [ ] Constants use UPPER_SNAKE_CASE

### Project Structure
- [ ] Feature-based organization
- [ ] Shared components in `/components`
- [ ] Hooks in `/hooks`

### Code Style
- [ ] No TODO comments in production code
- [ ] All components have PropTypes/TypeScript
- [ ] Maximum 300 lines per component
```

**Custom agents have highest priority** and override package agents!

### Override Default Workflows

Copy and customize:

```bash
# Copy default workflow
cp node_modules/@compound-workflow/core/.compound/workflows/plan.md \
   .compound/workflows/plan.md

# Edit to match your team's process
vim .compound/workflows/plan.md
```

---

## 🔍 Agent Management

### List All Agents

```bash
npx compound agents list
```

**Output:**
```
📦 Active Agents:

📌 Project Level (.compound/agents/):
   my-team-reviewer

👤 User Level (~/.compound/agents/):
   custom-accessibility-checker

📦 Package Level (node_modules/):
   requirements-analyzer (@compound-workflow/core)
   component-architect (@compound-workflow/core)
   react-reviewer (@compound-workflow/react)
   ...
```

### Add Agent from Package

```bash
# Add to project level
npx compound agents add react-performance

# Add to user level (global)
npx compound agents add react-performance --global
```

### Remove Agent

```bash
npx compound agents remove my-team-reviewer
```

### Update Agent

```bash
npx compound agents update react-performance
```

---

## 🛠️ Advanced Usage

### CI/CD Integration

```yaml
# .github/workflows/compound-review.yml
name: Compound Code Review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Compound
        run: npm install @compound-workflow/core
      - name: Run Review
        run: npx compound review --format markdown > review.md
      - name: Comment PR
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

### Team Knowledge Base

Share `.compound/docs/` with your team:

```bash
# Add to git
git add .compound/docs/

# Share via GitHub Pages or internal wiki
# Team members can reference:
# - .compound/docs/performance/lazy-loading.md
# - .compound/docs/security/auth-patterns.md
# - .compound/docs/react/custom-hooks.md
```

---

## 🐛 Troubleshooting

### Issue: "Agent not found"

**Solution:**
```bash
# Check installed agents
npx compound agents list

# Install missing framework package
npm install @compound-workflow/react
```

### Issue: "Adapter not working"

**Solution:**
```bash
# Reinitialize adapters
npx compound init --force
```

### Issue: "Configuration conflicts"

**Solution:**
```bash
# Check configuration
cat .compound/config.json

# Reset to defaults
rm .compound/config.json
npx compound init --setup-only
```

For more troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## 📦 Package Structure

### Monorepo Architecture

```
compound-workflow/
├── packages/
│   ├── core/                 # Universal workflows & agents
│   ├── frontend-base/        # Base frontend agents
│   ├── react/                # React-specific agents
│   ├── vue/                  # Vue-specific agents
│   ├── design-tools/         # Design tool integrations
│   └── meta/                 # Meta-package (all-in-one)
└── library/                  # Agent templates (development only)
    ├── react/
    ├── vue/
    └── css/
```

### Agent Priority

1. **Project** `.compound/agents/` (highest)
2. **User** `~/.compound/agents/`
3. **Package** `node_modules/@compound-workflow/*/agents/` (lowest)

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/compound-workflow.git

# Install dependencies
cd compound-workflow
pnpm install

# Run tests
pnpm test

# Build packages
pnpm build
```

---

## 📄 License

MIT © [Your Name]

---

## 🙏 Acknowledgments

Inspired by:
- [Claude Code Plugin System](https://docs.anthropic.com/claude-code)
- [Cursor Rules](https://cursor.sh/docs)
- [Grow Your Own Garden pattern](https://github.com/anthropics/anthropic-quickstarts)

---

## 📞 Support

- 📖 [Documentation](https://compound-workflow.dev)
- 💬 [Discord Community](https://discord.gg/compound-workflow)
- 🐛 [Issue Tracker](https://github.com/your-org/compound-workflow/issues)
- ✉️ Email: support@compound-workflow.dev

---

<div align="center">

**Made with ❤️ for the AI-powered frontend development community**

[⬆ Back to Top](#compound-workflow)

</div>
