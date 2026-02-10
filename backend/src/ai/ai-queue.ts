import { getSiliconFlowClient, AIResponse } from './siliconflow.client';
import { getPromptManager, PromptVariables } from './prompts';

/**
 * AI 任务类型
 */
export enum AITaskType {
  DETAILED_SUMMARY = 'detailed_summary',
  SOCIAL_MEDIA_SUMMARY = 'social_media_summary',
}

/**
 * AI 任务状态
 */
export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * AI 任务
 */
export interface AITask {
  id: string;
  type: AITaskType;
  conversationId: number;
  conversationData: any; // 对话 JSON 数据
  status: AITaskStatus;
  result?: string;
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
}

/**
 * 任务队列配置
 */
interface QueueConfig {
  maxConcurrent: number; // 最大并发数
  retryLimit: number; // 重试次数限制
  timeout: number; // 任务超时时间（毫秒）
}

/**
 * AI 任务队列
 */
export class AITaskQueue {
  private queue: AITask[] = [];
  private processing: Map<string, AITask> = new Map();
  private config: QueueConfig;

  constructor(config: QueueConfig = { maxConcurrent: 3, retryLimit: 3, timeout: 300000 }) {
    this.config = config;
  }

  /**
   * 添加任务到队列
   */
  addTask(
    type: AITaskType,
    conversationId: number,
    conversationData: any
  ): AITask {
    const task: AITask = {
      id: `${conversationId}-${type}-${Date.now()}`,
      type,
      conversationId,
      conversationData,
      status: AITaskStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
    };

    this.queue.push(task);
    return task;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const pending = this.queue.filter((t) => t.status === AITaskStatus.PENDING).length;
    const processing = Array.from(this.processing.values()).filter(
      (t) => t.status === AITaskStatus.PROCESSING
    ).length;
    const completed = Array.from(this.processing.values()).filter(
      (t) => t.status === AITaskStatus.COMPLETED
    ).length;
    const failed = Array.from(this.processing.values()).filter(
      (t) => t.status === AITaskStatus.FAILED
    ).length;

    return { pending, processing, completed, failed };
  }

  /**
   * 开始处理队列
   */
  async start(): Promise<void> {
    // 启动多个工作线程
    const workers = Array.from({ length: this.config.maxConcurrent }, () =>
      this.worker()
    );

    await Promise.all(workers);
  }

  /**
   * 工作线程（处理任务）
   */
  private async worker(): Promise<void> {
    while (true) {
      const task = this.getNextTask();
      if (!task) {
        // 没有待处理任务，等待 1 秒
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      await this.processTask(task);
    }
  }

  /**
   * 获取下一个待处理任务
   */
  private getNextTask(): AITask | null {
    const taskIndex = this.queue.findIndex((t) => t.status === AITaskStatus.PENDING);
    if (taskIndex === -1) {
      return null;
    }

    const task = this.queue[taskIndex];
    task.status = AITaskStatus.PROCESSING;
    task.startedAt = new Date();
    this.processing.set(task.id, task);

    return task;
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: AITask): Promise<void> {
    try {
      console.log(`[AI Queue] Processing task ${task.id}...`);

      // 构建提示词变量
      const variables: PromptVariables = {
        platform: task.conversationData.platform,
        messageCount: task.conversationData.messages?.length || 0,
        hasImages: !!(
          task.conversationData.image_urls && task.conversationData.image_urls.length > 0
        ),
      };

      // 获取提示词模板
      const promptManager = getPromptManager();
      const prompts = promptManager.buildPrompts(task.type, variables);

      if (!prompts) {
        throw new Error(`Prompt template not found: ${task.type}`);
      }

      // 调试日志：检查 prompt 长度
      const conversationJson = JSON.stringify(task.conversationData);
      console.log(`[AI Queue] Task ${task.id} - System prompt: ${prompts.systemPrompt.length} chars`);
      console.log(`[AI Queue] Task ${task.id} - User prompt: ${conversationJson.length} chars`);
      console.log(`[AI Queue] Task ${task.id} - Message count: ${variables.messageCount}`);

      // 调用 AI API
      const client = getSiliconFlowClient();
      console.log(`[AI Queue] Task ${task.id} - Calling AI API...`);
      const response: AIResponse = await this.withTimeout(
        client.generate(prompts.systemPrompt, conversationJson, 0.7, 4000),
        this.config.timeout
      );
      console.log(`[AI Queue] Task ${task.id} - AI API responded successfully`);

      // 检查禁用词
      const violationCheck = promptManager.checkForbiddenWords(response.content, task.type);
      if (violationCheck.hasViolation) {
        console.warn(
          `[AI Queue] Task ${task.id} contains forbidden words: ${violationCheck.foundWords.join(', ')}`
        );
        // 可选：自动清理禁用词
        // response.content = promptManager.cleanForbiddenWords(response.content, task.type);
      }

      // 保存结果到任务对象
      task.result = response.content;
      task.usage = {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        cost: response.cost || 0,
      };
      task.status = AITaskStatus.COMPLETED;
      task.completedAt = new Date();

      console.log(
        `[AI Queue] Task ${task.id} completed. Tokens: ${response.usage.totalTokens}, Cost: ¥${response.cost?.toFixed(4)}`
      );

      // 保存结果到数据库
      try {
        const { ConversationRepository } = require('../models/conversation.repository');
        const conversationRepo = new ConversationRepository();

        if (task.type === AITaskType.SOCIAL_MEDIA_SUMMARY) {
          conversationRepo.update(task.conversationId, { social_media_summary: response.content });
          console.log(`[AI Queue] Saved social_media_summary to database for conversation ${task.conversationId}`);
        } else if (task.type === AITaskType.DETAILED_SUMMARY) {
          conversationRepo.update(task.conversationId, { detailed_summary: response.content });
          console.log(`[AI Queue] Saved detailed_summary to database for conversation ${task.conversationId}`);
        }

        // 检查是否所有 AI 任务都已完成
        const allTasks = this.getConversationTasks(task.conversationId);
        const allAITasks = allTasks.filter(t => t.category === 'ai');
        const allCompleted = allAITasks.every(t => t.status === AITaskStatus.COMPLETED || t.status === AITaskStatus.FAILED);

        if (allCompleted && allAITasks.length > 0) {
          // 获取渲染任务
          const { getRenderQueue } = require('../rendering/render-queue');
          const renderQueue = getRenderQueue();
          const allRenderTasks = renderQueue.getConversationTasks(task.conversationId);
          const allRenderCompleted = allRenderTasks.every(t => t.status === 'completed' || t.status === 'failed');

          // 如果 AI 和渲染任务都完成了，更新 conversation status
          if (allRenderCompleted || allRenderTasks.length === 0) {
            conversationRepo.update(task.conversationId, { status: 'completed' });
            console.log(`[AI Queue] Updated conversation ${task.conversationId} status to 'completed'`);
          }
        }
      } catch (dbError) {
        console.error(`[AI Queue] Failed to save result to database:`, dbError);
        // 不影响任务状态，因为结果已经在内存中了
      }
    } catch (error) {
      console.error(`[AI Queue] Task ${task.id} failed:`, error);

      // 详细错误信息
      if (error instanceof Error) {
        console.error(`[AI Queue] Error name: ${error.name}`);
        console.error(`[AI Queue] Error message: ${error.message}`);
        if (error.stack) {
          console.error(`[AI Queue] Error stack: ${error.stack.substring(0, 200)}`);
        }
      }

      // 重试逻辑
      if (task.retryCount < this.config.retryLimit) {
        task.retryCount++;
        task.status = AITaskStatus.PENDING;
        task.startedAt = undefined;
        console.log(`[AI Queue] Retrying task ${task.id} (${task.retryCount}/${this.config.retryLimit})...`);
      } else {
        task.status = AITaskStatus.FAILED;
        task.error = error instanceof Error ? error.message : String(error);
        task.completedAt = new Date();
        console.error(`[AI Queue] Task ${task.id} failed permanently after ${task.retryCount} retries.`);
      }
    }
  }

  /**
   * 超时包装器
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      ),
    ]);
  }

  /**
   * 获取任务详情
   */
  getTask(taskId: string): AITask | undefined {
    return this.processing.get(taskId) || this.queue.find((t) => t.id === taskId);
  }

  /**
   * 获取对话的所有任务
   */
  getConversationTasks(conversationId: number): AITask[] {
    return [
      ...Array.from(this.processing.values()),
      ...this.queue,
    ].filter((t) => t.conversationId === conversationId);
  }

  /**
   * 清理已完成的任务（避免内存泄漏）
   */
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [id, task] of this.processing.entries()) {
      if (
        (task.status === AITaskStatus.COMPLETED || task.status === AITaskStatus.FAILED) &&
        task.completedAt &&
        now - task.completedAt.getTime() > oneHour
      ) {
        this.processing.delete(id);
      }
    }

    // 清理队列中已完成的旧任务
    this.queue = this.queue.filter((task) => {
      if (
        (task.status === AITaskStatus.COMPLETED || task.status === AITaskStatus.FAILED) &&
        task.completedAt &&
        now - task.completedAt.getTime() > oneHour
      ) {
        return false;
      }
      return true;
    });
  }
}

/**
 * AI 任务队列单例
 */
let queueInstance: AITaskQueue | null = null;

export function getAITaskQueue(): AITaskQueue {
  if (!queueInstance) {
    queueInstance = new AITaskQueue({
      maxConcurrent: 3, // 最多 3 个并发任务
      retryLimit: 3, // 失败重试 3 次
      timeout: 300000, // 5 分钟超时
    });

    // 启动队列
    queueInstance.start().catch((error) => {
      console.error('[AI Queue] Failed to start:', error);
    });

    // 每小时清理一次已完成的任务
    setInterval(() => {
      queueInstance?.cleanup();
    }, 60 * 60 * 1000);
  }

  return queueInstance;
}
