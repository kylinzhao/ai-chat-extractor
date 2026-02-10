# Proposal: AI Chat Extractor

## 为什么

AI 对话内容分散在不同平台（Gemini、豆包等），形成数据孤岛，难以统一管理和二次利用。用户需要一种方式将碎片化对话快速转化为结构化笔记和社交媒体分享内容，打破平台壁垒，提升内容复用价值。

## 变更内容

**新增功能**：
- **浏览器插件**：支持从 Gemini (Web) 和豆包 (Web) 采集原始对话内容，包括文本流、图片和元数据
- **后端处理引擎**：接收插件采集的数据，通过 DeepSeek API 进行"去 AI 化"总结，生成详细汇总和社媒摘要
- **视觉渲染系统**：基于 Puppeteer 将社媒摘要渲染为专业分享图，支持 Bento UI、Newsletter、复古信纸三种模板
- **Web 管理平台**：提供公开展示页和密钥保护的管理后台，支持内容公开/隐藏控制、手动编辑和删除功能

**技术实现**：
- 使用 Chrome Extension Manifest V3 开发浏览器插件
- 后端使用 Node.js (Fastify/Koa) + Puppeteer
- 集成 DeepSeek-V3/R1 API 进行 AI 加工
- 数据存储使用 SQLite 或 MongoDB

## 功能 (Capabilities)

### 新增功能

- **browser-extension**: 浏览器插件采集功能。支持在 Gemini 和豆包网页版聊天页面注入采集按钮，抓取完整对话文本流、图片 URL、平台名称、模型版本、抓取时间等元数据，并以 JSON 格式发送至后端 API。

- **backend-processor**: 后端 AI 加工与数据处理引擎。接收插件采集的原始对话数据，调用 DeepSeek API 生成详细汇总（适用于笔记软件）和社媒摘要（短小精悍的分享文案），管理对话与总结的关联关系（一个原始对话对应一个 Summary_Group）。

- **template-rendering**: Puppeteer 视觉渲染与模板系统。将生成的社媒摘要填充至 HTML 模板，使用 Headless Chrome 进行 @2x 高清截图。内置 Bento UI（现代化卡片布局）、Newsletter（模拟订阅邮件）、复古信纸（物理质感）三种专业模板。

- **web-platform**: Web 管理与展示平台。提供公开展示页（瀑布流或列表展示已公开内容）和管理后台（通过固定密钥 URL 访问），支持一键切换公开/隐藏状态、手动修改 AI 生成内容、物理删除记录等功能。

- **ai-prompting**: AI 提示词策略与内容生成。预置"去 AI 化"指令，避开"总之、综上所述、首先/其次"等 AI 常用词汇，模拟资深博主或技术专家在社交媒体的日常分享风格，限制字数并突出金句和核心结论。

### 修改功能

无（这是全新项目，无现有功能需要修改）

## 影响

**系统架构**：
- 新增完整的全栈应用架构，包括浏览器插件、后端服务和 Web 前端
- 需要部署具备海外访问能力的云服务器（兼顾 Gemini 访问）

**外部依赖**：
- DeepSeek API 密钥（用于 AI 内容加工）
- Puppeteer/Chrome 运行环境（用于图片渲染）
- 数据库服务（SQLite 或 MongoDB）

**用户体验**：
- 浏览器插件用户需要授予相应网站的页面访问权限
- 管理后台通过固定密钥 URL 访问，无需账户体系

**数据流**：
- 浏览器 → 后端 API → AI 处理 → 图片渲染 → 数据存储 → Web 展示
- 涉及跨域数据传输，需要处理 CORS 和安全验证

**Roadmap**：
- 第一阶段 (MVP): 插件抓取 + DeepSeek 基础总结
- 第二阶段 (Visual): 集成 Puppeteer，上线 2 款专业模板
- 第三阶段 (Archive): 上线 Web 管理页面
- 第四阶段 (Integration): 预留 NotebookLM/Notion 导出接口
