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
};

export function ImageGallery({ images, onRegenerate, regenerating = [] }: ImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (images.length === 0) {
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

  // Parse image URLs to extract template type
  // Format: /public/renders/{conversationId}-{templateType}-{timestamp}.png
  const parsedImages = images.map(url => {
    const filename = url.split('/').pop() || '';
    const parts = filename.replace('.png', '').split('-');
    const template = parts[parts.length - 2] || 'unknown';
    return {
      url,
      template,
      timestamp: parts[parts.length - 1],
    };
  });

  // Sort by timestamp descending (newest first)
  const sortedImages = [...parsedImages].sort((a, b) => {
    return (b.timestamp || '').localeCompare(a.timestamp || '');
  });

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            🖼️ 渲染图片 ({images.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedImages.map((image, index) => {
            const templateInfo = templateLabels[image.template] || {
              label: image.template,
              color: 'bg-gray-100 text-gray-800'
            };

            return (
              <div
                key={`${image.url}-${index}`}
                className="group relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setPreviewImage(`http://localhost:3000${image.url}`)}
              >
                {/* Template Label */}
                <div className="absolute top-2 left-2 z-10">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${templateInfo.color}`}>
                    {templateInfo.label}
                  </span>
                </div>

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

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreview
          src={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
