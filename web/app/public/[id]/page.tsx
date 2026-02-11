'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GenerationStatus } from '@/app/components/GenerationStatus';
import { ImageGallery } from '@/app/components/ImageGallery';

interface Conversation {
  id: number;
  platform: string;
  captured_at: string;
  messages: Array<{ role: string; content: string }>;
  image_urls?: string[];
  social_media_summary?: string;
  detailed_summary?: string;
}

export default function PublicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Regeneration states
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchConversation(params.id as string);
    }
  }, [params.id]);

  const fetchConversation = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/conversations/${id}`);
      if (!response.ok) {
        throw new Error('Conversation not found');
      }
      const data = await response.json();
      setConversation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = () => {
    // Reload conversation data when all tasks complete
    if (params.id) {
      fetchConversation(params.id as string);
    }
  };

  const generateAISummary = async (type: 'detailed_summary' | 'social_media_summary') => {
    if (!conversation) return;

    const taskKey = `ai-${type}`;
    setRegenerating(prev => ({ ...prev, [taskKey]: true }));
    setCompletionMessage(null);

    try {
      const response = await fetch(`http://localhost:3000/api/ai/conversations/${conversation.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, regenerate: true }),
      });

      const result = await response.json();
      if (result.taskId) {
        // Start polling status via GenerationStatus component
        // The component will auto-refresh and trigger handleTaskComplete when done
      } else {
        setCompletionMessage('❌ 创建任务失败');
        setTimeout(() => setCompletionMessage(null), 3000);
      }
    } catch (err) {
      setCompletionMessage(`❌ 错误: ${err instanceof Error ? err.message : '未知错误'}`);
      setTimeout(() => setCompletionMessage(null), 5000);
    } finally {
      setTimeout(() => {
        setRegenerating(prev => ({ ...prev, [taskKey]: false }));
      }, 3000);
    }
  };

  const renderImage = async (template: 'bento' | 'newsletter' | 'retro_letter' | 'xiaohongshu') => {
    if (!conversation) return;

    const taskKey = `render-${template}`;
    setRegenerating(prev => ({ ...prev, [taskKey]: true }));
    setCompletionMessage(null);

    try {
      const response = await fetch(`http://localhost:3000/api/render/conversations/${conversation.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, regenerate: true }),
      });

      const result = await response.json();
      if (result.taskId) {
        // Start polling status via GenerationStatus component
        // The component will auto-refresh and trigger handleTaskComplete when done
      } else {
        setCompletionMessage('❌ 创建任务失败');
        setTimeout(() => setCompletionMessage(null), 3000);
      }
    } catch (err) {
      setCompletionMessage(`❌ 错误: ${err instanceof Error ? err.message : '未知错误'}`);
      setTimeout(() => setCompletionMessage(null), 5000);
    } finally {
      setTimeout(() => {
        setRegenerating(prev => ({ ...prev, [taskKey]: false }));
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '对话不存在'}</p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← 返回首页
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Conversation Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-3 py-1 bg-white/20 text-white text-sm font-semibold rounded-full">
                  {conversation.platform}
                </span>
                <h1 className="text-3xl font-bold text-white mt-3">
                  对话 #{conversation.id}
                </h1>
                <p className="text-white/80 mt-2">
                  {formatDate(conversation.captured_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Generation Status */}
          <div className="p-6 border-b">
            <GenerationStatus
              conversationId={conversation.id}
              onComplete={handleTaskComplete}
            />
          </div>

          {/* Social Media Summary */}
          {conversation.social_media_summary ? (
            <div className="p-6 border-b animate-fade-in">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                📱 社媒摘要
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {conversation.social_media_summary}
              </p>
            </div>
          ) : (
            <div className="p-6 border-b bg-blue-50/50">
              <h2 className="text-sm font-medium text-gray-700 mb-2">📱 社媒摘要</h2>
              <p className="text-sm text-gray-500 italic">生成中...</p>
            </div>
          )}

          {/* Detailed Summary */}
          {conversation.detailed_summary ? (
            <div className="p-6 border-b animate-fade-in">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                📝 详细汇总
              </h2>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {conversation.detailed_summary}
              </div>
            </div>
          ) : (
            <div className="p-6 border-b bg-blue-50/50">
              <h2 className="text-sm font-medium text-gray-700 mb-2">📝 详细汇总</h2>
              <p className="text-sm text-gray-500 italic">生成中...</p>
            </div>
          )}

          {/* Image Gallery */}
          <div className="p-6 border-b">
            <ImageGallery images={conversation.image_urls || []} />
          </div>

          {/* Messages Preview */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              💬 对话消息 ({conversation.messages.length} 条)
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {conversation.messages.slice(0, 10).map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'bg-gray-50 border-l-4 border-gray-500'
                  }`}
                >
                  <div className="text-xs font-semibold text-gray-600 mb-1">
                    {msg.role === 'user' ? '用户' : 'AI'}
                  </div>
                  <p className="text-sm text-gray-800">{msg.content}</p>
                </div>
              ))}
              {conversation.messages.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  ... 还有 {conversation.messages.length - 10} 条消息
                </p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-gray-50 px-6 py-4 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>💬 {conversation.messages.length} 条消息</span>
              {conversation.image_urls && conversation.image_urls.length > 0 && (
                <span>📷 {conversation.image_urls.length} 张图片</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">重新生成内容</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* AI 生成按钮 */}
            <button
              onClick={() => generateAISummary('detailed_summary')}
              disabled={regenerating['ai-detailed_summary']}
              className="px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating['ai-detailed_summary'] ? '生成中...' : '📝 重新生成详细汇总'}
            </button>
            <button
              onClick={() => generateAISummary('social_media_summary')}
              disabled={regenerating['ai-social_media_summary']}
              className="px-4 py-3 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating['ai-social_media_summary'] ? '生成中...' : '📱 重新生成社媒摘要'}
            </button>

            {/* 渲染按钮 */}
            <button
              onClick={() => renderImage('bento')}
              disabled={regenerating['render-bento']}
              className="px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating['render-bento'] ? '渲染中...' : '🎨 重新生成 Bento UI'}
            </button>
            <button
              onClick={() => renderImage('newsletter')}
              disabled={regenerating['render-newsletter']}
              className="px-4 py-3 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating['render-newsletter'] ? '渲染中...' : '📧 重新生成 Newsletter'}
            </button>
            <button
              onClick={() => renderImage('retro_letter')}
              disabled={regenerating['render-retro_letter']}
              className="px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating['render-retro_letter'] ? '渲染中...' : '✉️ 重新生成 Retro Letter'}
            </button>
            <button
              onClick={() => renderImage('xiaohongshu')}
              disabled={regenerating['render-xiaohongshu']}
              className="px-4 py-3 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating['render-xiaohongshu'] ? '渲染中...' : '📱 重新生成 小红书风格'}
            </button>
          </div>

          {/* Completion Message */}
          {completionMessage && (
            <div className="mt-4 text-center">
              <span className={`inline-block px-4 py-2 rounded-md text-sm font-medium ${
                completionMessage.includes('✅')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {completionMessage}
              </span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
