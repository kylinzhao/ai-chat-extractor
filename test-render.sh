#!/bin/bash

# 测试 Puppeteer 渲染系统

echo "========================================"
echo "  Puppeteer 渲染系统测试"
echo "========================================"
echo ""

# 检查后端服务
echo "📡 [1/5] 检查后端服务..."
HEALTH_CHECK=$(curl --noproxy localhost -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务未启动"
    echo "   请先运行: cd backend && npm run dev"
    exit 1
fi
echo ""

# 测试 Puppeteer 健康状态
echo "🎨 [2/5] 测试 Puppeteer 实例池..."
RENDER_HEALTH=$(curl --noproxy localhost -s http://localhost:3000/api/render/health)
echo "$RENDER_HEALTH" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('status') == 'ok':
        pool = data.get('pool', {})
        print(f'✅ Puppeteer 实例池正常')
        print(f'   总实例数: {pool.get(\"total\", 0)}')
        print(f'   使用中: {pool.get(\"inUse\", 0)}')
        print(f'   空闲: {pool.get(\"available\", 0)}')
    else:
        print(f'❌ Puppeteer 实例池异常')
        print(f'   响应: {data}')
        sys.exit(1)
except Exception as e:
    print(f'❌ 解析失败: {e}')
    sys.exit(1)
" || exit 1
echo ""

# 获取可用的渲染模板
echo "📝 [3/5] 获取渲染模板..."
TEMPLATES=$(curl --noproxy localhost -s http://localhost:3000/api/render/templates)
echo "$TEMPLATES" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    templates = data.get('templates', [])
    print(f'✅ 找到 {len(templates)} 个渲染模板:')
    for t in templates:
        print(f'   🎨 {t[\"name\"]} ({t[\"type\"]})')
        print(f'      {t[\"description\"]}')
except Exception as e:
    print(f'❌ 获取模板失败: {e}')
" || true
echo ""

# 检查队列状态
echo "📊 [4/5] 检查渲染队列状态..."
QUEUE_STATUS=$(curl --noproxy localhost -s http://localhost:3000/api/render/queue/status)
echo "$QUEUE_STATUS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    queue = data.get('queue', {})
    pool = data.get('pool', {})
    print(f'✅ 队列状态:')
    print(f'   待处理: {queue.get(\"pending\", 0)}')
    print(f'   处理中: {queue.get(\"processing\", 0)}')
    print(f'   已完成: {queue.get(\"completed\", 0)}')
    print(f'   失败: {queue.get(\"failed\", 0)}')
    print(f'   实例池: {pool.get(\"available\", 0)}/{pool.get(\"total\", 0)} 空闲')
except Exception as e:
    print(f'❌ 获取队列状态失败: {e}')
"
echo ""

# 测试渲染任务（如果有对话数据）
echo "🎯 [5/5] 测试渲染任务..."
CONVERSATIONS=$(curl --noproxy localhost -s http://localhost:3000/api/conversations)
CONV_ID=$(echo "$CONVERSATIONS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    conversations = data.get('data', [])
    if conversations:
        # 选择第一条对话
        print(conversations[0]['id'])
    else:
        print('0')
except:
    print('0')
" 2>/dev/null)

if [ "$CONV_ID" != "0" ] && [ ! -z "$CONV_ID" ]; then
    echo "   使用对话 ID: $CONV_ID"
    echo ""
    echo "   测试渲染 Bento UI 模板..."
    RENDER_TASK=$(curl --noproxy localhost -s -X POST "http://localhost:3000/api/render/conversations/$CONV_ID/generate" \
        -H "Content-Type: application/json" \
        -d '{"template": "bento"}')

    echo "$RENDER_TASK" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('taskId'):
        print(f'   ✅ 渲染任务已创建')
        print(f'      任务 ID: {data[\"taskId\"]}')
        print(f'      模板: {data[\"template\"]}')
        print(f'      状态: {data[\"status\"]}')
    else:
        print(f'   ❌ 创建失败: {data}')
except Exception as e:
    print(f'   ❌ 解析失败: {e}')
    print(f'   原始响应: {sys.stdin.read()}')
"

    echo ""
    echo "   等待渲染完成..."
    sleep 5

    # 获取任务状态
    TASK_ID=$(echo "$RENDER_TASK" | python3 -c "import sys, json; print(json.load(sys.stdin).get('taskId', ''))" 2>/dev/null)
    if [ ! -z "$TASK_ID" ]; then
        curl --noproxy localhost -s "http://localhost:3000/api/render/tasks/$TASK_ID" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'   任务状态: {data[\"status\"]}')
    if data.get('status') == 'completed':
        print(f'   渲染时间: {data.get(\"renderTime\", 0)}ms')
        if data.get('result'):
            print(f'   图片路径: {data[\"result\"].get(\"imagePath\")}')
            print(f'   图片 URL: {data[\"result\"].get(\"imageUrl\")}')
    elif data.get('status') == 'failed':
        print(f'   错误: {data.get(\"error\")}')
except Exception as e:
    print(f'   查询失败: {e}')
"
    fi
else
    echo "   ⚠️  没有找到对话数据，跳过渲染测试"
fi
echo ""

echo "========================================"
echo "  测试完成！"
echo "========================================"
echo ""
echo "📌 渲染系统说明："
echo "   1. Puppeteer 实例池管理 Chrome 实例"
echo "   2. 支持 3 种模板：Bento UI、Newsletter、Retro Letter"
echo "   3. 异步任务队列，支持并发渲染"
echo "   4. 自动重试机制（最多 3 次）"
echo "   5. 超时保护（30 秒）"
echo ""
echo "💡 可用的 API 端点："
echo "   GET  /api/render/templates - 获取模板列表"
echo "   GET  /api/render/health - 健康检查"
echo "   GET  /api/render/queue/status - 队列状态"
echo "   POST /api/render/conversations/:id/generate - 创建渲染任务"
echo "   GET  /api/render/tasks/:taskId - 查询任务状态"
echo ""
