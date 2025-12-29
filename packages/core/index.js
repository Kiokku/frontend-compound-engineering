/**
 * @compound-workflow/core
 * 
 * Core workflows and agent management for compound development
 */

// Agent management
export { AgentLoader } from './src/agent-loader.js';

// Tool detection
export {
  ToolType,
  detectTool,
  getToolInfo,
  getSupportedTools,
  detectToolVersion,
  createDetectionReport,
  commandExists
} from './src/tool-detector.js';

// Error handling
export {
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
} from './src/errors.js';

export {
  ErrorHandler,
  safeExecute,
  withRetry,
  tryOrDefault,
  createErrorBoundary,
  assert
} from './src/error-handler.js';

// Re-export for convenience
import { AgentLoader } from './src/agent-loader.js';
import * as errors from './src/errors.js';
import * as errorHandler from './src/error-handler.js';
import * as toolDetector from './src/tool-detector.js';

export default {
  AgentLoader,
  ...errors,
  ...errorHandler,
  ...toolDetector
};
