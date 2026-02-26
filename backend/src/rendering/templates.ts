// 模板管理器
// 注意：在 Node.js 环境中运行，不使用 DOM API
import { marked } from 'marked';

/**
 * 安全地将 Markdown 转换为 HTML
 * 防止 XSS 攻击，只允许安全的 Markdown 标签
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // 配置 marked 选项，启用 GFM（GitHub Flavored Markdown）
  marked.use({
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // 支持 \n 换行
  });

  // 转换 Markdown 为 HTML
  const html = marked.parse(markdown) as string;

  return html;
}

/**
 * 安全地转义 HTML 特殊字符
 * 用于防止 XSS 攻击
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 模板类型
 */
export enum TemplateType {
  BENTO = 'bento',
  NEWSLETTER = 'newsletter',
  RETRO_LETTER = 'retro_letter',
  XIAOHONGSHU = 'xiaohongshu',
}

/**
 * 模板数据
 */
export interface TemplateData {
  conversationId: number;
  platform: string;
  socialMediaSummary?: string;
  detailedSummary?: string;
  messageCount: number;
  capturedAt: string;
  imageUrl?: string;
  title?: string;
}

/**
 * HTML 模板接口
 */
export interface HTMLTemplate {
  name: string;
  description: string;
  generateHTML: (data: TemplateData) => string;
}

/**
 * Bento UI 模板（网格布局）
 */
export class BentoTemplate implements HTMLTemplate {
  name = 'Bento UI';
  description = '现代网格布局，适合社交媒体分享';

  generateHTML(data: TemplateData): string {
    const platformIcon = this.getPlatformIcon(data.platform);
    const date = new Date(data.capturedAt).toLocaleDateString('zh-CN');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chat - ${data.conversationId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 15px;
    }

    .bento-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: auto auto auto;
      gap: 24px;
      max-width: 1000px;
      width: 100%;
      padding: 0;
    }

    .card {
      background: white;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .platform-badge {
      display: flex;
      align-items: center;
      gap: 18px;
      font-size: 42px;
      font-weight: 700;
      color: #667eea;
    }

    .conversation-id {
      font-size: 36px;
      color: #999;
    }

    .card-main {
      grid-column: 1 / -1;
    }

    .summary {
      font-size: 54px;
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
    }

    /* Markdown 样式 */
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 700;
      color: #222;
    }

    .markdown-content h1 { font-size: 63px; line-height: 1.2; }
    .markdown-content h2 { font-size: 54px; line-height: 1.2; }
    .markdown-content h3 { font-size: 45px; line-height: 1.2; }

    .markdown-content p { margin-bottom: 18px; }

    .markdown-content ul,
    .markdown-content ol {
      margin-left: 36px;
      margin-bottom: 18px;
    }

    .markdown-content li { margin-bottom: 9px; }

    .markdown-content code {
      background: #f4f4f4;
      padding: 3px 9px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 36px;
    }

    .markdown-content pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 24px;
      border-radius: 12px;
      overflow-x: auto;
      margin-bottom: 18px;
    }

    .markdown-content pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .markdown-content blockquote {
      border-left: 6px solid #667eea;
      padding-left: 24px;
      margin: 18px 0;
      color: #666;
      font-style: italic;
    }

    .markdown-content strong { font-weight: 700; color: #222; }
    .markdown-content em { font-style: italic; }
    .markdown-content a { color: #667eea; text-decoration: underline; }

    .card-meta {
      grid-column: 1 / 2;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .meta-label {
      font-size: 36px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .meta-value {
      font-size: 42px;
      font-weight: 600;
      color: #333;
    }

    .card-image {
      grid-column: 2 / -1;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border-radius: 16px;
      min-height: 150px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 64px;
    }

    .watermark {
      grid-column: 1 / -1;
      text-align: center;
      font-size: 22px;
      color: #999;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="bento-grid">
    <div class="card card-header">
      <div class="platform-badge">
        <span>${platformIcon}</span>
        <span>${data.platform}</span>
      </div>
      <div class="conversation-id">#${data.conversationId}</div>
    </div>

    <div class="card card-main">
      <div class="summary markdown-content">${data.socialMediaSummary ? markdownToHtml(data.socialMediaSummary) : '暂无摘要'}</div>
    </div>

    <div class="card card-meta">
      <div class="meta-item">
        <span class="meta-label">日期</span>
        <span class="meta-value">${date}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">消息数</span>
        <span class="meta-value">${data.messageCount} 条</span>
      </div>
    </div>

    ${data.imageUrl ? `
    <div class="card card-image">
      📷
    </div>
    ` : ''}

    <div class="watermark">
      Generated by AI Chat Extractor
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      Gemini: '✨',
      Doubao: '🫘',
    };
    return icons[platform] || '🤖';
  }
}

/**
 * Newsletter 模板（邮件风格）
 */
export class NewsletterTemplate implements HTMLTemplate {
  name = 'Newsletter';
  description = '邮件风格，适合分享给订阅者';

  generateHTML(data: TemplateData): string {
    const date = new Date(data.capturedAt).toLocaleDateString('zh-CN');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Chat Digest - ${date}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Georgia', serif;
      background: #f5f5f5;
      padding: 15px;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 96px;
      margin-bottom: 12px;
    }

    .header .subtitle {
      font-size: 33px;
      opacity: 0.9;
    }

    .content {
      padding: 30px;
    }

    .meta {
      display: flex;
      justify-content: space-between;
      padding-bottom: 24px;
      border-bottom: 3px solid #f0f0f0;
      margin-bottom: 24px;
      font-size: 36px;
      color: #999;
    }

    .summary {
      font-size: 54px;
      line-height: 1.8;
      color: #333;
      white-space: pre-wrap;
    }

    /* Markdown 样式 */
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 700;
      color: #222;
    }

    .markdown-content h1 { font-size: 63px; line-height: 1.2; }
    .markdown-content h2 { font-size: 54px; line-height: 1.2; }
    .markdown-content h3 { font-size: 45px; line-height: 1.2; }

    .markdown-content p { margin-bottom: 18px; }

    .markdown-content ul,
    .markdown-content ol {
      margin-left: 36px;
      margin-bottom: 18px;
    }

    .markdown-content li { margin-bottom: 9px; }

    .markdown-content code {
      background: #f4f4f4;
      padding: 3px 9px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 36px;
    }

    .markdown-content pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 24px;
      border-radius: 12px;
      overflow-x: auto;
      margin-bottom: 18px;
    }

    .markdown-content pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .markdown-content blockquote {
      border-left: 6px solid #667eea;
      padding-left: 24px;
      margin: 18px 0;
      color: #666;
      font-style: italic;
    }

    .markdown-content strong { font-weight: 700; color: #222; }
    .markdown-content em { font-style: italic; }
    .markdown-content a { color: #667eea; text-decoration: underline; }

    .footer {
      background: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 64px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Chat Digest</h1>
      <div class="subtitle">每日精选 AI 对话摘要</div>
    </div>

    <div class="content">
      <div class="meta">
        <span>📅 ${date}</span>
        <span>💬 ${data.messageCount} 条消息</span>
        <span>🤖 ${data.platform}</span>
      </div>

      <div class="summary markdown-content">${data.socialMediaSummary ? markdownToHtml(data.socialMediaSummary) : '暂无摘要'}</div>
    </div>

    <div class="footer">
      Generated by AI Chat Extractor • Conversation #${data.conversationId}
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

/**
 * 复古信纸模板
 */
export class RetroLetterTemplate implements HTMLTemplate {
  name = 'Retro Letter';
  description = '复古信纸风格，温馨怀旧';

  generateHTML(data: TemplateData): string {
    const date = new Date(data.capturedAt).toLocaleDateString('zh-CN');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Letter - ${data.conversationId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Noto+Serif+SC:wght@400;700&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Noto Serif SC', serif;
      background: #f4e4bc;
      background-image:
        repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(139, 69, 19, 0.1) 30px);
      padding: 15px;
      min-height: 100vh;
    }

    .paper {
      max-width: 800px;
      margin: 0 auto;
      background: #fffef0;
      padding: 36px;
      box-shadow: 0 0 60px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .paper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 90px;
      right: 0;
      bottom: 0;
      border-left: 3px solid rgba(255, 0, 0, 0.2);
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-left: 15px;
    }

    .header h1 {
      font-family: 'Caveat', cursive;
      font-size: 96px;
      color: #8b4513;
      margin-bottom: 6px;
    }

    .header .meta {
      font-size: 33px;
      color: #999;
      font-style: italic;
    }

    .content {
      padding-left: 60px;
      line-height: 2;
    }

    .summary {
      font-size: 54px;
      color: #333;
      white-space: pre-wrap;
    }

    /* Markdown 样式 */
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 700;
      color: #8b4513;
    }

    .markdown-content h1 { font-size: 63px; line-height: 1.2; }
    .markdown-content h2 { font-size: 54px; line-height: 1.2; }
    .markdown-content h3 { font-size: 45px; line-height: 1.2; }

    .markdown-content p { margin-bottom: 18px; }

    .markdown-content ul,
    .markdown-content ol {
      margin-left: 36px;
      margin-bottom: 18px;
    }

    .markdown-content li { margin-bottom: 9px; }

    .markdown-content code {
      background: #f4e4bc;
      padding: 3px 9px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 36px;
    }

    .markdown-content pre {
      background: #8b4513;
      color: #fffef0;
      padding: 24px;
      border-radius: 12px;
      overflow-x: auto;
      margin-bottom: 18px;
    }

    .markdown-content pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .markdown-content blockquote {
      border-left: 6px solid #8b4513;
      padding-left: 24px;
      margin: 18px 0;
      color: #666;
      font-style: italic;
    }

    .markdown-content strong { font-weight: 700; color: #8b4513; }
    .markdown-content em { font-style: italic; }
    .markdown-content a { color: #8b4513; text-decoration: underline; }

    .footer {
      margin-top: 40px;
      padding-left: 40px;
      font-size: 64px;
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="paper">
    <div class="header">
      <h1>To: My Future Self</h1>
      <div class="meta">
        📅 ${date} • 💬 ${data.messageCount} 条消息 • 🤖 ${data.platform}
      </div>
    </div>

    <div class="content">
      <div class="summary markdown-content">${data.socialMediaSummary ? markdownToHtml(data.socialMediaSummary) : '暂无摘要'}</div>
    </div>

    <div class="footer">
      — Generated by AI Chat Extractor (#${data.conversationId})
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

/**
 * 小红书风格模板
 */
export class XiaohongshuTemplate implements HTMLTemplate {
  name = 'XiaoHongShu';
  description = '小红书风格，适合移动端分享';

  generateHTML(data: TemplateData): string {
    const date = new Date(data.capturedAt).toLocaleDateString('zh-CN');
    const platformIcon = this.getPlatformIcon(data.platform);

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>小红书 - ${data.conversationId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFA726 100%);
      display: block;
      padding: 15px;
      margin: 0;
    }

    .xhs-card {
      background: white;
      border-radius: 24px;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 36px;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.2);
    }

    .header {
      margin-bottom: 24px;
    }

    .platform-badge {
      display: inline-flex;
      align-items: center;
      gap: 18px;
      background: linear-gradient(135deg, #FF6B6B, #FF8E53);
      color: white;
      padding: 18px 36px;
      border-radius: 36px;
      font-size: 42px;
      font-weight: 600;
      margin-bottom: 15px;
    }

    .title {
      font-size: 72px;
      font-weight: 700;
      color: #333;
      line-height: 1.2;
      margin-bottom: 12px;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 36px;
      color: #999;
      font-size: 36px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .content {
      margin-bottom: 24px;
    }

    .summary {
      font-size: 54px;
      line-height: 1.5;
      color: #333;
      white-space: pre-wrap;
    }

    /* Markdown 样式 */
    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 700;
      color: #333;
    }

    .markdown-content h1 { font-size: 63px; line-height: 1.2; }
    .markdown-content h2 { font-size: 54px; line-height: 1.2; }
    .markdown-content h3 { font-size: 45px; line-height: 1.2; }

    .markdown-content p { margin-bottom: 18px; }

    .markdown-content ul,
    .markdown-content ol {
      margin-left: 42px;
      margin-bottom: 18px;
    }

    .markdown-content li { margin-bottom: 9px; }

    .markdown-content code {
      background: #F5F5F5;
      padding: 4.5px 9px;
      border-radius: 9px;
      font-family: 'Courier New', monospace;
      font-size: 42px;
    }

    .markdown-content pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 24px;
      border-radius: 18px;
      overflow-x: auto;
      margin-bottom: 18px;
    }

    .markdown-content pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }

    .markdown-content blockquote {
      border-left: 6px solid #FF6B6B;
      padding-left: 24px;
      margin: 18px 0;
      color: #666;
      font-style: italic;
    }

    .markdown-content strong { font-weight: 700; color: #222; }
    .markdown-content em { font-style: italic; }
    .markdown-content a { color: #FF6B6B; text-decoration: underline; }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }

    .tag {
      background: #F5F5F5;
      color: #666;
      padding: 8px 20px;
      border-radius: 16px;
      font-size: 22px;
      font-weight: 500;
    }

    .footer {
      padding-top: 16px;
      border-top: 1px solid #F0F0F0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .watermark {
      font-size: 20px;
      color: #999;
    }

    .emoji {
      font-size: 28px;
    }
  </style>
</head>
<body>
  <div class="xhs-card">
    <div class="header">
      <div class="platform-badge">
        <span>${platformIcon}</span>
        <span>${data.platform}</span>
      </div>
      <h1 class="title">${escapeHtml(data.title || `AI 对话摘要 #${data.conversationId}`)}</h1>
      <div class="meta">
        <span class="meta-item">📅 ${date}</span>
        <span class="meta-item">💬 ${data.messageCount}条消息</span>
      </div>
    </div>

    <div class="content">
      <div class="summary markdown-content">${data.socialMediaSummary ? markdownToHtml(data.socialMediaSummary) : '暂无摘要'}</div>
      <div class="tags">
        <span class="tag">#AI对话</span>
        <span class="tag">#智能助手</span>
        <span class="tag">#${data.platform}</span>
      </div>
    </div>

    <div class="footer">
      <span class="watermark">Generated by AI Chat Extractor</span>
      <span class="emoji">✨</span>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      Gemini: '✨',
      Doubao: '🫘',
    };
    return icons[platform] || '🤖';
  }
}

/**
 * 模板管理器
 */
export class TemplateManager {
  private templates: Map<TemplateType, HTMLTemplate>;

  constructor() {
    this.templates = new Map<TemplateType, HTMLTemplate>([
      [TemplateType.BENTO, new BentoTemplate()],
      [TemplateType.NEWSLETTER, new NewsletterTemplate()],
      [TemplateType.RETRO_LETTER, new RetroLetterTemplate()],
      [TemplateType.XIAOHONGSHU, new XiaohongshuTemplate()],
    ]);
  }

  /**
   * 获取模板
   */
  getTemplate(type: TemplateType): HTMLTemplate {
    const template = this.templates.get(type);
    if (!template) {
      throw new Error(`Template not found: ${type}`);
    }
    return template;
  }

  /**
   * 列出所有模板
   */
  listTemplates(): Array<{ type: TemplateType; name: string; description: string }> {
    return Array.from(this.templates.entries()).map(([type, template]) => ({
      type,
      name: template.name,
      description: template.description,
    }));
  }
}

/**
 * 模板管理器单例
 */
let templateManagerInstance: TemplateManager | null = null;

export function getTemplateManager(): TemplateManager {
  if (!templateManagerInstance) {
    templateManagerInstance = new TemplateManager();
  }
  return templateManagerInstance;
}

/**
 * 获取模板（便捷方法）
 */
export function getTemplate(type: TemplateType): HTMLTemplate {
  return getTemplateManager().getTemplate(type);
}
