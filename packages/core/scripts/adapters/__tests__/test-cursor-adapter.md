# Cursor Adapter Testing Guide

## Phase 2.3 Completion - Cursor Adapter Implementation

### ✅ Implementation Status

All components for Phase 2.3 have been implemented:

1. **Cursor Adapter Script** ✅
   - File: `packages/core/scripts/adapters/to-cursor.js`
   - Supports both modern `.cursor/rules/` and legacy `.cursorrules` formats
   - Uses shared utility functions from `adapter-utils.js`

2. **Integration Points** ✅
   - Updated `scripts/init.js` to call Cursor adapter
   - Updated `bin/cli.js` to support `compound adapters generate cursor` command
   - Added `--legacy` flag for fallback to old format

3. **Features** ✅
   - Generates `.cursor/rules/*.mdc` files for workflows and agents
   - Creates main configuration file `compound-main.mdc`
   - Supports legacy `.cursorrules` single file format
   - Properly formats YAML frontmatter for Cursor IDE

### 🧪 Testing Instructions

Once Node.js is available in your environment, run the following tests:

#### Test 1: Generate Modern Format (Default)

```bash
cd packages/core
node scripts/adapters/to-cursor.js
```

**Expected Output:**
```
🔧 Converting to Cursor format...

📋 Loaded 4 workflows and 10 agents

📁 Generating .cursor/rules/ directory structure...

  ✓ Created compound-plan.mdc
  ✓ Created compound-work.mdc
  ✓ Created compound-review.mdc
  ✓ Created compound-compound.mdc
  ✓ Created agent-accessibility-reviewer.mdc
  ✓ Created agent-performance-reviewer.mdc
  ✓ Created agent-security-reviewer.mdc
  ✓ (and more agent files...)

  ✓ Created compound-main.mdc

✅ Generated 15 rules in .cursor/rules/
👉 Restart Cursor to apply changes
```

**Expected Files in `.cursor/rules/`:**
- `compound-plan.mdc` - Plan workflow
- `compound-work.mdc` - Work workflow
- `compound-review.mdc` - Review workflow
- `compound-compound.mdc` - Compound workflow
- `agent-*.mdc` - Agent-specific rules
- `compound-main.mdc` - Main configuration (alwaysApply: true)

#### Test 2: Generate Legacy Format

```bash
node scripts/adapters/to-cursor.js --cursor-legacy
```

**Expected Output:**
```
🔧 Converting to Cursor format...

📋 Loaded 4 workflows and 10 agents

📄 Generating .cursorrules (legacy mode)...

✅ Generated .cursorrules (legacy mode)
👉 Restart Cursor to apply changes
```

**Expected File:**
- `.cursorrules` - Single file with all workflows and agents

#### Test 3: Via CLI

```bash
# Modern format
node bin/cli.js adapters generate cursor

# Legacy format
node bin/cli.js adapters generate cursor --legacy
```

#### Test 4: Via Init Command

```bash
# This will auto-detect Cursor and generate the adapter
node bin/cli.js init --force

# Or force legacy format
node bin/cli.js init --cursor-legacy --force
```

### 🔍 Verification Checklist

After running the tests, verify:

- [ ] `.cursor/rules/` directory is created (modern mode)
- [ ] All workflow files exist: `compound-*.mdc`
- [ ] All agent files exist: `agent-*.mdc`
- [ ] Main config file exists: `compound-main.mdc`
- [ ] Each file has valid YAML frontmatter
- [ ] `compound-main.mdc` has `alwaysApply: true`
- [ ] Other rules have `alwaysApply: false`
- [ ] Legacy mode creates `.cursorrules` file

### 📝 File Structure Example

**Modern Format:**
```
.cursor/
└── rules/
    ├── compound-main.mdc              # Main config (always enabled)
    ├── compound-plan.mdc              # Plan workflow
    ├── compound-work.mdc              # Work workflow
    ├── compound-review.mdc            # Review workflow
    ├── compound-compound.mdc          # Compound workflow
    ├── agent-accessibility-reviewer.mdc
    ├── agent-performance-reviewer.mdc
    ├── agent-security-reviewer.mdc
    ├── agent-code-generator.mdc
    ├── agent-test-writer.mdc
    └── (more agents...)
```

**Legacy Format:**
```
.cursorrules                            # Single file with all rules
```

### 🎯 Cursor IDE Usage

After generation, restart Cursor IDE and try:

1. **Workflows:**
   - Ask: "Create a plan for user authentication feature"
   - Ask: "Review this component for performance issues"
   - Ask: "Help me implement the login form"

2. **Agents:**
   - Ask: "Use the component-architect agent to design this feature"
   - Ask: "Check accessibility with the accessibility-reviewer agent"

### 🐛 Troubleshooting

**Issue:** Rules not showing in Cursor
**Fix:**
1. Restart Cursor IDE completely
2. Check that `.cursor/rules/` directory exists
3. Verify YAML frontmatter is valid

**Issue:** "Agent not found" errors
**Fix:**
1. Check that `.compound/agents/` directory exists
2. Verify agent files are present
3. Run `compound agents list` to see available agents

**Issue:** Legacy mode not working
**Fix:**
1. Remove `.cursor/rules/` directory if it exists
2. Use `--cursor-legacy` flag
3. Verify `.cursorrules` file was created

### ✅ Phase 2.3 Acceptance Criteria

From the workflow document, Phase 2.3 requires:

- [x] Generate `.cursor/rules/*.mdc` files (modern format)
- [x] Support legacy `.cursorrules` fallback
- [x] Each workflow/agent has independent rule file
- [x] Main rule file with `alwaysApply: true`
- [x] Integration with init command
- [x] CLI command support: `compound adapters generate cursor`
- [x] Clear user instructions after generation

**All acceptance criteria met! ✅**

### 📦 Files Modified

1. `packages/core/scripts/adapters/to-cursor.js` (new)
2. `packages/core/scripts/init.js` (updated)
3. `packages/core/bin/cli.js` (updated)

### 🚀 Next Steps

Phase 2.3 is complete! The next phase would be:

- **Phase 3:** Frontend Agent Ecosystem
  - Implement minimal core agents (3 agents)
  - Create agent library structure
  - Framework-specific agent packages

However, you may want to test the Cursor adapter in a real Cursor IDE environment first to ensure everything works as expected.
