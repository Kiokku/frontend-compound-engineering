/**
 * @fileoverview Agent Loader - 三层优先级代理加载器（支持嵌套目录结构）
 * 
 * 代理查找优先级
 * 1. 项目级 (.compound/agents/) - 最高优先级
 * 2. 用户级 (~/.compound/agents/) - 中优先级
 * 3. npm 包级 (node_modules/@compound-workflow/star/agents/) - 最低优先级
 * 
 * 代理分类
 * - plan - 规划阶段代理
 * - work - 开发阶段代理
 * - review - 审查阶段代理
 * - compound - 知识固化阶段代理
 * 
 * 支持嵌套目录结构
 * - 根目录代理 - .compound/agents/custom-agent.md
 * - 分类代理 - .compound/agents/plan/requirements-analyzer.md
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { glob } from 'glob';
import { AgentLoadError } from './errors.js';

/**
 * 代理加载器类
 * 负责从三层路径中查找和加载代理
 */
/**
 * 代理分类常量
 */
export const AGENT_CATEGORIES = ['plan', 'work', 'review', 'compound'];

export class AgentLoader {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.verbose = options.verbose || false;
    
    // 定义搜索路径 (按优先级从高到低)
    this.searchPaths = [
      path.join(this.projectRoot, '.compound/agents'),           // 1. 项目级
      path.join(os.homedir(), '.compound/agents'),               // 2. 用户级
      path.join(this.projectRoot, 'node_modules/@compound-workflow/*/agents')  // 3. npm 包级
    ];
  }

  /**
   * 加载指定名称的代理
   * 支持嵌套路径，如 'requirements-analyzer' 或 'plan/requirements-analyzer'
   * 
   * @param {string} name - 代理名称 (可以包含路径，不含 .md 扩展名)
   * @param {string} [category] - 可选的分类过滤 (plan/work/review/compound)
   * @returns {object} - { content: string, path: string, source: string, category: string, metadata: object }
   * @throws {AgentLoadError} - 如果代理未找到
   */
  async loadAgent(name, category = null) {
    // 规范化名称：移除 .md 后缀
    const normalizedName = name.replace(/\.md$/, '');
    
    for (const basePath of this.searchPaths) {
      try {
        // 支持两种查找方式：
        // 1. 直接匹配: basePath/name.md 或 basePath/category/name.md
        // 2. 递归匹配: basePath/**/name.md
        let searchPatterns = [];
        
        if (category) {
          // 指定分类时，只在该分类目录下搜索
          searchPatterns.push(path.join(basePath, category, `${normalizedName}.md`));
        } else {
          // 未指定分类时，使用双模式查找
          searchPatterns.push(path.join(basePath, `${normalizedName}.md`));        // 根目录直接匹配
          searchPatterns.push(path.join(basePath, '**', `${normalizedName}.md`)); // 递归匹配
        }
        
        // 搜索所有可能的路径
        for (const pattern of searchPatterns) {
          const candidates = await glob(pattern);
          
          if (candidates.length > 0) {
            const agentPath = candidates[0];
            const content = await fs.readFile(agentPath, 'utf8');
            const source = this.getSource(agentPath);
            const metadata = this.parseMetadata(content);
            const detectedCategory = this.detectCategory(agentPath, metadata);
            
            if (this.verbose) {
              console.log(`📌 Loading agent "${normalizedName}" from: ${agentPath} (${source}/${detectedCategory || 'uncategorized'})`);
            }
            
            return {
              name: normalizedName,
              content,
              path: agentPath,
              source,
              category: detectedCategory,
              metadata
            };
          }
        }
      } catch (error) {
        // 继续尝试下一个路径
        if (this.verbose) {
          console.warn(`⚠️ Error searching in ${basePath}: ${error.message}`);
        }
      }
    }
    
    // 找不到代理，抛出 AgentLoadError
    throw new AgentLoadError(normalizedName, this.searchPaths, {
      suggestion: 'Run `compound agents list` to see available agents',
      category: category || 'any'
    });
  }

  /**
   * 列出所有可用代理
   * 递归扫描所有子目录，按优先级覆盖
   * 
   * @param {string} [category] - 可选的分类过滤 (plan/work/review/compound)
   * @returns {Array<object>} - 代理列表，每个包含 { name, path, source, category, relativePath, description, metadata }
   */
  async listAgents(category = null) {
    const agents = new Map();
    
    // 从低优先级到高优先级遍历，后面的覆盖前面的
    const reversedPaths = [...this.searchPaths].reverse();
    
    for (const basePath of reversedPaths) {
      try {
        // 递归扫描所有 .md 文件
        let searchPattern;
        if (category) {
          // 只搜索指定分类目录
          searchPattern = path.join(basePath, category, '**', '*.md');
        } else {
          // 递归扫描所有子目录
          searchPattern = path.join(basePath, '**', '*.md');
        }
        
        const files = await glob(searchPattern);
        
        for (const file of files) {
          // 提取代理名称（不包含 .md 后缀）
          const name = path.basename(file, '.md');
          const source = this.getSource(file);
          
          // 读取 metadata
          let metadata = {};
          try {
            const content = await fs.readFile(file, 'utf8');
            metadata = this.parseMetadata(content);
          } catch (e) {
            // 忽略读取错误
          }
          
          // 提取分类（如 plan, work, review, compound）
          const detectedCategory = this.detectCategory(file, metadata);
          
          // 如果指定了分类过滤，跳过不匹配的
          if (category && detectedCategory !== category) {
            continue;
          }
          
          // 获取相对路径
          const relativePath = this.getRelativePath(file, basePath);
          
          // 使用完整路径作为 key，确保同名但不同目录的代理不被覆盖
          const uniqueKey = detectedCategory ? `${detectedCategory}/${name}` : name;
          
          agents.set(uniqueKey, {
            name,
            path: file,
            source,
            category: detectedCategory,
            relativePath,
            description: metadata.description || '',
            metadata
          });
        }
      } catch (error) {
        // 继续处理其他路径
        if (this.verbose) {
          console.warn(`⚠️ Error listing agents in ${basePath}: ${error.message}`);
        }
      }
    }
    
    return Array.from(agents.values());
  }

  /**
   * 按分类列出所有代理
   * 
   * @returns {Promise<object>} - 按分类分组的代理对象
   * @example
   * {
   *   plan: [{ name: 'requirements-analyzer', ... }],
   *   work: [{ name: 'code-generator', ... }],
   *   review: [{ name: 'accessibility-reviewer', ... }],
   *   compound: [{ name: 'tech-stack-detector', ... }],
   *   uncategorized: [{ name: 'custom-agent', ... }]
   * }
   */
  async listAgentsByCategory() {
    const allAgents = await this.listAgents();
    const categorized = {
      plan: [],
      work: [],
      review: [],
      compound: [],
      uncategorized: []
    };
    
    for (const agent of allAgents) {
      const category = agent.category || 'uncategorized';
      if (AGENT_CATEGORIES.includes(category)) {
        categorized[category].push(agent);
      } else {
        categorized.uncategorized.push(agent);
      }
    }
    
    return categorized;
  }

  /**
   * 提取代理的分类（父目录名）
   * 优先使用 metadata 中的 category，其次根据文件路径推断
   * 
   * @param {string} filePath - 文件路径
   * @param {object} metadata - 解析的 metadata
   * @returns {string|null} - 分类名称，如 'plan', 'work', 'review', 'compound'，根目录代理返回 null
   * 
   * @example
   * detectCategory('plan/requirements-analyzer.md', {}) // → 'plan'
   * detectCategory('custom-agent.md', {}) // → null
   * detectCategory('work/code-generator.md', { category: 'work' }) // → 'work'
   */
  detectCategory(filePath, metadata = {}) {
    // 优先使用 metadata 中的 category
    if (metadata.category && AGENT_CATEGORIES.includes(metadata.category)) {
      return metadata.category;
    }
    
    // 根据文件路径推断
    for (const category of AGENT_CATEGORIES) {
      if (filePath.includes(`/${category}/`) || filePath.includes(`\\${category}\\`)) {
        return category;
      }
    }
    
    // 如果没有明确的分类，返回 null（而非 'uncategorized'）
    return null;
  }

  /**
   * 获取相对于基路径的相对路径
   * 
   * @param {string} filePath - 完整文件路径
   * @param {string} basePath - 基路径（可能包含 glob 通配符）
   * @returns {string} - 相对路径，如 'plan/requirements-analyzer.md'
   */
  getRelativePath(filePath, basePath) {
    // 移除 glob 通配符
    const cleanBasePath = basePath.replace(/[*]/g, '');
    return path.relative(cleanBasePath, filePath);
  }

  /**
   * 检查代理是否存在
   * 
   * @param {string} name - 代理名称
   * @param {string} [category] - 可选的分类过滤
   * @returns {Promise<boolean>}
   */
  async hasAgent(name, category = null) {
    try {
      await this.loadAgent(name, category);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取代理的完整路径
   * 
   * @param {string} name - 代理名称
   * @param {string} [category] - 可选的分类过滤
   * @returns {Promise<string|null>} - 代理文件路径，不存在返回 null
   */
  async getAgentPath(name, category = null) {
    try {
      const agent = await this.loadAgent(name, category);
      return agent.path;
    } catch {
      return null;
    }
  }

  /**
   * 判断代理来源：project, user, package
   * 
   * @param {string} filePath - 文件路径
   * @returns {string} - 'project' | 'user' | 'package'
   */
  getSource(filePath) {
    const projectAgentsPath = path.join(this.projectRoot, '.compound/agents');
    const userAgentsPath = path.join(os.homedir(), '.compound/agents');
    
    if (filePath.startsWith(projectAgentsPath)) {
      return 'project';
    }
    if (filePath.startsWith(userAgentsPath)) {
      return 'user';
    }
    return 'package';
  }

  /**
   * 获取来源的显示图标
   * @param {string} source - 来源类型
   * @returns {string} - emoji 图标
   */
  static getSourceIcon(source) {
    const icons = {
      project: '📌',
      user: '👤',
      package: '📦'
    };
    return icons[source] || '❓';
  }

  /**
   * 获取分类的显示图标
   * @param {string} category - 分类类型
   * @returns {string} - emoji 图标
   */
  static getCategoryIcon(category) {
    const icons = {
      plan: '📋',
      work: '🔨',
      review: '🔍',
      compound: '📚',
      uncategorized: '📄'
    };
    return icons[category] || '📄';
  }

  /**
   * 解析代理文件的 YAML frontmatter
   * @param {string} content - 文件内容
   * @returns {object} - 解析后的 metadata
   */
  parseMetadata(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return {};
    }
    
    const yamlContent = match[1];
    const metadata = {};
    
    // 简单的 YAML 解析 (键: 值 格式)
    const lines = yamlContent.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // 处理数组格式 [item1, item2]
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(v => v.trim());
        }
        
        metadata[key] = value;
      }
    }
    
    return metadata;
  }

  /**
   * 获取搜索路径信息
   * @returns {Array<object>}
   */
  getSearchPaths() {
    return this.searchPaths.map((p, index) => ({
      path: p,
      priority: index + 1,
      type: index === 0 ? 'project' : index === 1 ? 'user' : 'package',
      exists: fs.existsSync(p.replace(/\*/g, ''))
    }));
  }
}

export default AgentLoader;
