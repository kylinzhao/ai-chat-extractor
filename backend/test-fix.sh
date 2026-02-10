#!/bin/bash

# 测试 SQL 修复
# 验证 datetime('now') 语法正确性

echo "=== 测试 conversation update ==="

# 1. 创建测试对话
echo "1. 创建测试对话..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Gemini",
    "messages": [
      {"role": "user", "content": "测试消息"},
      {"role": "assistant", "content": "测试回复"}
    ],
    "captured_at": "2026-02-10T12:00:00Z"
  }')

CONVERSATION_ID=$(echo $RESPONSE | jq -r '.id')
echo "创建对话 ID: $CONVERSATION_ID"

if [ "$CONVERSATION_ID" = "null" ] || [ -z "$CONVERSATION_ID" ]; then
  echo "❌ 创建对话失败"
  echo $RESPONSE
  exit 1
fi

# 2. 测试更新（会触发 datetime('now')）
echo ""
echo "2. 测试更新对话（会触发 updated_at 字段）..."
UPDATE_RESPONSE=$(curl -s -X PATCH http://localhost:3000/api/conversations/$CONVERSATION_ID \
  -H "Content-Type: application/json" \
  -d '{"social_media_summary": "测试摘要"}')

UPDATE_SUCCESS=$(echo $UPDATE_RESPONSE | jq -r '.social_media_summary')
if [ "$UPDATE_SUCCESS" = "测试摘要" ]; then
  echo "✅ 更新成功，SQL 语法修复有效"
else
  echo "❌ 更新失败"
  echo $UPDATE_RESPONSE
  exit 1
fi

# 3. 测试批量更新（也会触发 datetime('now')）
echo ""
echo "3. 测试批量更新 visibility..."
BATCH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/conversations/batch-update-visibility \
  -H "Content-Type: application/json" \
  -d "{\"ids\": [$CONVERSATION_ID], \"visibility\": 1}")

BATCH_SUCCESS=$(echo $BATCH_RESPONSE | jq -r '.updated')
if [ "$BATCH_SUCCESS" = "1" ]; then
  echo "✅ 批量更新成功，SQL 语法修复有效"
else
  echo "❌ 批量更新失败"
  echo $BATCH_RESPONSE
  exit 1
fi

# 4. 清理测试数据
echo ""
echo "4. 清理测试数据..."
curl -s -X DELETE http://localhost:3000/api/conversations/$CONVERSATION_ID > /dev/null

echo ""
echo "=== 所有测试通过 ✅ ==="
echo ""
echo "修复内容："
echo "  - 将 datetime(\"now\") 改为 datetime('now')"
echo "  - SQLite 要求字符串使用单引号"
echo ""
echo "修复的文件："
echo "  - backend/src/models/conversation.repository.ts:119"
echo "  - backend/src/models/conversation.repository.ts:151"
