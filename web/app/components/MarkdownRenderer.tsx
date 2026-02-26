'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  maxLength?: number;
}

/**
 * Markdown 渲染器组件
 * 支持标题、列表、代码块、链接、加粗等常见 Markdown 格式
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, className = '', maxLength }) => {
    // 如果设置了长度限制，截断内容
    const displayContent = maxLength && content.length > maxLength
      ? content.substring(0, maxLength)
      : content;

    return (
      <div className={`markdown-body ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // 自定义段落样式
            p: ({ children }) => (
              <p className="mb-4 last:mb-0 text-gray-700 leading-relaxed">
                {children}
              </p>
            ),
            // 自定义标题样式
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                {children}
              </h3>
            ),
            // 自定义列表样式
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-700">{children}</li>
            ),
            // 自定义代码块样式
            code: ({ className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              return isInline ? (
                <code
                  className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code
                  className={`${className} block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono`}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-gray-900 rounded-lg overflow-x-auto mb-4">
                {children}
              </pre>
            ),
            // 自定义链接样式
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            // 自定义引用样式
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">
                {children}
              </blockquote>
            ),
            // 自定义表格样式
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-50">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="bg-white divide-y divide-gray-200">
                {children}
              </tbody>
            ),
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => (
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                {children}
              </td>
            ),
            // 自定义分隔线样式
            hr: () => <hr className="my-6 border-t border-gray-300" />,
            // 自定义强调样式
            strong: ({ children }) => (
              <strong className="font-bold text-gray-900">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-700">{children}</em>
            ),
          }}
        >
          {displayContent}
        </ReactMarkdown>
        {maxLength && content.length > maxLength && (
          <span className="text-gray-500 text-sm">...</span>
        )}
      </div>
    );
  }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

/**
 * 折叠式 Markdown 渲染器
 * 默认收起，显示前 N 个字符，点击展开显示全部
 */
export const CollapsibleMarkdown: React.FC<
  MarkdownRendererProps & { previewLength?: number }
> = React.memo(
  ({ content, className = '', previewLength = 100 }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    // 智能截断：在句子边界截断，避免中间截断
    const getPreviewText = (text: string, maxLength: number): string => {
      if (text.length <= maxLength) return text;

      // 尝试在句子结束符处截断
      const sentenceEnders = ['。', '！', '？', '. ', '! ', '? ', '\n'];
      for (let i = maxLength; i >= maxLength - 20; i--) {
        if (i < text.length && sentenceEnders.includes(text[i])) {
          return text.substring(0, i + 1);
        }
      }

      // 如果找不到句子边界，就在单词边界截断
      for (let i = maxLength; i >= maxLength - 10; i--) {
        if (i < text.length && text[i] === ' ') {
          return text.substring(0, i);
        }
      }

      // 最后才直接截断
      return text.substring(0, maxLength);
    };

    const needsTruncation = content.length > previewLength;
    const displayContent = isExpanded ? content : getPreviewText(content, previewLength);

    return (
      <div className={className}>
        <MarkdownRenderer content={displayContent} />
        {needsTruncation && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            {isExpanded ? '收起 ↑' : '展开全部 ↓'}
          </button>
        )}
      </div>
    );
  }
);

CollapsibleMarkdown.displayName = 'CollapsibleMarkdown';
