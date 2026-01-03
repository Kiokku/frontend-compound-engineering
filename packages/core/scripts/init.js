#!/usr/bin/env node

/**
 * Compound Workflow Init Script
 *
 * 初始化 compound workflow，检测 AI 工具并生成对应的适配器
 */

import { detectTool, getToolInfo, ToolType } from '../src/tool-detector.js';
import { convertToClaudePlugin } from './adapters/to-claude.js';
import { convertToQoderCommands } from './adapters/to-qoder.js';
import { convertToCursorRules } from './adapters/to-cursor.js';
import inquirer from 'inquirer';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

/**
 * 主初始化函数
 * @param {object} options - 命令行选项
 */
export async function init(options = {}) {
  const { force = false, cursorLegacy = false } = options;

  console.log('\n🔧 Initializing Compound Workflow...\n');

  // 1. 检测工具
  const detectedTool = detectTool();

  console.log(`🔍 Detected tool: ${detectedTool.toUpperCase()}`);

  if (detectedTool === ToolType.UNKNOWN) {
    // 未检测到工具，让用户手动选择
    const { selectedTool } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTool',
        message: 'No AI coding tool detected. Please select your tool:',
        choices: [
          { name: 'Claude Code', value: ToolType.CLAUDE },
          { name: 'Cursor IDE', value: ToolType.CURSOR },
          { name: 'Qoder CLI', value: ToolType.QODER },
          { name: 'Manual Setup (skip adapter generation)', value: 'manual' }
        ]
      }
    ]);

    if (selectedTool === 'manual') {
      console.log('\n✅ Basic setup complete. No adapter generated.');
      console.log('💡 You can manually run adapters later:');
      console.log('   node scripts/adapters/to-claude.js');
      return;
    }

    return runSetup(selectedTool, options);
  }

  // 2. 显示检测到的工具信息
  const toolInfo = getToolInfo(detectedTool);
  if (toolInfo) {
    console.log(`📦 Tool: ${toolInfo.name}`);
    console.log(`📁 Config: ${toolInfo.configDir}`);
    console.log(`📚 Docs: ${toolInfo.docsUrl}\n`);
  }

  // 3. 确认是否继续
  if (!force) {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Generate ${detectedTool} adapter for compound workflow?`,
        default: true
      }
    ]);

    if (!confirmed) {
      console.log('\n❌ Initialization cancelled.');
      return;
    }
  }

  // 4. 运行对应的适配器设置
  await runSetup(detectedTool, options);
}

/**
 * 运行工具特定的设置
 * @param {string} tool - 工具类型
 * @param {object} options - 命令行选项
 */
async function runSetup(tool, options = {}) {
  const projectRoot = process.cwd();
  const homeDir = os.homedir();

  try {
    switch (tool) {
      case ToolType.CLAUDE:
        await setupClaude(projectRoot, homeDir, options);
        break;

      case ToolType.CURSOR:
        await setupCursor(projectRoot, options);
        break;

      case ToolType.QODER:
        await setupQoder(projectRoot, homeDir, options);
        break;

      default:
        console.log('\n⚠️  Unsupported tool. Manual setup required.');
        console.log('💡 Supported tools: Claude, Cursor, Qoder');
    }
  } catch (error) {
    console.error(`\n❌ Setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Claude 设置
 * @param {string} projectRoot - 项目根目录
 * @param {string} homeDir - 用户主目录
 * @param {object} options - 选项
 */
async function setupClaude(projectRoot, homeDir, options) {
  console.log('\n🔨 Setting up Claude adapter...\n');

  // 1. 生成适配器
  const result = await convertToClaudePlugin({
    projectRoot,
    outputDir: path.join(projectRoot, '.compound/adapters/claude')
  });

  // 2. 复制到 Claude 插件目录
  const claudePluginDir = path.join(homeDir, '.claude/plugins/compound-frontend');

  console.log('\n📦 Installing to Claude plugins directory...');
  await fs.ensureDir(claudePluginDir);

  const sourceDir = path.join(projectRoot, '.compound/adapters/claude');
  await fs.copy(sourceDir, claudePluginDir, { overwrite: true });

  console.log(`✓ Copied to: ${claudePluginDir}`);

  // 3. 显示后续步骤
  console.log('\n✅ Claude setup complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Refresh Claude Code:');
  console.log('      claude /plugin refresh');
  console.log('');
  console.log('   2. Try a workflow:');
  console.log('      /compound:plan "添加用户登录表单"');
  console.log('      /compound:review "检查代码性能"');
  console.log('');
  console.log('   3. Use agents:');
  console.log('      @component-architect 分析组件结构');
}

/**
 * Cursor 设置
 * @param {string} projectRoot - 项目根目录
 * @param {object} options - 选项
 */
async function setupCursor(projectRoot, options) {
  const { cursorLegacy = false } = options;

  console.log('\n🔨 Setting up Cursor adapter...\n');

  // 生成 Cursor 规则
  await convertToCursorRules({
    useLegacy: cursorLegacy,
    sourceDir: path.join(projectRoot, '.compound')
  });

  // 显示后续步骤
  const format = cursorLegacy ? '.cursorrules (legacy)' : '.cursor/rules/ (modern)';
  console.log('\n✅ Cursor setup complete!\n');
  console.log(`📝 Generated ${format}`);
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Restart Cursor IDE to apply changes');
  console.log('');
  console.log('   2. Try a workflow:');
  console.log('      Ask Cursor: "Create a plan for user login form"');
  console.log('      Ask Cursor: "Review this code for performance"');
  console.log('');
  console.log('   3. Use agents:');
  console.log('      Ask Cursor: "Use the component-architect agent"');
  console.log('      Ask Cursor: "Check accessibility with the accessibility-reviewer"');
}

/**
 * Qoder 设置
 * @param {string} projectRoot - 项目根目录
 * @param {string} homeDir - 用户主目录
 * @param {object} options - 选项
 */
async function setupQoder(projectRoot, homeDir, options) {
  console.log('\n🔨 Setting up Qoder adapter...\n');

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
  console.log('\n✅ Qoder setup complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Restart Qoder CLI');
  console.log('');
  console.log('   2. Try a workflow:');
  console.log('      qoder /compound:plan "添加用户登录表单"');
  console.log('      qoder /compound:review "检查代码性能"');
  console.log('');
  console.log('   3. View all commands:');
  console.log('      qoder --help');
}

/**
 * CLI 入口 (直接运行此脚本时)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // 解析命令行参数
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    cursorLegacy: args.includes('--cursor-legacy')
  };

  init(options).catch(error => {
    console.error('\n❌ Initialization failed:', error.message);
    process.exit(1);
  });
}
