import OpenAI from 'openai';

/**
 * SiliconFlow API 配置
 */
export interface SiliconFlowConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * AI 调用结果
 */
export interface AIResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

/**
 * SiliconFlow 客户端类
 * 封装硅基流动 API 调用（兼容 OpenAI 格式）
 */
export class SiliconFlowClient {
  private client: OpenAI;
  private model: string;
  private maxRetries: number;

  constructor(config: SiliconFlowConfig) {
    this.model = config.model || 'deepseek-ai/DeepSeek-V3';
    this.maxRetries = config.maxRetries || 3;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://api.siliconflow.cn/v1',
      maxRetries: this.maxRetries,
      timeout: config.timeout || 300000, // 默认 5 分钟超时（与 AI 队列一致）
    });
  }

  /**
   * 生成文本（聊天完成）
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @param temperature 温度参数（0-2，越高越随机）
   * @param maxTokens 最大生成 token 数
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.7,
    maxTokens: number = 4000
  ): Promise<AIResponse> {
    try {
      console.log(`[SiliconFlow] Calling ${this.model} API...`);
      console.log(`[SiliconFlow] System prompt: ${systemPrompt.length} chars`);
      console.log(`[SiliconFlow] User prompt: ${userPrompt.length} chars`);
      console.log(`[SiliconFlow] Max tokens: ${maxTokens}, Temperature: ${temperature}`);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      console.log(`[SiliconFlow] API response received`);
      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        throw new Error('Empty response from AI');
      }

      console.log(`[SiliconFlow] Response content length: ${choice.message.content.length} chars`);
      return {
        content: choice.message.content,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        cost: this.calculateCost(response.usage?.total_tokens || 0),
      };
    } catch (error) {
      // 详细的错误日志
      console.error(`[SiliconFlow] API call failed:`);
      console.error(`[SiliconFlow] Error:`, error);

      if (error instanceof OpenAI.APIError) {
        console.error(`[SiliconFlow] APIError - Status: ${error.status}`);
        console.error(`[SiliconFlow] APIError - Message: ${error.message}`);
        console.error(`[SiliconFlow] APIError - Code: ${error.code}`);
        console.error(`[SiliconFlow] APIError - Type: ${error.type}`);
        throw new Error(
          `SiliconFlow API error: ${error.message} (status: ${error.status}, code: ${error.code})`
        );
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          console.error(`[SiliconFlow] Request timeout after ${this.client.timeout}ms`);
          throw new Error(`AI API request timeout (exceeded ${this.client.timeout}ms)`);
        }
        console.error(`[SiliconFlow] Error name: ${error.name}`);
        console.error(`[SiliconFlow] Error message: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * 流式生成文本（用于实时显示）
   * @param systemPrompt 系统提示词
   * @param userPrompt 用户提示词
   * @param onChunk 接收每个文本块的回调函数
   */
  async generateStream(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      });

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          onChunk(delta);
        }

        // 获取最后的 usage 信息
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens || 0;
          completionTokens = chunk.usage.completion_tokens || 0;
        }
      }

      return {
        content: fullContent,
        model: this.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        cost: this.calculateCost(promptTokens + completionTokens),
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(
          `SiliconFlow API error: ${error.message} (status: ${error.status})`
        );
      }
      throw error;
    }
  }

  /**
   * 计算 API 调用成本
   * 硅基流动定价（参考）：
   * - DeepSeek-V3: ¥0.14/1M input tokens, ¥0.28/1M output tokens
   * 这里使用简化计算
   */
  private calculateCost(totalTokens: number): number {
    // 简化计算：¥0.2 / 1M tokens
    return (totalTokens / 1_000_000) * 0.2;
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generate(
        'You are a helpful assistant.',
        'Say "OK" if you can read this.',
        0.1,
        10
      );
      return response.content.includes('OK');
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 切换模型
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * 获取当前模型
   */
  getModel(): string {
    return this.model;
  }
}

/**
 * 创建 SiliconFlow 客户端实例（单例）
 */
let clientInstance: SiliconFlowClient | null = null;

export function getSiliconFlowClient(): SiliconFlowClient {
  if (!clientInstance) {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
      throw new Error('SILICONFLOW_API_KEY environment variable is not set');
    }

    clientInstance = new SiliconFlowClient({
      apiKey,
      baseURL: process.env.SILICONFLOW_API_BASE,
      model: process.env.SILICONFLOW_MODEL,
      maxRetries: 3,
      timeout: 300000, // 5 分钟超时，与 AI 队列一致
    });
  }

  return clientInstance;
}
