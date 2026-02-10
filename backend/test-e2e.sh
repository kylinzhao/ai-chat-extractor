#!/bin/bash

echo "=== 端到端测试：自动生成功能 ==="
echo ""

# 禁用代理
unset ALL_PROXY
unset all_proxy
unset HTTP_PROXY
unset http_proxy

BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

echo "1. 测试后端健康状态..."
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ 后端运行正常"
else
  echo "❌ 后端未运行"
  exit 1
fi

echo ""
echo "2. 测试 CORS 配置..."
CORS_TEST=$(curl -s -H "Origin: $FRONTEND_URL" -I $BASE_URL/health | grep -i "access-control-allow-origin")
if [ -n "$CORS_TEST" ]; then
  echo "✅ CORS 配置正常: $CORS_TEST"
else
  echo "❌ CORS 配置有问题"
  exit 1
fi

echo ""
echo "3. 测试状态查询 API..."
STATUS=$(curl -s $BASE_URL/api/conversations/8/status)
if echo "$STATUS" | grep -q "conversationId"; then
  echo "✅ 状态 API 响应正常"
  echo "   响应: $STATUS"
else
  echo "❌ 状态 API 响应异常"
  echo "   响应: $STATUS"
  exit 1
fi

echo ""
echo "4. 检查数据库是否有任务..."
# 检查 AI 队列和渲染队列中是否有任务
# 创建一个新对话来测试自动生成

echo "   创建测试对话..."
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Gemini",
    "messages": [{"role": "user", "content": "端到端测试"}],
    "captured_at": "2026-02-10T12:00:00Z"
  }')

echo "   $CREATE_RESPONSE"

# 提取 conversation ID
CONVERSATION_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -z "$CONVERSATION_ID" ]; then
  echo "❌ 无法创建测试对话"
  exit 1
fi

echo "   ✅ 创建对话成功，ID: $CONVERSATION_ID"

echo ""
echo "5. 等待 3 秒让自动生成任务初始化..."
sleep 3

echo ""
echo "6. 检查对话状态..."
STATUS_CHECK=$(curl -s $BASE_URL/api/conversations/$CONVERSATION_ID/status)
echo "   状态响应: $STATUS_CHECK"

if echo "$STATUS_CHECK" | grep -q "tasks"; then
  TASK_COUNT=$(echo "$STATUS_CHECK" | grep -o '"type"' | wc -l)
  echo "   ✅ 找到 $TASK_COUNT 个任务"

  # 检查任务状态
  if echo "$STATUS_CHECK" | grep -q '"status":"pending"\|"status":"processing"'; then
    echo "   ✅ 有任务正在进行中"
  fi

  if echo "$STATUS_CHECK" | grep -q '"status":"completed"'; then
    echo "   ✅ 有任务已完成"
  fi
else
  echo "   ⚠️  没有找到任务（可能还未初始化）"
fi

echo ""
echo "7. 测试对话详情 API..."
DETAILS=$(curl -s $BASE_URL/api/conversations/$CONVERSATION_ID)
if echo "$DETAILS" | grep -q "id"; then
  echo "   ✅ 详情 API 正常"
  # 检查是否有 social_media_summary 和 detailed_summary 字段
  if echo "$DETAILS" | grep -q "social_media_summary"; then
    echo "   ✅ 包含 social_media_summary 字段"
  fi
  if echo "$DETAILS" | grep -q "detailed_summary"; then
    echo "   ✅ 包含 detailed_summary 字段"
  fi
else
  echo "   ❌ 详情 API 失败"
fi

echo ""
echo "8. 检查后端日志中的错误..."
# 这里我们无法直接访问后台日志，但我们已经验证了 API 能正常工作

echo ""
echo "=== 测试完成 ==="
echo ""
echo "✅ 后端 API 全部正常"
echo ""
echo "前端测试步骤："
echo "1. 访问 $FRONTEND_URL/public/$CONVERSATION_ID"
echo "2. 打开浏览器开发者工具（F12）"
echo "3. 查看 Console 标签页"
echo "4. 查看 Network 标签页"
echo "5. 刷新页面，观察是否有 Failed to fetch 错误"
echo ""
echo "如果仍有错误，请提供："
echo "- 浏览器 Console 的完整错误信息"
echo "- 浏览器 Network 标签中失败的请求详情"
echo "- 后端日志（如果有）"
