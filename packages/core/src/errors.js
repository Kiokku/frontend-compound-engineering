/**
 * @fileoverview Compound Workflow 统一错误处理类
 * 
 * 错误分类体系:
 * - ConfigError: 配置相关错误 (可恢复)
 * - FileOperationError: 文件操作错误
 * - AgentLoadError: 代理加载错误
 * - AdapterError: 适配器转换错误
 * - NetworkError: 网络相关错误
 * - CriticalError: 致命错误
 */

/**
 * Compound Workflow 错误基类
 */
export class CompoundError extends Error {
  /**
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   * @param {object} details - 错误详情
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CompoundError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.recoverable = true; // 默认可恢复
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      recoverable: this.recoverable
    };
  }

  /**
   * 获取用户友好的错误信息
   */
  getUserMessage() {
    return this.message;
  }
}

/**
 * 配置相关错误
 * 严重级别: 低
 * 处理策略: 使用默认值继续
 */
export class ConfigError extends CompoundError {
  constructor(message, details = {}) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
    this.recoverable = true;
    this.severity = 'low';
  }

  getUserMessage() {
    return `⚠️ 配置问题: ${this.message}`;
  }
}

/**
 * 文件操作错误
 * 严重级别: 中
 * 处理策略: 跳过并记录
 */
export class FileOperationError extends CompoundError {
  /**
   * @param {string} message - 错误消息
   * @param {string} filePath - 文件路径
   * @param {string} operation - 操作类型 (read/write/delete)
   * @param {object} details - 其他详情
   */
  constructor(message, filePath, operation, details = {}) {
    super(message, 'FILE_OPERATION_ERROR', { filePath, operation, ...details });
    this.name = 'FileOperationError';
    this.filePath = filePath;
    this.operation = operation;
    // 读取错误可恢复，写入/删除错误不可恢复
    this.recoverable = operation === 'read';
    this.severity = 'medium';
  }

  getUserMessage() {
    const icon = this.recoverable ? '📝' : '❌';
    return `${icon} 文件${this.operation === 'read' ? '读取' : '操作'}失败: ${this.filePath}`;
  }
}

/**
 * 代理加载错误
 * 严重级别: 中
 * 处理策略: 提示安装代理
 */
export class AgentLoadError extends CompoundError {
  /**
   * @param {string} agentName - 代理名称
   * @param {string[]} searchPaths - 搜索路径
   * @param {object} details - 其他详情
   */
  constructor(agentName, searchPaths = [], details = {}) {
    super(
      `Agent "${agentName}" not found in any search path`,
      'AGENT_LOAD_ERROR',
      { agentName, searchPaths, ...details }
    );
    this.name = 'AgentLoadError';
    this.agentName = agentName;
    this.searchPaths = searchPaths;
    this.recoverable = false;
    this.severity = 'medium';
  }

  getUserMessage() {
    return `❌ 代理 "${this.agentName}" 未找到`;
  }

  getSuggestion() {
    return `运行 'compound agents list' 查看可用代理，或使用 'compound agents add ${this.agentName}' 安装`;
  }
}

/**
 * 适配器转换错误
 * 严重级别: 高
 * 处理策略: 中止并提示修复
 */
export class AdapterError extends CompoundError {
  /**
   * @param {string} adapterName - 适配器名称
   * @param {string} message - 错误消息
   * @param {object} details - 其他详情
   */
  constructor(adapterName, message, details = {}) {
    super(message, 'ADAPTER_ERROR', { adapterName, ...details });
    this.name = 'AdapterError';
    this.adapterName = adapterName;
    this.recoverable = false;
    this.severity = 'high';
  }

  getUserMessage() {
    return `❌ 适配器 "${this.adapterName}" 错误: ${this.message}`;
  }

  getSuggestion() {
    return '尝试运行 npx compound init 重新初始化适配器';
  }
}

/**
 * 网络相关错误
 * 严重级别: 中
 * 处理策略: 重试 3 次后降级
 */
export class NetworkError extends CompoundError {
  /**
   * @param {string} message - 错误消息
   * @param {string} url - 请求 URL
   * @param {object} details - 其他详情
   */
  constructor(message, url, details = {}) {
    super(message, 'NETWORK_ERROR', { url, ...details });
    this.name = 'NetworkError';
    this.url = url;
    this.recoverable = true;
    this.severity = 'medium';
  }

  getUserMessage() {
    return `🔄 网络请求失败: ${this.message}`;
  }
}

/**
 * 权限错误
 * 严重级别: 高
 * 处理策略: 中止并提示修复
 */
export class PermissionError extends CompoundError {
  /**
   * @param {string} message - 错误消息
   * @param {string} resource - 资源路径
   * @param {object} details - 其他详情
   */
  constructor(message, resource, details = {}) {
    super(message, 'PERMISSION_ERROR', { resource, ...details });
    this.name = 'PermissionError';
    this.resource = resource;
    this.recoverable = false;
    this.severity = 'high';
  }

  getUserMessage() {
    return `❌ 权限不足: ${this.resource}`;
  }
}

/**
 * 致命错误
 * 严重级别: 致命
 * 处理策略: 立即中止并回滚
 */
export class CriticalError extends CompoundError {
  constructor(message, details = {}) {
    super(message, 'CRITICAL_ERROR', details);
    this.name = 'CriticalError';
    this.recoverable = false;
    this.severity = 'critical';
  }

  getUserMessage() {
    return `🚨 严重错误: ${this.message}`;
  }
}

/**
 * 错误代码常量
 */
export const ErrorCodes = {
  CONFIG_ERROR: 'CONFIG_ERROR',
  FILE_OPERATION_ERROR: 'FILE_OPERATION_ERROR',
  AGENT_LOAD_ERROR: 'AGENT_LOAD_ERROR',
  ADAPTER_ERROR: 'ADAPTER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  CRITICAL_ERROR: 'CRITICAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 错误严重级别
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export default {
  CompoundError,
  ConfigError,
  FileOperationError,
  AgentLoadError,
  AdapterError,
  NetworkError,
  PermissionError,
  CriticalError,
  ErrorCodes,
  ErrorSeverity
};
