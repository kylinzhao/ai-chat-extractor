'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* Social Media Summary */}
          {conversation.social_media_summary && (
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                📱 社媒摘要
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {conversation.social_media_summary}
              </p>
            </div>
          )}

          {/* Detailed Summary */}
          {conversation.detailed_summary && (
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                📝 详细汇总
              </h2>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {conversation.detailed_summary}
              </div>
            </div>
          )}

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
      </div>
    </div>
  );
}
