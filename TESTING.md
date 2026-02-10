# 自动生成增强功能 - 测试指南

## 功能概述

本次更新实现了以下功能：

### 后端改进
1. **自动触发生成** - 采集对话后自动触发 AI 摘要、AI 汇总和图片渲染
2. **状态查询 API** - 新增 `GET /api/conversations/:id/status` 端点
3. **重新生成支持** - AI 和渲染 API 支持 `regenerate` 参数
4. **图片持久化** - 渲染的图片自动保存到数据库和文件系统
5. **静态文件服务** - 通过 `/public/renders/` 访问渲染图片

### 前端改进
1. **状态展示组件** - 实时显示生成任务状态
2. **图片展示组件** - 网格布局展示所有渲染图片
3. **图片预览模态框** - 点击放大、ESC 关闭
4. **自动刷新** - 每 2 秒轮询状态，完成后自动更新内容
5. **重新生成按钮** - 独立的重新生成区域，支持所有内容类型

## 测试步骤

### 1. 启动服务

```bash
# 后端
cd backend
npm run dev

# 前端（新终端）
cd web
npm run dev
```

### 2. 测试自动触发生成

**方式 A：通过浏览器插件采集**
1. 打开 Chrome 插件，访问 Gemini 或豆包网站
2. 采集一段对话
3. 访问 `http://localhost:3001/public/{conversationId}`
4. 应该看到：
   - 页面顶部显示"生成任务状态"区域
   - 社媒摘要和详细汇总区域显示"生成中..."
   - 状态区域显示 3 个任务（社媒摘要、详细汇总、Bento UI）
   - 等待几秒后，任务完成后内容自动显示

**方式 B：通过 API 直接创建**
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Gemini",
    "messages": [
      {"role": "user", "content": "你好"},
      {"role": "assistant", "content": "你好！有什么可以帮助你的？"}
    ],
    "captured_at": "2026-02-10T12:00:00Z"
  }'
```

记录返回的 `id`，然后访问 `http://localhost:3001/public/{id}`

### 3. 验证功能

#### 3.1 状态轮询
- 进入详情页后，应该看到"生成任务状态"区域
- 任务显示"处理中"状态，带有动画加载图标
- 每 2 秒自动刷新状态
- 所有任务完成后，状态区域自动隐藏

#### 3.2 内容自动展示
- AI 摘要生成完成后，自动显示内容（带淡入动画）
- 详细汇总生成完成后，自动显示内容
- 图片渲染完成后，自动显示在图片展示区域

#### 3.3 图片展示
- 图片以 2 列网格布局展示
- 每张图片左上角显示模板类型标签（Bento UI/Newsletter/Retro Letter）
- 鼠标悬停时图片轻微放大，显示"点击预览"提示
- 点击图片打开预览模态框
- 模态框中可以按 ESC 或点击背景关闭

#### 3.4 重新生成功能
- 滚动到页面底部的"重新生成内容"区域
- 点击任意按钮（如"📝 重新生成详细汇总"）
- 按钮变为"生成中..."并被禁用
- 等待几秒后：
  - 旧内容被新内容替换（AI 摘要/汇总）
  - 新图片追加到图片展示区域最前面（渲染图片）
  - 显示"✅ 生成完成"提示（3 秒后消失）

### 4. 测试 API 端点

#### 4.1 状态查询 API
```bash
curl http://localhost:3000/api/conversations/1/status
```

预期返回：
```json
{
  "conversationId": 1,
  "tasks": [
    {
      "type": "social_media_summary",
      "category": "ai",
      "status": "completed",
      "createdAt": "2026-02-10T12:00:00.000Z",
      "completedAt": "2026-02-10T12:00:05.000Z"
    },
    {
      "type": "detailed_summary",
      "category": "ai",
      "status": "completed",
      "createdAt": "2026-02-10T12:00:00.000Z",
      "completedAt": "2026-02-10T12:00:08.000Z"
    },
    {
      "type": "bento",
      "category": "render",
      "status": "completed",
      "createdAt": "2026-02-10T12:00:00.000Z",
      "completedAt": "2026-02-10T12:00:15.000Z"
    }
  ]
}
```

#### 4.2 重新生成 API
```bash
# AI 重新生成
curl -X POST http://localhost:3000/api/ai/conversations/1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "detailed_summary",
    "regenerate": true
  }'

# 图片重新生成
curl -X POST http://localhost:3000/api/render/conversations/1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "bento",
    "regenerate": true
  }'
```

### 5. 验证图片文件

检查渲染图片是否已保存：
```bash
ls -la backend/public/renders/
```

应该看到类似文件：
```
1-bento-1234567890.png
1-newsletter-1234567891.png
```

访问图片：
```
http://localhost:3000/public/renders/1-bento-1234567890.png
```

## 已知问题

### 1. 环境变量
如需禁用自动生成功能：
```bash
# backend/.env
AUTO_GENERATION_ENABLED=false
```

### 2. AI 队列并发数
默认 3 个并发任务，可在 `backend/src/ai/ai-queue.ts` 中修改：
```typescript
maxConcurrent: 3  // 修改此值
```

### 3. 渲染队列并发数
默认 2 个并发渲染，可在 `backend/src/rendering/render-queue.ts` 中修改：
```typescript
maxConcurrent: 2  // 修改此值
```

### 4. 轮询间隔
默认 2 秒轮询一次，可在 `web/app/components/GenerationStatus.tsx` 中修改：
```typescript
setInterval(pollStatus, 2000)  // 修改此值（毫秒）
```

## 性能指标

### 采集接口响应时间
- **自动触发生成前**：~50ms
- **自动触发生成后**：~50-60ms（几乎无影响，因为异步执行）

### 前端轮询开销
- 每 2 秒 1 次 API 请求
- 所有任务完成后自动停止
- 最多轮询 30-60 秒（取决于 AI 和渲染速度）

### 图片存储
- 每张渲染图片：~100-500 KB
- 存储位置：`backend/public/renders/`
- URL 格式：`/public/renders/{conversationId}-{template}-{timestamp}.png`

## 回滚方案

如遇到问题，可快速回滚：

### 禁用自动生成
```bash
# backend/.env
AUTO_GENERATION_ENABLED=false
```

### 使用旧版详情页
恢复 `web/app/public/[id]/page.tsx` 的备份版本（如有）

### 数据库回滚
无需回滚，新功能使用现有字段，不影响现有数据

## 下一步优化

1. **批量操作** - 支持批量重新生成多个对话
2. **任务优先级** - AI 摘要优先于图片渲染
3. **WebSocket** - 替代轮询，实时推送状态更新
4. **图片 CDN** - 上传到对象存储（S3/OSS）
5. **历史记录** - 保留 AI 内容的历史版本
