/**
 * @fileoverview 错误处理工具函数
 * 
 * 提供统一的错误处理、日志记录和恢复机制
 */

import { CompoundError, CriticalError } from './errors.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * 全局错误处理器
 */
export class ErrorHandler {
  /**
   * @param {object} options - 配置选项
   * @param {string} options.logDir - 日志目录
   * @param {boolean} options.verbose - 是否显示详细信息
   * @param {boolean} options.exitOnCritical - 遇到致命错误是否退出
   */
  constructor(options = {}) {
    this.logDir = options.logDir || '.compound/logs';
    this.verbose = options.verbose || process.env.DEBUG === 'true';
    this.exitOnCritical = options.exitOnCritical ?? true;
  }

  /**
   * 处理错误并决定后续操作
   * @param {Error} error - 错误对象
   * @param {object} context - 错误上下文
   * @returns {object} - 处理结果
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
   * @param {CompoundError} error - Compound 错误对象
   * @param {object} context - 错误上下文
   * @returns {object} - 处理结果
   */
  handleCompoundError(error, context) {
    // 输出用户友好的错误信息
    this.printUserMessage(error);

    const { recoverable } = error;

    if (!recoverable && this.exitOnCritical) {
      console.error('\n❌ 无法恢复的错误，程序终止');
      console.error('📝 详细日志已保存到:', path.join(this.logDir, 'error.log'));
      process.exit(1);
    }

    return { handled: true, recoverable, error };
  }

  /**
   * 记录错误到日志文件
   * @param {Error} error - 错误对象
   * @param {object} context - 错误上下文
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
        context,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd()
        }
      };
      
      const logFile = path.join(this.logDir, 'error.log');
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (logError) {
      // 日志写入失败不应影响主流程
      if (this.verbose) {
        console.warn('⚠️ 无法写入错误日志:', logError.message);
      }
    }
  }

  /**
   * 打印用户友好的错误信息
   * @param {CompoundError} error - 错误对象
   */
  printUserMessage(error) {
    // 获取用户友好的消息
    const userMessage = error.getUserMessage ? error.getUserMessage() : error.message;
    console.error(`\n${userMessage}`);
    
    // 显示详细信息
    if (this.verbose && error.details && Object.keys(error.details).length > 0) {
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
   * @param {CompoundError} error - 错误对象
   * @returns {string|null} - 修复建议
   */
  getSuggestion(error) {
    // 优先使用错误自带的建议
    if (error.getSuggestion) {
      return error.getSuggestion();
    }

    // 默认建议
    const suggestions = {
      'CONFIG_ERROR': '检查 .compound/config.json 配置文件格式是否正确',
      'FILE_OPERATION_ERROR': `检查文件路径和权限: ${error.details?.filePath || ''}`,
      'AGENT_LOAD_ERROR': `运行 'compound agents list' 查看可用代理`,
      'ADAPTER_ERROR': '尝试运行 npx compound init 重新初始化适配器',
      'NETWORK_ERROR': '检查网络连接，或稍后重试',
      'PERMISSION_ERROR': '检查文件/目录权限，或使用 sudo 运行',
      'CRITICAL_ERROR': '请查看日志文件获取详细信息',
      'UNKNOWN_ERROR': '请查看日志文件获取详细信息'
    };
    
    return suggestions[error.code] || null;
  }
}

/**
 * 安全执行异步操作的包装器
 * @param {Function} fn - 要执行的异步函数
 * @param {*} fallback - 失败时的降级值
 * @param {object} context - 错误上下文
 * @returns {*} - 执行结果或降级值
 */
export async function safeExecute(fn, fallback = null, context = {}) {
  try {
    return await fn();
  } catch (error) {
    const handler = new ErrorHandler({ 
      verbose: process.env.DEBUG === 'true',
      exitOnCritical: false  // 安全执行模式不退出
    });
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
 * @param {Function} fn - 要执行的异步函数
 * @param {object} options - 重试选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.delay - 初始延迟(毫秒)
 * @param {number} options.backoff - 退避倍数
 * @param {Function} options.shouldRetry - 判断是否应该重试的函数
 * @returns {*} - 执行结果
 */
export async function withRetry(fn, options = {}) {
  const { 
    maxRetries = 3, 
    delay = 1000, 
    backoff = 2,
    shouldRetry = () => true
  } = options;
  
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 检查是否应该重试
      if (!shouldRetry(error) || attempt >= maxRetries) {
        break;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      console.warn(`🔄 第 ${attempt}/${maxRetries} 次尝试失败，${waitTime}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * 尝试执行操作，失败时返回默认值（不抛出错误）
 * @param {Function} fn - 要执行的函数
 * @param {*} defaultValue - 默认值
 * @returns {*} - 执行结果或默认值
 */
export async function tryOrDefault(fn, defaultValue = null) {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}

/**
 * 创建错误边界包装器
 * @param {string} operationName - 操作名称
 * @returns {Function} - 包装器函数
 */
export function createErrorBoundary(operationName) {
  return async function errorBoundary(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      const handler = new ErrorHandler({ verbose: true });
      await handler.handle(error, { operation: operationName, ...context });
      throw error;
    }
  };
}

/**
 * 断言函数，条件不满足时抛出错误
 * @param {boolean} condition - 断言条件
 * @param {string} message - 错误消息
 * @param {string} ErrorClass - 错误类
 */
export function assert(condition, message, ErrorClass = CompoundError) {
  if (!condition) {
    throw new ErrorClass(message, 'ASSERTION_FAILED', {});
  }
}

export default {
  ErrorHandler,
  safeExecute,
  withRetry,
  tryOrDefault,
  createErrorBoundary,
  assert
};
