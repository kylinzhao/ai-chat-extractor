#!/bin/bash

# 查看采集的对话数据

echo "========================================"
echo "  AI Chat Extractor - 采集数据查看"
echo "========================================"
echo ""

# 获取所有对话
CONVERSATIONS=$(curl --noproxy localhost -s http://localhost:3000/api/conversations)

# 统计信息
TOTAL_COUNT=$(echo "$CONVERSATIONS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['data']))" 2>/dev/null)
GEMINI_COUNT=$(echo "$CONVERSATIONS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(sum(1 for c in data['data'] if c['platform']=='Gemini'))" 2>/dev/null)
DOUBAO_COUNT=$(echo "$CONVERSATIONS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(sum(1 for c in data['data'] if c['platform']=='Doubao'))" 2>/dev/null)

echo "📊 采集统计"
echo "   总对话数: $TOTAL_COUNT"
echo "   Gemini: $GEMINI_COUNT 条"
echo "   豆包: $DOUBAO_COUNT 条"
echo ""

# 显示最近 5 条对话
echo "📝 最近的对话记录"
echo "----------------------------------------"

echo "$CONVERSATIONS" | python3 -c "
import sys, json
from datetime import datetime

data = json.load(sys.stdin)['data']

for i, conv in enumerate(data[:5], 1):
    print(f\"\n{id}. {conv['platform']} - ID: {conv['id']}\")
    print(f\"   时间: {conv['captured_at'][:19].replace('T', ' ')}\")
    print(f\"   消息数: {len(conv['messages'])} 条\")
    if 'image_urls' in conv and conv['image_urls']:
        print(f\"   图片: {len(conv['image_urls'])} 张\")

    # 显示第一条消息预览
    if conv['messages']:
        first_msg = conv['messages'][0]['content']
        preview = first_msg[:80] + '...' if len(first_msg) > 80 else first_msg
        print(f\"   预览: {preview}\")

    print(f\"   状态: {conv.get('status', 'processing')}\")
    print(f\"   可见性: {'公开' if conv.get('visibility') == 1 else '隐藏'}\")
    print('-' * 50)
"

echo ""
echo "💾 数据库位置: backend/data/database.sqlite"
echo "🔗 API 端点: http://localhost:3000/api/conversations"
echo ""
echo "========================================"
