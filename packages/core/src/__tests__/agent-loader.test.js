/**
 * Tests for Agent Loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLoader } from '../agent-loader.js';
import { AgentLoadError } from '../errors.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('AgentLoader', () => {
  let loader;
  let testDir;

  beforeEach(() => {
    loader = new AgentLoader();
    testDir = path.join(os.tmpdir(), 'compound-test-' + Date.now());
  });

  describe('loadAgent', () => {
    it('should load agent from project directory', async () => {
      const agentContent = '# Test Agent\n\nThis is a test agent.';
      const agentPath = path.join(testDir, '.compound', 'agents', 'test-agent.md');

      await fs.ensureDir(path.dirname(agentPath));
      await fs.writeFile(agentPath, agentContent);

      // Mock process.cwd() to return testDir
      const originalCwd = process.cwd;
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const content = loader.loadAgent('test-agent');
      expect(content).toContain('Test Agent');

      vi.unstubAllGlobals();
      process.cwd = originalCwd;
    });

    it('should throw AgentLoadError when agent not found', () => {
      expect(() => loader.loadAgent('non-existent-agent')).toThrow(AgentLoadError);
    });

    it('should handle nested agent paths', async () => {
      const agentContent = '# Plan Agent';
      const agentPath = path.join(testDir, '.compound', 'agents', 'plan', 'requirements-analyzer.md');

      await fs.ensureDir(path.dirname(agentPath));
      await fs.writeFile(agentPath, agentContent);

      const originalCwd = process.cwd;
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const content = loader.loadAgent('plan/requirements-analyzer');
      expect(content).toContain('Plan Agent');

      vi.unstubAllGlobals();
      process.cwd = originalCwd;
    });
  });

  describe('listAgents', () => {
    it('should list all available agents', async () => {
      const agentsDir = path.join(testDir, '.compound', 'agents');
      await fs.ensureDir(agentsDir);

      await fs.writeFile(path.join(agentsDir, 'agent1.md'), '# Agent 1');
      await fs.writeFile(path.join(agentsDir, 'agent2.md'), '# Agent 2');

      const originalCwd = process.cwd;
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const agents = loader.listAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('agent1');
      expect(agents[1].name).toBe('agent2');

      vi.unstubAllGlobals();
      process.cwd = originalCwd;
    });

    it('should handle nested directory structures', async () => {
      const planDir = path.join(testDir, '.compound', 'agents', 'plan');
      await fs.ensureDir(planDir);

      await fs.writeFile(path.join(planDir, 'requirements-analyzer.md'), '# Requirements Analyzer');

      const originalCwd = process.cwd;
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const agents = loader.listAgents();
      const planAgent = agents.find((a) => a.category === 'plan');

      expect(planAgent).toBeDefined();
      expect(planAgent.name).toBe('requirements-analyzer');

      vi.unstubAllGlobals();
      process.cwd = originalCwd;
    });
  });

  describe('hasAgent', () => {
    it('should return true for existing agent', async () => {
      const agentPath = path.join(testDir, '.compound', 'agents', 'existing-agent.md');
      await fs.ensureDir(path.dirname(agentPath));
      await fs.writeFile(agentPath, '# Existing Agent');

      const originalCwd = process.cwd;
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      expect(loader.hasAgent('existing-agent')).toBe(true);

      vi.unstubAllGlobals();
      process.cwd = originalCwd;
    });

    it('should return false for non-existing agent', () => {
      expect(loader.hasAgent('non-existing-agent')).toBe(false);
    });
  });

  describe('getAgentPath', () => {
    it('should return correct path for existing agent', async () => {
      const agentPath = path.join(testDir, '.compound', 'agents', 'test-agent.md');
      await fs.ensureDir(path.dirname(agentPath));
      await fs.writeFile(agentPath, '# Test Agent');

      const originalCwd = process.cwd;
      vi.stubGlobal('process', { ...process, cwd: () => testDir });

      const retrievedPath = loader.getAgentPath('test-agent');
      expect(retrievedPath).toContain('test-agent.md');

      vi.unstubAllGlobals();
      process.cwd = originalCwd;
    });

    it('should return null for non-existing agent', () => {
      const path = loader.getAgentPath('non-existing-agent');
      expect(path).toBeNull();
    });
  });
});
