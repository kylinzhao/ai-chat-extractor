# Tasks: AI Chat Extractor

## 1. 项目设置和基础设施

- [x] 1.1 创建项目根目录和 monorepo 结构（`/plugins/`, `/backend/`, `/web/`）
- [x] 1.2 初始化 Git 仓库，配置 .gitignore 文件
- [x] 1.3 后端项目：初始化 Node.js 项目，安装 Fastify、TypeScript、开发依赖
- [x] 1.4 后端项目：配置 TypeScript 编译选项和 tsconfig.json
- [x] 1.5 后端项目：配置 ESLint、Prettier 代码规范工具
- [x] 1.6 后端项目：设置环境变量管理（dotenv），创建 .env.example 文件
- [x] 1.7 数据库：设计 SQLite 数据库 Schema（conversations、summary_groups 表）
- [x] 1.8 数据库：实现数据库初始化脚本和迁移工具
- [x] 1.9 数据库：创建数据访问层（Repository 模式），封装 CRUD 操作
- [x] 1.10 Docker：创建后端服务的 Dockerfile
- [x] 1.11 Docker：创建 docker-compose.yml，编排后端、数据库服务
- [ ] 1.12 CI/CD：配置 GitHub Actions 或 GitLab CI（可选）

## 2. 浏览器插件开发（MVP 阶段）

- [x] 2.1 插件项目：创建 Chrome Extension 项目结构（manifest.json、background.js、content.js、popup）
- [x] 2.2 插件配置：编写 manifest.json（Manifest V3），声明必要权限（activeTab、storage、host_permissions）
- [x] 2.3 插件配置：配置插件图标和 Popup UI
- [x] 2.4 Content Script：实现 Gemini 页面的 DOM 结构分析和选择器
- [x] 2.5 Content Script：实现豆包页面的 DOM 结构分析和选择器
- [x] 2.6 Content Script：实现对话采集逻辑（提取消息、图片、元数据）
- [x] 2.7 Content Script：实现采集按钮注入逻辑（悬浮按钮或 Popup 触发）
- [x] 2.8 Background Script：实现 API 通信模块（发送数据到后端）
- [x] 2.9 Background Script：实现错误处理和重试逻辑
- [x] 2.10 Popup UI：设计并实现 Popup 界面（采集触发、状态显示、配置）
- [x] 2.11 插件配置：实现后端 API 地址配置功能（存储到 chrome.storage）
- [ ] 2.12 插件测试：在 Gemini 和豆包网站进行端到端测试
- [ ] 2.13 插件打包：构建生产版本，准备发布到 Chrome Web Store

## 3. 后端 API 开发

- [x] 3.1 API 路由：实现 POST /api/conversations 端点（接收插件数据）
- [x] 3.2 API 验证：实现请求体验证（JSON Schema），验证必需字段
- [x] 3.3 API 验证：实现 CORS 配置和来源验证
- [x] 3.4 业务逻辑：实现对话数据存储逻辑（创建 conversation 记录）
- [x] 3.5 业务逻辑：实现 Summary_Group 关联记录创建
- [x] 3.6 API 路由：实现 GET /api/conversations（查询所有记录，支持分页、筛选）
- [x] 3.7 API 路由：实现 GET /api/conversations/:id（查询单条记录）
- [x] 3.8 API 路由：实现 PATCH /api/conversations/:id（更新记录，支持手动编辑）
- [x] 3.9 API 路由：实现 DELETE /api/conversations/:id（删除记录）
- [x] 3.10 API 路由：实现 POST /api/conversations/batch-update-visibility（批量切换可见性）
- [x] 3.11 API 路由：实现 POST /api/conversations/batch-delete（批量删除）
- [x] 3.12 API 安全：实现请求频率限制（Rate Limiting）
- [ ] 3.13 API 安全：实现输入清理和验证（防止注入攻击）
- [ ] 3.14 API 日志：实现操作日志记录（数据接收、错误、API 调用）
- [ ] 3.15 API 文档：集成 Swagger/OpenAPI 文档（可选）

## 4. SiliconFlow AI 集成

- [x] 4.1 AI 客户端：创建 SiliconFlow API 客户端模块（兼容 OpenAI 格式）
- [x] 4.2 AI 客户端：实现 API 密钥配置和请求头设置
- [x] 4.3 AI 客户端：实现模型切换配置（支持 DeepSeek-V3、DeepSeek-R1 等）
- [x] 4.4 AI 客户端：实现错误处理和重试逻辑（最多 3 次）
- [x] 4.5 提示词管理：创建提示词配置模块（支持变量替换）
- [x] 4.6 提示词管理：实现"详细汇总"提示词模板
- [x] 4.7 提示词管理：实现"社媒摘要"提示词模板
- [x] 4.8 提示词管理：实现"去 AI 化"指令和禁用词检测
- [x] 4.9 AI 调用：实现异步任务队列（处理 AI 生成请求）
- [x] 4.10 AI 调用：实现详细汇总生成逻辑
- [x] 4.11 AI 调用：实现社媒摘要生成逻辑
- [x] 4.12 AI 调用：实现 Token 计数和成本计算
- [x] 4.13 AI 监控：实现 API 调用日志记录（Token 消耗、成本、响应时间）
- [ ] 4.14 AI 缓存：实现请求缓存（相同对话不重复生成）
- [ ] 4.15 AI 限流：实现每日调用上限控制

## 5. Puppeteer 渲染系统开发

- [x] 5.1 渲染服务：创建 Puppeteer 模块，封装实例管理逻辑
- [x] 5.2 渲染服务：实现 Puppeteer 实例池（预启动 3-5 个实例）
- [x] 5.3 渲染服务：实现任务队列（限制并发渲染数量）
- [x] 5.4 渲染服务：实现实例获取和释放逻辑
- [x] 5.5 HTML 模板：创建 Bento UI 模板（HTML + CSS）
- [x] 5.6 HTML 模板：创建 Newsletter 模板（HTML + CSS）
- [x] 5.7 HTML 模板：创建复古信纸模板（HTML + CSS）
- [x] 5.8 模板引擎：实现变量替换逻辑（填充社媒摘要、元数据）
- [x] 5.9 渲染逻辑：实现 HTML 加载和截图生成（@2x 高清）
- [ ] 5.10 渲染逻辑：实现图片保存到文件系统
- [ ] 5.11 渲染逻辑：实现图片 URL 生成和存储
- [x] 5.12 渲染服务：实现错误处理和超时机制（30 秒超时）
- [x] 5.13 渲染服务：实现重试逻辑（最多 3 次）
- [ ] 5.14 性能优化：实现模板资源缓存（CSS、字体）
- [x] 5.15 性能监控：实现渲染性能指标记录（耗时、成功率）

## 6. Web 平台开发（公开展示页）

- [ ] 6.1 前端项目：初始化前端项目（HTML + 模板引擎 或 React + Next.js）
- [ ] 6.2 前端项目：配置构建工具和开发服务器
- [ ] 6.3 前端项目：配置 CSS 框架（如 Tailwind CSS 或 Bootstrap）
- [ ] 6.4 展示页：实现首页布局（瀑布流或列表视图）
- [ ] 6.5 展示页：实现记录卡片组件（分享图、摘要、元数据）
- [ ] 6.6 展示页：实现分页或无限滚动加载
- [ ] 6.7 详情页：实现单条记录详情页（`/public/:id`）
- [ ] 6.8 详情页：实现图片放大查看功能
- [ ] 6.9 详情页：实现原始对话和详细汇总的折叠展示
- [ ] 6.10 搜索和筛选：实现关键词搜索功能
- [ ] 6.11 搜索和筛选：实现平台和日期范围筛选
- [ ] 6.12 响应式设计：实现移动端、平板、桌面端适配
- [ ] 6.13 SEO：实现元标签生成（title、description、og:image）
- [ ] 6.14 SEO：实现结构化数据（JSON-LD）
- [ ] 6.15 分享功能：实现图片下载和社交分享

## 7. Web 平台开发（管理后台）

- [ ] 7.1 后台认证：实现固定密钥 URL 验证逻辑
- [ ] 7.2 后台认证：实现会话 Cookie 管理和过期机制
- [ ] 7.3 后台布局：实现管理后台界面框架（导航、侧边栏）
- [ ] 7.4 记录列表：实现所有记录的列表展示（包括隐藏记录）
- [ ] 7.5 状态管理：实现可见性切换按钮（公开/隐藏）
- [ ] 7.6 状态管理：实现批量更新可见性功能
- [ ] 7.7 内容编辑：实现社媒摘要编辑模态框
- [ ] 7.8 内容编辑：实现详细汇总编辑功能
- [ ] 7.9 内容编辑：实现重新渲染分享图功能
- [ ] 7.10 记录删除：实现单条记录删除功能（带确认对话框）
- [ ] 7.11 记录删除：实现批量删除功能
- [ ] 7.12 提示词管理：实现提示词模板编辑界面
- [ ] 7.13 提示词管理：实现提示词测试功能（真实 API 调用）
- [ ] 7.14 成本统计：实现 API 成本统计和趋势图表
- [ ] 7.15 系统设置：实现后端配置界面（API 密钥、管理路径、模板选择）

## 8. 测试和质量保证

- [ ] 8.1 单元测试：为后端 API 编写单元测试（Jest）
- [ ] 8.2 单元测试：为数据访问层编写单元测试
- [ ] 8.3 集成测试：编写端到端测试（插件 → 后端 → AI → 存储）
- [ ] 8.4 插件测试：在 Chrome 中手动测试插件功能
- [ ] 8.5 性能测试：测试 Puppeteer 渲染性能和并发能力
- [ ] 8.6 安全测试：测试 API 安全（CORS、注入攻击、频率限制）
- [ ] 8.7 兼容性测试：测试不同浏览器的兼容性（Chrome、Edge）
- [ ] 8.8 移动端测试：测试移动端响应式布局
- [ ] 8.9 用户验收测试：邀请小范围用户测试，收集反馈

## 9. 部署和运维

- [ ] 9.1 服务器准备：购买云服务器（推荐 Vultr 或 DigitalOcean）
- [ ] 9.2 服务器配置：安装 Docker 和 Docker Compose
- [ ] 9.3 服务器配置：配置域名和 DNS 解析
- [ ] 9.4 服务器配置：配置 SSL 证书（Let's Encrypt）
- [ ] 9.5 部署后端：使用 Docker Compose 部署后端和数据库
- [ ] 9.6 部署前端：构建并部署 Web 平台静态文件
- [ ] 9.7 反向代理：配置 Nginx 反向代理（可选）
- [ ] 9.8 监控：配置日志收集（Sentry 或 ELK）
- [ ] 9.9 监控：配置性能监控（Grafana 或 Uptime Robot）
- [ ] 9.10 备份：配置数据库自动备份（每日备份）
- [ ] 9.11 插件发布：提交插件到 Chrome Web Store
- [ ] 9.12 文档：编写部署文档和用户手册

## 10. 后续优化（第四阶段）

- [ ] 10.1 预留接口：设计 NotebookLM 导出接口
- [ ] 10.2 预留接口：设计 Notion 导出接口
- [ ] 10.3 平台扩展：调研 Claude 采集可行性
- [ ] 10.4 平台扩展：调研 ChatGPT 采集可行性
- [ ] 10.5 数据库迁移：实现 SQLite → MongoDB 迁移脚本
- [ ] 10.6 性能优化：分离 Puppeteer 服务到独立容器
- [ ] 10.7 用户系统：评估是否需要用户账户体系
