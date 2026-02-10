# SiliconFlow AI 集成配置指南

## 1. 获取 SiliconFlow API 密钥

1. 访问硅基流动官网：https://siliconflow.cn
2. 注册账号并登录
3. 进入"API 密钥"页面
4. 创建新的 API 密钥

## 2. 配置后端环境变量

编辑 `backend/.env` 文件，添加以下配置：

```bash
# SiliconFlow API Configuration（兼容 OpenAI 格式）
SILICONFLOW_API_KEY=你的_api_密钥
SILICONFLOW_API_BASE=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3
```

### 可选模型列表

硅基流动支持多种模型，可以根据需求切换：

- **DeepSeek 系列**（推荐）：
  - `deepseek-ai/DeepSeek-V3` - 最新的 DeepSeek V3 模型
  - `deepseek-ai/DeepSeek-R1` - DeepSeek 推理模型

- **Qwen 系列**：
  - `Qwen/Qwen2.5-7B-Instruct` - 通义千问 2.5
  - `Qwen/Qwen2.5-72B-Instruct` - 更强的千问模型

- 其他模型请查看：https://siliconflow.cn/models

## 3. 重启后端服务

```bash
cd backend
npm run dev
```

## 4. 测试连接

运行测试脚本：

```bash
./test-siliconflow.sh
```

或者手动测试：

```bash
# 测试 AI 连接
curl http://localhost:3000/api/ai/test

# 查看提示词模板
curl http://localhost:3000/api/ai/prompts

# 查看队列状态
curl http://localhost:3000/api/ai/queue/status
```

## 5. API 使用说明

### 5.1 生成详细汇总

```bash
curl -X POST http://localhost:3000/api/ai/conversations/1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "detailed_summary"
  }'
```

响应：
```json
{
  "taskId": "1-detailed_summary-1234567890",
  "status": "pending",
  "message": "Task queued successfully"
}
```

### 5.2 生成社媒摘要

```bash
curl -X POST http://localhost:3000/api/ai/conversations/1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "social_media_summary"
  }'
```

### 5.3 查询任务状态

```bash
curl http://localhost:3000/api/ai/tasks/{taskId}
```

响应：
```json
{
  "id": "1-detailed_summary-1234567890",
  "type": "detailed_summary",
  "conversationId": 1,
  "status": "completed",
  "result": "生成的汇总内容...",
  "usage": {
    "promptTokens": 1000,
    "completionTokens": 500,
    "totalTokens": 1500,
    "cost": 0.0003
  }
}
```

### 5.4 检查禁用词

```bash
curl -X POST http://localhost:3000/api/ai/check-forbidden-words \
  -H "Content-Type: application/json" \
  -d '{
    "text": "总之，这是一个测试文本",
    "templateName": "detailed_summary"
  }'
```

响应：
```json
{
  "hasViolation": true,
  "foundWords": ["总之"],
  "count": 1
}
```

### 5.5 清理禁用词

```bash
curl -X POST http://localhost:3000/api/ai/clean-forbidden-words \
  -H "Content-Type: application/json" \
  -d '{
    "text": "总之，这是一个测试文本",
    "templateName": "detailed_summary"
  }'
```

响应：
```json
{
  "originalText": "总之，这是一个测试文本",
  "cleanedText": "，这是一个测试文本",
  "hasRemainingViolations": false,
  "remainingWords": []
}
```

## 6. 提示词模板

### 6.1 详细汇总模板（detailed_summary）

生成结构化的详细汇总文档，包含：
- 背景介绍
- 主要内容（分层级）
- 结论/行动项

特点：
- 使用 Markdown 格式
- 保留代码、链接等重要信息
- 禁用 AI 常用套话
- 字数：500-2000 字

### 6.2 社媒摘要模板（social_media_summary）

生成适合社交媒体分享的精简文案，包含：
- 吸引人的开头
- 1-3 个核心要点
- emoji 适度使用
- 互动话题或标签

特点：
- 字数：140-280 字
- 语言自然有个性
- 适合微博、Twitter、朋友圈
- 包含 # 标签

## 7. 成本估算

以 DeepSeek-V3 模型为例（参考价格）：

- 输入：¥0.14 / 1M tokens
- 输出：¥0.28 / 1M tokens

**示例计算**：
- 一篇对话 3000 tokens（输入）+ 1000 tokens（输出）
- 成本：(3000 * 0.14 + 1000 * 0.28) / 1,000,000 = ¥0.0007
- 即：每生成一篇汇总约 ¥0.0007（0.07 分）

**月度估算**（假设每天处理 100 篇）：
- 月处理量：3000 篇
- 月成本：3000 * 0.0007 = ¥2.1

## 8. 常见问题

### Q1: API 调用失败

**可能原因**：
- API 密钥未配置或错误
- 网络连接问题
- API 配额用完

**解决方案**：
1. 检查 `.env` 文件中的 `SILICONFLOW_API_KEY`
2. 测试网络连接：`curl https://api.siliconflow.cn/v1`
3. 检查硅基流动账户余额和配额

### Q2: 生成内容包含禁用词

**解决方案**：
1. 使用 `/api/ai/clean-forbidden-words` 端点清理
2. 或在提示词中强化"去 AI 化"指令
3. 或修改 `prompts.ts` 中的禁用词列表

### Q3: 队列任务一直 pending

**可能原因**：
- AI 队列未启动
- 后端服务未重启

**解决方案**：
1. 重启后端服务
2. 检查队列状态：`curl http://localhost:3000/api/ai/queue/status`
3. 查看后端日志是否有错误

### Q4: 想要切换到其他模型

**步骤**：
1. 编辑 `backend/.env`
2. 修改 `SILICONFLOW_MODEL` 为目标模型
3. 重启后端服务
4. 测试连接：`curl http://localhost:3000/api/ai/test`

## 9. 下一步

AI 集成完成后，可以继续：

1. ✅ **Phase 5**: Puppeteer 渲染系统（生成分享图片）
2. ✅ **Phase 6-7**: Web 平台开发（公开展示页 + 管理后台）
3. ✅ **测试**: 端到端测试（采集 → AI 生成 → 渲染 → 展示）

需要帮助？查看：
- 项目文档：`openspec/changes/ai-chat-extractor/`
- 任务列表：`openspec/changes/ai-chat-extractor/tasks.md`
- API 文档：运行后端后访问 `/docs`（如果集成了 Swagger）
