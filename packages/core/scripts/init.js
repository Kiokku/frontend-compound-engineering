#!/usr/bin/env node

/**
 * Compound Workflow Init Script (Unified)
 *
 * Phase 1: 项目基础设置（目录结构、核心文件、配置）
 * Phase 2: AI 工具检测与适配器生成
 *
 * 设计理念：
 * - 取消 postinstall 钩子，采用显式初始化方式
 * - 显式优于隐式：用户明确授权所有文件操作
 * - 一致的覆盖策略：工作流和代理统一采用「不覆盖已存在」（除非 --force）
 * - CI/CD 友好：不依赖可能被禁用的 postinstall
 * - 分阶段执行：基础设置 → 工具适配，职责清晰
 * - 可恢复性：支持 --force / --adapter-only / --setup-only
 */

import { detectTool, getToolInfo, ToolType } from '../src/tool-detector.js';
import { convertToClaudePlugin } from './adapters/to-claude.js';
import { convertToQoderCommands } from './adapters/to-qoder.js';
import { convertToCursorRules } from './adapters/to-cursor.js';
import inquirer from 'inquirer';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 主初始化函数
 * @param {object} options - 命令行选项
 * @param {boolean} options.force - 重置已存在的文件
 * @param {boolean} options.cursorLegacy - 使用旧版 .cursorrules 格式
 * @param {boolean} options.adapterOnly - 跳过项目设置，只配置适配器
 * @param {boolean} options.setupOnly - 只运行项目设置
 */
export async function init(options = {}) {
  const {
    force = false,
    cursorLegacy = false,
    adapterOnly = false,
    setupOnly = false
  } = options;

  console.log('\n🚀 Compound Workflow Initialization\n');
  console.log('━'.repeat(50));

  const projectRoot = process.cwd();

  // Phase 1: 项目基础设置
  if (!adapterOnly) {
    console.log('\n📦 Phase 1: Project Setup\n');
    const setupResult = await runProjectSetup(projectRoot, { force });

    if (!setupResult.success) {
      console.error('\n❌ Project setup failed.');
      return;
    }
    console.log('\n✅ Phase 1 complete!\n');
  }

  if (setupOnly) {
    console.log('\n━'.repeat(50));
    console.log('\n✅ Project setup complete!');
    console.log('\n📝 Next: Run `npx compound init --adapter-only`\n');
    return;
  }

  // Phase 2: AI 工具适配器
  console.log('━'.repeat(50));
  console.log('\n🔧 Phase 2: AI Tool Adapter\n');
  await runToolAdapter(projectRoot, { force, cursorLegacy });

  console.log('\n━'.repeat(50));
  console.log('\n🎉 Initialization complete!\n');
}

/**
 * Phase 1: 项目基础设置（原 postinstall 的所有功能）
 * @param {string} projectRoot - 项目根目录
 * @param {object} options - 选项
 * @returns {Promise<{success: boolean, created: string[], copied: string[], errors: string[]}>}
 */
async function runProjectSetup(projectRoot, options = {}) {
  const { force = false } = options;
  const compoundDir = path.join(projectRoot, '.compound');
  const packageRoot = path.resolve(__dirname, '..');
  const sourceCompound = path.join(packageRoot, '.compound');

  const result = { success: true, created: [], copied: [], errors: [] };

  try {
    // 1. 创建目录结构
    const directories = ['workflows', 'agents', 'docs', 'logs', 'adapters'];
    for (const dir of directories) {
      await fs.ensureDir(path.join(compoundDir, dir));
    }
    console.log('  ✓ Created .compound/ directory structure');

    // 2. 复制核心工作流（不覆盖已存在的）
    const workflowStats = await copyFiles({
      sourceDir: path.join(sourceCompound, 'workflows'),
      targetDir: path.join(compoundDir, 'workflows'),
      pattern: '*.md',
      overwrite: force
    });
    if (workflowStats.copied > 0 || workflowStats.skipped > 0) {
      console.log(`  ✓ Workflows: ${workflowStats.copied} copied, ${workflowStats.skipped} preserved`);
    }

    // 3. 复制核心代理（不覆盖已存在的）
    const agentStats = await copyFiles({
      sourceDir: path.join(sourceCompound, 'agents'),
      targetDir: path.join(compoundDir, 'agents'),
      pattern: '*.md',
      overwrite: force
    });
    if (agentStats.copied > 0 || agentStats.skipped > 0) {
      console.log(`  ✓ Agents: ${agentStats.copied} copied, ${agentStats.skipped} preserved`);
    }

    // 4. 创建/更新配置文件
    const configResult = await ensureConfig(compoundDir, { force });
    console.log(`  ✓ Config: ${configResult.action}`);

    // 5. 更新 .gitignore
    const gitignoreResult = await updateGitignore(projectRoot);
    if (gitignoreResult.updated) {
      console.log('  ✓ Updated .gitignore');
    }

  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    console.error(`  ✗ Error: ${error.message}`);
  }

  return result;
}

/**
 * 复制文件（支持不覆盖策略和嵌套目录）
 * @param {object} params - 参数
 * @param {string} params.sourceDir - 源目录
 * @param {string} params.targetDir - 目标目录
 * @param {string} params.pattern - 文件匹配模式（如 '*.md'）
 * @param {boolean} params.overwrite - 是否覆盖已存在的文件
 * @param {boolean} params.recursive - 是否递归处理子目录
 * @returns {Promise<{copied: number, skipped: number, files: string[]}>}
 */
async function copyFiles({ sourceDir, targetDir, pattern, overwrite = false, recursive = true }) {
  const stats = { copied: 0, skipped: 0, files: [] };

  // 检查源目录是否存在
  if (!await fs.pathExists(sourceDir)) {
    const dirName = path.basename(sourceDir);
    console.log(`  ⚠️  Source not found: ${dirName}/`);
    return stats;
  }

  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      if (entry.isDirectory() && recursive) {
        // 递归处理子目录
        await fs.ensureDir(targetPath);
        const subStats = await copyFiles({
          sourceDir: sourcePath,
          targetDir: targetPath,
          pattern,
          overwrite,
          recursive
        });
        stats.copied += subStats.copied;
        stats.skipped += subStats.skipped;
        stats.files.push(...subStats.files.map(f => path.join(entry.name, f)));
      } else if (entry.isFile()) {
        // 检查文件是否匹配模式
        if (pattern === '*.md' && !entry.name.endsWith('.md')) continue;

        const targetExists = await fs.pathExists(targetPath);

        if (targetExists && !overwrite) {
          stats.skipped++;
        } else {
          await fs.copy(sourcePath, targetPath, { overwrite: true });
          stats.copied++;
          stats.files.push(entry.name);
        }
      }
    }
  } catch (error) {
    console.log(`  ⚠️  Error reading ${path.basename(sourceDir)}/: ${error.message}`);
  }

  return stats;
}

/**
 * 确保配置文件存在
 * @param {string} compoundDir - .compound 目录路径
 * @param {object} options - 选项
 * @returns {Promise<{action: string, path: string}>}
 */
async function ensureConfig(compoundDir, options = {}) {
  const { force = false } = options;
  const configPath = path.join(compoundDir, 'config.json');
  const exists = await fs.pathExists(configPath);

  if (exists && !force) {
    return { action: 'preserved existing', path: configPath };
  }

  const defaultConfig = {
    version: '0.1.0',
    tool: 'auto',
    disabledAgents: [],
    preferences: {
      autoSuggestAgents: true,
      verboseLogging: false,
      recordSolutions: true
    },
    adapters: {
      claude: { enabled: true },
      cursor: { enabled: true, useLegacy: false },
      qoder: { enabled: true }
    }
  };

  // 如果 force=true，尝试合并保留用户设置
  if (exists && force) {
    try {
      const existingConfig = await fs.readJson(configPath);
      defaultConfig.disabledAgents = existingConfig.disabledAgents || [];
      defaultConfig.preferences = { ...defaultConfig.preferences, ...existingConfig.preferences };
    } catch { /* 忽略解析错误 */ }
  }

  await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
  return { action: exists ? 'reset (--force)' : 'created', path: configPath };
}

/**
 * 更新 .gitignore
 * @param {string} projectRoot - 项目根目录
 * @returns {Promise<{updated: boolean, reason?: string}>}
 */
async function updateGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const entriesToAdd = [
    '',
    '# Compound Workflow (auto-generated)',
    '.compound/logs/',
    '.compound/docs/',
    '.compound/adapters/'
  ];
  const marker = '# Compound Workflow';

  try {
    if (await fs.pathExists(gitignorePath)) {
      const content = await fs.readFile(gitignorePath, 'utf8');
      if (content.includes(marker)) {
        return { updated: false, reason: 'already configured' };
      }
      await fs.appendFile(gitignorePath, entriesToAdd.join('\n') + '\n');
      return { updated: true };
    }
    return { updated: false, reason: 'no .gitignore found' };
  } catch (error) {
    return { updated: false, reason: error.message };
  }
}

/**
 * Phase 2: AI 工具适配器
 * @param {string} projectRoot - 项目根目录
 * @param {object} options - 选项
 */
async function runToolAdapter(projectRoot, options = {}) {
  const { force = false, cursorLegacy = false } = options;

  try {
    const detectedTool = detectTool();
    console.log(`  🔍 Detected: ${detectedTool.toUpperCase()}`);

    let selectedTool = detectedTool;

    if (detectedTool === ToolType.UNKNOWN) {
      const { tool } = await inquirer.prompt([{
        type: 'list',
        name: 'tool',
        message: 'Select your AI coding tool:',
        choices: [
          { name: 'Claude Code', value: ToolType.CLAUDE },
          { name: 'Cursor IDE', value: ToolType.CURSOR },
          { name: 'Qoder CLI', value: ToolType.QODER },
          { name: 'Skip adapter setup', value: 'skip' }
        ]
      }]);

      if (tool === 'skip') {
        console.log('\n  ⏭️  Adapter setup skipped.');
        return { success: true, skipped: true };
      }
      selectedTool = tool;
    }

    const toolInfo = getToolInfo(selectedTool);
    if (toolInfo) {
      console.log(`  📦 Tool: ${toolInfo.name}`);
    }

    if (!force) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: `Generate ${selectedTool} adapter?`,
        default: true
      }]);
      if (!confirmed) {
        console.log('\n  ⏭️  Adapter generation skipped.');
        return { success: true, skipped: true };
      }
    }

    const homeDir = os.homedir();

    switch (selectedTool) {
      case ToolType.CLAUDE:
        await setupClaude(projectRoot, homeDir, options);
        break;
      case ToolType.CURSOR:
        await setupCursor(projectRoot, { cursorLegacy });
        break;
      case ToolType.QODER:
        await setupQoder(projectRoot, homeDir, options);
        break;
    }

    return { success: true, tool: selectedTool };
  } catch (error) {
    console.error(`\n  ✗ Adapter setup failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Claude 设置
 * @param {string} projectRoot - 项目根目录
 * @param {string} homeDir - 用户主目录
 * @param {object} options - 选项
 */
async function setupClaude(projectRoot, homeDir, options = {}) {
  try {
    console.log('\n  🔨 Setting up Claude adapter...\n');

  // 1. 生成适配器
  await convertToClaudePlugin({
    projectRoot,
    outputDir: path.join(projectRoot, '.compound/adapters/claude')
  });

  // 2. 复制到 Claude 插件目录
  const claudePluginDir = path.join(homeDir, '.claude/plugins/compound-frontend');

  console.log('\n📦 Installing to Claude plugins directory...');
  await fs.ensureDir(claudePluginDir);

  const sourceDir = path.join(projectRoot, '.compound/adapters/claude');
  await fs.copy(sourceDir, claudePluginDir, { overwrite: true });

  console.log(`  ✓ Copied to: ${claudePluginDir}`);

  // 3. 显示后续步骤
  console.log('\n  ✅ Claude setup complete!\n');
  console.log('  📝 Next steps:');
  console.log('     1. Refresh Claude Code:');
  console.log('        claude /plugin refresh');
  console.log('');
  console.log('     2. Try a workflow:');
  console.log('        /compound:plan "添加用户登录表单"');
  console.log('        /compound:review "检查代码性能"');
  console.log('');
  console.log('     3. Use agents:');
  console.log('        @component-architect 分析组件结构');
  } catch (error) {
    console.error(`\n  ✗ Claude setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Cursor 设置
 * @param {string} projectRoot - 项目根目录
 * @param {object} options - 选项
 */
async function setupCursor(projectRoot, options = {}) {
  const { cursorLegacy = false } = options;

  try {
    console.log('\n  🔨 Setting up Cursor adapter...\n');

  // 生成 Cursor 规则
  await convertToCursorRules({
    useLegacy: cursorLegacy,
    sourceDir: path.join(projectRoot, '.compound')
  });

  // 显示后续步骤
  const format = cursorLegacy ? '.cursorrules (legacy)' : '.cursor/rules/ (modern)';
  console.log('\n  ✅ Cursor setup complete!\n');
  console.log(`  📝 Generated ${format}`);
  console.log('');
  console.log('  📝 Next steps:');
  console.log('     1. Restart Cursor IDE to apply changes');
  console.log('');
  console.log('     2. Try a workflow:');
  console.log('        Ask Cursor: "Create a plan for user login form"');
  console.log('        Ask Cursor: "Review this code for performance"');
  console.log('');
  console.log('     3. Use agents:');
  console.log('        Ask Cursor: "Use the component-architect agent"');
  console.log('        Ask Cursor: "Check accessibility with the accessibility-reviewer"');
  } catch (error) {
    console.error(`\n  ✗ Cursor setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Qoder 设置
 * @param {string} projectRoot - 项目根目录
 * @param {string} homeDir - 用户主目录
 * @param {object} options - 选项
 */
async function setupQoder(projectRoot, homeDir, options = {}) {
  try {
    console.log('\n  🔨 Setting up Qoder adapter...\n');

  // 1. 生成 Qoder 命令
  const result = await convertToQoderCommands({
    projectRoot,
    outputDir: path.join(projectRoot, '.compound/adapters/qoder/commands')
  });

  console.log(`\n✓ Generated ${result.commandFiles.length} Qoder commands`);

  // 2. 询问安装方式
  const { installMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'installMethod',
      message: 'How would you like to install Qoder commands?',
      choices: [
        { name: 'Copy commands to ~/.qoder/commands/', value: 'copy' },
        { name: 'Create symbolic link (recommended)', value: 'symlink' },
        { name: 'Skip manual installation', value: 'skip' }
      ]
    }
  ]);

  if (installMethod === 'skip') {
    console.log('\n✅ Qoder commands generated successfully!\n');
    console.log('📝 Manual installation:');
    console.log('   cp .compound/adapters/qoder/commands/* ~/.qoder/commands/');
    console.log('   # or create symlink:');
    console.log('   ln -s $(pwd)/.compound/adapters/qoder/commands ~/.qoder/commands/compound');
    return;
  }

  // 3. 执行安装
  const qoderCommandsDir = path.join(homeDir, '.qoder/commands');
  const compoundLinkDir = path.join(qoderCommandsDir, 'compound');

  if (installMethod === 'copy') {
    console.log('\n📦 Copying commands to Qoder commands directory...');
    await fs.ensureDir(qoderCommandsDir);

    for (const file of result.commandFiles) {
      const fileName = path.basename(file);
      const targetPath = path.join(qoderCommandsDir, fileName);
      await fs.copy(file, targetPath, { overwrite: true });
      console.log(`✓ Copied: ${fileName}`);
    }
  } else if (installMethod === 'symlink') {
    console.log('\n🔗 Creating symbolic link...');
    await fs.ensureDir(qoderCommandsDir);

    // 删除已存在的链接
    if (await fs.pathExists(compoundLinkDir)) {
      await fs.remove(compoundLinkDir);
    }

    const sourceDir = path.join(projectRoot, '.compound/adapters/qoder/commands');
    await fs.symlink(sourceDir, compoundLinkDir);
    console.log(`✓ Linked: ${compoundLinkDir} -> ${sourceDir}`);
  }

  // 4. 显示后续步骤
  console.log('\n  ✅ Qoder setup complete!\n');
  console.log('  📝 Next steps:');
  console.log('     1. Restart Qoder CLI');
  console.log('');
  console.log('     2. Try a workflow:');
  console.log('        qoder /compound:plan "添加用户登录表单"');
  console.log('        qoder /compound:review "检查代码性能"');
  console.log('');
  console.log('     3. View all commands:');
  console.log('        qoder --help');
  } catch (error) {
    console.error(`\n  ✗ Qoder setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * 检测是否为主模块（跨平台兼容）
 * @returns {boolean}
 */
function isMainModule() {
  try {
    const scriptPath = fs.realpathSync(process.argv[1]);
    return import.meta.url === pathToFileURL(scriptPath).href;
  } catch {
    return false;
  }
}

/**
 * CLI 入口 (直接运行此脚本时)
 */
if (isMainModule()) {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    cursorLegacy: args.includes('--cursor-legacy'),
    adapterOnly: args.includes('--adapter-only'),
    setupOnly: args.includes('--setup-only')
  };

  // 显示帮助信息
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Compound Workflow Init

Usage:
  npx compound init [options]
  node packages/core/scripts/init.js [options]

Options:
  --force           Reset existing files (overwrites workflows, agents, config)
  --adapter-only    Skip project setup, only configure adapter
  --setup-only      Only run project setup, skip adapter configuration
  --cursor-legacy   Use legacy .cursorrules format instead of .cursor/rules/
  --help, -h        Show this help message

Examples:
  # Full initialization (setup + adapter)
  npx compound init

  # Only setup project structure
  npx compound init --setup-only

  # Only configure adapter (after project setup)
  npx compound init --adapter-only

  # Force reset and reinitialize
  npx compound init --force

  # Use legacy Cursor format
  npx compound init --cursor-legacy
`);
    process.exit(0);
  }

  init(options).catch(error => {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  });
}
