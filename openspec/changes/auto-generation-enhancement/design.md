# Design: 自动生成增强

## 上下文

当前系统在对话采集后需要用户手动点击多个按钮才能生成汇总、摘要和图片，操作繁琐。详情页也无法清晰展示生成状态和结果。本次改进旨在优化用户体验，实现自动化和实时反馈。

**当前状态**：
- 浏览器插件可以采集对话并提交到后端
- 后端提供 AI 生成和图片渲染的 API
- 详情页提供生成按钮，用户手动点击后触发任务
- 详情页无法实时展示生成进度
- 生成的图片无法在详情页展示

**约束**：
- 必须保持向后兼容，不影响现有的手动生成流程
- 必须确保采集接口的响应时间不受影响（异步触发生成）
- 必须避免过度的轮询导致服务器压力
- 必须正确处理任务失败和重试逻辑

**利益相关者**：
- 浏览器插件用户：希望采集后自动获得完整内容
- Web 平台用户：希望实时了解生成进度和查看结果
- 系统运维：需要控制资源消耗和 API 调用频率

## 目标 / 非目标

**目标：**
1. 采集成功后自动触发所有生成任务（AI 摘要、AI 汇总、图片渲染）
2. 详情页实时展示生成任务的状态（进行中/已完成/失败）
3. 详情页自动展示已生成的内容（摘要、汇总、图片）
4. 详情页提供重新生成功能，支持更新已过期的内容
5. 详情页提供图片展示和预览功能

**非目标：**
1. 不修改生成任务的核心逻辑（AI 调用、Puppeteer 渲染）
2. 不实现用户认证和权限控制
3. 不修改采集接口的输入输出格式
4. 不实现批量操作管理后台

## 决策

### 1. 采集后自动触发生成

**决策**：在采集接口（POST /api/conversations）的成功回调中触发生成任务

**理由**：
- 确保对话数据已持久化后再触发生成，避免数据丢失
- 生成任务在后台异步执行，不影响接口响应时间
- 用户无感知，体验流畅

**实现方案**：
```typescript
// backend/src/routes/conversations.ts
async function createConversation(req, reply) {
  // 1. 保存对话到数据库
  const conversation = conversationRepo.create(data);

  // 2. 返回响应（不等待生成任务）
  reply.status(201).send(conversation);

  // 3. 异步触发生成任务
  setImmediate(() => {
    triggerAutoGeneration(conversation);
  });
}

async function triggerAutoGeneration(conversation: Conversation) {
  const aiQueue = getAITaskQueue();
  const renderQueue = getRenderQueue();

  // 触发 AI 摘要生成
  aiQueue.addTask('social_media_summary', conversation.id, conversation);

  // 触发 AI 汇总生成
  aiQueue.addTask('detailed_summary', conversation.id, conversation);

  // 触发图片渲染（Bento UI 作为默认）
  renderQueue.addTask('bento', conversation.id, conversation.toRenderData());
}
```

**替代方案**：在采集接口中直接等待生成任务完成
- **为什么不选**：会导致接口响应时间过长（30秒+），影响用户体验

### 2. 生成任务状态查询 API

**决策**：新增 GET /api/conversations/:id/status 端点，返回所有生成任务的状态

**理由**：
- 前端需要一个统一的接口获取所有任务状态
- 避免多次轮询不同类型的任务接口
- 简化前端逻辑

**数据结构**：
```typescript
interface TaskStatus {
  type: 'social_media_summary' | 'detailed_summary' | 'bento' | 'newsletter' | 'retro_letter';
  category: 'ai' | 'render';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface GenerationStatusResponse {
  conversationId: number;
  tasks: TaskStatus[];
}
```

**实现方案**：
```typescript
// backend/src/routes/status.ts
fastify.get('/api/conversations/:id/status', async (request, reply) => {
  const conversationId = parseInt((request.params as any).id);

  // 获取 AI 任务状态
  const aiQueue = getAITaskQueue();
  const aiTasks = aiQueue.getConversationTasks(conversationId);

  // 获取渲染任务状态
  const renderQueue = getRenderQueue();
  const renderTasks = renderQueue.getConversationTasks(conversationId);

  // 组合结果
  const tasks: TaskStatus[] = [
    ...aiTasks.map(t => ({
      type: t.type,
      category: 'ai' as const,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      error: t.error
    })),
    ...renderTasks.map(t => ({
      type: t.type,
      category: 'render' as const,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      error: t.error
    }))
  ];

  reply.send({ conversationId, tasks });
});
```

### 3. 详情页轮询机制

**决策**：使用 setInterval 进行轮询，间隔 2 秒

**理由**：
- 实现简单，不需要 WebSocket 或 SSE
- 2 秒间隔平衡了实时性和服务器负载
- 所有任务完成后自动停止轮询

**前端实现**：
```typescript
// web/app/public/[id]/page.tsx
useEffect(() => {
  let pollInterval: NodeJS.Timeout;

  const pollStatus = async () => {
    const response = await fetch(`/api/conversations/${id}/status`);
    const data = await response.json();

    setTaskStatus(data.tasks);

    // 检查是否所有任务都完成或失败
    const allDone = data.tasks.every(t =>
      t.status === 'completed' || t.status === 'failed'
    );

    if (allDone) {
      clearInterval(pollInterval);
      // 重新加载对话数据以获取最新结果
      fetchConversation(id);
    }
  };

  // 立即执行一次
  pollStatus();

  // 设置轮询
  pollInterval = setInterval(pollStatus, 2000);

  return () => clearInterval(pollInterval);
}, [id]);
```

**优化策略**：
- 如果对话已创建超过 1 小时，认为所有任务已完成，不进行轮询
- 如果用户离开页面，自动清理轮询定时器

### 4. 图片展示组件

**决策**：在详情页新增图片展示区域，使用 CSS Grid 布局

**理由**：
- CSS Grid 响应式布局，适配不同屏幕尺寸
- 简单直观，不需要复杂的第三方库

**组件结构**：
```typescript
// web/components/ImageGallery.tsx
interface ImageGalleryProps {
  images: Array<{
    url: string;
    template: 'bento' | 'newsletter' | 'retro_letter';
    createdAt: string;
  }>;
}

export function ImageGallery({ images }: ImageGalleryProps) {
  if (images.length === 0) {
    return <div className="placeholder">暂无渲染图片</div>;
  }

  return (
    <div className="image-gallery">
      {images.map(img => (
        <div key={img.url} className="image-card">
          <div className="template-tag">{img.template}</div>
          <img src={img.url} alt={img.template} onClick={() => openPreview(img)} />
        </div>
      ))}
    </div>
  );
}
```

**样式设计**：
- 使用 Masonry 布局（瀑布流）
- 图片宽高比自适应
- 悬停时显示操作工具栏（下载、复制）
- 模板标签使用不同颜色区分

### 5. 图片预览模态框

**决策**：使用受控组件实现模态框，支持键盘操作

**实现方案**：
```typescript
// web/components/ImagePreview.tsx
export function ImagePreview({ src, onClose }: ImagePreviewProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <img src={src} alt="预览" />
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
```

### 6. 重新生成逻辑

**决策**：复用现有的生成 API，前端在调用前显示"生成中..."状态

**理由**：
- 避免代码重复
- 后端 API 已支持覆盖旧数据的逻辑
- 前端状态管理统一

**前端实现**：
```typescript
const regenerate = async (type: string) => {
  // 设置生成中状态
  setGenerating(prev => ({ ...prev, [type]: true }));

  try {
    // 调用生成 API
    await fetch(`/api/conversations/${id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, regenerate: true })
    });

    // 开始轮询状态
    startPolling();
  } catch (error) {
    console.error('重新生成失败', error);
    setGenerating(prev => ({ ...prev, [type]: false }));
  }
};
```

**后端 API 修改**：
```typescript
// backend/src/routes/ai.ts
fastify.post('/api/conversations/:id/generate', async (request, reply) => {
  const { type, regenerate = false } = request.body as any;

  // 如果是重新生成，先清除旧数据
  if (regenerate) {
    if (type === 'social_media_summary') {
      conversationRepo.update(conversationId, { social_media_summary: null });
    } else if (type === 'detailed_summary') {
      conversationRepo.update(conversationId, { detailed_summary: null });
    }
  }

  // 创建生成任务
  const task = queue.addTask(type, conversationId, conversation);

  reply.status(202).send({ taskId: task.id, status: task.status });
});
```

## 风险 / 权衡

### 风险 1: 采集后自动触发生成增加资源消耗
**影响**：所有采集的对话都会触发生成任务，可能导致资源浪费

**缓解措施**：
- 添加配置选项，允许禁用自动生成（环境变量 `AUTO_GENERATION_ENABLED=true`）
- 监控资源使用情况（CPU、内存、API 调用次数）
- 考虑添加速率限制，避免短时间内大量采集导致资源耗尽

### 风险 2: 轮询导致服务器压力
**影响**：大量用户同时查看详情页会产生大量 API 请求

**缓解措施**：
- 设置合理的轮询间隔（2 秒）
- 所有任务完成后立即停止轮询
- 考虑实现 HTTP 缓存（ETag），减少重复计算
- 监控 API 请求量，必要时增加限流

### 风险 3: 生成任务失败导致数据不一致
**影响**：部分任务成功、部分任务失败，用户看到不完整的内容

**缓解措施**：
- 任务失败时保留旧数据，不覆盖
- 显示明确的错误提示和重试按钮
- 记录详细的错误日志，便于排查问题
- 考虑实现任务失败后的自动重试机制（已存在，最多 3 次）

### 风险 4: 图片 URL 过期导致无法显示
**影响**：如果图片存储在临时位置，可能被清理

**缓解措施**：
- 使用持久的存储路径（不依赖 `/tmp/`）
- 在数据库中记录图片 URL 和创建时间
- 考虑实现图片上传到对象存储（S3、OSS）
- 前端添加图片加载失败的错误处理

## 迁移计划

### 部署步骤

1. **阶段 1：后端 API 修改**（无影响，向后兼容）
   - 修改 POST /api/conversations，添加自动触发逻辑
   - 新增 GET /api/conversations/:id/status 端点
   - 修改生成 API，支持 regenerate 参数
   - 测试：确保现有功能不受影响

2. **阶段 2：数据库 Schema 更新**（如需要）
   - 检查是否需要新增字段存储任务状态
   - 如需要，执行数据库迁移脚本
   - 备份数据库

3. **阶段 3：前端组件开发**
   - 开发生成状态展示组件
   - 开发图片展示和预览组件
   - 修改详情页，集成新组件
   - 添加轮询逻辑

4. **阶段 4：测试和验证**
   - 测试采集后自动触发生成流程
   - 测试详情页状态展示
   - 测试图片展示和预览
   - 测试重新生成功能
   - 性能测试：确保采集接口响应时间不受影响

5. **阶段 5：灰度发布**
   - 先发布到测试环境
   - 小范围用户试用
   - 收集反馈并优化
   - 正式发布到生产环境

### 回滚策略

**如果出现问题，可以按以下顺序回滚**：
1. 禁用自动生成（设置环境变量 `AUTO_GENERATION_ENABLED=false`）
2. 前端回滚到旧版本详情页（保留手动生成按钮）
3. 后端回滚到旧版本 API（移除状态查询端点）

**回滚不影响已有数据**：
- 已生成的摘要、汇总、图片仍然保留
- 用户仍可手动触发生成
- 数据库无需回滚

## 开放问题

1. **是否需要实现任务优先级队列？**
   - 当前：所有任务平等对待，先到先服务
   - 潜在改进：根据任务类型设置优先级（AI 摘要 > 图片渲染）

2. **是否需要实现生成历史记录？**
   - 当前：重新生成会覆盖旧数据
   - 潜在改进：保留历史版本，允许用户回滚

3. **是否需要实现批量管理生成任务？**
   - 当前：每个对话独立触发生成
   - 潜在改进：支持批量重新生成多个对话

4. **图片存储策略**
   - 当前：临时存储在 `/tmp/renders/`
   - 潜在改进：上传到对象存储（S3、OSS）并使用 CDN
