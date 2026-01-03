# Compound Frontend Workflow - Qoder Integration

## Installation

### Method 1: Copy Commands Manually

```bash
# Copy commands to Qoder commands directory
cp .compound/adapters/qoder/commands/* ~/.qoder/commands/
```

### Method 2: Symbolic Link (Recommended)

```bash
# Create symbolic link for easier updates
ln -s $(pwd)/.compound/adapters/qoder/commands ~/.qoder/commands/compound
```

## Usage

After installation, you can use compound workflows in Qoder CLI:

```bash
# Plan a new feature
qoder /compound:plan "Add user login form"

# Work on implementation
qoder /compound:work

# Review your code
qoder /compound:review

# Compound knowledge
qoder /compound:compound "Solved authentication issue"
```

## Command Reference

- **compound:plan** - Create detailed implementation plans for frontend features
- **compound:work** - Execute plans and create components
- **compound:review** - Review code for accessibility, performance, and best practices
- **compound:compound** - Document solutions and suggest relevant agents

## Updating

To update commands after modifying workflows:

```bash
# Re-generate commands
npx compound-init --tool qoder

# Or manually re-run
node packages/core/scripts/adapters/to-qoder.js
```

## Troubleshooting

### Commands not found

1. Check Qoder commands directory:
   ```bash
   ls ~/.qoder/commands/
   ```

2. Verify symbolic link (if used):
   ```bash
   ls -la ~/.qoder/commands/compound
   ```

3. Restart Qoder CLI

### Commands not working

1. Ensure command files are readable
2. Check Qoder CLI version compatibility
3. Review Qoder CLI documentation for command format requirements

## Support

For issues or questions, please visit:
- GitHub: [compound-workflow/frontend]
- Docs: [compound-workflow.dev/docs]
