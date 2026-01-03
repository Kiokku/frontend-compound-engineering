# Compound Frontend - Claude Plugin

## Installation

```bash
# Copy to Claude plugins directory
cp -r .compound/adapters/claude ~/.claude/plugins/compound-frontend

# Refresh Claude Code
claude /plugin refresh
```

## Usage

Use the following commands in Claude Code:

### Workflows
- `/compound:compound`: 记录解决方案并建议相关代理
- `/compound:plan`: 为前端功能创建详细的实施计划
- `/compound:review`: 代码审查（可访问性、性能、最佳实践）
- `/compound:work`: 执行计划，创建组件、编写测试

### Agents
- `@agent-suggester`: 根据技术栈和问题类型建议相关代理
- `@knowledge-recorder`: 将解决方案记录到知识库
- `@tech-stack-detector`: 检测项目技术栈并输出结构化信息
- `@component-architect`: 设计组件架构和层级结构
- `@dependency-advisor`: 分析并推荐项目依赖
- `@requirements-analyzer`: 分析需求并提取关键信息用于规划
- `@accessibility-reviewer`: Review code for accessibility (a11y) compliance
- `@performance-reviewer`: Review code for performance optimization opportunities
- `@security-reviewer`: Review code for frontend security vulnerabilities
- `@code-generator`: 根据规划生成组件代码骨架
- `@style-implementer`: 实现组件样式和响应式布局
- `@test-writer`: 编写单元测试和集成测试

## Version

0.1.0

## Generated Files

- **Commands**: 4 workflow files
- **Agents**: 12 agent files across 4 categories
