# 模板和用户体验改进提案

## 为什么

当前系统在小红书模板上线后，用户反馈存在多个体验问题：

1. **空间利用不足** - 模板边距过大（40px），内容无法填满页面，浪费了宝贵的移动端空间
2. **标题生成不智能** - 图片标题是硬编码的"AI对话摘要"，而不是 AI 根据对话内容生成的有意义的标题
3. **格式支持缺失** - AI 生成的摘要包含 Markdown 格式（如加粗、列表、代码块），但前端和图片渲染器都未处理这些格式，导致内容显示不正确
4. **异步流程问题** - 图片渲染在 AI 摘要生成完成前就开始执行，导致图片内容为空或显示"暂无摘要"
5. **可读性差** - 汇总信息（detailed_summary）通常很长，直接显示影响页面布局和用户体验

这些问题影响了产品的专业性和可用性，需要立即改进以提供更好的用户体验。

## 变更内容

### 新增功能
- **Markdown 渲染支持** - 前端和图片渲染器支持完整的 Markdown 格式（加粗、斜体、列表、代码块、链接等）
- **AI 标题生成** - AI 生成摘要时同时生成简短的标题（10-20字），用于图片标题和页面显示
- **异步渲染协调** - 图片渲染任务等待 AI 摘要生成完成后再开始执行
- **内容折叠功能** - 汇总信息添加折叠/展开控制，默认收起状态

### 修改功能
- **小红书模板边距优化** - 减少卡片内边距从 40px 到 10px，增加内容区域利用率
- **自动生成流程改进** - 调整 AI 生成和图片渲染的时序，确保数据准备完成后再渲染
- **数据库 schema 变更** - conversations 表添加 `title` 字段存储 AI 生成的标题

### 数据库变更
- **ALTER TABLE conversations ADD COLUMN title TEXT** - 存储 AI 生成的对话标题
- **Migration 脚本** - 为现有数据生成标题（可选）

## 功能 (Capabilities)

### 新增功能

#### markdown-rendering
支持前端和图片渲染器中的 Markdown 格式解析和渲染。涵盖：
- 标题（H1-H6）
- 加粗、斜体
- 无序和有序列表
- 代码块（带语法高亮）
- 链接
- 引用块
- 换行和段落

#### ai-title-generation
AI 在生成摘要时同时生成标题。包括：
- 标题长度：10-20个中文字符
- 标题风格：简洁、吸引人、概括对话主题
- 生成时机：与 social_media_summary 同时生成
- 存储位置：conversations.title 字段

#### async-render-queue
改进渲染队列的异步协调机制：
- 渲染任务依赖 AI 任务完成
- 实现任务依赖关系管理
- 添加任务状态监控
- 支持条件触发（AI 完成后触发渲染）

#### content-collapse
汇总信息的折叠/展开功能：
- 默认状态：收起
- 显示内容：摘要的前100个字符 + "展开"按钮
- 交互：点击展开显示完整内容
- 动画：平滑的展开/收起动画

### 修改功能

#### xiaohongshu-template
优化小红书模板的布局和内容显示：
- 减少内边距：40px → 10px
- 使用 AI 生成的 title 替代硬编码标题
- 支持 Markdown 格式渲染
- 保持现有的渐变背景和卡片设计

#### auto-generation
改进自动生成流程的任务协调：
- 调整任务触发顺序
- 添加任务依赖检查
- 实现条件触发机制
- 改进错误处理和重试逻辑

## 影响

### Backend
- **AI Prompt** - 修改 prompt 要求同时生成 title
- **AI Queue** - 添加 title 生成和处理逻辑
- **Render Queue** - 实现任务依赖机制
- **Templates** - 所有模板添加 Markdown 渲染和 title 显示
- **Database** - 添加 conversations.title 字段
- **API** - 可能需要更新 API 响应包含 title

### Frontend
- **Components** - 新建 MarkdownRenderer 组件
- **Conversation Page** - 集成 Markdown 渲染和折叠功能
- **Image Gallery** - 更新图片显示逻辑
- **UI Components** - 添加折叠/展开按钮组件

### Dependencies
可能需要新增：
- Markdown 解析库（如 `marked`、`markdown-it`）
- 语法高亮库（如 `highlight.js`、`prism.js`）

### Performance
- Markdown 渲染可能增加前端渲染时间（需要性能测试）
- 异步协调可能延长整体生成时间（但提高成功率）

### Breaking Changes
无破坏性变更。所有修改向后兼容：
- 旧数据没有 title 时使用默认值
- Markdown 渲染失败时回退到纯文本
