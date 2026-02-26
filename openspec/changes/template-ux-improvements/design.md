# 模板和用户体验改进 - 技术设计

## 上下文

### 当前状态
- 小红书模板已上线，但存在多个体验问题
- AI 生成和图片渲染是异步独立的任务，没有依赖关系
- 摘要内容是 Markdown 格式，但前端和图片都未处理
- 数据库没有 `title` 字段，标题是硬编码的
- 汇总信息直接显示，影响页面布局

### 约束
- **向后兼容**: 不能破坏现有数据和 API
- **性能**: Markdown 渲染不能显著增加页面加载时间
- **依赖**: 可能需要引入新的 npm 库（Markdown 解析、语法高亮）
- **数据库**: 需要执行 migration 添加 `title` 字段

### 利益相关者
- **前端用户**: 需要更好的内容展示和交互体验
- **产品经理**: 需要更有吸引力的标题和格式
- **开发者**: 需要清晰的实现路径和向后兼容性

---

## 目标 / 非目标

**目标：**
1. 实现完整的 Markdown 渲染支持（前端 + 图片）
2. AI 同时生成 title，用于图片和页面显示
3. 修复异步流程，确保渲染等待 AI 完成
4. 优化小红书模板边距（40px → 10px）
5. 添加汇总信息折叠/展开功能

**非目标：**
- 不修改其他模板（Bento UI、Newsletter、Retro Letter）的边距
- 不改变现有的 AI 摘要生成逻辑（只添加 title 生成）
- 不实现实时 Markdown 预览（编辑时）
- 不支持自定义 Markdown 渲染样式

---

## 决策

### 1. Markdown 渲染库选择

**决策**: 使用 `react-markdown` + `remark-gfm` + `rehype-highlight`

**理由**:
- `react-markdown` 是 React 生态中最流行的 Markdown 渲染库
- `remark-gfm` 支持 GitHub Flavored Markdown（表格、删除线等）
- `rehype-highlight` 提供代码语法高亮
- 与 Next.js 15 兼容性好
- 自动处理 XSS 安全性（默认转义 HTML）

**替代方案**:
- `marked`: 更快但不支持 React 组件集成
- `markdown-it`: 功能强大但不是 React 原生
- 自己实现: 工作量大，安全性风险高

**安装命令**:
```bash
npm install react-markdown remark-gfm rehype-highlight
```

---

### 2. AI Title 生成方案

**决策**: 修改 AI prompt，在生成摘要时同时生成 title

**实现**:
- 修改 `social_media_summary` 的 AI prompt
- 要求输出格式：
  ```json
  {
    "title": "简短的标题（10-20字）",
    "summary": "社交媒体摘要内容"
  }
  ```
- 解析 JSON，分别存储到 `title` 和 `social_media_summary` 字段

**理由**:
- 单次 AI 调用生成 title 和 summary，节省成本和时间
- title 和 summary 内容相关，一次性生成更连贯
- 向后兼容：如果 AI 返回纯文本，提取第一句作为 title

**替代方案**:
- 单独的 AI 调用生成 title: 成本高，速度慢
- 前端提取标题: 不够智能，无法概括全文

---

### 3. 异步任务依赖机制

**决策**: 在 RenderQueue 中添加任务依赖检查

**实现**:
```typescript
interface RenderTask {
  dependencies: {
    type: 'ai-task',
    taskType: AITaskType,
    conversationId: number,
  }[];
}

// 执行前检查依赖
private canExecute(task: RenderTask): boolean {
  if (!task.dependencies) return true;

  for (const dep of task.dependencies) {
    if (dep.type === 'ai-task') {
      const aiQueue = getAITaskQueue();
      const aiTasks = aiQueue.getConversationTasks(dep.conversationId);
      const hasPending = aiTasks.some(t =>
        t.type === dep.taskType &&
        t.status !== AITaskStatus.COMPLETED
      );
      if (hasPending) return false;
    }
  }
  return true;
}
```

**理由**:
- 不改变现有的队列架构，只添加依赖检查
- 灵活：可以支持多种依赖类型
- 向后兼容：没有 dependencies 的任务直接执行

**替代方案**:
- 使用消息队列（如 RabbitMQ）: 过度设计，增加复杂度
- 延迟添加渲染任务: 需要监听 AI 任务完成事件，增加耦合

---

### 4. 小红书模板边距优化

**决策**: 直接修改 CSS padding 属性

**实现**:
```css
/* 修改前 */
.xhs-card {
  padding: 40px;
}

/* 修改后 */
.xhs-card {
  padding: 10px;
}
```

**同时调整**:
- 减少标题下边距：margin-bottom: 16px → 8px
- 减少内容下边距：margin-bottom: 30px → 20px
- 增加字体大小：补偿边距减少，保持可读性

---

### 5. 汇总信息折叠功能

**决策**: 使用 React state + CSS transition 实现折叠/展开

**实现**:
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const SUMMARY_PREVIEW_LENGTH = 100;

const getPreviewText = (text: string) => {
  if (text.length <= SUMMARY_PREVIEW_LENGTH) return text;
  const preview = text.substring(0, SUMMARY_PREVIEW_LENGTH);
  const lastSentenceEnd = Math.max(
    preview.lastIndexOf('。'),
    preview.lastIndexOf('？'),
    preview.lastIndexOf('！')
  );
  return lastSentenceEnd > 0
    ? text.substring(0, lastSentenceEnd + 1)
    : preview + '...';
};
```

**样式**:
```css
.summary-content {
  max-height: 100px; /* 收起状态 */
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
}

.summary-content.expanded {
  max-height: none;
}
```

**理由**:
- 简单高效，不需要额外依赖
- 使用 CSS transition 保证流畅动画
- 智能截断，避免在句子中间截断

**替代方案**:
- 使用 `clamp()` CSS 函数: 浏览器支持度不够
- 使用第三方库（如 `react-clamp`）: 增加依赖，功能有限

---

### 6. 数据库 Migration

**决策**: 使用 SQL ALTER TABLE 添加 title 字段

**Migration 脚本**:
```sql
-- 添加 title 字段
ALTER TABLE conversations ADD COLUMN title TEXT;

-- 为现有数据生成标题（可选）
-- 这需要运行一个脚本，调用 AI 为每个对话生成标题
-- 或者保持为空，使用默认标题
```

**代码修改**:
```typescript
// backend/src/models/conversation.repository.ts
export interface Conversation {
  // ...existing fields
  title?: string;  // 新增
}
```

**理由**:
- 简单直接，不需要重构表结构
- TEXT 类型足够存储 20 个中文字符
- 可选字段，向后兼容（旧数据 title 为 null）

---

## 风险 / 权衡

### 风险 1: Markdown 渲染性能
**风险**: 长文本或复杂格式可能导致渲染慢
**缓解措施**:
- 使用 `react-markdown` 的异步渲染
- 限制最大渲染长度（如 5000 字符）
- 添加缓存机制（React.memo）

### 风险 2: AI Title 生成失败
**风险**: AI 可能不返回 JSON 或 JSON 格式错误
**缓解措施**:
- 添加 JSON 解析 try-catch
- 失败时回退到提取第一句话作为 title
- 记录错误日志，监控失败率

### 风险 3: 异步依赖死锁
**风险**: 渲染任务可能永远等待依赖任务
**缓解措施**:
- 添加超时机制（5 分钟）
- 超时后标记任务为 FAILED
- 提供手动重试按钮

### 风险 4: 数据库 Migration 失败
**风险**: ALTER TABLE 可能在大表上很慢
**缓解措施**:
- SQLite 的 ALTER TABLE 很快，风险低
- 在低峰期执行 migration
- 准备回滚脚本

### 权衡 1: 边距 vs 可读性
**权衡**: 减少边距可能影响可读性
**决策**: 增加字体大小和行高来补偿

### 权衡 2: 功能复杂度 vs 开发时间
**权衡**: 实现所有功能需要较长时间
**决策**: 优先级排序：
1. Markdown 渲染（最高优先级）
2. AI Title 生成
3. 异步依赖
4. 边距优化
5. 折叠功能

---

## 迁移计划

### Phase 1: 数据库 Migration
```bash
# 1. 备份数据库
cp data/database.sqlite data/database.sqlite.backup

# 2. 执行 migration
sqlite3 data/database.sqlite <<EOF
ALTER TABLE conversations ADD COLUMN title TEXT;
EOF

# 3. 验证
sqlite3 data/database.sqlite ".schema conversations"
```

### Phase 2: 后端实现
1. **AI Prompt 修改**
   - 修改 `backend/src/ai/prompts.ts`
   - 要求 AI 返回 JSON 格式（title + summary）

2. **AI Queue 更新**
   - 解析 AI JSON 响应
   - 分别存储 title 和 social_media_summary

3. **Render Queue 依赖**
   - 添加 dependencies 字段
   - 实现依赖检查逻辑

4. **Template 优化**
   - 修改小红书模板边距
   - 添加 Markdown 渲染（在模板中）

### Phase 3: 前端实现
1. **安装依赖**
   ```bash
   cd web
   npm install react-markdown remark-gfm rehype-highlight
   ```

2. **Markdown 组件**
   - 创建 `MarkdownRenderer` 组件
   - 集成到 `ConversationDetail` 页面

3. **折叠功能**
   - 创建 `CollapsibleText` 组件
   - 应用到 detailed_summary

4. **UI 更新**
   - 显示 AI 生成的 title
   - 更新按钮和交互

### Phase 4: 测试
1. **单元测试**: Markdown 渲染、依赖检查
2. **集成测试**: AI 生成 → 渲染流程
3. **性能测试**: 长文本渲染时间
4. **回归测试**: 确保旧功能正常

### Phase 5: 部署
1. **后端部署**: 先部署后端（数据库 migration）
2. **前端部署**: 再部署前端
3. **监控**: 观察 AI 生成成功率和渲染时间
4. **回滚**: 如果出现重大问题，回滚到旧版本

---

## 开放问题

### Q1: 是否为现有数据生成 title？
**选项**:
- A. 保持 title 为空，使用默认标题
- B. 运行脚本为现有数据生成 title（需要成本和时间）

**建议**: 选项 A，用户重新生成时自动生成 title

### Q2: Markdown 渲染是否需要支持图片？
**选项**:
- A. 支持（需要在模板中处理）
- B. 不支持（AI 摘要通常不包含图片）

**建议**: 选项 B，如果需要可以后续添加

### Q3: 折叠功能的默认状态？
**选项**:
- A. 默认收起（推荐）
- B. 默认展开

**建议**: 选项 A，提高页面可读性

---

## 性能指标

### 目标
- Markdown 渲染时间: < 100ms（1000 字符）
- AI Title 生成: 不增加现有时间（< 30 秒）
- 渲染任务等待时间: < 60 秒（依赖 AI 完成）
- 折叠/展开动画: < 300ms

### 监控
- AI 生成失败率 < 5%
- Markdown 解析失败率 < 1%
- 渲染任务超时率 < 2%

---

## 安全考虑

### XSS 防护
- `react-markdown` 默认转义 HTML
- 不要使用 `allowDangerousHtml` 选项
- 过滤 `javascript:` 链接

### SQL 注入
- 使用 prepared statements（已实现）
- Migration 脚本参数化

### 敏感信息
- 不在日志中记录完整的 AI 响应
- 不在 URL 中传递摘要内容
