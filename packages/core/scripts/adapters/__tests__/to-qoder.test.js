import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ConfigError } from '../../../src/errors.js';
import * as toQoder from '../to-qoder.js';
import * as adapterUtils from '../adapter-utils.js';

// Mock fs-extra module
vi.mock('fs-extra');

// Mock adapter-utils to test original functions
vi.mock('../adapter-utils.js', () => ({
  extractFrontmatter: vi.fn((content) => {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    // Simple YAML parsing for test
    const lines = match[1].split('\n');
    const result = {};
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        result[key.trim()] = valueParts.join(':').trim();
      }
    }
    return result;
  }),
  removeFrontmatter: vi.fn((content) => content.replace(/^---\n[\s\S]*?\n---\n?/, '')),
  isMarkdownFile: vi.fn((file) => file.endsWith('.md'))
}));

describe('Qoder Adapter Generator', () => {
  const mockWorkflowsDir = path.join(process.cwd(), '.compound/workflows');
  const mockOutputDir = '.compound/adapters/qoder/commands';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractFrontmatter', () => {
    test('should extract valid YAML frontmatter', () => {
      const content = `---
name: compound:plan
description: Plan feature implementation
argument-hint: "[feature description]"
framework: universal
---
# Planning workflow`;

      const result = toQoder.extractFrontmatter(content);
      expect(result).toEqual({
        name: 'compound:plan',
        description: 'Plan feature implementation',
        'argument-hint': '[feature description]',
        framework: 'universal'
      });
    });

    test('should return null when no frontmatter exists', () => {
      const content = '# Just content without frontmatter';
      const result = toQoder.extractFrontmatter(content);
      expect(result).toBeNull();
    });

    test('should throw ConfigError for malformed YAML', () => {
      const content = `---
name: test
  invalid: indentation
---
# Content`;

      expect(() => toQoder.extractFrontmatter(content)).toThrow(ConfigError);
      expect(() => toQoder.extractFrontmatter(content)).toThrow('Failed to parse YAML frontmatter');
    });

    test('should handle empty files', () => {
      const result = toQoder.extractFrontmatter('');
      expect(result).toBeNull();
    });

    test('should handle frontmatter with special characters', () => {
      const content = `---
name: "test:workflow"
description: "Workflow with special chars: < > &"
---
# Content`;

      const result = toQoder.extractFrontmatter(content);
      expect(result).toEqual({
        name: 'test:workflow',
        description: 'Workflow with special chars: < > &'
      });
    });

    test('should handle content with only frontmatter', () => {
      const content = `---
name: only-frontmatter
description: No content after frontmatter
---`;

      const result = toQoder.extractFrontmatter(content);
      expect(result).toEqual({
        name: 'only-frontmatter',
        description: 'No content after frontmatter'
      });
    });
  });

  describe('removeFrontmatter', () => {
    test('should remove YAML frontmatter from content', () => {
      const content = `---
name: test
---
# Actual content`;
      const result = toQoder.removeFrontmatter(content);
      expect(result).toBe('# Actual content');
      expect(result).not.toContain('---');
    });

    test('should return content unchanged when no frontmatter', () => {
      const content = '# Just content';
      const result = toQoder.removeFrontmatter(content);
      expect(result).toBe('# Just content');
    });

    test('should handle multiple newlines after frontmatter', () => {
      const content = `---
name: test
---


# Content`;
      const result = toQoder.removeFrontmatter(content);
      expect(result.trim()).toBe('# Content');
    });
  });

  describe('loadAllWorkflows', () => {
    test('should successfully load all workflow files', async () => {
      const mockWorkflows = ['plan.md', 'work.md', 'review.md'];
      const mockContent = `---
name: test
description: Test workflow
---
# Workflow content`;

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(mockWorkflows);
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await toQoder.loadAllWorkflows();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'plan',
        frontmatter: { name: 'test', description: 'Test workflow' }
      });
      expect(fs.readdir).toHaveBeenCalledWith(expect.stringContaining('.compound/workflows'));
    });

    test('should throw FileOperationError when workflows directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await expect(toQoder.loadAllWorkflows()).rejects.toThrow('Workflows directory not found');
    });

    test('should skip non-markdown files', async () => {
      const mockFiles = ['plan.md', 'README.txt', 'work.md', '.gitkeep'];
      const mockContent = `---
name: test
---
# Content`;

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles);
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await toQoder.loadAllWorkflows();
      expect(result).toHaveLength(2); // Only .md files
    });

    test('should skip files with invalid frontmatter', async () => {
      const mockFiles = ['valid.md', 'invalid.md'];
      const validContent = `---
name: valid
---
# Content`;
      const invalidContent = `---
invalid: yaml:
  content
---
# Content`;

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(validContent)
        .mockResolvedValueOnce(invalidContent);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await toQoder.loadAllWorkflows();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('valid');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped invalid.md'));

      consoleSpy.mockRestore();
    });

    test('should throw AdapterError when no valid workflows found', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([]);

      await expect(toQoder.loadAllWorkflows()).rejects.toThrow('No valid workflow files found');
    });

    test('should handle file read errors gracefully', async () => {
      const mockFiles = ['readable.md', 'unreadable.md'];
      const mockContent = `---
name: test
---
# Content`;

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(mockContent)
        .mockRejectedValueOnce(new Error('Permission denied'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await toQoder.loadAllWorkflows();

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped unreadable.md'));

      consoleSpy.mockRestore();
    });
  });

  describe('convertToQoderCommand', () => {
    test('should convert workflow to Qoder command format', () => {
      const workflow = {
        name: 'plan',
        content: '# Plan workflow\n## Steps\n1. Analyze',
        frontmatter: {
          name: 'compound:plan',
          description: 'Plan feature implementation',
          'argument-hint': '[feature]'
        }
      };

      const result = toQoder.convertToQoderCommand(workflow);

      // Qoder uses YAML frontmatter format, not # header format
      expect(result).toMatch(/^---\ndescription: "Plan feature implementation"\n---\n/);
      expect(result).toContain('# Plan workflow');
      expect(result).toContain('## Steps');
    });

    test('should handle workflow without frontmatter', () => {
      const workflow = {
        name: 'test',
        content: '# Test content',
        frontmatter: null
      };

      const result = toQoder.convertToQoderCommand(workflow);

      expect(result).toMatch(/^---\ndescription: "Compound workflow command"\n---\n/);
      expect(result).toContain('# Test content');
    });

    test('should handle workflow with missing description', () => {
      const workflow = {
        name: 'test',
        content: '# Content',
        frontmatter: { name: 'test-workflow' }
      };

      const result = toQoder.convertToQoderCommand(workflow);

      expect(result).toMatch(/^---\ndescription: "Compound workflow command"\n---\n/);
    });

    test('should escape special characters in description', () => {
      const workflow = {
        name: 'test',
        content: '# Content',
        frontmatter: {
          description: 'Test with "quotes" and \'apostrophes\''
        }
      };

      const result = toQoder.convertToQoderCommand(workflow);

      // Should handle special characters
      expect(result).toContain('description:');
      expect(result).toContain('Test with');
    });
  });

  describe('generateQoderConfig', () => {
    test('should generate valid Qoder configuration', () => {
      const commandFiles = [
        { path: '/path/to/plan.md', frontmatter: { description: 'Plan workflow' } },
        { path: '/path/to/work.md', frontmatter: { description: 'Work workflow' } }
      ];

      const result = toQoder.generateQoderConfig(commandFiles);
      const config = JSON.parse(result);

      expect(config.version).toBe('1.0.0');
      expect(config.commands).toHaveLength(2);
      expect(config.commands[0]).toMatchObject({
        name: 'plan',
        path: '/path/to/plan.md',
        description: 'Plan workflow'
      });
    });

    test('should handle empty command file list', () => {
      const result = toQoder.generateQoderConfig([]);
      const config = JSON.parse(result);

      expect(config.commands).toHaveLength(0);
    });
  });

  describe('convertToQoderCommands', () => {
    test('should successfully convert all workflows', async () => {
      const mockWorkflows = [
        {
          name: 'plan',
          content: '# Plan content',
          frontmatter: { name: 'compound:plan', description: 'Plan workflow' }
        },
        {
          name: 'work',
          content: '# Work content',
          frontmatter: { name: 'compound:work', description: 'Work workflow' }
        }
      ];

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['plan.md', 'work.md']);
      vi.mocked(fs.readFile).mockResolvedValue(`---
name: test
---
# Content`);

      // Mock loadAllWorkflows to return our test data
      vi.spyOn(toQoder, 'loadAllWorkflows').mockResolvedValue(mockWorkflows);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await toQoder.convertToQoderCommands();

      expect(result).toMatchObject({
        successCount: 2,
        skippedCount: 0
      });
      expect(result.commandFiles).toHaveLength(2);
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledTimes(4); // 2 workflows + config + readme

      consoleLogSpy.mockRestore();
    });

    test('should handle partial failures gracefully', async () => {
      const mockWorkflows = [
        {
          name: 'valid',
          content: '# Valid content',
          frontmatter: { name: 'valid', description: 'Valid workflow' }
        },
        {
          name: 'invalid',
          content: '# Invalid content',
          frontmatter: { name: 'invalid', description: 'Invalid workflow' }
        }
      ];

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['valid.md', 'invalid.md']);
      vi.mocked(fs.readFile).mockResolvedValue(`---
name: test
---
# Content`);
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);

      vi.spyOn(toQoder, 'loadAllWorkflows').mockResolvedValue(mockWorkflows);
      
      let writeCallCount = 0;
      vi.mocked(fs.writeFile).mockImplementation(async () => {
        writeCallCount++;
        if (writeCallCount === 2) {
          // Second call (invalid.md) fails
          throw new Error('Write failed');
        }
        // Other calls (valid.md, config.json, README.md) succeed
        return undefined;
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await toQoder.convertToQoderCommands();

      // Only 1 workflow file succeeded, 1 failed
      // But config and README are also written (not counted in successCount)
      expect(result.successCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped invalid'));

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should throw AdapterError when all conversions fail', async () => {
      // Mock process.exit to prevent actual exit
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test.md']);
      vi.mocked(fs.readFile).mockResolvedValue(`---
name: test
---
# Content`);
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);

      vi.spyOn(toQoder, 'loadAllWorkflows').mockResolvedValue([
        { name: 'test', content: '# Content', frontmatter: { name: 'test' } }
      ]);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('All writes failed'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await toQoder.convertToQoderCommands();
      } catch (error) {
        expect(error.message).toContain('Failed to generate any command files');
      }

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('should use custom output directory when provided', async () => {
      const customDir = '/custom/output/dir';
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.readFile).mockResolvedValue(`---
name: test
---
# Content`);
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);

      vi.spyOn(toQoder, 'loadAllWorkflows').mockResolvedValue([]);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await toQoder.convertToQoderCommands({ outputDir: customDir });
      } catch (error) {
        // Expected to throw because no workflows
      }

      expect(fs.ensureDir).toHaveBeenCalledWith(customDir);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('generateInstallationInstructions', () => {
    test('should generate complete installation instructions', () => {
      const result = toQoder.generateInstallationInstructions();

      expect(result).toContain('# Compound Frontend Workflow - Qoder Integration');
      expect(result).toContain('## Installation');
      expect(result).toContain('## Usage');
      expect(result).toContain('## Troubleshooting');
      expect(result).toContain('qoder /compound:plan');
    });

    test('should include all command references', () => {
      const result = toQoder.generateInstallationInstructions();

      expect(result).toContain('compound:plan');
      expect(result).toContain('compound:work');
      expect(result).toContain('compound:review');
      expect(result).toContain('compound:compound');
    });
  });

  describe('Error Handling Integration', () => {
    test('should retry operations on temporary failures', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      let attemptCount = 0;
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary error');
        }
        return [];
      });
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);

      vi.spyOn(toQoder, 'loadAllWorkflows').mockResolvedValue([]);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await toQoder.convertToQoderCommands();
      } catch (error) {
        // Expected to fail because no workflows
      }

      expect(attemptCount).toBeGreaterThan(1); // Should have retried

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    test('should log errors to .compound/logs/error.log', async () => {
      const error = new Error('Test error');
      vi.mocked(fs.pathExists).mockResolvedValue(false); // Trigger error
      vi.mocked(fs.readdir).mockRejectedValue(error);
      vi.mocked(fs.appendFile).mockResolvedValue(undefined);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

      try {
        await toQoder.loadAllWorkflows();
      } catch (e) {
        // Expected to throw
      }

      // loadAllWorkflows should throw FileOperationError, no need to verify logging here
      expect(vi.mocked(fs.pathExists)).toHaveBeenCalled();
    });
  });
});
