/**
 * Tool Detector - 多层检测策略
 * 
 * 检测顺序（按优先级）：
 * 1. 项目级配置（.claude/, .cursor/ 等）
 * 2. 用户级配置（~/.claude/, ~/.cursor/ 等）
 * 3. 环境变量
 * 4. 命令行工具
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

/**
 * 支持的工具类型
 */
export const ToolType = {
  CLAUDE: 'claude',
  CURSOR: 'cursor',
  QODER: 'qoder',
  UNKNOWN: 'unknown'
};

/**
 * 检查命令是否存在于系统 PATH 中
 * @param {string} command - 要检查的命令名称
 * @returns {boolean} - 命令是否存在
 */
export function commandExists(command) {
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
 * 安全检查路径是否存在
 * @param {string} filePath - 要检查的路径
 * @returns {boolean}
 */
function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * 检测 Claude 环境
 * @param {string} cwd - 当前工作目录
 * @param {string} home - 用户主目录
 * @returns {{detected: boolean, source: string, priority: number}}
 */
function detectClaude(cwd, home) {
  const env = process.env;
  
  // 1. 项目级 .claude/ 目录 (最高优先级)
  if (pathExists(path.join(cwd, '.claude'))) {
    return { detected: true, source: 'project', priority: 1 };
  }
  
  // 2. 用户级 ~/.claude/ 配置
  if (pathExists(path.join(home, '.claude'))) {
    return { detected: true, source: 'user', priority: 2 };
  }
  
  // 3. 环境变量
  if (env.CLAUDE_CODE || env.CLAUDE_API_KEY) {
    return { detected: true, source: 'env', priority: 3 };
  }
  
  // 4. 命令行工具
  if (commandExists('claude')) {
    return { detected: true, source: 'cli', priority: 4 };
  }
  
  return { detected: false, source: null, priority: -1 };
}

/**
 * 检测 Cursor 环境
 * @param {string} cwd - 当前工作目录
 * @param {string} home - 用户主目录
 * @returns {{detected: boolean, source: string, priority: number, legacy: boolean}}
 */
function detectCursor(cwd, home) {
  const env = process.env;
  
  // 1. 项目级 .cursor/ 目录 (新版本，最高优先级)
  if (pathExists(path.join(cwd, '.cursor'))) {
    return { detected: true, source: 'project', priority: 1, legacy: false };
  }
  
  // 2. 项目级 .cursorrules 文件 (旧版本兼容)
  if (pathExists(path.join(cwd, '.cursorrules'))) {
    return { detected: true, source: 'project', priority: 1, legacy: true };
  }
  
  // 3. 用户级 ~/.cursor/ 配置
  if (pathExists(path.join(home, '.cursor'))) {
    return { detected: true, source: 'user', priority: 2, legacy: false };
  }
  
  // 4. 环境变量
  if (env.CURSOR_WORKSPACE || env.CURSOR_SESSION) {
    return { detected: true, source: 'env', priority: 3, legacy: false };
  }
  
  return { detected: false, source: null, priority: -1, legacy: false };
}

/**
 * 检测 Qoder 环境
 * @param {string} cwd - 当前工作目录
 * @param {string} home - 用户主目录
 * @returns {{detected: boolean, source: string, priority: number}}
 */
function detectQoder(cwd, home) {
  const env = process.env;
  
  // 1. 项目级配置
  if (pathExists(path.join(cwd, '.qoder'))) {
    return { detected: true, source: 'project', priority: 1 };
  }
  
  // 2. 用户级配置
  if (pathExists(path.join(home, '.qoder'))) {
    return { detected: true, source: 'user', priority: 2 };
  }
  
  // 3. 环境变量
  if (env.QODER_CLI || env.QODER_SESSION) {
    return { detected: true, source: 'env', priority: 3 };
  }
  
  // 4. 命令行工具存在
  if (commandExists('qoder')) {
    return { detected: true, source: 'cli', priority: 4 };
  }
  
  return { detected: false, source: null, priority: -1 };
}

/**
 * 多层检测策略，按优先级返回检测到的工具
 * 检测顺序: 项目配置 > 用户目录配置 > 环境变量 > 命令行工具
 * 
 * @param {Object} options - 检测选项
 * @param {string} [options.cwd] - 当前工作目录，默认 process.cwd()
 * @param {boolean} [options.all] - 是否返回所有检测到的工具
 * @returns {string | Object} - 检测到的工具名称或详细信息
 */
export function detectTool(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = os.homedir();
  
  // 检测所有工具
  const results = {
    claude: detectClaude(cwd, home),
    cursor: detectCursor(cwd, home),
    qoder: detectQoder(cwd, home)
  };
  
  // 如果需要返回所有检测结果
  if (options.all) {
    return {
      detected: Object.entries(results)
        .filter(([_, info]) => info.detected)
        .map(([tool, info]) => ({ tool, ...info }))
        .sort((a, b) => a.priority - b.priority),
      primary: getPrimaryTool(results)
    };
  }
  
  return getPrimaryTool(results);
}

/**
 * 根据优先级获取主要工具
 * @param {Object} results - 检测结果
 * @returns {string}
 */
function getPrimaryTool(results) {
  // 按优先级排序检测到的工具
  const detected = Object.entries(results)
    .filter(([_, info]) => info.detected)
    .sort((a, b) => a[1].priority - b[1].priority);
  
  if (detected.length === 0) {
    return ToolType.UNKNOWN;
  }
  
  // 返回优先级最高的工具
  return detected[0][0];
}

/**
 * 工具详细信息
 */
const TOOL_INFO = {
  claude: {
    name: 'Claude Code',
    configDir: '.claude',
    pluginDir: '~/.claude/plugins',
    docsUrl: 'https://docs.anthropic.com/claude-code',
    features: ['slash-commands', 'plugins', 'agents'],
    filePatterns: {
      config: '.claude/config.json',
      commands: '.claude/commands/*.md'
    }
  },
  cursor: {
    name: 'Cursor IDE',
    configDir: '.cursor',
    rulesDir: '.cursor/rules',
    legacyFile: '.cursorrules',
    docsUrl: 'https://cursor.sh/docs',
    features: ['rules', 'agents', 'composer'],
    filePatterns: {
      rules: '.cursor/rules/*.mdc',
      legacyRules: '.cursorrules'
    }
  },
  qoder: {
    name: 'Qoder CLI',
    configDir: '~/.qoder',
    commandsDir: '~/.qoder/commands',
    docsUrl: 'https://qoder.dev/docs',
    features: ['commands', 'agents'],
    filePatterns: {
      commands: '~/.qoder/commands/*.md'
    }
  }
};

/**
 * 获取检测到的工具的详细信息
 * @param {string} tool - 工具名称
 * @returns {Object | null}
 */
export function getToolInfo(tool) {
  return TOOL_INFO[tool] || null;
}

/**
 * 获取所有支持的工具列表
 * @returns {Array<Object>}
 */
export function getSupportedTools() {
  return Object.entries(TOOL_INFO).map(([key, info]) => ({
    id: key,
    ...info
  }));
}

/**
 * 检测工具版本（如果可能）
 * @param {string} tool - 工具名称
 * @returns {string | null}
 */
export function detectToolVersion(tool) {
  try {
    switch (tool) {
      case 'claude':
        if (commandExists('claude')) {
          const output = execSync('claude --version', { encoding: 'utf8' });
          return output.trim();
        }
        break;
      case 'cursor':
        // Cursor 版本通常从 VS Code 扩展获取
        // 这里返回 null，因为无法直接获取
        break;
      case 'qoder':
        if (commandExists('qoder')) {
          const output = execSync('qoder --version', { encoding: 'utf8' });
          return output.trim();
        }
        break;
    }
  } catch {
    // 忽略版本检测错误
  }
  return null;
}

/**
 * 创建详细的检测报告
 * @param {Object} options - 检测选项
 * @returns {Object}
 */
export function createDetectionReport(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = os.homedir();
  
  const allResults = detectTool({ ...options, all: true });
  const primary = allResults.primary;
  
  return {
    timestamp: new Date().toISOString(),
    environment: {
      cwd,
      home,
      platform: process.platform,
      nodeVersion: process.version
    },
    primary: {
      tool: primary,
      info: getToolInfo(primary),
      version: detectToolVersion(primary)
    },
    allDetected: allResults.detected.map(result => ({
      ...result,
      info: getToolInfo(result.tool),
      version: detectToolVersion(result.tool)
    })),
    recommendations: generateRecommendations(allResults)
  };
}

/**
 * 生成使用建议
 * @param {Object} allResults - 所有检测结果
 * @returns {Array<string>}
 */
function generateRecommendations(allResults) {
  const recommendations = [];
  
  if (allResults.detected.length === 0) {
    recommendations.push('未检测到任何 AI 编码工具，请安装 Claude Code、Cursor 或 Qoder');
    recommendations.push('运行 `compound init` 时可手动选择工具类型');
  } else if (allResults.detected.length > 1) {
    recommendations.push(`检测到多个工具，将使用 ${allResults.primary} 作为主要工具`);
    recommendations.push('可通过 .compound/config.json 中的 "tool" 字段手动指定');
  }
  
  // Cursor 特定建议
  const cursorResult = allResults.detected.find(r => r.tool === 'cursor');
  if (cursorResult?.legacy) {
    recommendations.push('检测到旧版 .cursorrules 文件，建议迁移到新版 .cursor/rules/ 目录');
  }
  
  return recommendations;
}

// 默认导出
export default {
  ToolType,
  detectTool,
  getToolInfo,
  getSupportedTools,
  detectToolVersion,
  createDetectionReport,
  commandExists
};
