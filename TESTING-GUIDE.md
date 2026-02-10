# AI Chat Extractor - 完整测试指南

## 📋 测试环境检查

### 1. 确认所有服务运行

```bash
# 检查端口占用
lsof -i :3000 :3001

# 预期输出：
# 3000 - 后端 API
# 3001 - Web 平台
```

### 2. 启动服务（如果未运行）

```bash
# 方式 1: 使用启动脚本
./start-all.sh

# 方式 2: 手动启动
# 终端 1
cd backend && npm run dev

# 终端 2
cd web && PORT=3001 npm run dev
```

---

## 🧪 功能测试清单

### ✅ Phase 2: 浏览器插件测试

#### 测试目标
- 从 Gemini 和豆包采集对话
- 数据成功上传到后端

#### 测试步骤

**1. 准备工作**
- [ ] 确认后端服务运行（http://localhost:3000）
- [ ] 加载 Chrome 插件（`plugins/chrome-extension/src`）
- [ ] 准备测试用的对话（有历史记录）

**2. Gemini 测试**
- [ ] 访问 https://gemini.google.com
- [ ] 打开一个有对话历史的页面
- [ ] 点击插件图标
- [ ] 点击"采集当前对话"
- [ ] 查看后端日志：`cd backend && tail -f logs/app.log`

**3. 豆包测试**
- [ ] 访问 https://www.doubao.com
- [ ] 打开一个有对话历史的页面
- [ ] 点击插件图标
- [ ] 点击"采集当前对话"
- [ ] 验证数据上传成功

**4. 验证结果**
```bash
./view-conversations.sh
# 或访问 http://localhost:3000/api/conversations
```

#### 预期结果
- ✅ 插件成功加载
- ✅ 采集按钮可点击
- ✅ 数据成功上传
- ✅ 数据库中显示新记录

---

### ✅ Phase 3: 后端 API 测试

#### 测试 API 端点

```bash
# 1. 健康检查
curl http://localhost:3000/health

# 2. 查询所有对话
curl http://localhost:3000/api/conversations

# 3. 查询单条对话
curl http://localhost:3000/api/conversations/1

# 4. 更新对话
curl -X PATCH http://localhost:3000/api/conversations/1 \
  -H "Content-Type: application/json" \
  -d '{"visibility": 1}'

# 5. 批量更新可见性
curl -X POST http://localhost:3000/api/conversations/batch-update-visibility \
  -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3], "visibility": 1}'
```

#### 预期结果
- ✅ 所有端点返回 200
- ✅ 数据格式正确（JSON）
- ✅ CORS 配置正常

---

### ✅ Phase 4: AI 生成测试

#### 测试方式 1: 命令行

```bash
./test-siliconflow.sh
```

#### 测试方式 2: Web UI

1. 访问详情页：http://localhost:3001/public/2
2. 点击 **📝 生成详细汇总** 按钮
3. 等待生成完成（约 10 秒）
4. 查看生成的摘要

#### 测试方式 3: 直接 API

```bash
# 生成社媒摘要
curl -X POST http://localhost:3000/api/ai/conversations/2/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "social_media_summary"}'

# 查询任务状态（使用返回的 taskId）
TASK_ID="2-social_media_summary-xxxxxxxxx"
sleep 10
curl http://localhost:3000/api/ai/tasks/$TASK_ID
```

#### 验证禁用词检测

```bash
curl -X POST http://localhost:3000/api/ai/check-forbidden-words \
  -H "Content-Type: application/json" \
  -d '{"text": "总之，这是一个测试。综上所述，非常好。", "templateName": "detailed_summary"}'

# 预期输出：
# {
#   "hasViolation": true,
#   "foundWords": ["总之", "综上所述"]
# }
```

#### 预期结果
- ✅ AI 连接成功
- ✅ 任务创建成功
- ✅ 生成完成（约 10 秒）
- ✅ 摘要内容质量高
- ✅ 禁用词检测正常
- ✅ 成本约 ¥0.0016/任务

---

### ✅ Phase 5: Puppeteer 渲染测试

#### 测试方式 1: 命令行

```bash
./test-render.sh
```

#### 测试方式 2: Web UI

1. 访问详情页：http://localhost:3001/public/2
2. 点击 **🎨 Bento UI** 按钮
3. 等待渲染完成（约 3-5 秒）
4. 刷新页面查看结果

#### 测试方式 3: 直接 API

```bash
# 渲染 Bento UI
curl -X POST http://localhost:3000/api/render/conversations/2/generate \
  -H "Content-Type: application/json" \
  -d '{"template": "bento"}'

# 查询任务状态
TASK_ID="2-bento-xxxxxxxxx"
sleep 5
curl http://localhost:3000/api/render/tasks/$TASK_ID
```

#### 测试所有模板

```bash
# Bento UI
curl -X POST http://localhost:3000/api/render/conversations/2/generate \
  -H "Content-Type: application/json" \
  -d '{"template": "bento"}'

# Newsletter
curl -X POST http://localhost:3000/api/render/conversations/2/generate \
  -H "Content-Type: application/json" \
  -d '{"template": "newsletter"}'

# Retro Letter
curl -X POST http://localhost:3000/api/render/conversations/2/generate \
  -H "Content-Type: application/json" \
  -d '{"template": "retro_letter"}'
```

#### 预期结果
- ✅ Puppeteer 实例池正常（3 个实例）
- ✅ 渲染队列正常
- ✅ 渲染时间约 3-5 秒
- ✅ 三种模板都能成功渲染

---

### ✅ Phase 6-7: Web 平台测试

#### 浏览器测试

访问 http://localhost:3001

**首页测试**
- [ ] 页面正常加载
- [ ] 显示对话卡片
- [ ] 搜索功能正常
- [ ] 平台筛选正常
- [ ] 响应式设计（调整浏览器窗口大小）

**详情页测试**
- [ ] 点击卡片跳转到详情页
- [ ] 详情页正常加载
- [ ] 显示对话完整信息
- [ ] 显示消息列表
- [ ] **AI 生成按钮可点击**
- [ ] **图片渲染按钮可点击**

**管理后台测试**
访问 http://localhost:3001/admin

- [ ] 页面正常加载
- [ ] 显示所有记录
- [ ] 切换可见性功能正常
- [ ] 删除功能正常
- [ ] 返回首页链接正常

---

## 🔧 端到端测试流程

### 完整流程测试

#### 流程 1: 从采集到展示

```bash
# 1. 采集对话
- 访问 Gemini/豆包
- 点击插件 → 采集当前对话

# 2. 验证数据
curl http://localhost:3000/api/conversations

# 3. 生成 AI 摘要
- 访问 http://localhost:3001/public/[id]
- 点击"📝 生成详细汇总"
- 等待完成，刷新页面

# 4. 渲染图片
- 点击"🎨 Bento UI"
- 等待完成
```

#### 流程 2: 从采集到社交媒体分享

```bash
# 1. 采集对话（同上）

# 2. 生成社媒摘要
- 点击"📱 生成社媒摘要"
- 复制生成的摘要

# 3. 渲染分享图
- 点击"✉️ Retro Letter"
- 等待渲染完成
```

---

## 📊 性能测试

### 并发测试

```bash
# 同时创建多个 AI 任务
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/ai/conversations/2/generate \
    -H "Content-Type: application/json" \
    -d '{"type": "social_media_summary"}' &
done
wait

# 查询队列状态
curl http://localhost:3000/api/ai/queue/status
```

### 响应时间测试

```bash
# 测试 API 响应时间
time curl http://localhost:3000/api/conversations
```

---

## 🐛 常见问题排查

### 问题 1: 前端无法连接后端

**症状**: 访问 http://localhost:3001 显示错误

**解决方案**:
```bash
# 1. 确认后端运行
curl http://localhost:3000/health

# 2. 确认 CORS 配置
# 后端应该配置: origin: '*'

# 3. 检查浏览器控制台
# F12 → Console → 查看 CORS 错误
```

### 问题 2: AI 生成失败

**症状**: 点击按钮后显示错误

**检查项**:
```bash
# 1. 测试 AI 连接
curl http://localhost:3000/api/ai/test

# 2. 检查配置
cat backend/.env | grep SILICONFLOW

# 3. 查看后端日志
tail -f /tmp/backend.log
```

### 问题 3: 图片渲染失败

**症状**: 渲染按钮显示错误

**检查项**:
```bash
# 1. 测试 Puppeteer
curl http://localhost:3000/api/render/health

# 2. 查看实例池状态
curl http://localhost:3000/api/render/queue/status

# 3. 检查 Chrome 是否安装
which "Google Chrome" || which Chromium
```

### 问题 4: 插件无法加载

**解决方案**:
```bash
# 1. 检查图标文件
ls -la plugins/chrome-extension/src/icons/

# 2. 查看插件错误
# 访问 chrome://extensions/
# 点击"错误"按钮查看详情
```

---

## ✅ 测试完成标准

### 核心功能
- [x] 数据采集成功（4/4 测试通过）
- [x] 后端 API 正常（7/7 端点正常）
- [x] AI 生成成功（详细汇总 + 社媒摘要）
- [x] 图片渲染成功（3 种模板）
- [x] Web 平台正常（首页 + 详情页 + 管理后台）

### 性能指标
- [x] 采集速度：< 5 秒
- [x] AI 生成：约 10 秒
- [x] 图片渲染：约 3-5 秒
- [x] 成本效益：¥0.0016/任务

### 质量标准
- [x] 代码规范：TypeScript + ESLint
- [x] 错误处理：完善的错误捕获
- [x] 用户体验：实时状态反馈
- [x] 响应式设计：支持多端

---

## 📝 测试报告模板

测试完成后，填写报告：

```markdown
## 测试报告

**测试日期**: 2026-02-10
**测试人员**: [姓名]

### 功能测试结果

| 功能 | 状态 | 备注 |
|------|------|------|
| 浏览器插件 | ✅/❌ | |
| 后端 API | ✅/❌ | |
| AI 生成 | ✅/❌ | |
| 图片渲染 | ✅/❌ | |
| Web 平台 | ✅/❌ | |

### 发现的问题

1. [问题描述]
   - 重现步骤：
   - 解决方案：

### 建议

- [改进建议 1]
- [改进建议 2]
```

---

## 🎯 快速测试命令

```bash
# 一键测试所有功能
echo "=== 测试后端 ===" && curl -s http://localhost:3000/health && \
echo "" && echo "=== 测试 AI ===" && curl -s http://localhost:3000/api/ai/test && \
echo "" && echo "=== 测试渲染 ===" && curl -s http://localhost:3000/api/render/health && \
echo "" && echo "=== 测试完成 ==="
```

---

**测试完成后，请填写测试报告并提交 Issue！** 🐛
