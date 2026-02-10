#!/bin/bash

# 测试脚本：插件与后端联调

echo "========================================"
echo "  AI Chat Extractor - 联调测试"
echo "========================================"
echo ""

# 检查后端服务
echo "📡 [1/5] 检查后端服务..."
HEALTH_CHECK=$(curl --noproxy localhost -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo "✅ 后端服务运行正常"
    echo "   $HEALTH_CHECK"
else
    echo "❌ 后端服务未启动"
    echo "   请先运行: cd backend && npm run dev"
    exit 1
fi
echo ""

# 检查图标文件
echo "🎨 [2/5] 检查插件图标..."
ICON_DIR="plugins/chrome-extension/src/icons"
if [ -f "$ICON_DIR/icon16.png" ] && [ -f "$ICON_DIR/icon48.png" ] && [ -f "$ICON_DIR/icon128.png" ]; then
    echo "✅ 所有图标文件已就位"
else
    echo "⚠️  图标文件缺失"
    echo "   请打开浏览器中的 generate-icons.html 生成图标"
    echo "   或者手动创建图标文件"
fi
echo ""

# 测试 API
echo "🧪 [3/5] 测试 API 创建对话..."
API_RESPONSE=$(curl --noproxy localhost -s -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Gemini",
    "model_version": "test-model",
    "captured_at": "2026-02-10T08:00:00.000Z",
    "messages": [
      {
        "role": "user",
        "content": "Test message from integration test"
      }
    ]
  }')

if echo "$API_RESPONSE" | grep -q "id"; then
    CONVERSATION_ID=$(echo "$API_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "unknown")
    echo "✅ API 测试成功"
    echo "   创建的对话 ID: $CONVERSATION_ID"
else
    echo "❌ API 测试失败"
    echo "   响应: $API_RESPONSE"
fi
echo ""

# 检查数据库
echo "💾 [4/5] 检查数据库文件..."
if [ -f "backend/data/database.sqlite" ]; then
    DB_SIZE=$(du -h backend/data/database.sqlite | cut -f1)
    echo "✅ 数据库文件已创建"
    echo "   大小: $DB_SIZE"
else
    echo "⚠️  数据库文件不存在（首次运行时正常）"
fi
echo ""

# 插件加载说明
echo "🔌 [5/5] 插件加载说明"
echo ""
echo "请按以下步骤加载插件："
echo "1. 打开 Chrome 浏览器"
echo "2. 访问: chrome://extensions/"
echo "3. 开启右上角的"开发者模式""
echo "4. 点击"加载已解压的扩展程序""
echo "5. 选择文件夹: plugins/chrome-extension/src"
echo ""
echo "加载后，测试流程："
echo "1. 访问 Gemini (https://gemini.google.com) 或豆包"
echo "2. 点击插件图标"
echo "3. 点击"采集当前对话"按钮"
echo "4. 查看后端日志：cd backend && tail -f logs/app.log"
echo ""
echo "========================================"
echo "  测试准备完成！"
echo "========================================"
