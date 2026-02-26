# 实施任务清单

## 1. 数据库 Migration

- [x] 1.1 备份现有数据库 (`cp data/database.sqlite data/database.sqlite.backup`)
- [x] 1.2 创建 migration 脚本添加 `title` 字段 (`ALTER TABLE conversations ADD COLUMN title TEXT`)
- [x] 1.3 执行 migration 并验证字段添加成功
- [ ] 1.4 更新 `Conversation` 接口添加 `title?: string` 字段
- [ ] 1.5 准备回滚脚本（删除 title 字段）
- [ ] 1.6 测试迁移效果（创建新对话并检查 title 字段）

## 2. AI Prompt 和 Title 生成

- [x] 2.1 修改 `social_media_summary` 的 AI prompt，要求返回 JSON 格式（包含 title 和 summary）
- [x] 2.2 更新 AI Queue 解析逻辑，解析 JSON 响应
- [x] 2.3 实现失败回退：JSON 解析失败时提取第一句话作为 title
- [x] 2.4 保存 title 到数据库的 `conversations.title` 字段
- [x] 2.5 添加错误日志记录 AI title 生成失败情况
- [ ] 2.6 测试 AI 生成 title 的长度（10-20 字符）

## 3. 异步渲染任务依赖

- [x] 3.1 在 `RenderTask` 接口添加 `dependencies` 字段
- [x] 3.2 实现 `canExecute(task)` 方法检查依赖任务状态
- [x] 3.3 在 `worker()` 方法中调用 `canExecute()` 检查
- [x] 3.4 实现依赖未完成时跳过执行逻辑
- [x] 3.5 添加超时机制（等待依赖超过 5 分钟标记为 FAILED）
- [x] 3.6 更新 `triggerAutoGeneration()` 移除立即创建的渲染任务
- [x] 3.7 实现完成后自动触发：AI 完成后触发渲染任务

## 4. Markdown 渲染库集成

- [x] 4.1 安装 npm 依赖：`npm install react-markdown remark-gfm rehype-highlight`
- [x] 4.2 创建 `MarkdownRenderer` 组件（支持标题、列表、代码块、链接等）
- [x] 4.3 添加代码语法高亮样式（使用 `rehype-highlight`）
- [x] 4.4 实现 XSS 安全防护（确保 HTML 标签被转义）
- [x] 4.5 添加性能优化（React.memo、长度限制）
- [ ] 4.6 编写单元测试：Markdown 格式渲染正确性

## 5. 前端 Markdown 集成

- [x] 5.1 在对话详情页集成 `MarkdownRenderer` 到 `social_media_summary` 显示
- [x] 5.2 在对话详情页集成 `CollapsibleMarkdown` 到 `detailed_summary` 显示
- [ ] 5.3 测试各种 Markdown 格式（加粗、列表、代码块、链接）
- [ ] 5.4 测试长文本性能（> 5000 字符）
- [ ] 5.5 测试错误格式回退到纯文本

## 6. 图片模板 Markdown 渲染

- [x] 6.1 修改 `BentoTemplate` 支持 Markdown 渲染（在 HTML 中）
- [x] 6.2 修改 `NewsletterTemplate` 支持 Markdown 渲染
- [x] 6.3 修改 `RetroLetterTemplate` 支持 Markdown 渲染
- [x] 6.4 修改 `XiaohongshuTemplate` 支持 Markdown 渲染
- [x] 6.5 实现模板中 Markdown 到 HTML 的转换（使用 marked 库）
- [x] 6.6 确保特殊字符正确转义（防止 HTML 注入）
- [ ] 6.7 测试所有模板的 Markdown 渲染效果

## 7. 小红书模板优化

- [x] 7.1 修改 `XiaohongshuTemplate` 卡片内边距：`padding: 40px → 10px`
- [x] 7.2 调整标题下边距：`margin-bottom: 16px → 8px`
- [x] 7.3 调整内容下边距：`margin-bottom: 30px → 20px`
- [x] 7.4 使用 AI 生成的 `title` 替代硬编码的"AI 对话摘要"
- [x] 7.5 实现 `title` 为空时的回退逻辑（显示默认标题）
- [ ] 7.6 测试边距减少后的显示效果和可读性

## 8. 汇总信息折叠功能

- [ ] 8.1 创建 `CollapsibleText` 组件
- [ ] 8.2 实现默认收起状态（显示前 100 字符）
- [ ] 8.3 实现智能截断（在句子边界截断，避免中间截断）
- [ ] 8.4 添加展开/收起按钮和状态切换
- [ ] 8.5 实现 CSS transition 平滑动画（< 300ms）
- [ ] 8.6 集成到对话详情页的 `detailed_summary`
- [ ] 8.7 测试长文本折叠性能
- [ ] 8.8 测试快速切换的防抖机制

## 9. 一键生成所有渲染图片功能

- [x] 9.1 添加"一键生成所有"按钮到详情页
- [x] 9.2 实现并行触发所有4种模板的渲染（Bento、Newsletter、Retro Letter、小红书风格）
- [x] 9.3 添加实时进度显示（0/4 → 1/4 → 2/4 → 3/4 → 4/4 完成）
- [x] 9.4 实现事件驱动的进度更新机制
    - 后端渲染任务完成时发送 `render-complete` 自定义事件
    - 前端监听事件并实时更新进度条
- [x] 9.5 添加完整的错误处理和用户反馈

## 10. API 更新

- [ ] 9.1 更新 GET `/api/conversations/:id` 响应包含 `title` 字段
- [ ] 9.2 更新 GET `/api/conversations` 列表响应包含 `title` 字段
- [ ] 9.3 更新渲染任务状态 API 返回依赖任务状态
- [ ] 9.4 添加 GET `/api/conversations/:id/status` 返回 title 生成状态
- [ ] 9.5 更新 API 文档（如果有）

## 10. 测试

- [ ] 10.1 单元测试：AI Title 生成逻辑
- [ ] 10.2 单元测试：Markdown 渲染各种格式
- [ ] 10.3 单元测试：任务依赖检查逻辑
- [ ] 10.4 单元测试：智能截断逻辑
- [ ] 10.5 集成测试：新对话创建 → AI 生成（含 title） → 渲染图片
- [ ] 10.6 集成测试：重新生成功能
- [ ] 10.7 性能测试：长文本 Markdown 渲染时间（< 100ms）
- [ ] 10.8 性能测试：折叠/展开动画时间（< 300ms）
- [ ] 10.9 回归测试：确保现有功能正常（Bento UI、Newsletter、Retro Letter）
- [ ] 10.10 手动测试：浏览器插件采集新对话

## 11. 部署和监控

- [ ] 11.1 代码审查和合并到主分支
- [ ] 11.2 执行数据库 migration（在低峰期）
- [ ] 11.3 部署后端（包含 AI prompt 和依赖逻辑）
- [ ] 11.4 部署前端（包含 Markdown 组件和折叠功能）
- [ ] 11.5 监控 AI 生成成功率和失败率
- [ ] 11.6 监控渲染任务超时率
- [ ] 11.7 收集用户反馈和性能指标
- [ ] 11.8 准备回滚计划（如果出现重大问题）

## 12. 文档

- [ ] 12.1 更新 `FINAL_DELIVERY.md` 包含新功能
- [ ] 12.2 创建 `MARKDOWN_RENDERING.md` 说明文档
- [ ] 12.3 更新 README.md（如果有必要）
- [ ] 12.4 记录已知限制和未来优化方向
