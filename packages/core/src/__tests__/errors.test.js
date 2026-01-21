/**
 * Tests for Error Handling
 */

import { describe, it, expect } from 'vitest';
import {
  CompoundError,
  ConfigError,
  FileOperationError,
  AgentLoadError,
  AdapterError
} from '../errors.js';

describe('Error Classes', () => {
  describe('CompoundError', () => {
    it('should create base error with all properties', () => {
      const error = new CompoundError('Test error', 'TEST_CODE', { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ key: 'value' });
      expect(error.name).toBe('CompoundError');
      expect(error.timestamp).toBeDefined();
    });

    it('should serialize to JSON correctly', () => {
      const error = new CompoundError('Test error', 'TEST_CODE', { key: 'value' });
      const json = error.toJSON();

      expect(json.name).toBe('CompoundError');
      expect(json.code).toBe('TEST_CODE');
      expect(json.message).toBe('Test error');
      expect(json.details).toEqual({ key: 'value' });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('ConfigError', () => {
    it('should create config error', () => {
      const error = new ConfigError('Invalid config', { field: 'port' });

      expect(error.name).toBe('ConfigError');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.details.field).toBe('port');
    });
  });

  describe('FileOperationError', () => {
    it('should create file operation error', () => {
      const error = new FileOperationError('Cannot read file', '/path/to/file', 'read');

      expect(error.name).toBe('FileOperationError');
      expect(error.code).toBe('FILE_OPERATION_ERROR');
      expect(error.details.filePath).toBe('/path/to/file');
      expect(error.details.operation).toBe('read');
      expect(error.recoverable).toBe(true);
    });

    it('should mark write operations as non-recoverable', () => {
      const error = new FileOperationError('Cannot write file', '/path/to/file', 'write');

      expect(error.recoverable).toBe(false);
    });
  });

  describe('AgentLoadError', () => {
    it('should create agent load error', () => {
      const searchPaths = ['/path1', '/path2'];
      const error = new AgentLoadError('test-agent', searchPaths, { suggestion: 'Install it' });

      expect(error.name).toBe('AgentLoadError');
      expect(error.code).toBe('AGENT_LOAD_ERROR');
      expect(error.details.agentName).toBe('test-agent');
      expect(error.details.searchPaths).toEqual(searchPaths);
      expect(error.details.suggestion).toBe('Install it');
      expect(error.recoverable).toBe(false);
    });
  });

  describe('AdapterError', () => {
    it('should create adapter error', () => {
      const error = new AdapterError('claude', 'Conversion failed', { stage: 'parsing' });

      expect(error.name).toBe('AdapterError');
      expect(error.code).toBe('ADAPTER_ERROR');
      expect(error.details.adapterName).toBe('claude');
      expect(error.details.stage).toBe('parsing');
      expect(error.recoverable).toBe(false);
    });
  });
});
