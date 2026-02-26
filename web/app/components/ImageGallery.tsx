'use client';

import { useState } from 'react';
import { ImagePreview } from './ImagePreview';

interface RenderedImage {
  url: string;
  template: string;
  timestamp?: string;
}

interface ImageGalleryProps {
  images: string[];
  onRegenerate?: (template: string) => void;
  regenerating?: string[];
}

const templateLabels: Record<string, { label: string; color: string }> = {
  bento: { label: 'Bento UI', color: 'bg-green-100 text-green-800' },
  newsletter: { label: 'Newsletter', color: 'bg-teal-100 text-teal-800' },
  retro_letter: { label: 'Retro Letter', color: 'bg-amber-100 text-amber-800' },
  xiaohongshu: { label: '小红书风格', color: 'bg-red-100 text-red-800' },
};

export function ImageGallery({ images, onRegenerate, regenerating = [] }: ImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(0);

  // 只显示渲染图片（以 /public/renders/ 开头的URL），过滤掉外链图片
  const renderImages = images.filter(url => url.startsWith('/public/renders/'));

  // 处理预览图片切换
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    const index = displayImages.findIndex(img => img.url === url);
    if (index !== -1) {
      setCurrentPreviewIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentPreviewIndex > 0) {
      const prevIndex = currentPreviewIndex - 1;
      setCurrentPreviewIndex(prevIndex);
      setPreviewImage(`http://localhost:3000${displayImages[prevIndex].url}`);
    }
  };

  const handleNext = () => {
    if (currentPreviewIndex < displayImages.length - 1) {
      const nextIndex = currentPreviewIndex + 1;
      setCurrentPreviewIndex(nextIndex);
      setPreviewImage(`http://localhost:3000${displayImages[nextIndex].url}`);
    }
  };

  if (renderImages.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无渲染图片</h3>
          <p className="text-sm text-gray-600 mb-4">
            点击上方按钮生成渲染图片
          </p>
        </div>
      </div>
    );
  }

  // Parse image URLs to extract template type and page number
  // Format: /public/renders/{conversationId}-{templateType}-{pageNum}-{timestamp}.png (多页)
  //          or /public/renders/{conversationId}-{templateType}-{timestamp}.png (单页)
  const parsedImages = renderImages.map(url => {
    const filename = url.split('/').pop() || '';
    const parts = filename.replace('.png', '').split('-');

    // 解析格式: conversationId-templateType-pageNum-timestamp 或 conversationId-templateType-timestamp
    const conversationId = parts[0];
    const template = parts[1] || 'unknown';
    const pageNum = parts.length === 4 ? parseInt(parts[2]) : 1; // 如果有4个部分，第3个是页码
    const timestamp = parts[parts.length - 1];

    return {
      url,
      conversationId,
      template,
      pageNum,
      timestamp,
    };
  });

  // 按模板分组，并按页码排序
  const groupedByTemplate = parsedImages.reduce((acc, image) => {
    if (!acc[image.template]) {
      acc[image.template] = [];
    }
    acc[image.template].push(image);
    return acc;
  }, {} as Record<string, typeof parsedImages>);

  // 对每个模板组按页码排序，并按时间戳取最新的一组
  for (const template in groupedByTemplate) {
    groupedByTemplate[template].sort((a, b) => {
      // 先按时间戳倒序（最新的在前）
      const timestampCompare = (b.timestamp || '').localeCompare(a.timestamp || '');
      if (timestampCompare !== 0) return timestampCompare;
      // 时间戳相同，按页码升序
      return a.pageNum - b.pageNum;
    });

    // 找出最新的时间戳
    const latestTimestamp = groupedByTemplate[template][0].timestamp;

    // 只保留最新时间戳的图片（所有分页）
    groupedByTemplate[template] = groupedByTemplate[template].filter(
      img => img.timestamp === latestTimestamp
    );
  }

  // 获取所有模板类型并排序
  const templateTypes = Object.keys(groupedByTemplate).sort();

  // 为每个模板准备图片URL（用于预览导航）
  const imagesByTemplate = templateTypes.reduce((acc, template) => {
    acc[template] = groupedByTemplate[template].map(img => `http://localhost:3000${img.url}`);
    return acc;
  }, {} as Record<string, string[]>);

  // 展平成数组用于总数显示
  const displayImages = Object.values(groupedByTemplate).flat();

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🖼️ 渲染图片 ({displayImages.length})
          </h2>
        </div>

        {/* 按模板分组显示 */}
        {templateTypes.map(template => {
          const templateInfo = templateLabels[template] || {
            label: template,
            color: 'bg-gray-100 text-gray-800'
          };
          const templateImages = groupedByTemplate[template];

          return (
            <div key={template} className="mb-6">
              {/* Template Header */}
              <div className="flex items-center gap-2 mb-3">
                <h3 className={`text-lg font-semibold px-3 py-1 rounded-lg ${templateInfo.color}`}>
                  {templateInfo.label}
                </h3>
                <span className="text-sm text-gray-600">
                  ({templateImages.length} 张图片)
                </span>
              </div>

              {/* Images Grid for this template */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templateImages.map((image, index) => {
                  // 如果是多页图片，显示页码
                  const isMultiPage = image.pageNum > 0;
                  const label = isMultiPage
                    ? `${templateInfo.label} (第 ${image.pageNum + 1} 页)`
                    : templateInfo.label;

                  return (
                    <div
                      key={`${image.url}-${index}`}
                      className="group relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handlePreview(image.url)}
                    >
                      {/* Page Number Badge */}
                      {isMultiPage && (
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
                            第 {image.pageNum + 1} 页
                          </span>
                        </div>
                      )}

                      {/* Image */}
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={`http://localhost:3000${image.url}`}
                          alt={`${templateInfo.label} 渲染`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-sm font-medium px-3 py-1 bg-black/50 rounded-full">
                            点击预览
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreview
          src={previewImage}
          images={displayImages.map(img => `http://localhost:3000${img.url}`)}
          currentIndex={currentPreviewIndex}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
