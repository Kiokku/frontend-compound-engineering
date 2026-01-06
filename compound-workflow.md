# 前端开发全流程 Plugin 实施计划

## 📋 项目概览

**项目名称**: `@compound-workflow/frontend`\
**核心理念**: Plan → Work → Review → Compound\
**目标**: 跨工具兼容的前端开发全流程自动化工具链\
**架构策略**: 种子(Seed) + 生长(Growth) - 从最小核心开始,随使用逐步扩展

***

## 🏗️ 架构设计

### 1. 统一目录结构

    项目根目录/ (Monorepo 结构)
    ├── packages/
    │   ├── core/                     # @compound-workflow/core (核心包)
    │   │   ├── .compound/
    │   │   │   ├── workflows/        # 4 个核心工作流
    │   │   │   ├── agents/           # 最小核心代理(3个)
    │   │   │   └── skills/
    │   │   ├── scripts/
    │   │   │   ├── install.js
    │   │   │   ├── init.js
    │   │   │   ├── agents-cli.js    # 代理管理命令
    │   │   │   └── adapters/
    │   │   └── package.json
    │   ├── frontend-base/            # @compound-workflow/frontend-base
    │   │   └── agents/               # 基础前端代理(accessibility, performance, security)
    │   ├── react/                    # @compound-workflow/react (可选)
    │   │   └── agents/               # React 专用代理
    │   ├── vue/                      # @compound-workflow/vue (可选)
    │   │   └── agents/               # Vue 专用代理
    │   ├── design-tools/             # @compound-workflow/design-tools (可选)
    │   │   └── agents/               # 设计工具集成
    │   └── meta/                     # @compound-workflow/frontend (元包)
    │       └── package.json          # 依赖所有子包
    ├── library/                      # 代理库(不直接安装)
    │   ├── react/
    │   ├── vue/
    │   ├── angular/
    │   └── svelte/
    ├── pnpm-workspace.yaml
    └── README.md

    用户项目中的结构:
    项目根目录/
    ├── .compound/
    │   ├── agents/                   # 项目特定代理(最高优先级)
    │   ├── docs/                     # compound 记录的知识
    │   └── config.json               # 配置(禁用的代理等)
    ├── ~/.compound/
    │   └── agents/                   # 用户全局代理(中优先级)
    └── node_modules/@compound-workflow/
        └── */agents/                 # npm 包代理(最低优先级)

***

## 🌱 Phase 0: Monorepo 结构设计 (Week 1)

### 任务分解

#### 0.1 初始化 Monorepo

**使用 pnpm workspace**:

```bash

# 初始化 pnpm workspace
pnpm init

# 创建 pnpm-workspace.yaml
cat > pnpm-workspace.yaml << EOF
packages:
  - 'packages/*'
EOF
```

**创建子包结构**:

```bash
mkdir -p packages/{core,frontend-base,react,vue,design-tools,meta}

# 初始化各子包
for pkg in core frontend-base react vue design-tools meta; do
  cd packages/$pkg
  pnpm init
  cd ../..
done
```

**验收标准**:

*   [x] pnpm workspace 配置正确
*   [x] 6 个子包初始化完成
*   [x] 子包可以相互引用

***

#### 0.2 定义包依赖关系

**核心包 (packages/core/package.json)**:

```json
{
  "name": "@compound-workflow/core",
  "version": "0.1.0",
  "description": "Core workflows: plan, work, review, compound",
  "type": "module",
  "main": "index.js",
  "bin": {
    "compound": "./bin/cli.js"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "inquirer": "^9.0.0",
    "fs-extra": "^11.0.0",
    "glob": "^10.0.0",
    "yaml": "^2.0.0"
  }
}
```

**前端基础包 (packages/frontend-base/package.json)**:

```json
{
  "name": "@compound-workflow/frontend-base",
  "version": "0.1.0",
  "description": "Base frontend agents: accessibility, performance, security",
  "peerDependencies": {
    "@compound-workflow/core": "^0.1.0"
  }
}
```

**React 扩展包 (packages/react/package.json)**:

```json
{
  "name": "@compound-workflow/react",
  "version": "0.1.0",
  "description": "React-specific agents and reviewers",
  "peerDependencies": {
    "@compound-workflow/core": "^0.1.0",
    "@compound-workflow/frontend-base": "^0.1.0"
  }
}
```

**元包 (packages/meta/package.json)**:

```json
{
  "name": "@compound-workflow/frontend",
  "version": "0.1.0",
  "description": "Complete frontend workflow toolkit (meta-package)",
  "dependencies": {
    "@compound-workflow/core": "^0.1.0",
    "@compound-workflow/frontend-base": "^0.1.0",
    "@compound-workflow/react": "^0.1.0",
    "@compound-workflow/vue": "^0.1.0",
    "@compound-workflow/design-tools": "^0.1.0"
  }
}
```

**验收标准**:

*   [x] 包依赖关系清晰
*   [x] 核心包无外部依赖于框架
*   [x] 框架包正确依赖核心包
*   [x] 元包聚合所有子包

***

#### 0.3 设计代理优先级机制

**三层代理查找**:

```javascript
// packages/core/src/agent-loader.js

import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { glob } from 'glob';
import { AgentLoadError } from './errors.js';

/**
 * 代理加载器 - 支持嵌套目录结构
 * 按优先级从三个位置查找代理：项目 > 用户 > npm 包
 */
export class AgentLoader {
  constructor() {
    this.searchPaths = [
      '.compound/agents/',                              // 1. 项目级(最高优先级)
      path.join(os.homedir(), '.compound/agents/'),    // 2. 用户级
      'node_modules/@compound-workflow/*/agents/'      // 3. npm 包级
    ];
  }
  
  /**
   * 加载指定名称的代理
   * 支持嵌套路径，如 'requirements-analyzer' 或 'plan/requirements-analyzer'
   * 
   * @param {string} name - 代理名称，可以包含路径
   * @returns {string} - 代理文件内容
   */
  loadAgent(name) {
    // 规范化名称：移除 .md 后缀
    const normalizedName = name.replace(/\.md$/, '');
    
    for (const basePath of this.searchPaths) {
      // 支持两种查找方式：
      // 1. 直接匹配: basePath/name.md
      // 2. 递归匹配: basePath/**/name.md
      const patterns = [
        path.join(basePath, `${normalizedName}.md`),       // 直接匹配
        path.join(basePath, '**', `${normalizedName}.md`)  // 递归匹配
      ];
      
      for (const pattern of patterns) {
        const candidates = glob.sync(pattern);
        if (candidates.length > 0) {
          const agentPath = candidates[0];
          console.log(`📌 Loading agent from: ${agentPath}`);
          return fs.readFileSync(agentPath, 'utf8');
        }
      }
    }
    
    // 找不到代理，抛出错误
    throw new AgentLoadError(normalizedName, this.searchPaths, {
      suggestion: 'Run `compound agents list` to see available agents'
    });
  }
  
  /**
   * 列出所有可用代理
   * 递归扫描所有子目录，按优先级覆盖
   * 
   * @returns {Array} - 代理列表，每个包含 name, path, source, category
   */
  listAgents() {
    const agents = new Map();
    
    // 从低优先级到高优先级，后面的覆盖前面的
    for (const basePath of [...this.searchPaths].reverse()) {
      // 递归扫描所有 .md 文件
      const files = glob.sync(path.join(basePath, '**', '*.md'));
      
      files.forEach(file => {
        // 提取代理名称（不包含 .md 后缀）
        const name = path.basename(file, '.md');
        
        // 提取分类（如 plan, work, review, compound）
        const category = this.extractCategory(file, basePath);
        
        // 使用完整路径作为 key，确保同名但不同目录的代理不被覆盖
        const relPath = this.getRelativePath(file, basePath);
        const uniqueKey = category ? `${category}/${name}` : name;
        
        agents.set(uniqueKey, {
          name,
          path: file,
          source: this.getSource(file),
          category,
          relativePath: relPath
        });
      });
    }
    
    return Array.from(agents.values());
  }
  
  /**
   * 提取代理的分类（父目录名）
   * 例如：plan/requirements-analyzer.md → 'plan'
   */
  extractCategory(filePath, basePath) {
    const relativePath = path.relative(
      basePath.replace(/[*]/g, ''),  // 移除 glob 通配符
      filePath
    );
    
    const parts = relativePath.split(path.sep);
    
    // 如果有父目录，返回父目录名；否则返回 null
    return parts.length > 1 ? parts[0] : null;
  }
  
  /**
   * 获取相对于基路径的相对路径
   */
  getRelativePath(filePath, basePath) {
    const cleanBasePath = basePath.replace(/[*]/g, '');
    return path.relative(cleanBasePath, filePath);
  }
  
  /**
   * 判断代理来源：project, user, package
   */
  getSource(filePath) {
    if (filePath.includes('.compound/agents')) {
      // 区分项目级和用户级
      if (filePath.includes(os.homedir())) {
        return 'user';
      }
      return 'project';
    }
    return 'package';
  }
  
  /**
   * 检查代理是否存在
   * 
   * @param {string} name - 代理名称
   * @returns {boolean}
   */
  hasAgent(name) {
    try {
      this.loadAgent(name);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 获取代理的完整路径
   * 
   * @param {string} name - 代理名称
   * @returns {string|null} - 代理文件路径，不存在返回 null
   */
  getAgentPath(name) {
    const normalizedName = name.replace(/\.md$/, '');
    
    for (const basePath of this.searchPaths) {
      const patterns = [
        path.join(basePath, `${normalizedName}.md`),
        path.join(basePath, '**', `${normalizedName}.md`)
      ];
      
      for (const pattern of patterns) {
        const candidates = glob.sync(pattern);
        if (candidates.length > 0) {
          return candidates[0];
        }
      }
    }
    
    return null;
  }
  
  /**
   * 按分类列出代理
   * 
   * @returns {Object} - 按分类分组的代理对象
   */
  listAgentsByCategory() {
    const allAgents = this.listAgents();
    const byCategory = {
      plan: [],
      work: [],
      review: [],
      compound: [],
      uncategorized: []
    };
    
    allAgents.forEach(agent => {
      const category = agent.category || 'uncategorized';
      if (byCategory[category]) {
        byCategory[category].push(agent);
      } else {
        byCategory.uncategorized.push(agent);
      }
    });
    
    return byCategory;
  }
}
```

**验收标准**:

*   [x] 支持嵌套目录结构（plan/requirements-analyzer.md）
*   [x] 高优先级代理正确覆盖低优先级
*   [x] 能递归列出所有子目录中的代理
*   [x] 正确提取代理分类（plan/work/review/compound）
*   [x] 加载时显示代理来源和完整路径
*   [x] 找不到代理时抛出 AgentLoadError
*   [x] 支持按分类列出代理
*   [x] 支持检查代理是否存在

***

## 🛡️ Phase 0.4: 错误处理策略 (贯穿全流程)

### 错误处理设计原则

在开始核心架构搭建之前，必须先定义统一的错误处理策略，确保整个工具链具有良好的容错能力和用户体验。

#### 0.4.1 错误分类体系

| 错误类型 | 严重级别 | 处理策略 | 用户提示 |
|---------|---------|---------|----------|
| `ConfigError` | 低 | 使用默认值继续 | ⚠️ 警告信息 |
| `FileNotFoundError` | 中 | 跳过并记录 | 📝 提示缺失文件 |
| `NetworkError` | 中 | 重试 3 次后降级 | 🔄 重试中... |
| `PermissionError` | 高 | 中止并提示修复 | ❌ 需要权限 |
| `CriticalError` | 致命 | 立即中止并回滚 | 🚨 严重错误 |

#### 0.4.2 统一错误处理类

**文件**: `packages/core/src/errors.js`

```javascript
/**
 * Compound Workflow 错误基类
 */
export class CompoundError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CompoundError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 配置相关错误
 */
export class ConfigError extends CompoundError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
    this.recoverable = true;
  }
}

/**
 * 文件操作错误
 */
export class FileOperationError extends CompoundError {
  constructor(message, filePath, operation, details = {}) {
    super(message, 'FILE_OPERATION_ERROR', { filePath, operation, ...details });
    this.name = 'FileOperationError';
    this.recoverable = operation === 'read'; // 读取错误可恢复，写入错误不可恢复
  }
}

/**
 * 代理加载错误
 */
export class AgentLoadError extends CompoundError {
  constructor(agentName, searchPaths, details = {}) {
    super(
      `Agent "${agentName}" not found in any search path`,
      'AGENT_LOAD_ERROR',
      { agentName, searchPaths, ...details }
    );
    this.name = 'AgentLoadError';
    this.recoverable = false;
  }
}

/**
 * 适配器转换错误
 */
export class AdapterError extends CompoundError {
  constructor(adapterName, message, details = {}) {
    super(message, 'ADAPTER_ERROR', { adapterName, ...details });
    this.name = 'AdapterError';
    this.recoverable = false;
  }
}
```

#### 0.4.3 错误处理工具函数

**文件**: `packages/core/src/error-handler.js`

```javascript
import { CompoundError } from './errors.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * 全局错误处理器
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.logDir = options.logDir || '.compound/logs';
    this.verbose = options.verbose || false;
    this.exitOnCritical = options.exitOnCritical ?? true;
  }

  /**
   * 处理错误并决定后续操作
   */
  async handle(error, context = {}) {
    // 记录错误日志
    await this.log(error, context);

    // 根据错误类型决定处理策略
    if (error instanceof CompoundError) {
      return this.handleCompoundError(error, context);
    }

    // 未知错误，包装后处理
    const wrappedError = new CompoundError(
      error.message,
      'UNKNOWN_ERROR',
      { originalError: error.stack }
    );
    return this.handleCompoundError(wrappedError, context);
  }

  /**
   * 处理 Compound 特定错误
   */
  handleCompoundError(error, context) {
    const { recoverable } = error;

    // 输出用户友好的错误信息
    this.printUserMessage(error);

    if (!recoverable && this.exitOnCritical) {
      console.error('\n❌ 无法恢复的错误，程序终止');
      console.error('📝 详细日志已保存到:', path.join(this.logDir, 'error.log'));
      process.exit(1);
    }

    return { handled: true, recoverable, error };
  }

  /**
   * 记录错误到日志文件
   */
  async log(error, context) {
    try {
      await fs.ensureDir(this.logDir);
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: error instanceof CompoundError ? error.toJSON() : {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context
      };
      
      const logFile = path.join(this.logDir, 'error.log');
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (logError) {
      // 日志写入失败不应影响主流程
      console.warn('⚠️ 无法写入错误日志:', logError.message);
    }
  }

  /**
   * 打印用户友好的错误信息
   */
  printUserMessage(error) {
    const icon = error.recoverable ? '⚠️' : '❌';
    console.error(`\n${icon} ${error.name}: ${error.message}`);
    
    if (this.verbose && error.details) {
      console.error('\n📋 详细信息:', JSON.stringify(error.details, null, 2));
    }

    // 提供修复建议
    const suggestion = this.getSuggestion(error);
    if (suggestion) {
      console.error(`\n💡 建议: ${suggestion}`);
    }
  }

  /**
   * 根据错误类型提供修复建议
   */
  getSuggestion(error) {
    const suggestions = {
      'CONFIG_ERROR': '检查 .compound/config.json 配置文件格式是否正确',
      'FILE_OPERATION_ERROR': `检查文件路径和权限: ${error.details?.filePath}`,
      'AGENT_LOAD_ERROR': `运行 'compound agents list' 查看可用代理，或使用 'compound agents add <name>' 安装`,
      'ADAPTER_ERROR': '尝试运行 npx compound-init 重新初始化适配器'
    };
    return suggestions[error.code];
  }
}

/**
 * 安全执行异步操作的包装器
 */
export async function safeExecute(fn, fallback = null, context = {}) {
  try {
    return await fn();
  } catch (error) {
    const handler = new ErrorHandler({ verbose: process.env.DEBUG === 'true' });
    const result = await handler.handle(error, context);
    
    if (result.recoverable && fallback !== null) {
      console.warn('⚠️ 使用降级方案继续执行...');
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    
    throw error;
  }
}

/**
 * 带重试的异步操作
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = options;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        console.warn(`🔄 第 ${attempt}/${maxRetries} 次尝试失败，${waitTime}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}
```

#### 0.4.4 集成到核心模块

**更新 AgentLoader 以使用错误处理**:

```javascript
import { AgentLoadError, FileOperationError } from './errors.js';
import { safeExecute } from './error-handler.js';

export class AgentLoader {
  // ... 其他代码 ...
  
  loadAgent(name) {
    for (const basePath of this.searchPaths) {
      const result = safeExecute(
        () => {
          const candidates = glob.sync(path.join(basePath, `${name}.md`));
          if (candidates.length > 0) {
            console.log(`📌 Loading agent from: ${candidates[0]}`);
            return fs.readFileSync(candidates[0], 'utf8');
          }
          return null;
        },
        null,
        { operation: 'loadAgent', agentName: name, basePath }
      );
      
      if (result) return result;
    }
    
    throw new AgentLoadError(name, this.searchPaths);
  }
}
```

**验收标准**:

*   [x] 定义完整的错误分类体系
*   [x] 实现统一的错误处理类
*   [x] 提供 safeExecute 和 withRetry 工具函数
*   [x] 错误日志自动记录到 .compound/logs/
*   [x] 用户友好的错误提示和修复建议
*   [x] 可恢复错误自动降级处理

***

## 🔧 Phase 1: 核心架构搭建 (Week 2-3)

### 任务分解

#### 1.1 初始化 NPM 包结构

```bash
# 核心包结构 (packages/core/)
cd packages/core

# package.json
{
  "name": "@compound-workflow/core",
  "version": "0.1.0",
  "description": "Core workflows and agent management for compound development",
  "main": "index.js",
  "bin": {
    "compound": "./bin/cli.js"
  },
  "scripts": {
    "postinstall": "node scripts/install.js"
  },
  "keywords": ["workflow", "agents", "claude", "cursor", "qoder"],
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "inquirer": "^9.0.0",
    "fs-extra": "^11.0.0",
    "glob": "^10.0.0",
    "yaml": "^2.0.0"
  }
}
```

**验收标准**:

*   [x] 核心包独立可运行
*   [x] 包含 postinstall 钩子
*   [x] 二进制命令 `compound` 可执行
*   [x] 支持插件式扩展

***

#### 1.2 实现工具检测机制

**文件**: `packages/core/src/tool-detector.js`

```javascript
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * 检查命令是否存在于系统 PATH 中
 * @param {string} command - 要检查的命令名称
 * @returns {boolean} - 命令是否存在
 */
function commandExists(command) {
  try {
    const checkCommand = process.platform === 'win32' 
      ? `where ${command}` 
      : `which ${command}`;
    execSync(checkCommand, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 多层检测策略，按优先级返回检测到的工具
 * 检测顺序: 项目配置 > 用户目录配置 > 环境变量 > 命令行工具
 */
export function detectTool() {
  const env = process.env;
  const cwd = process.cwd();
  const home = os.homedir();
  
  // === Claude 检测 (多层) ===
  // 1. 项目级 .claude/ 目录
  if (fs.existsSync(path.join(cwd, '.claude'))) {
    return 'claude';
  }
  // 2. 用户级 ~/.claude/ 配置
  if (fs.existsSync(path.join(home, '.claude'))) {
    return 'claude';
  }
  // 3. 环境变量 (最后检查)
  if (env.CLAUDE_CODE) {
    return 'claude';
  }
  
  // === Cursor 检测 (多层) ===
  // 1. 项目级 .cursor/ 目录 (新版本)
  if (fs.existsSync(path.join(cwd, '.cursor'))) {
    return 'cursor';
  }
  // 2. 项目级 .cursorrules 文件 (旧版本兼容)
  if (fs.existsSync(path.join(cwd, '.cursorrules'))) {
    return 'cursor';
  }
  // 3. 用户级 ~/.cursor/ 配置
  if (fs.existsSync(path.join(home, '.cursor'))) {
    return 'cursor';
  }
  // 4. 环境变量
  if (env.CURSOR_WORKSPACE) {
    return 'cursor';
  }
  
  // === Qoder 检测 ===
  // 1. 环境变量
  if (env.QODER_CLI) {
    return 'qoder';
  }
  // 2. 命令行工具存在
  if (commandExists('qoder')) {
    return 'qoder';
  }
  
  return 'unknown';
}

/**
 * 获取检测到的工具的详细信息
 */
export function getToolInfo(tool) {
  const info = {
    claude: {
      name: 'Claude Code',
      configDir: '.claude',
      pluginDir: '~/.claude/plugins',
      docsUrl: 'https://docs.anthropic.com/claude-code'
    },
    cursor: {
      name: 'Cursor IDE',
      configDir: '.cursor',
      rulesDir: '.cursor/rules',
      docsUrl: 'https://cursor.sh/docs'
    },
    qoder: {
      name: 'Qoder CLI',
      configDir: '~/.qoder',
      commandsDir: '~/.qoder/commands',
      docsUrl: 'https://qoder.dev/docs'
    }
  };
  return info[tool] || null;
}
```

**验收标准**:

*   [x] 多层检测策略：项目配置 > 用户配置 > 环境变量
*   [x] 支持 Cursor 新版 `.cursor/` 目录结构
*   [x] 准确检测 Claude/Cursor/Qoder
*   [x] 提供工具详细信息查询

***

#### 1.3 创建核心工作流定义

**目标**: 定义 4 个核心工作流的通用模板

**文件**: `packages/core/.compound/workflows/plan.md`

```yaml
---
name: compound:plan
description: 为前端功能创建详细的实施计划
argument-hint: "[功能描述或设计稿链接]"
framework: universal  # 表示工具无关
---

# 前端功能规划

## 输入
<feature_description>#$ARGUMENTS</feature_description>

## 工作流
1. **设计分析**: 解析设计稿(Figma/Sketch/原型图)
2. **组件规划**: 识别可复用组件和原子组件
3. **技术选型**: 根据项目框架选择实现方案
4. **依赖分析**: 列出需要安装的 npm 包
5. **测试策略**: 单元测试、集成测试、E2E 测试
6. **性能预估**: 首屏加载、交互响应时间目标

## 输出
- 计划文件: `plans/<feature-name>.md`
- 组件清单: 列出需要创建的组件及其层级
- 依赖清单: package.json 需要添加的依赖
```

**其他工作流**(类似结构):

*   `work.md`: 执行计划,创建组件、编写测试
*   `review.md`: 代码审查(可访问性、性能、最佳实践)
*   `compound.md`: 记录解决方案到知识库 **+ 智能建议代理**

**验收标准**:

*   [x] 4 个核心工作流 Markdown 文件完整 ✅ (plan.md, work.md, review.md, compound.md)
*   [x] 包含 YAML frontmatter ✅ (name, description, argument-hint, framework)
*   [x] 工作流步骤清晰可执行 ✅

***

\--

#### 1.4 实现 compound 工作流的智能建议

**文件**: `packages/core/.compound/workflows/compound.md`

````yaml
---
name: compound:compound
description: 记录解决方案并建议相关代理
argument-hint: "[已解决的问题描述]"
---

# 固化知识并成长

## 步骤

### 1. 记录解决方案
将解决方案保存到 `.compound/docs/<category>/<title>.md`

### 2. 技术栈检测
```javascript
const techStack = detectTechStack({
  packageJson: true,
  configFiles: ['vite.config.js', 'next.config.js', 'vue.config.js']
});
```

### 3. 代理建议引擎

根据以下规则建议代理:

**框架检测**:

*   检测到 React → 建议 `react-reviewer`
*   检测到 Vue → 建议 `vue-reviewer`
*   检测到 Angular → 建议 `angular-reviewer`

**问题类型检测**:

*   涉及可访问性 → 建议 `wcag-compliance-checker`
*   涉及性能优化 → 建议 `bundle-analyzer`
*   涉及设计实现 → 建议 `design-system-validator`

### 4. 用户交互

    ✅ 解决方案已记录: .compound/docs/performance/lazy-loading.md

    💡 发现改进机会:

      [1] 添加 React 审查代理
          检测到项目使用 React,添加专用代理可以:
          - 检查 Hooks 使用规范
          - 优化组件性能
          - 防止常见陷阱
          
          安装: compound agents add react-reviewer
          
          [y] 现在安装  [n] 跳过  [x] 不再提示

      [2] 添加 Bundle 分析代理
          涉及性能优化,建议:
          - Webpack/Vite bundle 分析
          - 依赖树优化建议
          
          安装: compound agents add bundle-analyzer
          
          [y] 现在安装  [n] 跳过  [x] 不再提示

### 5. 自动安装

如果用户选择安装:

```bash
compound agents add react-reviewer
# → 从 library/ 复制到 .compound/agents/
# → 或者提示: npm install @compound-workflow/react
```

````

**验收标准**:
- [x] 能检测项目技术栈
- [x] 根据问题类型智能建议代理
- [x] 提供清晰的安装选项
- [x] 记录用户的"不再提示"选择

---

## 🎯 Phase 2: 适配器实现 (Week 4-5)

### 2.1 Claude 适配器

**目标**: 将核心工作流转换为 Claude Plugin 格式

**脚本**: `scripts/adapters/to-claude.js`

```javascript
export function convertToClaudePlugin() {
  const sourceDir = '.compound/core';
  const targetDir = '.compound/adapters/claude';
  
  // 1. 创建 plugin.json
  const pluginManifest = {
    name: "compound-frontend",
    version: packageJson.version,
    description: "Frontend workflow automation",
    commands: [],
    agents: []
  };
  
  // 2. 转换 workflows → commands
  fs.readdirSync(`${sourceDir}/workflows`).forEach(file => {
    const content = fs.readFileSync(`${sourceDir}/workflows/${file}`, 'utf8');
    // 保持 YAML frontmatter 和内容不变
    fs.copyFileSync(
      `${sourceDir}/workflows/${file}`,
      `${targetDir}/commands/${file}`
    );
    pluginManifest.commands.push(extractNameFromFrontmatter(content));
  });
  
  // 3. 转换 agents
  copyDirectoryRecursive(`${sourceDir}/agents`, `${targetDir}/agents`);
  
  fs.writeFileSync(
    `${targetDir}/plugin.json`,
    JSON.stringify(pluginManifest, null, 2)
  );
}
````

**Claude 安装流程**:

```bash
# 在项目目录执行
npm install @compound-workflow/frontend

# 初始化(检测到 Claude 环境)
npx compound-init
# 输出: ✓ Detected Claude Code
#       ✓ Installing plugin to ~/.claude/plugins/compound-frontend
#       ✓ Run: claude /plugin refresh
```

**验收标准**:

*   [x] 生成符合 Claude 规范的 plugin.json
*   [x] 命令和代理正确放置在对应目录
*   [x] 可以通过 `/compound:plan` 调用

***

### 2.2 Qoder 适配器

**目标**: 为 Qoder CLI 创建可用的命令

**脚本**: `scripts/adapters/to-qoder.js`

```javascript
export function convertToQoderCommands() {
  const sourceDir = '.compound/core/workflows';
  const targetDir = '.compound/adapters/qoder/commands';
  
  fs.readdirSync(sourceDir).forEach(file => {
    const content = fs.readFileSync(`${sourceDir}/${file}`, 'utf8');
    const frontmatter = extractFrontmatter(content);
    
    // Qoder 命令格式(假设支持 slash command)
    const qoderCommand = `
# ${frontmatter.name}
# ${frontmatter.description}

${content.replace(/---[\s\S]*?---/, '')}  # 移除 YAML
`;
    
    fs.writeFileSync(`${targetDir}/${file}`, qoderCommand);
  });
  
  // 创建 Qoder 配置文件
  const qoderConfig = {
    commands: fs.readdirSync(targetDir).map(f => ({
      name: f.replace('.md', ''),
      path: `${targetDir}/${f}`
    }))
  };
  
  fs.writeFileSync(
    '.compound/adapters/qoder/config.json',
    JSON.stringify(qoderConfig, null, 2)
  );
}
```

**Qoder 集成说明**:

```markdown
# 在 Qoder CLI 中手动添加命令

## 方法1: 复制命令文件
cp .compound/adapters/qoder/commands/* ~/.qoder/commands/

## 方法2: 符号链接(推荐)
ln -s $(pwd)/.compound/adapters/qoder/commands ~/.qoder/commands/compound

## 使用
qoder /compound:plan "添加用户登录表单"
```

**验收标准**:

*   [x] 生成 Qoder 兼容的命令文件
*   [x] 提供清晰的安装说明
*   [x] 命令可以被 Qoder CLI 识别

***

### 2.3 Cursor 适配器

**目标**: 将核心工作流转换为 Cursor Rules (支持新版 `.cursor/rules/` 目录结构)

**脚本**: `packages/core/scripts/adapters/to-cursor.js`

```javascript
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

/**
 * 转换工作流为 Cursor Rules
 * 支持两种模式:
 * - 新版: .cursor/rules/*.mdc (推荐)
 * - 旧版: .cursorrules (fallback)
 */
export async function convertToCursorRules(options = {}) {
  const { useLegacy = false } = options;
  const workflows = await loadAllWorkflows('.compound/workflows');
  const agents = await loadAllAgents('.compound/agents');
  
  if (useLegacy) {
    // 旧版模式: 单个 .cursorrules 文件
    await generateLegacyCursorRules(workflows, agents);
  } else {
    // 新版模式: .cursor/rules/ 目录
    await generateCursorRulesDir(workflows, agents);
  }
}

/**
 * 生成新版 .cursor/rules/ 目录结构
 */
async function generateCursorRulesDir(workflows, agents) {
  const rulesDir = '.cursor/rules';
  await fs.ensureDir(rulesDir);
  
  // 1. 生成工作流 rules
  for (const workflow of workflows) {
    const ruleContent = `---
description: ${workflow.description}
globs: ["**/*"]
alwaysApply: false
---

# ${workflow.name}

${workflow.content}
`;
    await fs.writeFile(
      path.join(rulesDir, `compound-${workflow.name.replace(':', '-')}.mdc`),
      ruleContent
    );
  }
  
  // 2. 生成代理 rules
  for (const agent of agents) {
    const ruleContent = `---
description: ${agent.description}
globs: ${JSON.stringify(agent.globs || ["**/*"])}
alwaysApply: false
---

${agent.content}
`;
    await fs.writeFile(
      path.join(rulesDir, `agent-${agent.name}.mdc`),
      ruleContent
    );
  }
  
  // 3. 生成主规则文件 (始终启用)
  const mainRule = `---
description: Compound Frontend Workflow - Main Configuration
globs: ["**/*"]
alwaysApply: true
---

# Compound Frontend Workflow

You are an expert frontend developer following a systematic workflow.

## Available Commands

${workflows.map(w => `- **${w.name}**: ${w.description}`).join('\n')}

## Available Agents

${agents.map(a => `- **${a.name}**: ${a.description}`).join('\n')}

## Usage

When the user mentions a workflow name (e.g., "plan", "review"), 
activate the corresponding workflow rule.
`;
  
  await fs.writeFile(path.join(rulesDir, 'compound-main.mdc'), mainRule);
  
  console.log(`✅ Generated ${workflows.length + agents.length + 1} rules in ${rulesDir}/`);
}

/**
 * 生成旧版 .cursorrules 文件 (fallback)
 */
async function generateLegacyCursorRules(workflows, agents) {
  const cursorRules = `# Compound Frontend Workflow

You are an expert frontend developer following a systematic workflow.

## Available Workflows

${workflows.map(w => `
### ${w.name}
${w.description}

**When user says**: "${w.name}" or requests ${w.name.split(':')[1]}
**Then execute**:
${w.steps.map((s, i) => \`\${i + 1}. \${s}\`).join('\n')}
`).join('\n')}

## Available Agents

${agents.map(a => `- **${a.name}**: ${a.description}`).join('\n')}
`;
  
  await fs.writeFile('.cursorrules', cursorRules);
  console.log('✅ Generated .cursorrules (legacy mode)');
}
```

**生成的目录结构**:

```
.cursor/
└── rules/
    ├── compound-main.mdc           # 主配置 (始终启用)
    ├── compound-plan.mdc           # plan 工作流
    ├── compound-work.mdc           # work 工作流
    ├── compound-review.mdc         # review 工作流
    ├── compound-compound.mdc       # compound 工作流
    ├── agent-accessibility.mdc     # 可访问性代理
    ├── agent-performance.mdc       # 性能代理
    └── agent-security.mdc          # 安全代理
```

**Cursor 安装流程**:

```bash
npm install @compound-workflow/frontend
npx compound-init

# 输出: ✓ Detected Cursor IDE
#       ✓ Generated .cursor/rules/ with 8 rule files
#       ✓ Restart Cursor to apply changes

# 如果需要旧版兼容模式:
npx compound-init --cursor-legacy
```

**验收标准**:

*   [x] 生成 `.cursor/rules/*.mdc` 文件 (新版格式)
*   [x] 支持旧版 `.cursorrules` fallback
*   [x] 每个工作流/代理独立一个 rule 文件
*   [x] 主规则文件 `alwaysApply: true`
*   [x] Cursor 可以识别并执行工作流

***

## 🧩 Phase 3: 前端代理生态 (Week 6-7)

### 3.1 最小核心代理 (Seed)

**核心包包含 12 个通用代理** (`packages/core/.compound/agents/`)，按工作流分类：

#### Plan 阶段代理 (3个)

| 代理名称                   | 职责           | 包含位置                    |
| ---------------------- | ------------ | ----------------------- |
| `requirements-analyzer` | 需求分析与拆解      | @compound-workflow/core |
| `component-architect`   | 组件架构设计       | @compound-workflow/core |
| `dependency-advisor`    | 依赖选型与管理建议    | @compound-workflow/core |

#### Work 阶段代理 (3个)

| 代理名称               | 职责        | 包含位置                    |
| ------------------ | --------- | ----------------------- |
| `code-generator`    | 代码生成与脚手架  | @compound-workflow/core |
| `style-implementer` | 样式实现与优化   | @compound-workflow/core |
| `test-writer`       | 测试用例编写    | @compound-workflow/core |

#### Review 阶段代理 (3个)

| 代理名称                     | 职责     | 包含位置                    |
| ------------------------ | ------ | ----------------------- |
| `accessibility-reviewer` | 可访问性检查 | @compound-workflow/core |
| `performance-reviewer`   | 通用性能优化 | @compound-workflow/core |
| `security-reviewer`      | 前端安全审查 | @compound-workflow/core |

#### Compound 阶段代理 (3个)

| 代理名称                  | 职责          | 包含位置                    |
| --------------------- | ----------- | ----------------------- |
| `tech-stack-detector` | 技术栈检测与分析    | @compound-workflow/core |
| `agent-suggester`     | 智能代理推荐      | @compound-workflow/core |
| `knowledge-recorder`  | 知识记录与结构化存储  | @compound-workflow/core |

**核心代理设计原则**:

*   ✅ 覆盖完整的 Plan → Work → Review → Compound 工作流
*   ✅ 适用于所有前端项目(框架无关)
*   ✅ 每个工作流阶段 3 个核心代理，职责清晰
*   ✅ 保持核心包精简(<10MB)
*   ✅ 用户按需添加框架特定代理(React/Vue/Angular)

***

### 3.2 代理生态架构与管理

本阶段定义框架专用代理的组织、开发、发布和使用的完整流程。

#### 3.2.1 三层代理体系

**核心包代理 (Core Agents)**
- 位置：`packages/core/.compound/agents/`
- 数量：12 个（4 个工作流 × 3 个代理）
- 特点：框架无关，适用于所有前端项目
- 安装：随 `@compound-workflow/core` 自动安装

**框架包代理 (Framework Agents)**
- 位置：`packages/react/agents/`, `packages/vue/agents/` 等
- 数量：每个框架 3-5 个专用代理
- 特点：深度集成框架最佳实践和常见陷阱检查
- 安装：`npm install @compound-workflow/react`

**工具包代理 (Tool Agents)**
- 位置：`packages/design-tools/agents/` 等
- 数量：按工具类别分组
- 特点：集成外部工具（Figma、Storybook、Bundle Analyzer）
- 安装：`npm install @compound-workflow/design-tools`

#### 3.2.2 开发时的代理库结构

**在 Monorepo 源码中使用 `library/` 目录作为代理模板库**:

    library/                           # 仅存在于开发环境
    ├── react/
    │   ├── react-reviewer.md          # React 最佳实践
    │   ├── react-hooks-specialist.md  # Hooks 深度审查
    │   └── react-performance.md       # React 性能优化
    ├── vue/
    │   ├── vue-reviewer.md            # Vue 最佳实践
    │   ├── vue-composition-api.md     # Composition API 专家
    │   └── vue-reactivity.md          # 响应式系统审查
    ├── angular/
    │   └── angular-reviewer.md
    ├── svelte/
    │   └── svelte-reviewer.md
    └── css/
        ├── tailwind-reviewer.md
        └── css-modules-reviewer.md

**`library/` 目录的作用**:
- ✅ 作为所有可选代理的**单一数据源**
- ✅ 便于统一管理和版本控制
- ✅ 通过脚本同步到对应的 npm 包
- ❌ **不会**随 npm 包发布到用户项目

#### 3.2.3 代理同步与构建流程

**同步脚本**: `scripts/sync-agents.js`

```javascript
#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

/**
 * 将 library/ 中的代理模板同步到对应的 npm 包
 */
async function syncAgents() {
  console.log('📦 同步代理文件到 npm 包...\n');
  
  const frameworks = [
    { name: 'react', package: 'packages/react/agents' },
    { name: 'vue', package: 'packages/vue/agents' },
    { name: 'angular', package: 'packages/angular/agents' },
    { name: 'svelte', package: 'packages/svelte/agents' }
  ];
  
  for (const framework of frameworks) {
    const source = `library/${framework.name}`;
    const target = framework.package;
    
    if (!await fs.pathExists(source)) {
      console.log(`⏭️  跳过 ${framework.name} (源目录不存在)`);
      continue;
    }
    
    // 清空目标目录
    await fs.emptyDir(target);
    
    // 复制所有代理文件
    await fs.copy(source, target, {
      filter: (src) => src.endsWith('.md')
    });
    
    const files = await fs.readdir(target);
    console.log(`✅ ${framework.name}: 同步了 ${files.length} 个代理`);
  }
  
  console.log('\n🎉 代理同步完成!');
}

syncAgents().catch(console.error);
```

**集成到 package.json**:

```json
{
  "scripts": {
    "sync:agents": "node scripts/sync-agents.js",
    "validate:agents": "node scripts/validate-agents.js",
    "prebuild": "pnpm run sync:agents && pnpm run validate:agents"
  }
}
```

**验证脚本**: `scripts/validate-agents.js`

```javascript
#!/usr/bin/env node

import fs from 'fs-extra';
import yaml from 'yaml';
import { glob } from 'glob';

/**
 * 验证所有代理文件的格式和必需字段
 */
async function validateAgents() {
  console.log('🔍 验证代理文件格式...\n');
  
  const agentFiles = glob.sync('packages/*/agents/**/*.md');
  let errorCount = 0;
  
  for (const file of agentFiles) {
    const content = await fs.readFile(file, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    
    if (!frontmatterMatch) {
      console.error(`❌ ${file}: 缺少 YAML frontmatter`);
      errorCount++;
      continue;
    }
    
    try {
      const frontmatter = yaml.parse(frontmatterMatch[1]);
      const required = ['name', 'description', 'category', 'frameworks'];
      
      for (const field of required) {
        if (!frontmatter[field]) {
          console.error(`❌ ${file}: 缺少必需字段 '${field}'`);
          errorCount++;
        }
      }
      
      if (errorCount === 0) {
        console.log(`✅ ${file}`);
      }
    } catch (error) {
      console.error(`❌ ${file}: YAML 解析错误 - ${error.message}`);
      errorCount++;
    }
  }
  
  if (errorCount > 0) {
    console.error(`\n❌ 发现 ${errorCount} 个错误`);
    process.exit(1);
  } else {
    console.log('\n✅ 所有代理文件验证通过');
  }
}

validateAgents().catch(console.error);
```

#### 3.2.4 用户安装代理的三种方式

**方式1: 轻量级使用（适合学习和尝试）**

```bash
# 只安装核心包
npm install @compound-workflow/core

# 按需添加单个代理（从 npm 包中复制）
compound agents add react-reviewer
# → 检测到已安装 @compound-workflow/react
# → 从 node_modules/@compound-workflow/react/agents/ 复制到 .compound/agents/

# 如果未安装对应包，提示安装
compound agents add vue-reviewer
# ⚠️  未找到 vue-reviewer
# 💡 提示: 运行 'npm install @compound-workflow/vue' 后重试
```

**优点**:
- 核心包体积小
- 只安装需要的代理
- 可以自由选择

**缺点**:
- 需要先安装对应的框架包
- 代理版本依赖 npm 包版本

---

**方式2: 框架包安装（推荐生产环境）**

```bash
# 安装框架专用包（包含所有 React 代理）
npm install @compound-workflow/react

# 代理自动可用（无需手动复制）
compound agents list
# 输出:
# 📦 Installed Agents:
# 📦 react-reviewer (package: @compound-workflow/react)
# 📦 react-hooks-specialist (package: @compound-workflow/react)
# 📦 react-performance (package: @compound-workflow/react)
```

**优点**:
- 版本锁定，稳定可靠
- 离线可用
- 所有代理一次性可用
- 无需手动管理文件

**缺点**:
- 包体积稍大（约 2-3MB per 框架）
- 无法选择性安装单个代理

---

**方式3: 自定义代理（适合团队定制）**

```bash
# 复制 npm 包中的代理到项目，进行自定义修改
cp node_modules/@compound-workflow/react/agents/react-reviewer.md \
   .compound/agents/react-reviewer.md

# 编辑自定义规则
vim .compound/agents/react-reviewer.md

# 项目级代理优先级最高，会覆盖 npm 包中的同名代理
compound agents list
# 输出:
# 📌 react-reviewer (project) ← 自定义版本
# 📦 react-hooks-specialist (package)
# 📦 react-performance (package)
```

**优点**:
- 完全自定义
- 项目级优先级最高
- 可以添加团队特定规则

**使用场景**:
- 团队有特殊代码规范
- 需要深度定制检查规则
- 集成内部工具链

#### 3.2.5 代理包发布流程

**发布前检查清单**:

```bash
# 1. 同步代理文件
pnpm run sync:agents

# 2. 验证代理格式
pnpm run validate:agents

# 3. 运行测试
pnpm test

# 4. 构建包
pnpm run build

# 5. 发布
cd packages/react && npm publish --access public
```

**CI/CD 集成**:

```yaml
# .github/workflows/publish.yml
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      
      - name: Sync Agents
        run: pnpm run sync:agents
      
      - name: Validate Agents
        run: pnpm run validate:agents
      
      - name: Build
        run: pnpm run build
      
      - name: Publish to npm
        run: pnpm publish -r --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**验收标准**:

*   [x] `library/` 目录结构清晰，覆盖主流框架（React、Vue、Angular、Svelte）
*   [x] 每个框架至少包含 3 个专用代理
*   [x] 实现 `library/` 到 `packages/*/agents/` 的自动化同步脚本
*   [x] 实现代理文件格式验证脚本
*   [x] 所有代理文件包含完整的 YAML frontmatter（name, description, category, frameworks）
*   [x] 用户可通过三种方式安装和使用代理
*   [x] npm 包安装后，代理自动可用（通过代理优先级查找）
*   [x] 框架代理包大小控制在 3MB 以内
*   [x] 发布前自动执行同步和验证流程
*   [x] CI/CD 集成自动化发布

***

### 3.3 框架扩展包

**React 包** (`packages/react/agents/`):

**示例**: `packages/react/agents/react-reviewer.md`

```yaml
---
name: react-reviewer
description: Review React code for best practices and common pitfalls
category: review
frameworks: [react, next.js, remix]
---

# React Code Reviewer

## Your Role
You are a React expert reviewer focusing on modern best practices.

## Review Checklist

### Hooks Usage
- [ ] 自定义 Hook 遵循 `use*` 命名规范
- [ ] useEffect 依赖数组正确完整
- [ ] 避免不必要的 useCallback/useMemo(过早优化)

### Component Design
- [ ] 单一职责:一个组件只做一件事
- [ ] Props 解构清晰,使用 TypeScript 类型
- [ ] 避免 prop drilling(考虑 Context 或状态管理)

### Performance
- [ ] 列表渲染使用稳定的 key(避免 index)
- [ ] 大列表使用虚拟滚动(react-window)
- [ ] 图片使用 Next.js Image 组件优化

### Common Pitfalls
- [ ] 避免在循环/条件中调用 Hooks
- [ ] 异步操作检查组件是否已卸载
- [ ] 事件处理器正确清理
```

**Vue 包** (`packages/vue/agents/vue-reviewer.md`):

类似结构,检查 Vue 3 Composition API、响应式系统等。

**验收标准**:

*   [x] 每个框架包至少包含 3 个专用代理
*   [x] 所有框架代理包含完整的 YAML frontmatter
*   [x] 每个代理有清晰的检查清单（至少 5 条）
*   [x] 代理内容包含 Common Pitfalls 部分
*   [x] 代理文件大小控制在 5KB 以内
*   [x] 框架包可以独立发布和版本管理
*   [x] 框架包 peerDependencies 正确依赖 core 包

***

### 3.4 设计工具包

**设计工具包** (`packages/design-tools/agents/`):

*   `figma-design-sync`: Figma 设计同步
*   `design-system-validator`: 设计系统一致性检查
*   `responsive-design-checker`: 响应式设计审查

***

## 🚀 Phase 4: 安装与代理管理 (Week 8)

### 4.0 文件路径约定

**明确源目录和目标目录的关系**:

```
源 (npm 包内):                          目标 (用户项目):
────────────────────────────────────────     ────────────────────────────────

packages/core/
├── .compound/
│   ├── workflows/           ──────────→  .compound/workflows/
│   │   ├── plan.md
│   │   ├── work.md
│   │   ├── review.md
│   │   └── compound.md
│   └── agents/              ──────────→  .compound/agents/ (npm 包级)
│       ├── plan/
│       │   ├── requirements-analyzer.md
│       │   ├── component-architect.md
│       │   └── dependency-advisor.md
│       ├── work/
│       │   ├── code-generator.md
│       │   ├── style-implementer.md
│       │   └── test-writer.md
│       ├── review/
│       │   ├── accessibility-reviewer.md
│       │   ├── performance-reviewer.md
│       │   └── security-reviewer.md
│       └── compound/
│           ├── tech-stack-detector.md
│           ├── agent-suggester.md
│           └── knowledge-recorder.md
├── scripts/
│   ├── install.js           # postinstall 钩子
│   ├── init.js              # npx compound-init
│   └── adapters/
│       ├── to-claude.js
│       ├── to-cursor.js
│       └── to-qoder.js
├── src/
│   ├── agent-loader.js
│   ├── agent-manager.js
│   ├── tool-detector.js
│   ├── errors.js
│   └── error-handler.js
└── bin/
    └── cli.js               # compound 命令

用户项目中的结构:
───────────────────────
项目根目录/
├── .compound/
│   ├── workflows/           # 从 npm 包复制的工作流
│   ├── agents/              # 项目级代理 (最高优先级)
│   ├── docs/                # compound 记录的知识
│   └── config.json          # 配置文件
├── .cursor/                 # Cursor 适配器生成
│   └── rules/
└── node_modules/
    └── @compound-workflow/
        └── */agents/        # npm 包代理 (最低优先级)
```

**代理优先级查找顺序**:

| 优先级 | 路径 | 说明 |
|------|------|------|
| 1 (最高) | `.compound/agents/` | 项目特定代理 |
| 2 | `~/.compound/agents/` | 用户全局代理 |
| 3 (最低) | `node_modules/@compound-workflow/*/agents/` | npm 包代理 |

***

### 4.1 实现 postinstall 钩子

**文件**: `packages/core/scripts/install.js`

```javascript
#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function install() {
  console.log('📦 Installing Compound Frontend Workflow...\n');
  
  // 获取项目根目录 (安装时的 cwd)
  const projectRoot = process.env.INIT_CWD || process.cwd();
  const compoundDir = path.join(projectRoot, '.compound');
  
  // 获取 npm 包根目录
  const packageRoot = path.resolve(__dirname, '..');
  const sourceCompound = path.join(packageRoot, '.compound');
  
  // 1. 创建 .compound 目录结构
  await fs.ensureDir(path.join(compoundDir, 'workflows'));
  await fs.ensureDir(path.join(compoundDir, 'agents'));
  await fs.ensureDir(path.join(compoundDir, 'docs'));
  console.log('✓ Created .compound/ directory structure');
  
  // 2. 复制工作流文件 (始终复制)
  if (await fs.pathExists(path.join(sourceCompound, 'workflows'))) {
    await fs.copy(
      path.join(sourceCompound, 'workflows'),
      path.join(compoundDir, 'workflows'),
      { overwrite: true }
    );
    console.log('✓ Copied core workflows');
  }
  
  // 3. 复制核心代理 (不覆盖已存在的项目代理)
  if (await fs.pathExists(path.join(sourceCompound, 'agents'))) {
    const sourceAgents = await fs.readdir(path.join(sourceCompound, 'agents'));
    for (const agent of sourceAgents) {
      const targetPath = path.join(compoundDir, 'agents', agent);
      // 只有当目标不存在时才复制 (保护项目级代理)
      if (!await fs.pathExists(targetPath)) {
        await fs.copy(
          path.join(sourceCompound, 'agents', agent),
          targetPath
        );
      }
    }
    console.log('✓ Copied core agents (preserved existing project agents)');
  }
  
  // 4. 创建默认配置文件
  const configPath = path.join(compoundDir, 'config.json');
  if (!await fs.pathExists(configPath)) {
    await fs.writeJson(configPath, {
      version: '0.1.0',
      disabledAgents: [],
      preferences: {
        autoSuggestAgents: true,
        verboseLogging: false
      }
    }, { spaces: 2 });
    console.log('✓ Created default config.json');
  }
  
  // 5. 添加到 .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const ignoreEntries = ['\n# Compound Workflow', '.compound/logs/', '.compound/docs/'];
  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, 'utf8');
    if (!content.includes('.compound/logs/')) {
      await fs.appendFile(gitignorePath, ignoreEntries.join('\n') + '\n');
      console.log('✓ Updated .gitignore');
    }
  }
  
  console.log('\n✅ Installation complete!');
  console.log('👉 Run: npx compound init');
}

install().catch(err => {
  console.error('❌ Installation failed:', err.message);
  process.exit(1);
});
```

***

### 4.2 实现 init 命令

**文件**: `scripts/init.js`

```javascript
#!/usr/bin/env node

import { detectTool } from './tool-detector.js';
import { convertToClaudePlugin } from './adapters/to-claude.js';
import { convertToQoderCommands } from './adapters/to-qoder.js';
import { convertToCursorRules } from './adapters/to-cursor.js';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

async function init() {
  let tool = detectTool();  // 使用 let 以支持后续重新赋值
  
  if (tool === 'unknown') {
    // 手动选择
    const { selectedTool } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedTool',
      message: 'Select your AI coding tool:',
      choices: ['Claude', 'Cursor', 'Qoder', 'Manual Setup']
    }]);
    tool = selectedTool.toLowerCase();
  }
  
  console.log(`\n🔧 Detected: ${tool.toUpperCase()}\n`);
  
  switch (tool) {
    case 'claude':
      await setupClaude();
      break;
    case 'cursor':
      await setupCursor();
      break;
    case 'qoder':
      await setupQoder();
      break;
    default:
      showManualInstructions();
  }
}

async function setupClaude() {
  convertToClaudePlugin();
  
  // 复制到 Claude 插件目录
  const homeDir = os.homedir();
  const claudePluginDir = path.join(homeDir, '.claude/plugins/compound-frontend');
  
  copyDirectory('.compound/adapters/claude', claudePluginDir);
  
  console.log('✅ Claude plugin installed!');
  console.log('👉 Refresh Claude: claude /plugin refresh');
  console.log('👉 Try: /compound:plan "用户登录表单"');
}

async function setupCursor() {
  convertToCursorRules();
  console.log('✅ .cursorrules generated!');
  console.log('👉 Restart Cursor to apply changes');
}

async function setupQoder() {
  convertToQoderCommands();
  console.log('✅ Qoder commands ready!');
  console.log('👉 Copy commands to Qoder:');
  console.log('   cp .compound/adapters/qoder/commands/* ~/.qoder/commands/');
}

init().catch(console.error);
```

**验收标准**:

*   [x] 自动检测工具类型
*   [x] 未检测到时提供选择界面
*   [x] 根据不同工具执行对应安装流程
*   [x] 提供清晰的后续操作提示

***

### 4.3 实现代理管理 CLI

**新增命令**: `compound agents`

**文件**: `packages/core/bin/cli.js`

```javascript
#!/usr/bin/env node

import { program } from 'commander';
import { AgentManager } from '../src/agent-manager.js';

const agentManager = new AgentManager();

program
  .name('compound')
  .description('Compound workflow CLI')
  .version('0.1.0');

// 创建 agents 子命令
const agentsCmd = program
  .command('agents')
  .description('Manage agents');

// agents list
agentsCmd
  .command('list')
  .description('List all installed and available agents')
  .action(async () => {
    await agentManager.list();
  });

// agents add <name>
agentsCmd
  .command('add <name>')
  .description('Add an agent from library')
  .option('-g, --global', 'Install globally to ~/.compound/agents/')
  .action(async (name, options) => {
    await agentManager.add(name, options);
  });

// agents remove <name>
agentsCmd
  .command('remove <name>')
  .description('Remove a project or user agent')
  .action(async (name) => {
    await agentManager.remove(name);
  });

// agents update <name>
agentsCmd
  .command('update <name>')
  .description('Update an agent to latest version')
  .action(async (name) => {
    await agentManager.update(name);
  });

// init 命令
program
  .command('init')
  .description('Initialize compound workflow for your AI tool')
  .option('--cursor-legacy', 'Use legacy .cursorrules format')
  .action(async (options) => {
    const { init } = await import('../scripts/init.js');
    await init(options);
  });

program.parse();
```

**代理管理器**: `packages/core/src/agent-manager.js`

```javascript
import { AgentLoader } from './agent-loader.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { glob } from 'glob';

/**
 * 代理管理器 - 负责安装、移除、列出代理
 * 根据 Phase 3.2 架构，从 node_modules 中查找可用代理
 */
export class AgentManager {
  constructor() {
    this.loader = new AgentLoader();
    // 查找所有 @compound-workflow/* 包中的 agents 目录
    this.packageAgentsPath = 'node_modules/@compound-workflow/*/agents';
  }
  
  /**
   * 列出所有已安装的代理和可安装的代理
   */
  async list() {
    // 1. 获取已激活的代理（通过 AgentLoader 的优先级查找）
    const activeAgents = this.loader.listAgents();
    
    console.log('\n📦 Active Agents:\n');
    
    // 按来源分组显示
    const bySource = {
      project: [],
      user: [],
      package: []
    };
    
    activeAgents.forEach(agent => {
      bySource[agent.source].push(agent);
    });
    
    // 显示项目级代理
    if (bySource.project.length > 0) {
      console.log('📌 Project Level (.compound/agents/):\n');
      bySource.project.forEach(agent => {
        console.log(`   ${agent.name}`);
      });
      console.log();
    }
    
    // 显示用户级代理
    if (bySource.user.length > 0) {
      console.log('👤 User Level (~/.compound/agents/):\n');
      bySource.user.forEach(agent => {
        console.log(`   ${agent.name}`);
      });
      console.log();
    }
    
    // 显示包级代理
    if (bySource.package.length > 0) {
      console.log('📦 Package Level (node_modules/):\n');
      bySource.package.forEach(agent => {
        const pkgName = this.extractPackageName(agent.path);
        console.log(`   ${agent.name} (${pkgName})`);
      });
      console.log();
    }
    
    // 2. 显示可用但未激活的代理
    await this.showAvailableAgents(activeAgents);
  }
  
  /**
   * 显示可安装的代理
   */
  async showAvailableAgents(activeAgents) {
    const activeNames = new Set(activeAgents.map(a => a.name));
    const availableAgents = await this.scanPackageAgents();
    
    const notActive = availableAgents.filter(agent => !activeNames.has(agent.name));
    
    if (notActive.length > 0) {
      console.log('💡 Available to Install (from installed packages):\n');
      notActive.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.package})`);
      });
      console.log('\n📝 Install with: compound agents add <name>');
      console.log('   Add --global to install to ~/.compound/agents/\n');
    }
    
    // 3. 检测常见框架包是否安装
    await this.suggestPackages();
  }
  
  /**
   * 扫描 node_modules 中的所有代理
   */
  async scanPackageAgents() {
    const agents = [];
    const agentFiles = glob.sync(this.packageAgentsPath + '/**/*.md');
    
    for (const file of agentFiles) {
      const name = path.basename(file, '.md');
      const pkgName = this.extractPackageName(file);
      agents.push({ name, path: file, package: pkgName });
    }
    
    return agents;
  }
  
  /**
   * 从文件路径提取包名
   */
  extractPackageName(filePath) {
    const match = filePath.match(/node_modules\/@compound-workflow\/(\w+)/);
    return match ? `@compound-workflow/${match[1]}` : 'unknown';
  }
  
  /**
   * 建议安装常见框架包
   */
  async suggestPackages() {
    const commonPackages = [
      { name: '@compound-workflow/react', check: 'react' },
      { name: '@compound-workflow/vue', check: 'vue' },
      { name: '@compound-workflow/angular', check: '@angular/core' }
    ];
    
    const suggestions = [];
    
    for (const pkg of commonPackages) {
      // 检查项目是否使用该框架
      const hasFramework = await this.hasPackageInProject(pkg.check);
      // 检查是否已安装对应的 compound 包
      const hasCompoundPkg = await this.hasPackageInProject(pkg.name);
      
      if (hasFramework && !hasCompoundPkg) {
        suggestions.push(pkg.name);
      }
    }
    
    if (suggestions.length > 0) {
      console.log('\n💡 Suggested Packages (based on your project):\n');
      suggestions.forEach(pkg => {
        console.log(`   npm install ${pkg}`);
      });
      console.log();
    }
  }
  
  /**
   * 检查项目中是否安装了某个包
   */
  async hasPackageInProject(packageName) {
    const pkgJsonPath = path.join(process.cwd(), 'package.json');
    
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
   * 添加代理到项目或用户目录
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
      console.log('   2. Install a framework package first:');
      console.log('      npm install @compound-workflow/react');
      console.log('      npm install @compound-workflow/vue\n');
      return;
    }
    
    // 2. 确定安装位置
    const targetDir = global 
      ? path.join(os.homedir(), '.compound/agents')
      : '.compound/agents';
    
    // 3. 处理嵌套目录结构（如 plan/requirements-analyzer.md）
    const relativePath = path.relative(
      path.join(path.dirname(agent.path), '..'),
      agent.path
    );
    const targetPath = path.join(targetDir, relativePath);
    
    // 4. 复制文件
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(agent.path, targetPath);
    
    const location = global ? '~/.compound/agents/' : '.compound/agents/';
    console.log(`✅ Installed ${name} to ${location}`);
    console.log(`📦 Source: ${agent.package}\n`);
  }
  
  /**
   * 移除代理
   */
  async remove(name) {
    const agents = this.loader.listAgents();
    const agent = agents.find(a => a.name === name);
    
    if (!agent) {
      console.error(`❌ Agent '${name}' not found`);
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
    
    await fs.remove(agent.path);
    const location = agent.source === 'user' ? 'user' : 'project';
    console.log(`🗑️  Removed ${name} from ${location} level\n`);
  }
  
  /**
   * 更新代理（从 package 重新复制）
   */
  async update(name) {
    const agents = this.loader.listAgents();
    const agent = agents.find(a => a.name === name);
    
    if (!agent) {
      console.error(`❌ Agent '${name}' not found`);
      return;
    }
    
    if (agent.source === 'package') {
      console.log('⚠️  Package agents are always up-to-date.');
      console.log('💡 Update the npm package to get the latest version:\n');
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
```

**使用示例**:

```bash
# 列出所有代理
compound agents list
# 输出:
# 📦 Active Agents:
#
# 📌 Project Level (.compound/agents/):
#    custom-react-reviewer
#
# 👤 User Level (~/.compound/agents/):
#    my-custom-agent
#
# 📦 Package Level (node_modules/):
#    react-reviewer (@compound-workflow/react)
#    react-hooks-specialist (@compound-workflow/react)
#    vue-reviewer (@compound-workflow/vue)
#
# 💡 Available to Install (from installed packages):
#    - react-performance (@compound-workflow/react)
#    - vue-composition-api (@compound-workflow/vue)
#
# 📝 Install with: compound agents add <name>
#    Add --global to install to ~/.compound/agents/
#
# 💡 Suggested Packages (based on your project):
#    npm install @compound-workflow/react

# 添加代理到项目（从已安装的 npm 包复制）
compound agents add react-reviewer
# 输出:
# ✅ Installed react-reviewer to .compound/agents/
# 📦 Source: @compound-workflow/react

# 添加代理到用户全局
compound agents add react-reviewer --global
# ✅ Installed react-reviewer to ~/.compound/agents/
# 📦 Source: @compound-workflow/react

# 如果代理不存在
compound agents add vue-reviewer
# ❌ Agent 'vue-reviewer' not found in installed packages.
#
# 💡 Suggestions:
#    1. Check available agents: compound agents list
#    2. Install a framework package first:
#       npm install @compound-workflow/react
#       npm install @compound-workflow/vue

# 移除代理
compound agents remove react-reviewer
# 🗑️  Removed react-reviewer from project level

# 尝试移除 package 代理
compound agents remove accessibility-reviewer
# ⚠️  Cannot remove package agents.
# 💡 Package agents are read-only from node_modules/
#    To disable, uninstall the npm package:
#    npm uninstall @compound-workflow/core

# 更新代理
compound agents update react-reviewer
# 🔄 Updating react-reviewer from package...
# ✅ Installed react-reviewer to .compound/agents/
# 📦 Source: @compound-workflow/react
```

**验收标准**:

*   [x] `compound agents list` 按来源分组显示所有代理
*   [x] 显示 package 代理时包含所属的 npm 包名
*   [x] `compound agents add` 从 node_modules 复制代理到项目
*   [x] 代理不存在时提供有帮助的错误信息
*   [x] 支持 `--global` 安装到用户目录
*   [x] `compound agents remove` 移除项目/用户代理，但不能移除 package 代理
*   [x] `compound agents update` 从 package 重新复制最新版本
*   [x] 根据项目 package.json 智能推荐框架包
*   [x] 支持嵌套目录结构（如 plan/requirements-analyzer.md）
*   [x] 清晰提示可安装的代理及其来源

***

## 📦 Phase 5: NPM 发布与测试 (Week 9)

### 5.1 完善 package.json

**核心包** (`packages/core/package.json`):

```json
{
  "name": "@compound-workflow/core",
  "version": "1.0.0",
  "description": "Core workflows and agent management",
  "type": "module",
  "main": "index.js",
  "bin": {
    "compound": "./bin/cli.js"
  },
  "scripts": {
    "postinstall": "node scripts/install.js",
    "test": "vitest"
  },
  "keywords": ["workflow", "agents", "ai-coding"],
  "dependencies": {
    "inquirer": "^9.0.0",
    "fs-extra": "^11.0.0",
    "glob": "^10.0.0",
    "commander": "^11.0.0"
  },
  "files": [".compound/**/*", "scripts/**/*", "bin/**/*"],
  "engines": { "node": ">=18.0.0" },
  "license": "MIT"
}
```

**元包** (`packages/meta/package.json`):

```json
{
  "name": "@compound-workflow/frontend",
  "version": "1.0.0",
  "description": "Complete frontend workflow toolkit (includes all packages)",
  "type": "module",
  "dependencies": {
    "@compound-workflow/core": "^1.0.0",
    "@compound-workflow/frontend-base": "^1.0.0",
    "@compound-workflow/react": "^1.0.0",
    "@compound-workflow/vue": "^1.0.0",
    "@compound-workflow/design-tools": "^1.0.0"
  },
  "keywords": [
    "frontend",
    "workflow",
    "react",
    "vue",
    "ai-coding"
  ],
  "license": "MIT"
}
```

**发布策略**:

```bash
# 1. 独立发布各子包
cd packages/core && npm publish --access public
cd packages/frontend-base && npm publish --access public
cd packages/react && npm publish --access public
cd packages/vue && npm publish --access public
cd packages/design-tools && npm publish --access public

# 2. 最后发布元包
cd packages/meta && npm publish --access public
```

***

### 5.2 编写测试用例

**文件**: `tests/adapters.test.js`

```javascript
import { describe, test, expect } from 'vitest';
import { convertToClaudePlugin } from '../scripts/adapters/to-claude.js';

describe('Claude Adapter', () => {
  test('should generate valid plugin.json', () => {
    convertToClaudePlugin();
    const manifest = JSON.parse(
      fs.readFileSync('.compound/adapters/claude/plugin.json', 'utf8')
    );
    
    expect(manifest.name).toBe('compound-frontend');
    expect(manifest.commands).toHaveLength(4); // plan, work, review, compound
  });
});
```

**验收标准**:

*   [x] 核心功能有单元测试覆盖
*   [x] 适配器转换逻辑测试通过
*   [x] 集成测试验证完整安装流程

***

### 5.3 安全审计流程 (发布前必做)

在发布到 NPM 之前，必须完成以下安全审计步骤，确保包的安全性和依赖可靠性。

#### 5.3.1 依赖安全扫描

```bash
# 1. 使用 npm audit 扫描已知漏洞
npm audit

# 2. 自动修复可安全升级的漏洞
npm audit fix

# 3. 查看详细的漏洞报告
npm audit --json > security-report.json

# 4. 使用 snyk 进行深度扫描（推荐）
npx snyk test
npx snyk monitor  # 持续监控
```

#### 5.3.2 代码安全检查

**文件**: `scripts/security-audit.js`

```javascript
#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

/**
 * 安全审计检查器
 */
class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.patterns = [
      // 危险的代码模式
      { regex: /eval\s*\(/g, severity: 'critical', message: '禁止使用 eval()' },
      { regex: /new Function\s*\(/g, severity: 'critical', message: '禁止使用 new Function()' },
      { regex: /child_process\.exec\s*\(/g, severity: 'high', message: '使用 execFile 替代 exec' },
      { regex: /\$\{.*\}/g, severity: 'medium', message: '检查模板字符串是否存在注入风险', context: 'shell' },
      
      // 敏感信息泄露
      { regex: /api[_-]?key\s*[:=]/gi, severity: 'critical', message: '检测到可能的 API 密钥' },
      { regex: /password\s*[:=]\s*['"][^'"]+['"]/gi, severity: 'critical', message: '检测到硬编码密码' },
      { regex: /secret\s*[:=]/gi, severity: 'high', message: '检测到可能的密钥信息' },
      
      // 路径遍历风险
      { regex: /\.\.\/|\.\.\\./g, severity: 'medium', message: '检查路径遍历风险' },
      
      // 不安全的依赖使用
      { regex: /require\s*\([^)]*\+/g, severity: 'high', message: '动态 require 可能存在安全风险' }
    ];
  }

  /**
   * 扫描指定目录
   */
  async scan(directory) {
    console.log('🔍 开始安全扫描...\n');
    
    const files = glob.sync(path.join(directory, '**/*.js'), {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.js']
    });

    for (const file of files) {
      await this.scanFile(file);
    }

    return this.generateReport();
  }

  /**
   * 扫描单个文件
   */
  async scanFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    for (const pattern of this.patterns) {
      let match;
      while ((match = pattern.regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        this.issues.push({
          file: filePath,
          line: lineNumber,
          severity: pattern.severity,
          message: pattern.message,
          code: lines[lineNumber - 1]?.trim()
        });
      }
      // 重置 regex lastIndex
      pattern.regex.lastIndex = 0;
    }
  }

  /**
   * 生成审计报告
   */
  generateReport() {
    const criticalCount = this.issues.filter(i => i.severity === 'critical').length;
    const highCount = this.issues.filter(i => i.severity === 'high').length;
    const mediumCount = this.issues.filter(i => i.severity === 'medium').length;

    console.log('📊 安全审计报告\n');
    console.log('='.repeat(50));
    console.log(`🚨 严重: ${criticalCount}`);
    console.log(`⚠️  高危: ${highCount}`);
    console.log(`📝 中等: ${mediumCount}`);
    console.log('='.repeat(50));

    if (this.issues.length > 0) {
      console.log('\n📋 详细问题列表:\n');
      
      for (const issue of this.issues) {
        const icon = {
          critical: '🚨',
          high: '⚠️',
          medium: '📝'
        }[issue.severity];
        
        console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
        console.log(`   ${issue.message}`);
        console.log(`   代码: ${issue.code}`);
        console.log();
      }
    }

    // 写入报告文件
    const report = {
      timestamp: new Date().toISOString(),
      summary: { critical: criticalCount, high: highCount, medium: mediumCount },
      issues: this.issues
    };
    
    fs.writeFileSync(
      'security-audit-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n📄 报告已保存: security-audit-report.json');

    // 如果有严重问题，返回失败
    return criticalCount === 0;
  }
}

// 执行审计
const auditor = new SecurityAuditor();
const passed = await auditor.scan('packages');

if (!passed) {
  console.error('\n❌ 安全审计失败: 存在严重安全问题，请修复后再发布');
  process.exit(1);
} else {
  console.log('\n✅ 安全审计通过');
}
```

#### 5.3.3 发布前检查清单

```bash
# 创建发布前检查脚本
cat > scripts/pre-publish-check.sh << 'EOF'
#!/bin/bash
set -e

echo "🔒 发布前安全检查...\n"

# 1. 依赖审计
echo "📦 Step 1: 依赖安全扫描"
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "❌ 发现高危漏洞，请先修复"
  exit 1
fi
echo "✅ 依赖审计通过\n"

# 2. 代码安全扫描
echo "🔍 Step 2: 代码安全扫描"
node scripts/security-audit.js
if [ $? -ne 0 ]; then
  echo "❌ 代码安全检查失败"
  exit 1
fi
echo "✅ 代码安全检查通过\n"

# 3. 检查敏感文件
echo "📂 Step 3: 敏感文件检查"
SENSITIVE_FILES=(".env" ".env.local" "*.pem" "*.key" "secrets.json")
for pattern in "${SENSITIVE_FILES[@]}"; do
  if compgen -G "$pattern" > /dev/null; then
    echo "❌ 发现敏感文件: $pattern"
    echo "请确保这些文件在 .npmignore 中"
    exit 1
  fi
done
echo "✅ 未发现敏感文件\n"

# 4. 检查 .npmignore
echo "📝 Step 4: 检查 .npmignore"
if [ ! -f ".npmignore" ]; then
  echo "⚠️ 未找到 .npmignore，创建默认配置..."
  cat > .npmignore << 'IGNORE'
# 敏感文件
.env*
*.pem
*.key
secrets.json
security-audit-report.json

# 开发文件
tests/
*.test.js
.github/
.vscode/

# 日志
*.log
.compound/logs/
IGNORE
fi
echo "✅ .npmignore 配置正确\n"

# 5. 运行测试
echo "🧪 Step 5: 运行测试"
pnpm test
if [ $? -ne 0 ]; then
  echo "❌ 测试未通过"
  exit 1
fi
echo "✅ 所有测试通过\n"

echo "===========================================\n"
echo "🎉 所有安全检查通过，可以安全发布！"
echo "\n运行: npm publish --access public"
EOF

chmod +x scripts/pre-publish-check.sh
```

#### 5.3.4 集成到 package.json

```json
{
  "scripts": {
    "security:audit": "node scripts/security-audit.js",
    "security:deps": "npm audit && npx snyk test",
    "prepublishOnly": "./scripts/pre-publish-check.sh",
    "publish:safe": "npm run security:audit && npm run test && npm publish --access public"
  }
}
```

**验收标准**:

*   [x] npm audit 无高危漏洞
*   [x] 代码安全扫描通过
*   [x] 无敏感文件泄露风险
*   [x] .npmignore 正确配置
*   [x] prepublishOnly 钩子集成安全检查
*   [x] 安全审计报告自动生成

***

### 5.4 发布到 NPM

```bash
# 1. 运行完整的安全检查
./scripts/pre-publish-check.sh

# 2. 测试本地安装
npm pack
npm install -g compound-workflow-frontend-1.0.0.tgz

# 3. 在测试项目中验证
cd ~/test-project
npm install @compound-workflow/frontend
npx compound-init

# 4. 确认无误后发布
npm publish --access public
```

***

## 📚 Phase 6: 文档与示例 (Week 10)

### 6.1 编写 README

主要内容包括:

*   快速开始指南
*   各工具的安装说明
*   工作流详细说明
*   配置选项
*   故障排除

***

### 6.2 创建示例项目

    examples/
    ├── react-app/          # React + Vite 示例
    ├── vue-app/            # Vue 3 示例
    └── next-app/           # Next.js 示例

每个示例展示完整的 plan → work → review → compound 流程。

***

## 🎯 总体验收标准

### 功能性

*   [x] npm 安装后可正常运行
*   [x] 自动检测并适配 Claude/Cursor/Qoder
*   [x] 4 个核心工作流完整可用
*   [x] 至少 5 个前端专用代理
*   [x] 跨工具保持一致的用户体验

### 质量标准

*   [x] 单元测试覆盖率 > 80%
*   [x] 文档完整清晰
*   [x] 错误处理和降级方案
*   [x] 遵循语义化版本控制

### 用户体验

*   [x] 安装过程 < 2 分钟
*   [x] 提供清晰的错误提示
*   [x] 有实际可运行的示例
*   [x] 支持自定义配置

***

## 🚧 风险与缓解

| 风险           | 缓解措施                            |
| ------------ | ------------------------------- |
| 不同工具 API 差异大 | 抽象核心逻辑,适配器只负责格式转换               |
| 工具更新导致适配器失效  | 版本锁定 + 适配器独立更新                  |
| 跨平台兼容性问题     | 使用 cross-platform 库(如 fs-extra) |
| 用户环境检测失败     | 提供手动选择和详细安装说明                   |

***

## 📅 时间线总结

| 阶段          | 周数         | 主要产出                      | 变化       |
| ----------- | ---------- | ------------------------- | -------- |
| **Phase 0** | **Week 1** | **Monorepo 结构 + 包拆分设计**   | **新增**   |
| Phase 1     | Week 2-3   | 核心架构 + 工具检测 + compound 增强 | 调整       |
| Phase 2     | Week 4-5   | 3 个适配器实现                  | 不变       |
| Phase 3     | Week 6-7   | **最小核心代理 + 代理库结构**        | **重大调整** |
| Phase 4     | Week 8     | 安装脚本 + **代理管理 CLI**       | **增强**   |
| Phase 5     | Week 9     | 测试 + NPM 发布               | 不变       |
| Phase 6     | Week 10    | 文档 + 示例                   | 不变       |

**总计**: 10 周完成 MVP (增加 1 周)

***

## 🎁 后续扩展

1.  **更多框架支持**: Angular、Svelte、Solid (通过 npm 包)
2.  **CI/CD 集成**: GitHub Actions 自动运行 review
3.  **团队协作**: 共享 compound 知识库到团队仓库
4.  **可视化 Dashboard**: 查看工作流执行历史和代理使用统计
5.  **社区代理市场**: 允许发布自定义代理到 npm
6.  **代理推荐引擎**: 基于项目特征自动推荐最佳代理组合

***

## 核心设计原则

### 1. 适配器模式

*   **核心层**(.compound/core): 工具无关的工作流和代理定义
*   **适配器层**(.compound/adapters): 针对不同工具的格式转换
*   **好处**: 添加新工具只需编写新适配器,核心逻辑不变

### 2. 声明式工作流

*   使用 Markdown + YAML frontmatter 定义工作流
*   工具通过解析文件内容执行相应逻辑
*   易于阅读、修改和版本控制

### 3. 渐进增强

*   MVP: 核心 4 个工作流 + Claude 适配器
*   逐步添加: 更多代理、更多工具支持、更多功能

### 4. 开发者友好

*   npm 包分发,符合前端开发习惯
*   自动检测环境,减少配置
*   清晰的错误提示和文档

***

## 关键技术决策

| 决策                          | 理由                |
| --------------------------- | ----------------- |
| 使用 `.compound` 而非 `.claude` | 避免与特定工具绑定,体现跨工具特性 |
| npm 包形式分发                   | 前端生态标准,版本管理方便     |
| 适配器模式                       | 解耦核心逻辑与工具特性,易扩展   |
| Markdown + YAML             | 可读性强,工具无关,易维护     |
| postinstall 钩子              | 自动设置基础结构,减少手动操作   |
| 独立 init 命令                  | 用户可控的环境配置,支持多次运行  |

***

## 🎯 架构对比与改进总结

### 与参考方案的对齐

| 特性   | Grow Your Own Garden   | Split into Multiple Plugins | 本方案                    |
| ---- | ---------------------- | --------------------------- | ---------------------- |
| 核心理念 | 种子 + 生长                | 模块化拆分                       | 种子 + 生长 + 跨工具          |
| 最小核心 | 4 commands + 11 agents | Core plugin (17 agents)     | 4 workflows + 3 agents |
| 扩展机制 | /compound 建议           | 手动安装多个插件                    | /compound 建议 + npm 包   |
| 代理存储 | 3 层优先级                 | 单层(plugin)                  | 3 层优先级                 |
| 分发方式 | Claude plugin          | Claude plugin               | npm + 适配器              |

### 核心改进

✅ **种子策略**: 从 3 个通用代理开始,避免臃肿\
✅ **Monorepo**: 模块化拆分,按需安装\
✅ **智能建议**: compound 工作流自动检测并推荐代理\
✅ **三层优先级**: 项目 > 用户 > npm 包\
✅ **代理管理 CLI**: `compound agents` 统一管理\
✅ **跨工具兼容**: 适配器模式支持 Claude/Cursor/Qoder

***

## 结论

这个方案融合了三种架构的精髓:

1.  **Grow Your Own Garden**: 种子 + 生长机制,用户只安装需要的代理
2.  **Split into Multiple Plugins**: 模块化拆分,清晰的包边界
3.  **跨工具适配**: 通过 npm 生态和适配器模式实现工具无关

关键优势:

*   ✅ **轻量级**: 核心包 < 5MB,只包含必需功能
*   ✅ **渐进式**: 随使用自然成长,不强制安装所有代理
*   ✅ **模块化**: 每个框架独立 npm 包,版本独立管理
*   ✅ **智能化**: 自动检测技术栈并推荐代理
*   ✅ **灵活性**: 三层优先级,支持项目/用户/全局定制
*   ✅ **跨工具**: 同一套核心逻辑适配多个 AI 编码工具

**建议执行路径**:

1.  Phase 0: 搭建 Monorepo,定义包边界
2.  Phase 1: 实现核心工作流 + 代理管理
3.  Phase 2-3: 适配器 + 最小代理集
4.  Phase 4-6: 完善工具链,发布 MVP

**首个里程碑**: 10 周后发布 `@compound-workflow/core` 1.0.0,验证核心架构的可行性。
