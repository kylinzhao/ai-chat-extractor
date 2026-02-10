# AI Chat Extractor - Chrome Extension

Chrome 浏览器插件，用于从 Gemini 和豆包采集 AI 对话内容。

## 功能特性

- ✅ 支持 Gemini (gemini.google.com)
- ✅ 支持豆包 (www.doubao.com)
- ✅ 自动采集对话文本和图片
- ✅ 一键上传到后端 API
- ✅ 采集历史记录
- ✅ 可配置后端 API 地址

## 安装方法

### 开发模式安装

1. **克隆项目并进入插件目录**
   ```bash
   cd plugins/chrome-extension
   ```

2. **准备图标文件**（可选）
   - 在 `src/icons/` 目录下放置以下文件：
     - icon16.png (16x16)
     - icon48.png (48x48)
     - icon128.png (128x128)
   - 可以使用在线工具生成：https://favicon.io/

3. **加载到 Chrome**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 打开右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `src` 目录

4. **配置后端 API**
   - 点击插件图标打开 Popup
   - 输入后端 API 地址（默认：http://localhost:3000）
   - 点击"保存配置"

## 使用方法

1. **访问支持的平台**
   - Gemini: https://gemini.google.com
   - 豆包: https://www.doubao.com

2. **采集对话**
   - 在对话页面点击插件图标
   - 点击"采集当前对话"按钮
   - 等待采集和上传完成

3. **查看历史**
   - 在 Popup 中查看最近的采集记录

## 项目结构

```
src/
├── manifest.json          # Chrome 扩展配置（Manifest V3）
├── background/
│   └── background.js      # 后台服务
├── content/
│   ├── gemini.js          # Gemini 内容脚本
│   └── doubao.js          # 豆包内容脚本
├── popup/
│   ├── popup.html         # Popup 界面
│   ├── popup.css          # Popup 样式
│   └── popup.js           # Popup 逻辑
└── icons/
    ├── icon16.png         # 16x16 图标
    ├── icon48.png         # 48x48 图标
    └── icon128.png        # 128x128 图标
```

## 开发

### 调试

**Content Script 调试**：
1. 在目标页面（如 Gemini）按 F12 打开开发者工具
2. 在 Console 中查看日志

**Background Script 调试**：
1. 访问 `chrome://extensions/`
2. 找到"AI Chat Extractor"
3. 点击"Service Worker"查看日志

**Popup 调试**：
1. 右键点击插件图标
2. 选择"检查弹出内容"

### 重新加载

修改代码后：
1. 访问 `chrome://extensions/`
2. 点击"重新加载"按钮（🔄）

## 注意事项

1. **CORS 问题**：确保后端 API 已正确配置 CORS
2. **API 地址**：开发环境使用 `http://localhost:3000`
3. **DOM 选择器**：如果平台更新页面结构，可能需要调整选择器

## 后端 API 接口

### POST /api/conversations

**请求体**：
```json
{
  "platform": "Gemini" | "Doubao",
  "model_version": "string",
  "captured_at": "ISO 8601 timestamp",
  "messages": [
    {
      "role": "user" | "assistant",
      "content": "string"
    }
  ],
  "image_urls": ["string"]
}
```

**响应**：
```json
{
  "id": 1,
  "summaryGroupId": 1,
  "message": "Conversation created successfully"
}
```

## 故障排查

### 1. 插件无法加载
- 检查 `manifest.json` 语法是否正确
- 查看扩展程序页面的错误信息

### 2. 采集按钮是灰色的
- 确保在 Gemini 或豆包页面
- 刷新页面后重试

### 3. 采集失败
- 打开开发者工具查看错误信息
- 检查后端 API 是否运行
- 检查 API 地址配置是否正确

### 4. CORS 错误
- 确保后端已配置正确的 CORS 设置
- 检查 API 地址是否使用 `http://`（开发环境）

## 后续优化

- [ ] 添加更精确的 DOM 选择器
- [ ] 支持分段加载长对话
- [ ] 添加采集进度显示
- [ ] 支持手动编辑采集内容
- [ ] 添加截图预览功能
