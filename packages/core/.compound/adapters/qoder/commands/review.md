---
description: "代码审查（可访问性、性能、最佳实践）"
---

# 代码审查

## 输入
<review_target>#$ARGUMENTS</review_target>

## 前置条件

- [ ] 已完成 `compound:work` 阶段
- [ ] 代码已通过自动化检查
- [ ] 变更范围明确

## 审查维度

### 1. 可访问性审查 (Accessibility)

#### WCAG 2.1 合规检查
- [ ] **感知性 (Perceivable)**
  - 图片有 alt 文本
  - 视频有字幕
  - 颜色对比度符合标准 (AA: 4.5:1, AAA: 7:1)
  - 文字可缩放至 200%

- [ ] **可操作性 (Operable)**
  - 键盘可访问所有功能
  - 有明确的焦点指示器
  - 无键盘陷阱
  - 提供跳过导航链接

- [ ] **可理解性 (Understandable)**
  - 表单有清晰的标签
  - 错误信息明确
  - 一致的导航模式
  - 语言属性正确设置

- [ ] **健壮性 (Robust)**
  - 语义化 HTML 标签
  - ARIA 属性正确使用
  - 兼容辅助技术

#### 工具验证
```bash
# 使用 axe-core 检查
npx axe <url>

# 使用 Lighthouse 检查
npx lighthouse <url> --only-categories=accessibility
```

### 2. 性能审查 (Performance)

#### Core Web Vitals
- [ ] **LCP (Largest Contentful Paint)** < 2.5s
- [ ] **FID (First Input Delay)** < 100ms
- [ ] **CLS (Cumulative Layout Shift)** < 0.1
- [ ] **TTFB (Time to First Byte)** < 600ms

#### 资源优化
- [ ] 图片已压缩和适当格式化 (WebP/AVIF)
- [ ] 使用懒加载
- [ ] 代码分割合理
- [ ] 无未使用的依赖

#### 运行时性能
- [ ] 无内存泄漏
- [ ] 无不必要的重渲染
- [ ] 列表使用虚拟化（如适用）
- [ ] 防抖/节流已正确应用

#### 工具验证
```bash
# Lighthouse 性能检查
npx lighthouse <url> --only-categories=performance

# Bundle 分析
npm run build -- --analyze
```

### 3. 安全审查 (Security)

- [ ] **XSS 防护**
  - 用户输入已转义
  - 使用 CSP 头
  - 避免 dangerouslySetInnerHTML

- [ ] **CSRF 防护**
  - 表单包含 CSRF token
  - API 请求携带认证信息

- [ ] **敏感数据处理**
  - 无硬编码密钥
  - 敏感数据不存入 localStorage
  - HTTPS 强制使用

- [ ] **依赖安全**
  ```bash
  npm audit
  ```

### 4. 代码质量审查

#### 可维护性
- [ ] 函数/组件职责单一
- [ ] 代码重复率低 (< 5%)
- [ ] 命名清晰有意义
- [ ] 适当的代码注释

#### TypeScript 最佳实践
- [ ] 无 `any` 类型使用
- [ ] 接口定义完整
- [ ] 泛型使用得当
- [ ] 类型守卫正确使用

#### React/Vue 最佳实践
- [ ] Hook 使用正确（依赖数组完整）
- [ ] 组件拆分合理
- [ ] Props 类型完整
- [ ] 避免不必要的 state

#### 测试质量
- [ ] 测试覆盖核心逻辑
- [ ] 测试用例独立
- [ ] Mock 使用适当
- [ ] 边界情况已覆盖

### 5. 用户体验审查 (UX)

- [ ] 加载状态处理
- [ ] 错误状态友好展示
- [ ] 空状态处理
- [ ] 操作反馈及时
- [ ] 移动端适配良好

## 输出

### 审查报告
生成审查报告 `reviews/<date>-<feature>.md`:

```markdown
# 代码审查报告

## 概览
- 审查日期: YYYY-MM-DD
- 审查范围: [文件列表]
- 审查人: [AI/人工]

## 问题汇总

### 严重 (Critical)
- [问题描述及修复建议]

### 警告 (Warning)
- [问题描述及修复建议]

### 建议 (Info)
- [改进建议]

## 通过项
- [已通过的检查项]
```

## 验收检查

- [ ] 可访问性检查通过
- [ ] 性能指标达标
- [ ] 无安全漏洞
- [ ] 代码质量符合规范
- [ ] 用户体验良好
