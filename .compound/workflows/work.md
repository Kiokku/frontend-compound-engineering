---
name: compound:work
description: 执行计划，创建组件、编写测试
argument-hint: "[计划文件路径或任务描述]"
framework: universal
---

# 执行开发工作

## 输入
<task_description>#$ARGUMENTS</task_description>

## 前置条件

- [ ] 已完成 `compound:plan` 阶段
- [ ] 计划文件已审核通过
- [ ] 依赖已安装完成

## 工作流

### 1. 环境准备
确保开发环境就绪：
- 检查 Node.js 版本符合要求
- 验证依赖安装完整
- 确认开发服务器可启动
- 检查代码规范工具配置

### 2. 组件实现
按照计划创建组件：

#### 2.1 目录结构
```
src/components/<ComponentName>/
├── index.ts              # 导出入口
├── <ComponentName>.tsx   # 组件实现
├── <ComponentName>.test.tsx  # 单元测试
├── <ComponentName>.module.css # 样式文件
└── types.ts              # 类型定义
```

#### 2.2 组件开发顺序
1. **原子组件** - 最基础的 UI 元素
2. **分子组件** - 组合原子组件
3. **组织组件** - 组合分子组件
4. **模板组件** - 页面布局模板
5. **页面组件** - 完整页面

#### 2.3 编码规范
- 使用 TypeScript 严格模式
- Props 接口完整定义
- 添加 JSDoc 注释
- 遵循项目命名规范

### 3. 状态管理
实现状态逻辑：
- 定义 Store/Context
- 实现 Actions/Reducers
- 处理异步操作
- 添加状态持久化（如需要）

### 4. 样式实现
按设计稿实现样式：
- 使用设计 token
- 实现响应式布局
- 处理主题切换（如需要）
- 确保样式隔离

### 5. 单元测试
为每个组件编写测试：

```javascript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // 渲染测试
  });

  it('should handle user interactions', () => {
    // 交互测试
  });

  it('should meet accessibility requirements', () => {
    // 可访问性测试
  });
});
```

### 6. 集成测试
测试组件间交互：
- 模拟用户操作流程
- 验证数据流转正确
- 测试边界情况
- 检查错误处理

## 输出

### 代码交付物
- [ ] 组件源文件
- [ ] 类型定义文件
- [ ] 样式文件
- [ ] 单元测试文件

### 文档交付物
- [ ] 组件使用示例
- [ ] API 文档更新
- [ ] Storybook 故事（如适用）

## 质量检查

执行以下检查：

```bash
# 类型检查
npm run type-check

# 代码规范检查
npm run lint

# 运行测试
npm run test

# 构建验证
npm run build
```

## 验收检查

- [ ] 所有组件按计划实现
- [ ] 类型检查通过
- [ ] 代码规范检查通过
- [ ] 单元测试覆盖率 >= 80%
- [ ] 无控制台错误或警告
- [ ] 响应式布局正常
