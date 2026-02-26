'use client';

import { useEffect, useState, useRef } from 'react';

interface TaskStatus {
  type: string;
  category: 'ai' | 'render';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface GenerationStatusResponse {
  conversationId: number;
  tasks: TaskStatus[];
}

interface GenerationStatusProps {
  conversationId: number;
  onComplete?: () => void;
}

const taskLabels: Record<string, { emoji: string; name: string }> = {
  social_media_summary: { emoji: '📱', name: '社媒摘要' },
  detailed_summary: { emoji: '📝', name: '详细汇总' },
  bento: { emoji: '🎨', name: 'Bento UI' },
  newsletter: { emoji: '📧', name: 'Newsletter' },
  retro_letter: { emoji: '✉️', name: 'Retro Letter' },
};

export function GenerationStatus({ conversationId, onComplete }: GenerationStatusProps) {
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  // 使用 ref 来避免 onComplete 变化导致重复创建轮询
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // 使用 ref 来追踪是否已经调用过 onComplete
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let isMounted = true;
    let lastPollTime = 0;
    const MIN_POLL_INTERVAL = 1000; // 最小轮询间隔 1 秒

    const pollStatus = async () => {
      // 节流：确保至少距离上次轮询 1 秒
      const now = Date.now();
      const timeSinceLastPoll = now - lastPollTime;

      if (timeSinceLastPoll < MIN_POLL_INTERVAL) {
        return; // 跳过这次轮询
      }

      lastPollTime = now;

      try {
        const response = await fetch(`http://localhost:3000/api/conversations/${conversationId}/status`);

        // Handle rate limiting and other errors gracefully
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('Rate limited, skipping this poll');
            return; // Don't stop polling on rate limit
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: GenerationStatusResponse = await response.json();

        if (!isMounted) return;

        setTasks(data.tasks);

        // Check if there are any active tasks
        const hasActiveTasks = data.tasks.length > 0;
        const allDone = hasActiveTasks && data.tasks.every(
          task => task.status === 'completed' || task.status === 'failed'
        );

        if (allDone) {
          if (pollInterval) {
            clearInterval(pollInterval);
            setPolling(false);
          }
          setLoading(false);

          // 只调用一次 onComplete
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onCompleteRef.current?.();

            // 发送渲染完成事件到前端（用于一键生成功能的进度更新）
            if (typeof window !== 'undefined') {
              // 为每个完成的任务发送事件
              data.tasks
                .filter(task => task.status === 'completed' && task.category === 'render')
                .forEach(task => {
                  window.dispatchEvent(new CustomEvent('render-complete', {
                    detail: {
                      conversationId,
                      template: task.type,
                      imageUrl: 'completed', // 标记为完成
                    }
                  }));
                });
            }
          }
        } else {
          setPolling(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
        // Don't stop polling on network errors, just log them
        if (!isMounted) return;
        setLoading(false);
      }
    };

    // Initial fetch
    pollStatus();

    // Start polling - 每 3 秒尝试一次，但实际调用会受节流控制
    pollInterval = setInterval(pollStatus, 3000);

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [conversationId]); // 移除 onComplete 依赖，只依赖 conversationId

  if (loading && tasks.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-800">加载任务状态...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  // Filter tasks that are not completed
  const activeTasks = tasks.filter(task => task.status !== 'completed');

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {polling && (
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          生成任务状态
        </h3>
        {polling && (
          <span className="text-xs text-gray-500">自动刷新中...</span>
        )}
      </div>

      <div className="space-y-2">
        {activeTasks.map((task, index) => {
          const label = taskLabels[task.type] || { emoji: '⚙️', name: task.type };
          const isProcessing = task.status === 'processing';
          const isPending = task.status === 'pending';
          const isFailed = task.status === 'failed';

          return (
            <div
              key={`${task.type}-${task.createdAt}-${index}`}
              className="flex items-center justify-between p-2 rounded-md bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{label.emoji}</span>
                <span className="text-sm font-medium text-gray-700">{label.name}</span>
              </div>

              <div className="flex items-center gap-2">
                {isFailed && task.error && (
                  <span className="text-xs text-red-600 max-w-xs truncate" title={task.error}>
                    失败: {task.error}
                  </span>
                )}

                {isProcessing && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    处理中
                  </span>
                )}

                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                    等待中
                  </span>
                )}

                {isFailed && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    ❌ 失败
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
