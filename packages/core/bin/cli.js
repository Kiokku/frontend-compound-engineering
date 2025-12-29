#!/usr/bin/env node

/**
 * Compound Workflow CLI
 * 
 * 核心命令入口，支持工作流管理和代理管理
 */

import { program } from 'commander';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 package.json 获取版本号
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

program
  .name('compound')
  .description('Compound workflow CLI - Plan → Work → Review → Compound')
  .version(packageJson.version);

// ========================================
// agents 子命令组
// ========================================
const agentsCmd = program
  .command('agents')
  .description('Manage agents');

// agents list
agentsCmd
  .command('list')
  .description('List all installed and available agents')
  .action(async () => {
    try {
      const { AgentLoader } = await import('../src/agent-loader.js');
      const loader = new AgentLoader();
      const agents = await loader.listAgents();

      console.log('\n📦 Installed Agents:\n');

      if (agents.length === 0) {
        console.log('   (No agents installed)');
      } else {
        agents.forEach(agent => {
          const icon = {
            project: '📌',
            user: '👤',
            package: '📦'
          }[agent.source] || '📄';
          console.log(`   ${icon} ${agent.name} (${agent.source})`);
        });
      }

      console.log('\n💡 Tip: Use "compound agents add <name>" to install more agents\n');
    } catch (error) {
      console.error('❌ Failed to list agents:', error.message);
      process.exit(1);
    }
  });

// agents add <name>
agentsCmd
  .command('add <name>')
  .description('Add an agent from library')
  .option('-g, --global', 'Install globally to ~/.compound/agents/')
  .action(async (name, options) => {
    console.log(`📥 Adding agent: ${name}${options.global ? ' (global)' : ''}...`);
    // TODO: 实现代理添加逻辑 (Phase 4.3)
    console.log('⚠️  Agent add functionality will be implemented in Phase 4.3');
  });

// agents remove <name>
agentsCmd
  .command('remove <name>')
  .description('Remove a project or user agent')
  .action(async (name) => {
    console.log(`🗑️  Removing agent: ${name}...`);
    // TODO: 实现代理移除逻辑 (Phase 4.3)
    console.log('⚠️  Agent remove functionality will be implemented in Phase 4.3');
  });

// agents update <name>
agentsCmd
  .command('update <name>')
  .description('Update an agent to latest version')
  .action(async (name) => {
    console.log(`🔄 Updating agent: ${name}...`);
    // TODO: 实现代理更新逻辑 (Phase 4.3)
    console.log('⚠️  Agent update functionality will be implemented in Phase 4.3');
  });

// ========================================
// init 命令
// ========================================
program
  .command('init')
  .description('Initialize compound workflow for your AI tool')
  .option('--cursor-legacy', 'Use legacy .cursorrules format')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    console.log('\n🔧 Initializing Compound Workflow...\n');
    
    try {
      // 动态导入 init 脚本
      const initPath = path.resolve(__dirname, '../scripts/init.js');
      if (await fs.pathExists(initPath)) {
        const { init } = await import(initPath);
        await init(options);
      } else {
        console.log('⚠️  Init script not found. Running basic setup...');
        await basicSetup();
      }
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  });

// ========================================
// info 命令
// ========================================
program
  .command('info')
  .description('Show information about compound workflow installation')
  .action(async () => {
    console.log('\n📋 Compound Workflow Info\n');
    console.log('='.repeat(40));
    console.log(`Version: ${packageJson.version}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`CWD: ${process.cwd()}`);
    console.log('='.repeat(40));
    
    // 检查 .compound 目录
    const compoundDir = path.join(process.cwd(), '.compound');
    if (await fs.pathExists(compoundDir)) {
      console.log('\n✅ .compound directory exists');
      
      const subdirs = ['workflows', 'agents', 'docs', 'logs'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(compoundDir, subdir);
        const exists = await fs.pathExists(subdirPath);
        console.log(`   ${exists ? '✓' : '✗'} ${subdir}/`);
      }
    } else {
      console.log('\n⚠️  .compound directory not found');
      console.log('   Run: compound init');
    }
    
    console.log('');
  });

// ========================================
// 基础设置函数
// ========================================
async function basicSetup() {
  const projectRoot = process.cwd();
  const compoundDir = path.join(projectRoot, '.compound');
  
  // 创建目录结构
  const dirs = ['workflows', 'agents', 'docs', 'logs'];
  for (const dir of dirs) {
    await fs.ensureDir(path.join(compoundDir, dir));
  }
  
  // 创建默认配置
  const configPath = path.join(compoundDir, 'config.json');
  if (!await fs.pathExists(configPath)) {
    await fs.writeJson(configPath, {
      version: packageJson.version,
      disabledAgents: [],
      preferences: {
        autoSuggestAgents: true,
        verboseLogging: false
      }
    }, { spaces: 2 });
  }
  
  console.log('✅ Basic setup complete!');
  console.log('   Created .compound/ directory structure');
}

// 解析命令行参数
program.parse();
