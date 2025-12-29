#!/usr/bin/env node

/**
 * Compound Workflow - postinstall 钩子脚本
 * 
 * 在 npm install 后自动执行：
 * 1. 创建 .compound 目录结构
 * 2. 复制核心工作流文件
 * 3. 复制核心代理（不覆盖已存在的）
 * 4. 创建默认配置文件
 * 5. 更新 .gitignore
 */

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 主安装函数
 */
async function install() {
  console.log('\n📦 Installing Compound Frontend Workflow...\n');
  
  try {
    // 获取项目根目录 (安装时的 cwd)
    // INIT_CWD 是 npm 在执行 postinstall 时设置的环境变量，指向用户执行 npm install 的目录
    const projectRoot = process.env.INIT_CWD || process.cwd();
    const compoundDir = path.join(projectRoot, '.compound');
    
    // 获取 npm 包根目录
    const packageRoot = path.resolve(__dirname, '..');
    const sourceCompound = path.join(packageRoot, '.compound');
    
    // 检查是否在 npm 包内部执行（避免自安装循环）
    if (projectRoot === packageRoot) {
      console.log('ℹ️  Running inside package directory, skipping setup');
      return;
    }
    
    // 1. 创建 .compound 目录结构
    const directories = ['workflows', 'agents', 'docs', 'logs'];
    for (const dir of directories) {
      await fs.ensureDir(path.join(compoundDir, dir));
    }
    console.log('✓ Created .compound/ directory structure');
    
    // 2. 复制工作流文件 (始终复制，覆盖旧版本)
    const sourceWorkflows = path.join(sourceCompound, 'workflows');
    const targetWorkflows = path.join(compoundDir, 'workflows');
    
    if (await fs.pathExists(sourceWorkflows)) {
      const workflowFiles = await fs.readdir(sourceWorkflows);
      let copiedCount = 0;
      
      for (const file of workflowFiles) {
        if (file.endsWith('.md')) {
          await fs.copy(
            path.join(sourceWorkflows, file),
            path.join(targetWorkflows, file),
            { overwrite: true }
          );
          copiedCount++;
        }
      }
      
      if (copiedCount > 0) {
        console.log(`✓ Copied ${copiedCount} core workflow(s)`);
      }
    }
    
    // 3. 复制核心代理 (不覆盖已存在的项目代理)
    const sourceAgents = path.join(sourceCompound, 'agents');
    const targetAgents = path.join(compoundDir, 'agents');
    
    if (await fs.pathExists(sourceAgents)) {
      const agentFiles = await fs.readdir(sourceAgents);
      let copiedCount = 0;
      let skippedCount = 0;
      
      for (const file of agentFiles) {
        if (file.endsWith('.md')) {
          const targetPath = path.join(targetAgents, file);
          
          // 只有当目标不存在时才复制 (保护项目级代理)
          if (!await fs.pathExists(targetPath)) {
            await fs.copy(
              path.join(sourceAgents, file),
              targetPath
            );
            copiedCount++;
          } else {
            skippedCount++;
          }
        }
      }
      
      if (copiedCount > 0 || skippedCount > 0) {
        console.log(`✓ Copied ${copiedCount} core agent(s), skipped ${skippedCount} existing`);
      }
    }
    
    // 4. 创建默认配置文件
    const configPath = path.join(compoundDir, 'config.json');
    if (!await fs.pathExists(configPath)) {
      const defaultConfig = {
        version: '0.1.0',
        tool: 'auto', // 自动检测工具类型
        disabledAgents: [],
        preferences: {
          autoSuggestAgents: true,
          verboseLogging: false,
          recordSolutions: true
        },
        adapters: {
          claude: {
            enabled: true,
            pluginDir: '~/.claude/plugins/compound-frontend'
          },
          cursor: {
            enabled: true,
            useLegacy: false // 使用新版 .cursor/rules/ 格式
          },
          qoder: {
            enabled: true
          }
        }
      };
      
      await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
      console.log('✓ Created default config.json');
    } else {
      console.log('✓ Config.json already exists (preserved)');
    }
    
    // 5. 添加到 .gitignore
    await updateGitignore(projectRoot);
    
    // 完成提示
    console.log('\n✅ Installation complete!\n');
    console.log('Next steps:');
    console.log('  1. Run: npx compound init');
    console.log('     (This will detect your AI tool and set up adapters)\n');
    console.log('  2. Start using workflows:');
    console.log('     - /compound:plan "feature description"');
    console.log('     - /compound:work');
    console.log('     - /compound:review');
    console.log('     - /compound:compound\n');
    
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('\nPlease try manual setup:');
    console.error('  1. Create .compound/ directory in your project');
    console.error('  2. Run: npx compound init\n');
    
    // 不要让 postinstall 失败阻止整个安装
    // process.exit(1);
  }
}

/**
 * 更新 .gitignore 文件
 */
async function updateGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  
  const entriesToAdd = [
    '',
    '# Compound Workflow',
    '.compound/logs/',
    '.compound/docs/',
    '.compound/adapters/'
  ];
  
  try {
    if (await fs.pathExists(gitignorePath)) {
      const content = await fs.readFile(gitignorePath, 'utf8');
      
      // 检查是否已经添加过
      if (!content.includes('.compound/logs/')) {
        await fs.appendFile(gitignorePath, entriesToAdd.join('\n') + '\n');
        console.log('✓ Updated .gitignore');
      }
    } else {
      // 创建新的 .gitignore
      await fs.writeFile(gitignorePath, entriesToAdd.slice(1).join('\n') + '\n');
      console.log('✓ Created .gitignore');
    }
  } catch (error) {
    // .gitignore 更新失败不是致命错误
    console.log('⚠️  Could not update .gitignore:', error.message);
  }
}

// 执行安装
install().catch(err => {
  console.error('❌ Installation error:', err);
  // 不要阻止 npm install
});
