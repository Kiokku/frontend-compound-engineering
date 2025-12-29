/**
 * @fileoverview Agent Loader - 三层优先级代理加载器
 * 
 * 代理查找优先级:
 * 1. 项目级 (.compound/agents/) - 最高优先级
 * 2. 用户级 (~/.compound/agents/) - 中优先级
 * 3. npm 包级 (node_modules/@compound-workflow/* /agents/) - 最低优先级
 * 
 * 代理分类:
 * - plan: 规划阶段代理
 * - work: 开发阶段代理
 * - review: 审查阶段代理
 * - compound: 知识固化阶段代理
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { glob } from 'glob';

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
   * @param {string} name - 代理名称 (不含 .md 扩展名)
   * @param {string} [category] - 可选的分类过滤 (plan/work/review/compound)
   * @returns {object} - { content: string, path: string, source: string }
   * @throws {Error} - 如果代理未找到
   */
  async loadAgent(name, category = null) {
    for (const basePath of this.searchPaths) {
      try {
        // 构建搜索模式
        let searchPatterns = [];
        
        if (category) {
          // 指定分类时，只在该分类目录下搜索
          searchPatterns.push(path.join(basePath, category, `${name}.md`));
        } else {
          // 未指定分类时，搜索根目录和所有分类子目录
          searchPatterns.push(path.join(basePath, `${name}.md`));
          for (const cat of AGENT_CATEGORIES) {
            searchPatterns.push(path.join(basePath, cat, `${name}.md`));
          }
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
              console.log(`📌 Loading agent "${name}" from: ${agentPath} (${source}/${detectedCategory})`);
            }
            
            return {
              name,
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
    
    throw new Error(`Agent "${name}" not found in any search path`);
  }

  /**
   * 列出所有可用代理
   * @param {string} [category] - 可选的分类过滤
   * @returns {Array<object>} - 代理列表，高优先级覆盖低优先级
   */
  async listAgents(category = null) {
    const agents = new Map();
    
    // 从低优先级到高优先级遍历，后面的覆盖前面的
    const reversedPaths = [...this.searchPaths].reverse();
    
    for (const basePath of reversedPaths) {
      try {
        // 构建搜索模式 - 包括根目录和所有分类子目录
        let searchPatterns = [];
        
        if (category) {
          // 只搜索指定分类
          searchPatterns.push(path.join(basePath, category, '*.md'));
        } else {
          // 搜索根目录和所有分类子目录
          searchPatterns.push(path.join(basePath, '*.md'));
          searchPatterns.push(path.join(basePath, '**', '*.md'));
        }
        
        for (const pattern of searchPatterns) {
          const files = await glob(pattern);
          
          for (const file of files) {
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
            
            const detectedCategory = this.detectCategory(file, metadata);
            
            // 如果指定了分类过滤，跳过不匹配的
            if (category && detectedCategory !== category) {
              continue;
            }
            
            agents.set(name, {
              name,
              path: file,
              source,
              description: metadata.description || '',
              category: detectedCategory
            });
          }
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
   * @returns {object} - { plan: [...], work: [...], review: [...], compound: [...], uncategorized: [...] }
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
      const category = agent.category;
      if (AGENT_CATEGORIES.includes(category)) {
        categorized[category].push(agent);
      } else {
        categorized.uncategorized.push(agent);
      }
    }
    
    return categorized;
  }

  /**
   * 检测代理的分类
   * 优先使用 metadata 中的 category，其次根据文件路径推断
   * @param {string} filePath - 文件路径
   * @param {object} metadata - 解析的 metadata
   * @returns {string} - 分类名称
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
    
    return 'uncategorized';
  }

  /**
   * 检查代理是否存在
   * @param {string} name - 代理名称
   * @returns {boolean}
   */
  async hasAgent(name) {
    try {
      await this.loadAgent(name);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 根据文件路径判断代理来源
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
