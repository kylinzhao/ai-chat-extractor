#!/bin/bash

# 测试 SQL 修复 - 简化版
# 验证 datetime('now') 语法正确性

echo "=== 测试 SQL datetime('now') 修复 ==="
echo ""

# 1. 测试创建对话（不触发 datetime）
echo "1. 测试创建对话..."
CREATE_RESULT=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "Gemini",
    "messages": [{"role": "user", "content": "测试"}],
    "captured_at": "2026-02-10T12:00:00Z"
  }')

HTTP_CODE=$(echo "$CREATE_RESULT" | tail -1)
if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ 创建成功 (HTTP $HTTP_CODE)"
else
  echo "❌ 创建失败 (HTTP $HTTP_CODE)"
  echo "$CREATE_RESULT"
  exit 1
fi

# 2. 测试更新（会触发 datetime('now')）
echo ""
echo "2. 测试更新对话（触发 updated_at = datetime('now')）..."
UPDATE_RESULT=$(curl -s -w "\n%{http_code}" -X PATCH http://localhost:3000/api/conversations/1 \
  -H "Content-Type: application/json" \
  -d '{"detailed_summary": "测试汇总"}')

UPDATE_CODE=$(echo "$UPDATE_RESULT" | tail -1)
if [ "$UPDATE_CODE" = "200" ] || [ "$UPDATE_CODE" = "201" ]; then
  echo "✅ 更新成功，SQL datetime('now') 语法正确 (HTTP $UPDATE_CODE)"
else
  echo "❌ 更新失败 (HTTP $UPDATE_CODE)"
  echo "$UPDATE_RESULT"
  exit 1
fi

# 3. 测试批量更新（也会触发 datetime('now')）
echo ""
echo "3. 测试批量更新 visibility..."
BATCH_RESULT=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/conversations/batch-update-visibility \
  -H "Content-Type: application/json" \
  -d '{"ids": [1], "visibility": 1}')

BATCH_CODE=$(echo "$BATCH_RESULT" | tail -1)
if [ "$BATCH_CODE" = "200" ] || [ "$BATCH_CODE" = "201" ]; then
  echo "✅ 批量更新成功，SQL datetime('now') 语法正确 (HTTP $BATCH_CODE)"
else
  echo "❌ 批量更新失败 (HTTP $BATCH_CODE)"
  echo "$BATCH_RESULT"
  exit 1
fi

echo ""
echo "=== 所有测试通过 ✅ ==="
echo ""
echo "修复说明："
echo "  ❌ 修复前: datetime(\"now\")  - SQLite 错误"
echo "  ✅ 修复后: datetime('now')   - 正确语法"
echo ""
echo "修复位置："
echo "  • backend/src/models/conversation.repository.ts:119"
echo "  • backend/src/models/conversation.repository.ts:151"
echo ""
echo "现在可以访问 http://localhost:3001/public/8 测试完整功能"
