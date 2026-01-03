#!/usr/bin/env node

/**
 * Test script to verify Qoder command format
 */

import { convertToQoderCommand } from './to-qoder.js';

// Test case 1: Complete workflow with frontmatter
const workflow1 = {
  name: 'plan',
  content: `# 前端功能规划

## 输入
<feature_description>#$ARGUMENTS</feature_description>

## 工作流

### 1. 设计分析
解析设计稿`,
  frontmatter: {
    name: 'compound:plan',
    description: '为前端功能创建详细的实施计划'
  }
};

// Test case 2: Workflow without frontmatter
const workflow2 = {
  name: 'test',
  content: '# Test content',
  frontmatter: null
};

// Test case 3: Workflow with empty description
const workflow3 = {
  name: 'compound',
  content: '# Compound workflow content',
  frontmatter: {
    name: 'compound:compound',
    description: ''
  }
};

console.log('=== Test Case 1: Complete workflow ===\n');
console.log(convertToQoderCommand(workflow1));

console.log('\n=== Test Case 2: Workflow without frontmatter ===\n');
console.log(convertToQoderCommand(workflow2));

console.log('\n=== Test Case 3: Workflow with empty description ===\n');
console.log(convertToQoderCommand(workflow3));
