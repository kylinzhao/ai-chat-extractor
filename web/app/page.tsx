'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Conversation {
  id: number;
  platform: string;
  captured_at: string;
  messages: Array<{ role: string; content: string }>;
  image_urls?: string[];
  social_media_summary?: string;
  detailed_summary?: string;
  render_image_url?: string;
}

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/conversations');
      const result = await response.json();
      setConversations(result.data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchQuery === '' ||
      conv.social_media_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.detailed_summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlatform =
      platformFilter === 'all' || conv.platform === platformFilter;

    return matchesSearch && matchesPlatform;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlatformBadgeClass = (platform: string) => {
    return platform === 'Gemini'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 AI Chat Extractor
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                精选 AI 对话摘要分享平台
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              管理后台
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                搜索
              </label>
              <input
                type="text"
                id="search"
                placeholder="搜索关键词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="platform"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                平台
              </label>
              <select
                id="platform"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部平台</option>
                <option value="Gemini">Gemini</option>
                <option value="Doubao">豆包</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                共 {filteredConversations.length} 条记录
              </div>
            </div>
          </div>
        </div>

        {/* Conversations Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">暂无记录</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/public/${conv.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Image Preview */}
                {conv.render_image_url && (
                  <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-4xl">🤖</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlatformBadgeClass(
                        conv.platform
                      )}`}
                    >
                      {conv.platform}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(conv.captured_at)}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                    {conv.social_media_summary ||
                      conv.detailed_summary?.substring(0, 150) + '...'}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>💬 {conv.messages.length} 条消息</span>
                    {conv.image_urls && conv.image_urls.length > 0 && (
                      <span>📷 {conv.image_urls.length} 张图片</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-600">
            Generated by AI Chat Extractor • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
