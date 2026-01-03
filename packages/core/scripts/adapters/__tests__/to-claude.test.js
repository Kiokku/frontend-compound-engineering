import { describe, test, expect } from 'vitest';
import { extractFrontmatter, extractNameFromFrontmatter } from '../to-claude.js';

describe('Claude Adapter Utilities', () => {
  describe('extractFrontmatter', () => {
    test('should extract valid YAML frontmatter', () => {
      const content = `---
name: test-workflow
description: A test workflow
---
# Content here`;
      const result = extractFrontmatter(content, 'test.md');
      expect(result).toEqual({
        name: 'test-workflow',
        description: 'A test workflow'
      });
    });

    test('should extract frontmatter with multiple fields', () => {
      const content = `---
name: compound:plan
description: Plan feature implementation
argument-hint: "[feature description]"
framework: universal
---
# Planning workflow`;
      const result = extractFrontmatter(content, 'plan.md');
      expect(result).toEqual({
        name: 'compound:plan',
        description: 'Plan feature implementation',
        'argument-hint': '[feature description]',
        framework: 'universal'
      });
    });

    test('should return empty object when no frontmatter', () => {
      const content = '# Just content without frontmatter';
      const result = extractFrontmatter(content, 'test.md');
      expect(result).toEqual({});
    });

    test('should handle malformed YAML gracefully', () => {
      const content = `---
name: test
  invalid: indentation
---
# Content`;
      // Should log warning but not throw
      const result = extractFrontmatter(content, 'test.md');
      expect(result).toEqual({});
    });

    test('should handle empty files', () => {
      const result = extractFrontmatter('', 'empty.md');
      expect(result).toEqual({});
    });

    test('should handle content with only frontmatter', () => {
      const content = `---
name: only-frontmatter
description: No content after frontmatter
---`;
      const result = extractFrontmatter(content, 'only.md');
      expect(result).toEqual({
        name: 'only-frontmatter',
        description: 'No content after frontmatter'
      });
    });

    test('should handle frontmatter with special characters', () => {
      const content = `---
name: "test:workflow"
description: "Workflow with special chars: < > &"
---
# Content`;
      const result = extractFrontmatter(content, 'special.md');
      expect(result).toEqual({
        name: 'test:workflow',
        description: 'Workflow with special chars: < > &'
      });
    });
  });

  describe('extractNameFromFrontmatter', () => {
    test('should extract name from frontmatter', () => {
      const content = `---
name: my-workflow
---
# Content`;
      const name = extractNameFromFrontmatter(content, '/path/to/file.md');
      expect(name).toBe('my-workflow');
    });

    test('should fallback to filename when no name in frontmatter', () => {
      const content = `---
description: No name field
---
# Content`;
      const name = extractNameFromFrontmatter(content, '/path/to/workflow.md');
      expect(name).toBe('workflow');
    });

    test('should handle empty frontmatter', () => {
      const content = '# No frontmatter at all';
      const name = extractNameFromFrontmatter(content, '/path/to/example.md');
      expect(name).toBe('example');
    });

    test('should handle compound workflow names', () => {
      const content = `---
name: compound:plan
---
# Content`;
      const name = extractNameFromFrontmatter(content, '/path/to/plan.md');
      expect(name).toBe('compound:plan');
    });

    test('should handle nested paths correctly', () => {
      const content = `---
description: No name
---
# Content`;
      const name = extractNameFromFrontmatter(content, '/very/nested/path/to/workflow.md');
      expect(name).toBe('workflow');
    });

    test('should prioritize frontmatter name over filename', () => {
      const content = `---
name: frontmatter-name
---
# Content`;
      const name = extractNameFromFrontmatter(content, '/path/to/different-name.md');
      expect(name).toBe('frontmatter-name');
    });
  });
});
