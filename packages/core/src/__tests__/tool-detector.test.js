/**
 * Tests for Tool Detector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectTool, getToolInfo, ToolType } from '../tool-detector.js';
import fs from 'fs-extra';

describe('Tool Detector', () => {
  let originalEnv;
  let originalCwd;

  beforeEach(() => {
    originalEnv = { ...process.env };
    originalCwd = process.cwd;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  describe('detectTool', () => {
    it('should detect Claude from project directory', async () => {
      const testDir = '/tmp/test-claude';
      await fs.ensureDir(path.join(testDir, '.claude'));

      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const detected = detectTool();
      expect(detected).toBe(ToolType.CLAUDE);

      await fs.remove(testDir);
    });

    it('should detect Cursor from project directory', async () => {
      const testDir = '/tmp/test-cursor';
      await fs.ensureDir(path.join(testDir, '.cursor'));

      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const detected = detectTool();
      expect(detected).toBe(ToolType.CURSOR);

      await fs.remove(testDir);
    });

    it('should detect Qoder from environment variable', () => {
      process.env.QODER_CLI = 'true';

      const detected = detectTool();
      expect(detected).toBe(ToolType.QODER);
    });

    it('should return UNKNOWN when no tool detected', () => {
      const testDir = '/tmp/test-unknown';
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const detected = detectTool();
      expect(detected).toBe(ToolType.UNKNOWN);
    });
  });

  describe('getToolInfo', () => {
    it('should return Claude tool info', () => {
      const info = getToolInfo(ToolType.CLAUDE);

      expect(info).toBeDefined();
      expect(info.name).toBe('Claude Code');
      expect(info.configDir).toBe('.claude');
    });

    it('should return Cursor tool info', () => {
      const info = getToolInfo(ToolType.CURSOR);

      expect(info).toBeDefined();
      expect(info.name).toBe('Cursor IDE');
      expect(info.configDir).toBe('.cursor');
    });

    it('should return Qoder tool info', () => {
      const info = getToolInfo(ToolType.QODER);

      expect(info).toBeDefined();
      expect(info.name).toBe('Qoder CLI');
      expect(info.configDir).toBe('~/.qoder');
    });

    it('should return null for unknown tool', () => {
      const info = getToolInfo('unknown');
      expect(info).toBeNull();
    });
  });
});
