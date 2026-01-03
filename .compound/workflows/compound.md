---
name: compound:compound
description: 记录解决方案并建议相关代理
argument-hint: "[已解决的问题描述]"
framework: universal
---

# 固化知识并成长

## 输入
<solution_description>#$ARGUMENTS</solution_description>

## 前置条件

- [ ] 问题已成功解决
- [ ] 解决方案经过验证
- [ ] 代码已通过审查

## 工作流

### 1. 记录解决方案

> 🔗 **调用代理**: `@compound/agents/compound/knowledge-recorder`

调用知识记录代理，将解决方案保存到 `.compound/docs/<category>/<title>.md`

```yaml
agent_call:
  name: knowledge-recorder
  category: compound
  input:
    solution_description: "#$ARGUMENTS"
    auto_categorize: true
  output:
    save_to: ".compound/docs/"
    format: markdown
```

#### 分类规则
| 问题类型 | 目录 | 示例 |
|---------|------|------|
| 性能优化 | `performance/` | lazy-loading, bundle-optimization |
| 可访问性 | `accessibility/` | keyboard-navigation, screen-reader |
| 状态管理 | `state/` | context-optimization, reducer-patterns |
| 组件设计 | `components/` | compound-components, render-props |
| 样式方案 | `styling/` | css-modules, theme-switching |
| 测试相关 | `testing/` | mocking-strategies, e2e-patterns |
| 工具配置 | `tooling/` | webpack-config, vite-plugins |
| 通用模式 | `patterns/` | error-handling, data-fetching |

#### 文档模板
```markdown
# [解决方案标题]

## 问题背景
[描述遇到的问题及其上下文]

## 解决方案
[详细的解决步骤]

## 代码示例
[关键代码片段]

## 相关文件
- [文件1路径]
- [文件2路径]

## 注意事项
[实施时需要注意的点]

## 标签
- #[tag1]
- #[tag2]
```

### 2. 技术栈检测

> 🔗 **调用代理**: `@compound/agents/compound/tech-stack-detector`

执行技术栈检测代理，分析项目配置：

```yaml
agent_call:
  name: tech-stack-detector
  category: compound
  input:
    scan_targets:
      - package.json
      - "*.config.js"
      - "*.config.ts"
      - tsconfig.json
  output:
    format: yaml
    save_to: .compound/cache/tech-stack.yaml
```

#### 检测维度
- **框架**: React, Vue, Angular, Svelte, Solid, Next.js, Nuxt
- **构建工具**: Vite, Webpack, Rollup, esbuild, Turbopack
- **样式方案**: Tailwind, Styled-components, CSS Modules, Sass, Emotion
- **状态管理**: Redux, Zustand, Pinia, MobX, Jotai, Recoil
- **测试框架**: Jest, Vitest, Playwright, Cypress, Testing Library

#### 输出示例
```yaml
tech_stack:
  framework:
    primary: "React"
    meta_framework: "Next.js"
    version: "18.2.0"
  build_tool: "Vite"
  styling: ["Tailwind CSS", "CSS Modules"]
  state_management: "Zustand"
  testing:
    unit: "Vitest"
    e2e: "Playwright"
  language: "TypeScript"
```

### 3. 代理建议引擎

> 🔗 **调用代理**: `@compound/agents/compound/agent-suggester`

基于技术栈检测结果和当前解决的问题，调用代理建议引擎：

```yaml
agent_call:
  name: agent-suggester
  category: compound
  input:
    tech_stack: "${step_2.output}"           # 使用上一步的检测结果
    problem_context: "#$ARGUMENTS"           # 当前解决的问题描述
    config_path: ".compound/config.json"     # 用户配置（已忽略/已安装的代理）
  output:
    format: yaml
    include_install_commands: true
```

#### 框架检测规则
| 检测结果 | 建议代理 |
|---------|----------|
| React | `react-reviewer`, `hooks-optimizer` |
| Vue | `vue-reviewer`, `composition-api-guide` |
| Angular | `angular-reviewer` |
| Svelte | `svelte-reviewer` |
| Next.js | `nextjs-optimizer` |
| Nuxt | `nuxt-optimizer` |

#### 问题类型检测规则
| 问题涉及 | 关键词 | 建议代理 |
|---------|-------|----------|
| 可访问性 | a11y, accessibility, WCAG | `wcag-compliance-checker` |
| 性能优化 | performance, speed, bundle | `bundle-analyzer`, `performance-profiler` |
| 设计实现 | design, UI, component | `design-system-validator` |
| 状态管理 | state, store, redux | `state-architecture-reviewer` |
| 测试覆盖 | test, coverage, unit | `test-coverage-advisor` |
| 安全问题 | security, XSS, CSRF | `security-scanner` |

### 4. 用户交互

提供交互式建议界面：

```
✅ 解决方案已记录: .compound/docs/performance/lazy-loading.md

💡 发现改进机会:

  [1] 添加 React 审查代理
      检测到项目使用 React,添加专用代理可以:
      - 检查 Hooks 使用规范
      - 优化组件性能
      - 防止常见陷阱
      
      安装: compound agents add react-reviewer
      
      [y] 现在安装  [n] 跳过  [x] 不再提示

  [2] 添加 Bundle 分析代理
      涉及性能优化,建议:
      - Webpack/Vite bundle 分析
      - 依赖树优化建议
      
      安装: compound agents add bundle-analyzer
      
      [y] 现在安装  [n] 跳过  [x] 不再提示
```

### 5. 自动安装

如果用户选择安装：

```bash
# 从库复制到项目
compound agents add react-reviewer
# → 复制 library/react/react-reviewer.md 到 .compound/agents/

# 或者安装 npm 包
npm install @compound-workflow/react
```

### 6. 记录用户偏好

保存用户的"不再提示"选择到配置：

```json
// .compound/config.json
{
  "dismissedSuggestions": [
    "bundle-analyzer"
  ],
  "installedAgents": [
    "react-reviewer"
  ]
}
```

## 输出

### 知识库更新
- [ ] 解决方案文档已创建
- [ ] 文档分类正确
- [ ] 标签已添加

### 代理建议
- [ ] 技术栈检测完成
- [ ] 相关代理已建议
- [ ] 用户选择已记录

### 配置更新
- [ ] 用户偏好已保存
- [ ] 新代理已注册

## 成长指标

跟踪工具链的成长：

```
📊 Compound 统计

知识库:
  - 总文档数: 24
  - 本月新增: 6
  - 最常用类别: performance (8篇)

代理:
  - 已安装: 5
  - 活跃使用: 3
  - 建议采纳率: 67%

工作流执行:
  - plan: 12次
  - work: 45次
  - review: 38次
  - compound: 18次
```

## 验收检查

- [ ] 解决方案完整记录
- [ ] 代理建议相关性高
- [ ] 用户体验流畅
- [ ] 配置正确保存
