#!/bin/bash

# AI Chat Extractor - 启动所有服务

echo "========================================"
echo "  启动 AI Chat Extractor 服务"
echo "========================================"
echo ""

# 清理旧的进程
echo "🧹 清理旧进程..."
pkill -f "backend/dist/index.js" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# 启动后端服务
echo "🚀 启动后端服务 (端口 3000)..."
cd backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"
cd ..

# 等待后端启动
sleep 3

# 检查后端健康
HEALTH_CHECK=$(curl --noproxy localhost -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo "   ✅ 后端服务启动成功"
else
    echo "   ❌ 后端服务启动失败"
    echo "   查看: tail -f /tmp/backend.log"
    exit 1
fi
echo ""

# 启动 Web 服务
echo "🌐 启动 Web 平台 (端口 3001)..."
cd web
PORT=3001 npm run dev > /tmp/web.log 2>&1 &
WEB_PID=$!
echo "   Web PID: $WEB_PID"
cd ..

# 等待 Web 启动
sleep 5

# 检查 Web 服务
WEB_CHECK=$(curl --noproxy localhost -s -I http://localhost:3001 | head -1)
if [[ $WEB_CHECK == *"200"* ]]; then
    echo "   ✅ Web 平台启动成功"
else
    echo "   ⚠️  Web 平台可能还在启动..."
    echo "   查看: tail -f /tmp/web.log"
fi
echo ""

echo "========================================"
echo "  所有服务已启动！"
echo "========================================"
echo ""
echo "📍 访问地址："
echo "   - 后端 API: http://localhost:3000"
echo "   - Web 平台: http://localhost:3001"
echo "   - 管理后台: http://localhost:3001/admin"
echo ""
echo "📝 日志文件："
echo "   - 后端: tail -f /tmp/backend.log"
echo "   - Web: tail -f /tmp/web.log"
echo ""
echo "🛑 停止服务："
echo "   kill $BACKEND_PID $WEB_PID"
echo "   或运行: pkill -f 'backend/dist/index.js' && pkill -f 'next dev'"
echo ""
echo "========================================"
