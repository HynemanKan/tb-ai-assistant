# TB AI Assistant

Thunderbird 邮件客户端 AI 助手扩展。自动分析收到的邮件，使用 AI 进行智能处理。

## 功能

- **邮件标签** - 自动分析邮件内容并添加合适的标签
- **日历事件** - 从邮件中提取会议/预约信息，自动创建日历事件
- **任务管理** - 识别邮件中的待办事项，自动创建任务
- **发件人过滤** - 支持配置过滤规则，跳过特定发件人的邮件
- **聊天记录** - 保存 AI 处理邮件的对话历史

## 支持的 LLM

- OpenAI
- Ollama (本地部署)

## 安装

1. 下载最新的 `.xpi` 文件
2. 打开 Thunderbird → 附加组件和主题
3. 点击齿轮图标 → 从文件安装附加组件
4. 选择下载的 `.xpi` 文件

## 配置

安装后，进入扩展的设置页面配置：

- LLM 提供商类型 (OpenAI/Ollama)
- API 端点地址
- API 密钥
- 模型名称
- 系统提示词
- 启用的工具组 (邮件标签/日历事件/任务管理)
- 发件人过滤规则
- 日历 ID 和任务列表 ID

## 开发

### 环境要求

- Node.js v20+
- pnpm

### 安装依赖

```sh
pnpm install
```

### 开发构建

```sh
# 监听文件变化并自动重新构建
pnpm run watch
```

### 生产构建

```sh
pnpm run build
```

### 打包

```sh
pnpm run package
```

## 加载扩展进行调试

1. 运行 `pnpm run build`
2. 打开 Thunderbird → 工具 → 开发者 → 调试附加组件
3. 点击 "加载临时附加组件"
4. 选择 `dist/manifest.json`

## 技术栈

- [Vue 3](https://vuejs.org/)
- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [LangChain](https://github.com/langchain-ai/langchainjs)
- [Thunderbird WebExtension APIs](https://thunderbird.net/en/developers/)

## 许可证

MIT
