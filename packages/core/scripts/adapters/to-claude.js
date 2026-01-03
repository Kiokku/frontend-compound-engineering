/**
 * Claude Adapter - Convert workflows to Claude Plugin format
 *
 * 将核心工作流转换为 Claude Code Plugin 格式
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { AdapterError } from '../../src/errors.js';
import {
  extractFrontmatterSafe,
  extractNameFromFrontmatter,
  readPackageJson,
  isMarkdownFile,
  findCompoundDirectory
} from './adapter-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 递归复制目录
 * @param {string} source - 源目录
 * @param {string} destination - 目标目录
 */
export async function copyDirectoryRecursive(source, destination) {
  await fs.ensureDir(destination);

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryRecursive(srcPath, destPath);
    } else {
      await fs.copy(srcPath, destPath);
    }
  }
}

/**
 * 转换为核心 Claude Plugin 格式
 * @param {object} options - 配置选项
 * @param {string} options.projectRoot - 项目根目录
 * @param {string} options.outputDir - 输出目录
 */
export async function convertToClaudePlugin(options = {}) {
  const {
    projectRoot = process.cwd(),
    outputDir = path.join(projectRoot, '.compound/adapters/claude')
  } = options;

  console.log('\n🔧 Converting to Claude Plugin format...\n');

  // 1. 定义源目录（使用灵活的路径查找）
  const sourceWorkflowsDir = findCompoundDirectory(projectRoot, 'workflows');
  const sourceAgentsDir = findCompoundDirectory(projectRoot, 'agents');

  if (!sourceWorkflowsDir) {
    throw new AdapterError('claude', `Workflows directory not found`, {
      projectRoot,
      hint: 'Ensure .compound/workflows exists in either project root or packages/core/'
    });
  }

  if (!sourceAgentsDir) {
    throw new AdapterError('claude', `Agents directory not found`, {
      projectRoot,
      hint: 'Ensure .compound/agents exists in either project root or packages/core/'
    });
  }

  console.log(`📁 Workflows: ${sourceWorkflowsDir}`);
  console.log(`📁 Agents: ${sourceAgentsDir}\n`);

  // 2. 创建目标目录结构
  const commandsDir = path.join(outputDir, 'commands');
  const agentsDir = path.join(outputDir, 'agents');
  await fs.ensureDir(commandsDir);
  await fs.ensureDir(agentsDir);

  console.log(`📁 Target directory: ${outputDir}`);

  // 3. 读取 package.json
  const packageJson = await readPackageJson(projectRoot);

  // 4. 创建 plugin manifest
  const pluginManifest = {
    name: "compound-frontend",
    version: packageJson.version || "0.1.0",
    description: "Frontend workflow automation - Plan, Work, Review, Compound",
    author: packageJson.author || "Compound Workflow",
    license: packageJson.license || "MIT",
    commands: [],
    agents: []
  };

  // 5. 转换 workflows → commands
  console.log('\n📋 Processing workflows...');
  const workflowFiles = await fs.readdir(sourceWorkflowsDir);

  for (const file of workflowFiles) {
    if (!isMarkdownFile(file)) continue;

    const sourcePath = path.join(sourceWorkflowsDir, file);
    const targetPath = path.join(commandsDir, file);
    const content = await fs.readFile(sourcePath, 'utf8');

    // 保持 YAML frontmatter 和内容不变，直接复制
    await fs.copy(sourcePath, targetPath);

    // 提取命令信息
    const frontmatter = extractFrontmatterSafe(content, file);
    pluginManifest.commands.push({
      name: frontmatter.name || file.replace('.md', ''),
      description: frontmatter.description || '',
      argumentHint: frontmatter['argument-hint'] || '',
      framework: frontmatter.framework || 'universal'
    });

    console.log(`  ✓ ${file} → commands/${file}`);
  }

  // 6. 转换 agents
  console.log('\n🤖 Processing agents...');
  await copyDirectoryRecursive(sourceAgentsDir, agentsDir);

  // 统计代理数量
  const agentCategories = await fs.readdir(agentsDir);
  let totalAgents = 0;

  for (const category of agentCategories) {
    const categoryPath = path.join(agentsDir, category);
    const stat = await fs.stat(categoryPath);

    if (stat.isDirectory()) {
      const agents = await fs.readdir(categoryPath);
      const mdFiles = agents.filter(isMarkdownFile);
      totalAgents += mdFiles.length;

      for (const agent of mdFiles) {
        const agentPath = path.join(categoryPath, agent);
        const content = await fs.readFile(agentPath, 'utf8');
        const frontmatter = extractFrontmatterSafe(content, agent);

        pluginManifest.agents.push({
          name: frontmatter.name || agent.replace('.md', ''),
          description: frontmatter.description || '',
          category: category
        });
      }

      console.log(`  ✓ ${category}/ (${mdFiles.length} agents)`);
    }
  }

  // 7. 写入 plugin.json
  const manifestPath = path.join(outputDir, 'plugin.json');
  await fs.writeJson(manifestPath, pluginManifest, { spaces: 2 });
  console.log(`\n✓ Generated plugin.json (${pluginManifest.commands.length} commands, ${pluginManifest.agents.length} agents)`);

  // 8. 生成 README (可选)
  const readmeContent = `# Compound Frontend - Claude Plugin

## Installation

\`\`\`bash
# Copy to Claude plugins directory
cp -r .compound/adapters/claude ~/.claude/plugins/compound-frontend

# Refresh Claude Code
claude /plugin refresh
\`\`\`

## Usage

Use the following commands in Claude Code:

### Workflows
${pluginManifest.commands.map(cmd => `- \`/${cmd.name}\`: ${cmd.description}`).join('\n')}

### Agents
${pluginManifest.agents.map(agent => `- \`@${agent.name}\`: ${agent.description}`).join('\n')}

## Version

${pluginManifest.version}

## Generated Files

- **Commands**: ${pluginManifest.commands.length} workflow files
- **Agents**: ${pluginManifest.agents.length} agent files across ${agentCategories.length} categories
`;

  const readmePath = path.join(outputDir, 'README.md');
  await fs.writeFile(readmePath, readmeContent);
  console.log(`✓ Generated README.md`);

  console.log('\n✅ Claude Plugin conversion complete!\n');
  console.log(`📦 Output: ${outputDir}`);
  console.log(`📋 Commands: ${pluginManifest.commands.length}`);
  console.log(`🤖 Agents: ${pluginManifest.agents.length}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Copy to Claude plugins: cp -r .compound/adapters/claude ~/.claude/plugins/compound-frontend');
  console.log('   2. Refresh Claude: claude /plugin refresh');
  console.log('   3. Try: /compound:plan "添加用户登录表单"\n');

  return {
    outputDir,
    commandsCount: pluginManifest.commands.length,
    agentsCount: pluginManifest.agents.length,
    manifest: pluginManifest
  };
}

/**
 * CLI 入口 (直接运行此脚本时)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  convertToClaudePlugin().catch(error => {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  });
}
