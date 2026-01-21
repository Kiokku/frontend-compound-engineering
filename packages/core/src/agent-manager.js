/**
 * @fileoverview Agent Manager - 代理管理器
 *
 * 负责代理的安装、移除、更新和列表功能
 * 支持从 npm 包中复制代理到项目或用户目录
 *
 * 核心功能:
 * - list: 列出所有已安装和可用的代理
 * - add: 从 node_modules 安装代理到项目/用户目录
 * - remove: 移除项目/用户级代理（保护包级代理）
 * - update: 从 npm 包更新代理到最新版本
 */

import { AgentLoader } from './agent-loader.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { glob } from 'glob';

/**
 * 代理管理器类
 */
export class AgentManager {
  constructor(options = {}) {
    this.loader = new AgentLoader(options);
    this.projectRoot = options.projectRoot || process.cwd();

    // 查找所有 @compound-workflow/* 包中的 agents 目录
    this.packageAgentsPath = path.join(this.projectRoot, 'node_modules/@compound-workflow/*/agents');
  }

  /**
   * 列出所有已安装的代理和可安装的代理
   * 按来源分组显示，并推荐可用代理和包
   */
  async list() {
    // 1. 获取已激活的代理（通过 AgentLoader 的优先级查找）
    const activeAgents = await this.loader.listAgents();

    console.log('\n📦 Active Agents:\n');

    // 按来源分组显示
    const bySource = {
      project: [],
      user: [],
      package: []
    };

    activeAgents.forEach(agent => {
      if (bySource[agent.source]) {
        bySource[agent.source].push(agent);
      }
    });

    // 显示项目级代理
    if (bySource.project.length > 0) {
      console.log('📌 Project Level (.compound/agents/):\n');
      bySource.project.forEach(agent => {
        const categoryIcon = agent.category ? ` [${AgentLoader.getCategoryIcon(agent.category)} ${agent.category}]` : '';
        console.log(`   ${agent.name}${categoryIcon}`);
      });
      console.log('');
    }

    // 显示用户级代理
    if (bySource.user.length > 0) {
      console.log('👤 User Level (~/.compound/agents/):\n');
      bySource.user.forEach(agent => {
        const categoryIcon = agent.category ? ` [${AgentLoader.getCategoryIcon(agent.category)} ${agent.category}]` : '';
        console.log(`   ${agent.name}${categoryIcon}`);
      });
      console.log('');
    }

    // 显示包级代理
    if (bySource.package.length > 0) {
      console.log('📦 Package Level (node_modules/):\n');
      bySource.package.forEach(agent => {
        const pkgName = this.extractPackageName(agent.path);
        const categoryIcon = agent.category ? ` [${AgentLoader.getCategoryIcon(agent.category)} ${agent.category}]` : '';
        console.log(`   ${agent.name}${categoryIcon} (${pkgName})`);
      });
      console.log('');
    }

    // 如果没有任何代理
    if (activeAgents.length === 0) {
      console.log('   (No agents found)\n');
    }

    // 2. 显示可用但未激活的代理
    await this.showAvailableAgents(activeAgents);
  }

  /**
   * 显示可安装的代理
   * @param {Array} activeAgents - 已激活的代理列表
   */
  async showAvailableAgents(activeAgents) {
    const activeNames = new Set(activeAgents.map(a => a.name));
    const availableAgents = await this.scanPackageAgents();

    // 过滤出未激活的代理
    const notActive = availableAgents.filter(agent => !activeNames.has(agent.name));

    if (notActive.length > 0) {
      console.log('💡 Available to Install (from installed packages):\n');
      notActive.forEach(agent => {
        const categoryIcon = agent.category ? ` [${AgentLoader.getCategoryIcon(agent.category)} ${agent.category}]` : '';
        console.log(`   - ${agent.name}${categoryIcon} (${agent.package})`);
      });
      console.log('\n📝 Install with: compound agents add <name>');
      console.log('   Add --global to install to ~/.compound/agents/\n');
    }

    // 3. 检测常见框架包是否安装
    await this.suggestPackages();
  }

  /**
   * 扫描 node_modules 中的所有代理
   * @returns {Promise<Array>} - 代理列表，每个包含 { name, path, package, category }
   */
  async scanPackageAgents() {
    const agents = [];
    const agentFiles = await glob(this.packageAgentsPath + '/**/*.md');

    for (const file of agentFiles) {
      const name = path.basename(file, '.md');
      const pkgName = this.extractPackageName(file);

      // 读取文件以检测分类
      let category = null;
      try {
        const content = await fs.readFile(file, 'utf8');
        const metadata = this.loader.parseMetadata(content);
        category = this.loader.detectCategory(file, metadata);
      } catch (e) {
        // 忽略错误
      }

      agents.push({ name, path: file, package: pkgName, category });
    }

    return agents;
  }

  /**
   * 从文件路径提取包名
   * @param {string} filePath - 文件路径
   * @returns {string} - 包名，如 '@compound-workflow/react'
   */
  extractPackageName(filePath) {
    const match = filePath.match(/node_modules\/@compound-workflow\/(\w+)/);
    return match ? `@compound-workflow/${match[1]}` : 'unknown';
  }

  /**
   * 建议安装常见框架包
   * 根据项目的 package.json 检测使用的框架并推荐对应的 compound 包
   */
  async suggestPackages() {
    const frameworkMapping = [
      { compoundPkg: '@compound-workflow/react', frameworkPkgs: ['react', 'next', 'remix'] },
      { compoundPkg: '@compound-workflow/vue', frameworkPkgs: ['vue', 'nuxt'] },
      { compoundPkg: '@compound-workflow/angular', frameworkPkgs: ['@angular/core'] },
      { compoundPkg: '@compound-workflow/svelte', frameworkPkgs: ['svelte'] }
    ];

    const suggestions = [];

    for (const mapping of frameworkMapping) {
      // 检查项目是否使用该框架
      const hasFramework = await this.hasAnyPackage(mapping.frameworkPkgs);
      // 检查是否已安装对应的 compound 包
      const hasCompoundPkg = await this.hasPackageInProject(mapping.compoundPkg);

      if (hasFramework && !hasCompoundPkg) {
        suggestions.push(mapping.compoundPkg);
      }
    }

    if (suggestions.length > 0) {
      console.log('\n💡 Suggested Packages (based on your project):\n');
      suggestions.forEach(pkg => {
        console.log(`   npm install ${pkg}`);
      });
      console.log('');
    }
  }

  /**
   * 检查项目中是否安装了某个包
   * @param {string} packageName - 包名
   * @returns {Promise<boolean>}
   */
  async hasPackageInProject(packageName) {
    const pkgJsonPath = path.join(this.projectRoot, 'package.json');

    if (!await fs.pathExists(pkgJsonPath)) {
      return false;
    }

    const pkgJson = await fs.readJson(pkgJsonPath);
    const deps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies
    };

    return !!deps[packageName];
  }

  /**
   * 检查项目中是否安装了任何一个给定的包
   * @param {Array<string>} packageNames - 包名数组
   * @returns {Promise<boolean>}
   */
  async hasAnyPackage(packageNames) {
    for (const pkgName of packageNames) {
      if (await this.hasPackageInProject(pkgName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 添加代理到项目或用户目录
   * @param {string} name - 代理名称
   * @param {object} options - 选项 { global: boolean }
   */
  async add(name, options = {}) {
    const { global = false } = options;

    // 1. 在 node_modules 中查找代理
    const availableAgents = await this.scanPackageAgents();
    const agent = availableAgents.find(a => a.name === name);

    if (!agent) {
      // 代理不存在，提供帮助信息
      console.error(`❌ Agent '${name}' not found in installed packages.\n`);
      console.log('💡 Suggestions:\n');
      console.log('   1. Check available agents: compound agents list');
      console.log('   2. Install a framework package first, for example:');
      console.log('      npm install @compound-workflow/react');
      console.log('      npm install @compound-workflow/vue');
      console.log('      npm install @compound-workflow/angular\n');
      return;
    }

    // 2. 确定安装位置
    const targetDir = global
      ? path.join(os.homedir(), '.compound/agents')
      : path.join(this.projectRoot, '.compound/agents');

    // 3. 处理嵌套目录结构（如 plan/requirements-analyzer.md）
    // 获取相对于 agents 目录的相对路径
    const agentsDir = path.join(path.dirname(agent.path), '..');
    const relativePath = path.relative(agentsDir, agent.path);
    const targetPath = path.join(targetDir, relativePath);

    // 检查目标文件是否已存在
    if (await fs.pathExists(targetPath)) {
      console.log(`⚠️  Agent '${name}' already exists at ${targetPath}`);
      console.log('💡 Use "compound agents update ' + name + '" to update it\n');
      return;
    }

    // 4. 复制文件
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(agent.path, targetPath);

    const location = global ? '~/.compound/agents/' : '.compound/agents/';
    const locationType = global ? 'user' : 'project';
    console.log(`✅ Installed ${name} to ${locationType} level (${location})`);
    console.log(`📦 Source: ${agent.package}\n`);
  }

  /**
   * 移除代理
   * @param {string} name - 代理名称
   */
  async remove(name) {
    const agents = await this.loader.listAgents();
    const agent = agents.find(a => a.name === name);

    if (!agent) {
      console.error(`❌ Agent '${name}' not found`);
      console.log('💡 Run "compound agents list" to see available agents\n');
      return;
    }

    if (agent.source === 'package') {
      console.log('⚠️  Cannot remove package agents.');
      console.log('💡 Package agents are read-only from node_modules/');
      console.log('   To disable, uninstall the npm package:\n');
      const pkgName = this.extractPackageName(agent.path);
      console.log(`   npm uninstall ${pkgName}\n`);
      return;
    }

    // 确认删除
    console.log(`🗑️  Removing agent: ${name}`);
    console.log(`   Location: ${agent.path}`);
    console.log(`   Source: ${agent.source}\n`);

    await fs.remove(agent.path);

    const location = agent.source === 'user' ? 'user' : 'project';
    console.log(`✅ Removed ${name} from ${location} level\n`);
  }

  /**
   * 更新代理（从 package 重新复制）
   * @param {string} name - 代理名称
   */
  async update(name) {
    const agents = await this.loader.listAgents();
    const agent = agents.find(a => a.name === name);

    if (!agent) {
      console.error(`❌ Agent '${name}' not found`);
      console.log('💡 Run "compound agents list" to see available agents\n');
      return;
    }

    if (agent.source === 'package') {
      console.log('⚠️  Package agents are always up-to-date.');
      console.log('💡 To get the latest version, update the npm package:\n');
      const pkgName = this.extractPackageName(agent.path);
      console.log(`   npm update ${pkgName}\n`);
      return;
    }

    // 从 package 重新复制
    console.log(`🔄 Updating ${name} from package...\n`);

    // 先移除
    await fs.remove(agent.path);

    // 重新添加
    const isGlobal = agent.source === 'user';
    await this.add(name, { global: isGlobal });
  }
}

export default AgentManager;
