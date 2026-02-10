# 🧪 插件与后端联调测试指南

## 前置准备

### 1. 生成插件图标

1. 浏览器已打开图标生成页面
2. 右键点击每个图标，"图片另存为"
3. 保存到 `plugins/chrome-extension/src/icons/` 目录：
   - icon16.png
   - icon48.png
   - icon128.png

### 2. 启动后端服务

```bash
# 进入后端目录
cd backend

# 开发模式启动（支持热重载）
npm run dev

# 或者生产模式启动
npm run build
npm start
```

**预期输出**：
```
🚀 Server is running on http://0.0.0.0:3000
Database initialized successfully
```

### 3. 验证后端 API

在浏览器访问：
```
http://localhost:3000/health
```

**预期响应**：
```json
{
  "status": "ok",
  "timestamp": "2025-02-10T..."
}
```

---

## 加载 Chrome 插件

### 步骤 1：打开扩展程序页面

在 Chrome 地址栏输入：
```
chrome://extensions/
```

### 步骤 2：启用开发者模式

- 找到右上角的"开发者模式"开关
- 打开它

### 步骤 3：加载插件

1. 点击"加载已解压的扩展程序"
2. 选择文件夹：`plugins/chrome-extension/src`
3. 点击"选择文件夹"

**预期结果**：
- 插件卡片出现在列表中
- 名称：AI Chat Extractor
- 图标显示（蓝色背景 + AI 文字）
- 没有"错误"按钮

---

## 测试流程

### 测试 1：检查插件 Popup

1. 点击 Chrome 工具栏的插件图标
2. 应该看到 Popup 窗口弹出
3. 检查以下元素：
   - ✅ 标题："🤖 AI Chat Extractor"
   - ✅ API 地址输入框（默认：http://localhost:3000）
   - ✅ "保存配置"按钮
   - ✅ 状态指示器（灰色圆点）
   - ✅ "采集当前对话"按钮（灰色禁用状态）
   - ✅ 最近采集区域（显示"暂无采集记录"）

### 测试 2：测试 Gemini 页面（如果可访问）

#### 前置条件
- 能够访问 gemini.google.com
- 已有对话历史

#### 步骤

1. 访问 https://gemini.google.com
2. 打开一个已有的对话
3. 点击插件图标
4. 检查 Popup 状态：
   - 状态圆点：绿色
   - 平台信息：✓ Gemini
   - "采集当前对话"按钮：可点击（蓝色）

5. 点击"采集当前对话"
6. 观察进度：
   - 按钮变为禁用
   - 显示"正在采集对话..."
   - 然后"正在上传到后端..."
   - 如果成功：显示"采集成功！对话 ID: X"
   - 如果失败：显示错误信息

7. 查看后端日志：
   ```bash
   # 在后端终端查看
   # 应该看到：
   # - "Created conversation 1 from Gemini"
   ```

8. 验证数据库：
   ```bash
   # 查看数据库文件
   ls -la backend/data/
   # 应该看到 database.sqlite 文件
   ```

### 测试 3：测试豆包页面（如果可访问）

#### 步骤

1. 访问 https://www.doubao.com
2. 打开一个已有的对话
3. 点击插件图标
4. 检查 Popup 状态：
   - 状态圆点：绿色
   - 平台信息：✓ 豆包

5. 点击"采集当前对话"
6. 验证采集和上传流程

### 测试 4：测试 API 直接调用

如果插件采集失败，可以直接测试 API：

```bash
# 使用 curl 测试
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Gemini",
    "model_version": "gemini-pro",
    "captured_at": "2025-02-10T08:00:00.000Z",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      },
      {
        "role": "assistant",
        "content": "I am doing well, thank you!"
      }
    ]
  }'
```

**预期响应**：
```json
{
  "id": 1,
  "summaryGroupId": 1,
  "message": "Conversation created successfully"
}
```

---

## 调试技巧

### 查看插件日志

1. **Content Script 日志**（在 Gemini/豆包页面）
   - 按 F12 打开开发者工具
   - 切换到 Console 标签
   - 查找："AI Chat Extractor loaded for Gemini"

2. **Background Script 日志**
   - 访问 `chrome://extensions/`
   - 找到"AI Chat Extractor"
   - 点击"Service Worker"链接
   - 在打开的 DevTools 中查看 Console

3. **Popup 日志**
   - 右键点击插件图标
   - 选择"检查弹出内容"
   - 查看Console

### 常见问题排查

#### 问题 1：插件无法加载

**可能原因**：
- 缺少图标文件
- manifest.json 语法错误

**解决方案**：
1. 确保所有 3 个图标文件存在
2. 访问 `chrome://extensions/` 查看错误信息

#### 问题 2：采集按钮是灰色的

**可能原因**：
- 不在支持的平台页面
- Content Script 未注入

**解决方案**：
1. 确保在 gemini.google.com 或 www.doubao.com
2. 刷新页面
3. 查看浏览器 Console 是否有错误

#### 问题 3：采集失败

**可能原因**：
- DOM 结构变化，选择器不匹配
- 后端 API 未运行
- CORS 配置问题

**解决方案**：
1. 打开开发者工具查看 Console 错误
2. 检查后端是否运行：`curl http://localhost:3000/health`
3. 检查 Network 标签，查看 API 请求状态

#### 问题 4：上传失败

**可能原因**：
- API 地址配置错误
- 后端 CORS 未配置
- 网络问题

**解决方案**：
1. 在 Popup 中确认 API 地址正确
2. 查看后端日志：
   ```bash
   # 应该看到请求日志
   # "POST /api/conversations" 200
   ```
3. 检查 Network 标签中的请求详情

---

## 成功标志

当一切正常工作时，您应该看到：

1. ✅ 后端服务运行在 http://localhost:3000
2. ✅ 插件成功加载到 Chrome
3. ✅ 在 Gemini/豆包页面，插件显示绿色状态
4. ✅ 点击采集后，数据成功上传
5. ✅ 后端日志显示"Created conversation X"
6. ✅ 数据库文件已创建（backend/data/database.sqlite）
7. ✅ Popup 显示"采集成功"消息

---

## 下一步

测试通过后，您可以：

1. ✅ 标记任务 2.12 为完成
2. 🔄 继续实现 Phase 4（DeepSeek AI 集成）
3. 📱 开发 Web 平台（Phase 6-7）
4. 🐛 修复发现的 bug

**需要帮助？**

如果测试过程中遇到问题：
1. 收集错误信息（Console 日志、Network 请求）
2. 记录复现步骤
3. 告诉我具体的错误信息
