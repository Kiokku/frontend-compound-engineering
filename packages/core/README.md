# @compound-workflow/core

<div align="center">

**Core Package - Universal Workflows & Agents**

[![npm version](https://badge.fury.io/js/%40compound-workflow%2Fcore.svg)](https://www.npmjs.com/package/@compound-workflow/core)
[![Downloads](https://img.shields.io/npm/dm/%40compound-workflow/core.svg)](https://www.npmjs.com/package/@compound-workflow/core)

</div>

## 📦 Overview

`@compound-workflow/core` is the foundational package providing:
- ✅ **4 Core Workflows** - Plan, Work, Review, Compound
- ✅ **12 Universal Agents** - Framework-independent development aids
- ✅ **CLI Tools** - Agent management and initialization
- ✅ **Cross-Platform Adapters** - Claude, Cursor, Qoder support

**Size:** ~64KB gzipped

---

## 🚀 Quick Start

### Installation

```bash
npm install @compound-workflow/core
```

### Initialization

```bash
# Initialize for your AI tool (auto-detects Claude/Cursor/Qoder)
npx compound init
```

---

## 📋 Core Workflows

### 1. Plan Workflow

Creates detailed implementation plans.

**Location:** `.compound/workflows/plan.md`

**Usage in AI Tool:**
```
I need to add user authentication. Please help me plan this feature.
```

**What it does:**
- Analyzes requirements
- Designs component architecture
- Identifies dependencies
- Plans testing strategy
- Estimates performance targets

### 2. Work Workflow

Executes implementation plans.

**Location:** `.compound/workflows/work.md`

**Usage:**
```
Implement the login form based on the plan.
```

**What it does:**
- Generates component code
- Implements styles
- Writes tests
- Creates documentation

### 3. Review Workflow

Comprehensive code review.

**Location:** `.compound/workflows/review.md`

**Usage:**
```
Review my LoginForm component for accessibility and security.
```

**What it does:**
- WCAG compliance checks
- Performance optimization review
- Security vulnerability scan
- Best practices validation

### 4. Compound Workflow

Records solutions to knowledge base.

**Location:** `.compound/workflows/compound.md`

**Usage:**
```
I just implemented a custom hook for data fetching. Record this pattern.
```

**What it does:**
- Saves to `.compound/docs/<category>/<title>.md`
- Detects tech stack
- Suggests related agents
- Grows your knowledge base

---

## 🤖 Universal Agents (12)

### Plan Phase Agents

#### 📋 Requirements Analyzer
`requirements-analyzer.md`

Analyzes and breaks down requirements into actionable tasks.

**Features:**
- Requirement clarification
- Task decomposition
- Dependency identification
- Risk assessment

#### 🏗️ Component Architect
`component-architect.md`

Designs component architecture and hierarchy.

**Features:**
- Component decomposition
- Props interface design
- State management strategy
- Reusability analysis

#### 📦 Dependency Advisor
`dependency-advisor.md`

Recommends and manages npm dependencies.

**Features:**
- Package selection
- Version compatibility
- Bundle size impact
- Security considerations

### Work Phase Agents

#### 💻 Code Generator
`code-generator.md`

Generates code scaffolds and boilerplate.

**Features:**
- Component templates
- File structure
- Import statements
- Type definitions

#### 🎨 Style Implementer
`style-implementer.md`

Implements styles and UI designs.

**Features:**
- CSS/SCSS generation
- Responsive design
- Design system integration
- Theme support

#### ✅ Test Writer
`test-writer.md`

Writes unit and integration tests.

**Features:**
- Test case generation
- Coverage optimization
- Mock creation
- Test data setup

### Review Phase Agents

#### ♿ Accessibility Reviewer
`accessibility-reviewer.md`

Checks WCAG compliance.

**Features:**
- Semantic HTML
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Color contrast

#### ⚡ Performance Reviewer
`performance-reviewer.md`

Analyzes performance optimization.

**Features:**
- Bundle size analysis
- Lazy loading opportunities
- Rendering optimization
- Network request reduction

#### 🔒 Security Reviewer
`security-reviewer.md`

Audits security vulnerabilities.

**Features:**
- XSS prevention
- CSRF protection
- Data validation
- Authentication checks

### Compound Phase Agents

#### 🔍 Tech Stack Detector
`tech-stack-detector.md`

Detects and analyzes project technology.

**Features:**
- Framework detection
- Bundler identification
- Library usage analysis
- Configuration parsing

#### 💡 Agent Suggester
`agent-suggester.md`

Recommends relevant agents.

**Features:**
- Context-aware suggestions
- Framework matching
- Problem type detection
- Usage statistics

#### 📚 Knowledge Recorder
`knowledge-recorder.md`

Records and organizes solutions.

**Features:**
- Structured documentation
- Auto-categorization
- Tagging system
- Search support

---

## 🔧 CLI Commands

### `compound init`

Initialize Compound Workflow for your project.

```bash
# Auto-detect AI tool
npx compound init

# Specify options
npx compound init --force
npx compound init --cursor-legacy
npx compound init --adapter-only
npx compound init --setup-only
```

**Options:**
- `--force` - Override existing files
- `--cursor-legacy` - Use legacy .cursorrules format
- `--adapter-only` - Skip project setup, only configure adapter
- `--setup-only` - Only run project setup

### `compound agents`

Manage agents.

#### List Agents

```bash
npx compound agents list
```

**Output:**
```
📦 Active Agents:

📌 Project Level (.compound/agents/):
   my-custom-agent

👤 User Level (~/.compound/agents/):
   (empty)

📦 Package Level (node_modules/):
   requirements-analyzer (@compound-workflow/core)
   component-architect (@compound-workflow/core)
   ...
```

#### Add Agent

```bash
# Add to project level
npx compound agents add react-performance

# Add to user level (global)
npx compound agents add react-performance --global
```

#### Remove Agent

```bash
npx compound agents remove my-custom-agent
```

#### Update Agent

```bash
npx compound agents update react-performance
```

---

## 📁 Directory Structure

After installation, your project will have:

```
your-project/
├── .compound/
│   ├── workflows/           # Custom workflows
│   │   ├── plan.md
│   │   ├── work.md
│   │   ├── review.md
│   │   └── compound.md
│   ├── agents/              # Project-specific agents
│   ├── docs/                # Knowledge base (auto-generated)
│   ├── logs/                # Execution logs
│   ├── adapters/            # Generated adapters
│   │   ├── claude/
│   │   ├── cursor/
│   │   └── qoder/
│   └── config.json          # Configuration
└── node_modules/
    └── @compound-workflow/
        └── core/
            ├── .compound/
            │   ├── workflows/  # Default workflows
            │   └── agents/     # Universal agents
            ├── scripts/        # CLI scripts
            └── bin/
                └── cli.js      # compound command
```

---

## ⚙️ Configuration

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

### Options

- `tool` - AI tool to use (`"auto"`, `"claude"`, `"cursor"`, `"qoder"`)
- `disabledAgents` - Array of agent names to disable
- `preferences.autoSuggestAgents` - Enable agent suggestions (default: `true`)
- `preferences.verboseLogging` - Enable verbose logging (default: `false`)
- `preferences.recordSolutions` - Auto-record solutions (default: `true`)

---

## 🔌 AI Tool Integration

### Claude Code

After `compound init`, Claude will automatically:

1. Load workflows as slash commands
2. Load agents as skills
3. Activate workflows based on your prompts

**Example:**
```
I need to add a dark mode toggle. Please plan this feature.
```
Claude activates `plan` workflow automatically.

### Cursor IDE

After `compound init`, Cursor will:

1. Generate `.cursor/rules/` directory
2. Create rule files for each workflow and agent
3. Auto-activate based on context

**Example:**
```
Help me optimize this React component.
```
Cursor activates `review` workflow with `performance-reviewer` agent.

### Qoder CLI

After `compound init`, Qoder will have:

1. Commands in `~/.qoder/commands/compound/`
2. Access via `/compound:plan`, `/compound:work`, etc.

**Example:**
```bash
qoder /compound:review "Check my component for accessibility"
```

---

## 🎨 Customization

### Override Workflows

Copy and customize default workflows:

```bash
# Copy default plan workflow
cp node_modules/@compound-workflow/core/.compound/workflows/plan.md \
   .compound/workflows/plan.md

# Edit to match your process
vim .compound/workflows/plan.md
```

### Create Custom Agents

Create `.compound/agents/my-agent.md`:

```markdown
---
name: my-agent
description: My custom agent
category: review
frameworks: [react, vue]
---

# My Custom Agent

## Your Role
Describe what this agent does...

## Review Checklist

### Item 1
- [ ] Check point 1
- [ ] Check point 2
```

**Custom agents override package agents!**

---

## 📚 API

### AgentLoader

```javascript
import { AgentLoader } from '@compound-workflow/core';

const loader = new AgentLoader();

// Load agent content
const content = loader.loadAgent('requirements-analyzer');

// List all agents
const agents = loader.listAgents();

// Check if agent exists
const hasAgent = loader.hasAgent('performance-reviewer');

// Get agent path
const path = loader.getAgentPath('security-reviewer');
```

### ToolDetector

```javascript
import { detectTool, getToolInfo, ToolType } from '@compound-workflow/core';

// Detect AI tool
const tool = detectTool();
// Returns: ToolType.CLAUDE | ToolType.CURSOR | ToolType.QODER | ToolType.UNKNOWN

// Get tool info
const info = getToolInfo(tool);
```

### Error Classes

```javascript
import {
  CompoundError,
  ConfigError,
  FileOperationError,
  AgentLoadError,
  AdapterError
} from '@compound-workflow/core';

// Throw errors
throw new AgentLoadError('my-agent', searchPaths, {
  suggestion: 'Run "compound agents list" to see available agents'
});
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in CI mode
npm run test:run

# Run with coverage
npm run test:coverage
```

---

## 🔒 Security

This package includes security auditing:

```bash
# Run security audit
npm run security:audit

# Check dependencies
npm run security:deps
```

**Security Features:**
- ✅ No `eval()` or `new Function()`
- ✅ No hardcoded secrets
- ✅ Dependency vulnerability scanning
- ✅ Code pattern analysis
- ✅ `.npmignore` excludes sensitive files

---

## 📦 Publishing

```bash
# Safe publish (includes security checks)
npm run publish:safe

# Or manual publish
npm run prepublishOnly  # Run all checks
npm publish --access public
```

---

## 🐛 Troubleshooting

### "Agent not found"

```bash
# List available agents
npx compound agents list

# Check if core package is installed
npm ls @compound-workflow/core
```

### "Init script fails"

```bash
# Run with verbose logging
DEBUG=true npx compound init

# Force reinitialize
npx compound init --force
```

### "Adapter not working"

```bash
# Regenerate adapters only
npx compound init --adapter-only
```

---

## 📄 License

MIT

---

## 🔗 Links

- [Main Repository](https://github.com/your-org/compound-workflow)
- [Documentation](https://compound-workflow.dev)
- [Issues](https://github.com/your-org/compound-workflow/issues)

---

<div align="center">

**Part of the Compound Workflow ecosystem**

[Full Toolkit](https://www.npmjs.com/package/@compound-workflow/frontend) •
[React Package](https://www.npmjs.com/package/@compound-workflow/react) •
[Vue Package](https://www.npmjs.com/package/@compound-workflow/vue)

</div>
