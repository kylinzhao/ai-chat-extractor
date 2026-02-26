/**
 * 提示词模板配置
 */

/**
 * 提示词变量
 */
export interface PromptVariables {
  platform: string;
  conversationTopic?: string;
  messageCount: number;
  hasImages: boolean;
  // 可以添加更多变量
}

/**
 * 提示词模板接口
 */
export interface PromptTemplate {
  name: string;
  description: string;
  systemPrompt: string;
  getUserPrompt: (variables: PromptVariables) => string;
  forbiddenWords: string[];
}

/**
 * 禁用词列表（用于"去 AI 化"）
 */
export const FORBIDDEN_WORDS = [
  '总之',
  '综上所述',
  '值得注意的是',
  '不得不说',
  '可以说',
  '显而易见',
  '众所周知',
  '毫无疑问',
  '毋庸置疑',
  '显而易见地',
  '自然而然地',
  '不容置疑',
  '不言而喻',
  '一方面',
  '另一方面',
  '首先',
  '其次',
  '最后',
  '另外',
  '此外',
  '而且',
  '并且',
  '同时',
  '不过',
  '然而',
  '因此',
  '所以',
  '由此可见',
  '从上述分析可以看出',
  '总的来说',
  '简而言之',
  '换言之',
  '换句话说',
  '也就是说',
  '换句话说就是',
  '也就是说',
  '换句话说',
  '综上所述',
  '总而言之',
  '概括起来',
  '概括来说',
  '总体来看',
  '整体而言',
  '从整体来看',
  '整体上',
  '基本上',
  '根本上',
  '本质上',
  '实质上',
  '实际上',
  '事实上',
  '实际上',
  '实质上',
  '本质上',
  '基本上',
  '主要地',
  '关键地',
  '重要地',
  '值得注意的是',
  '需要指出的是',
  '必须承认',
  '必须指出',
  '不得不说',
  '不得不说的是',
  '事实上',
  '实际上',
  '实际上',
  '其实',
  '其实',
  '归根结底',
  '归根到底',
  '从本质上说',
  '从根本上说',
  '从根本上看',
  '从根本上',
  '从根本上讲',
  '从根本上来说',
];

/**
 * 详细汇总提示词模板
 */
export const DETAILED_SUMMARY_TEMPLATE: PromptTemplate = {
  name: 'detailed_summary',
  description: '生成详细的对话汇总，包括主要话题、关键信息、结论等',
  systemPrompt: `你是一个专业的对话分析助手。你的任务是将 AI 对话转换为结构清晰、内容丰富的详细汇总。

**要求：**
1. 保持客观中立，准确传达对话的核心内容
2. 使用清晰的层级结构（标题、小标题、列表）
3. 突出关键信息和重要结论
4. 省略无关的寒暄和重复内容
5. 保留代码、命令、链接等重要信息
6. 如有图片，简要说明图片内容
7. **禁止使用**以下表达：总之、综上所述、值得注意的是、不得不说、显而易见等 AI 常用套话
8. 使用自然流畅的语言，像真实人类写的笔记
9. 如果对话涉及技术问题，确保技术细节准确

**输出格式：**
# 标题

## 背景介绍
简要说明对话的背景和主题

## 主要内容
### 要点 1
- 详细说明
- 代码示例（如有）
- 相关链接（如有）

### 要点 2
...

## 结论/行动项
- 结论 1
- 结论 2
- 待办事项（如有）`,
  getUserPrompt: (variables: PromptVariables) => {
    return `请分析以下来自 ${variables.platform} 的 AI 对话（共 ${variables.messageCount} 条消息${variables.hasImages ? '，包含图片' : ''}），生成详细的汇总文档。

对话内容将以 JSON 格式提供，请仔细阅读并按照系统提示的要求生成汇总。`;
  },
  forbiddenWords: FORBIDDEN_WORDS,
};

/**
 * 社媒摘要提示词模板
 */
export const SOCIAL_MEDIA_SUMMARY_TEMPLATE: PromptTemplate = {
  name: 'social_media_summary',
  description: '生成适合社交媒体分享的精简摘要（140-280 字）和标题',
  systemPrompt: `你是一个社交媒体内容编辑。你的任务是将 AI 对话转换为精简、有吸引力的社媒分享文案和标题。

**要求：**
1. 总字数控制在 140-280 字之间（适合微博、Twitter、朋友圈）
2. 开头要有吸引人的钩子（问题、数据、观点等）
3. 使用 emoji 让内容更生动（适度使用，不要过多）
4. 突出最有价值的 1-3 个要点
5. 使用短句和列表，提高可读性
6. 结尾可以有互动问题或行动号召
7. **绝对禁止**使用 AI 套话（总之、综上所述等）
8. 语言风格：像真人在社交媒体分享，自然、有个性
9. 如果有技术内容，用通俗语言解释
10. 适当添加标签（#）

**标题要求：**
- 10-20 个中文字符
- 简洁有力，能吸引点击
- 包含对话的核心主题
- 避免使用 "AI 对话摘要" 这种通用标题

**语气风格参考：**
- 轻松但不轻浮
- 专业但不死板
- 有观点但不偏激
- 有温度但不矫情

**输出格式（必须是严格的 JSON）：**
\`\`\`json
{
  "title": "标题（10-20字）",
  "summary": "社媒分享文案（140-280字）"
}
\`\`\`

**示例结构：**
\`\`\`json
{
  "title": "用 React 19 新特性重构组件，性能提升 300%",
  "summary": "🤖 刚用 React 19 的新特性重构了老项目，性能提升显著：\\n\\n1️⃣ use() Hook 替代 useEffect，代码减少 40%\\n2️⃣ 自动状态批处理，渲染次数减半\\n3️⃣ 服务器组件优化首屏加载\\n\\n最大的感受是：并发渲染真的香！\\n\\n#React #前端开发"
}
\`\`\``,
  getUserPrompt: (variables: PromptVariables) => {
    let topicHint = '';
    if (variables.conversationTopic) {
      topicHint = `\n主题提示：${variables.conversationTopic}`;
    }

    return `请将以下来自 ${variables.platform} 的 AI 对话（共 ${variables.messageCount} 条消息${variables.hasImages ? '，包含图片' : ''}）转换为精简的社媒分享文案和标题。${topicHint}

对话内容将以 JSON 格式提供，请仔细阅读并按照系统提示的要求生成 JSON 格式的响应。`;
  },
  forbiddenWords: FORBIDDEN_WORDS,
};

/**
 * 提示词模板管理器
 */
export class PromptManager {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.registerTemplate(DETAILED_SUMMARY_TEMPLATE);
    this.registerTemplate(SOCIAL_MEDIA_SUMMARY_TEMPLATE);
  }

  /**
   * 注册自定义提示词模板
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * 获取提示词模板
   */
  getTemplate(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * 列出所有模板
   */
  listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 构建完整的提示词（system + user）
   */
  buildPrompts(
    templateName: string,
    variables: PromptVariables
  ): { systemPrompt: string; userPrompt: string } | null {
    const template = this.templates.get(templateName);
    if (!template) {
      return null;
    }

    return {
      systemPrompt: template.systemPrompt,
      userPrompt: template.getUserPrompt(variables),
    };
  }

  /**
   * 检查文本是否包含禁用词
   */
  checkForbiddenWords(text: string, templateName: string): {
    hasViolation: boolean;
    foundWords: string[];
  } {
    const template = this.templates.get(templateName);
    if (!template) {
      return { hasViolation: false, foundWords: [] };
    }

    const foundWords: string[] = [];
    for (const word of template.forbiddenWords) {
      if (text.includes(word)) {
        foundWords.push(word);
      }
    }

    return {
      hasViolation: foundWords.length > 0,
      foundWords,
    };
  }

  /**
   * 清理禁用词（简单替换，实际使用时可能需要更智能的处理）
   */
  cleanForbiddenWords(text: string, templateName: string): string {
    const { foundWords } = this.checkForbiddenWords(text, templateName);
    let cleanedText = text;

    for (const word of foundWords) {
      // 使用正则表达式全局替换
      const regex = new RegExp(word, 'g');
      cleanedText = cleanedText.replace(regex, '');
    }

    return cleanedText;
  }
}

/**
 * 提示词管理器单例
 */
let promptManagerInstance: PromptManager | null = null;

export function getPromptManager(): PromptManager {
  if (!promptManagerInstance) {
    promptManagerInstance = new PromptManager();
  }
  return promptManagerInstance;
}
