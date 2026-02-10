#!/bin/bash

# 测试 SiliconFlow AI 集成

echo "========================================"
echo "  SiliconFlow AI 集成测试"
echo "========================================"
echo ""

# 检查后端服务
echo "📡 [1/4] 检查后端服务..."
HEALTH_CHECK=$(curl --noproxy localhost -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务未启动"
    echo "   请先运行: cd backend && npm run dev"
    exit 1
fi
echo ""

# 测试 AI 连接
echo "🤖 [2/4] 测试 SiliconFlow API 连接..."
AI_TEST=$(curl --noproxy localhost -s http://localhost:3000/api/ai/test)
echo "$AI_TEST" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('connected'):
        print(f'✅ AI 连接成功')
        print(f'   模型: {data.get(\"model\", \"unknown\")}')
    else:
        print(f'❌ AI 连接失败')
        print(f'   响应: {data}')
        sys.exit(1)
except Exception as e:
    print(f'❌ 解析响应失败: {e}')
    print(f'   原始响应: {sys.stdin.read()}')
    sys.exit(1)
" || exit 1
echo ""

# 获取提示词模板
echo "📝 [3/4] 获取提示词模板..."
PROMPTS=$(curl --noproxy localhost -s http://localhost:3000/api/ai/prompts)
echo "$PROMPTS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    templates = data.get('templates', [])
    print(f'✅ 找到 {len(templates)} 个提示词模板:')
    for t in templates:
        print(f'   - {t[\"name\"]}: {t[\"description\"]}')
except Exception as e:
    print(f'❌ 获取模板失败: {e}')
    sys.exit(1)
"
echo ""

# 检查队列状态
echo "📊 [4/4] 检查任务队列状态..."
QUEUE_STATUS=$(curl --noproxy localhost -s http://localhost:3000/api/ai/queue/status)
echo "$QUEUE_STATUS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    queue = data.get('queue', {})
    print(f'✅ 队列状态:')
    print(f'   待处理: {queue.get(\"pending\", 0)}')
    print(f'   处理中: {queue.get(\"processing\", 0)}')
    print(f'   已完成: {queue.get(\"completed\", 0)}')
    print(f'   失败: {queue.get(\"failed\", 0)}')
except Exception as e:
    print(f'❌ 获取队列状态失败: {e}')
    sys.exit(1)
"
echo ""

echo "========================================"
echo "  测试完成！"
echo "========================================"
echo ""
echo "📌 下一步："
echo "   1. 配置 SILICONFLOW_API_KEY 到 backend/.env"
echo "   2. 测试 AI 生成功能"
echo ""
echo "💡 可用的 API 端点："
echo "   GET  /api/ai/test              - 测试 AI 连接"
echo "   GET  /api/ai/prompts           - 获取提示词模板"
echo "   GET  /api/ai/queue/status      - 查看队列状态"
echo "   POST /api/ai/conversations/:id/generate  - 生成 AI 内容"
echo "   GET  /api/ai/tasks/:taskId     - 查询任务状态"
echo ""
