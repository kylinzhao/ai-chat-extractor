'use client';

import { useEffect } from 'react';
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  images: string[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function ImagePreview({ src, images, currentIndex, onPrevious, onNext, onClose }: ImagePreviewProps) {
  useEffect(() => {
    // Handle keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
      }
    };

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onPrevious, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          aria-label="关闭预览"
        >
          <XIcon className="w-6 h-6 text-white" />
        </button>

        {/* Previous Button */}
        {images.length > 1 && currentIndex > 0 && (
          <button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="上一张"
          >
            <ChevronLeftIcon className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && currentIndex < images.length - 1 && (
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="下一张"
          >
            <ChevronRightIcon className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Image */}
        <img
          src={src}
          alt="预览"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/60 text-white px-6 py-3 rounded-full text-sm">
        {images.length > 1 && (
          <span>{currentIndex + 1} / {images.length}</span>
        )}
        <span className="border-l border-white/40 pl-4 ml-4">
          点击背景、按 ESC 键关闭
          {images.length > 1 && ' • 使用 ← → 键切换'}
        </span>
      </div>
    </div>
  );
}
