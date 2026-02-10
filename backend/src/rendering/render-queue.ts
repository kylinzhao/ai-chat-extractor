import { getPuppeteerManager } from './puppeteer-manager';
import { getTemplate, TemplateType } from './templates';

/**
 * 渲染任务类型
 */
export enum RenderTaskType {
  BENTO = 'bento',
  NEWSLETTER = 'newsletter',
  RETRO_LETTER = 'retro_letter',
}

/**
 * 渲染任务状态
 */
export enum RenderTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 渲染任务数据
 */
export interface RenderTaskData {
  conversationId: number;
  platform: string;
  socialMediaSummary?: string;
  detailedSummary?: string;
  messageCount: number;
  capturedAt: string;
  imageUrl?: string;
}

/**
 * 渲染任务
 */
export interface RenderTask {
  id: string;
  type: RenderTaskType;
  data: RenderTaskData;
  status: RenderTaskStatus;
  result?: {
    imagePath: string;
    imageUrl: string;
  };
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  renderTime?: number; // 毫秒
}

/**
 * 任务队列配置
 */
interface QueueConfig {
  maxConcurrent: number; // 最大并发渲染数
  retryLimit: number; // 重试次数限制
  timeout: number; // 任务超时时间（毫秒）
}

/**
 * 渲染任务队列
 */
export class RenderQueue {
  private queue: RenderTask[] = [];
  private processing: Map<string, RenderTask> = new Map();
  private config: QueueConfig;

  constructor(config: QueueConfig = { maxConcurrent: 2, retryLimit: 3, timeout: 30000 }) {
    this.config = config;
  }

  /**
   * 添加任务到队列
   */
  addTask(type: RenderTaskType, data: RenderTaskData): RenderTask {
    const task: RenderTask = {
      id: `${data.conversationId}-${type}-${Date.now()}`,
      type,
      data,
      status: RenderTaskStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
    };

    this.queue.push(task);
    console.log(`[Render Queue] 任务已添加: ${task.id}`);
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
    const pending = this.queue.filter((t) => t.status === RenderTaskStatus.PENDING).length;
    const processing = Array.from(this.processing.values()).filter(
      (t) => t.status === RenderTaskStatus.PROCESSING
    ).length;
    const completed = Array.from(this.processing.values()).filter(
      (t) => t.status === RenderTaskStatus.COMPLETED
    ).length;
    const failed = Array.from(this.processing.values()).filter(
      (t) => t.status === RenderTaskStatus.FAILED
    ).length;

    return { pending, processing, completed, failed };
  }

  /**
   * 开始处理队列
   */
  async start(): Promise<void> {
    // 启动多个工作线程
    const workers = Array.from({ length: this.config.maxConcurrent }, () => this.worker());

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
  private getNextTask(): RenderTask | null {
    const taskIndex = this.queue.findIndex((t) => t.status === RenderTaskStatus.PENDING);
    if (taskIndex === -1) {
      return null;
    }

    const task = this.queue[taskIndex];
    task.status = RenderTaskStatus.PROCESSING;
    task.startedAt = new Date();
    this.processing.set(task.id, task);

    return task;
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: RenderTask): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`[Render Queue] 处理任务 ${task.id}...`);

      // 获取 Puppeteer 实例
      const manager = getPuppeteerManager();
      const instance = await manager.acquire();

      try {
        // 获取 HTML 模板（转换类型）
        const template = getTemplate(task.type as unknown as TemplateType);
        const html = template.generateHTML(task.data);

        // 渲染页面
        await instance.page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: this.config.timeout,
        });

        // 等待字体加载
        await instance.page.evaluateHandle('document.fonts.ready');

        // 生成截图（临时未使用，等待保存逻辑实现）
        await instance.page.screenshot({
          type: 'png',
          encoding: 'base64',
        });

        // TODO: 保存图片到文件系统和数据库
        // const imagePath = await saveImage(screenshot, task.id);
        // const imageUrl = generateImageUrl(imagePath);

        // 临时：保存结果
        task.result = {
          imagePath: `/tmp/renders/${task.id}.png`,
          imageUrl: `/renders/${task.id}.png`,
        };

        task.renderTime = Date.now() - startTime;
        task.status = RenderTaskStatus.COMPLETED;
        task.completedAt = new Date();

        console.log(
          `[Render Queue] 任务 ${task.id} 完成，耗时 ${task.renderTime}ms`
        );
      } finally {
        // 释放实例
        manager.release(instance);
      }
    } catch (error) {
      console.error(`[Render Queue] 任务 ${task.id} 失败:`, error);

      // 重试逻辑
      if (task.retryCount < this.config.retryLimit) {
        task.retryCount++;
        task.status = RenderTaskStatus.PENDING;
        task.startedAt = undefined;
        console.log(
          `[Render Queue] 重试任务 ${task.id} (${task.retryCount}/${this.config.retryLimit})...`
        );
      } else {
        task.status = RenderTaskStatus.FAILED;
        task.error = error instanceof Error ? error.message : String(error);
        task.completedAt = new Date();
        task.renderTime = Date.now() - startTime;
        console.error(
          `[Render Queue] 任务 ${task.id} 永久失败，重试 ${task.retryCount} 次后仍失败`
        );
      }
    }
  }

  /**
   * 获取任务详情
   */
  getTask(taskId: string): RenderTask | undefined {
    return this.processing.get(taskId) || this.queue.find((t) => t.id === taskId);
  }

  /**
   * 获取对话的所有渲染任务
   */
  getConversationTasks(conversationId: number): RenderTask[] {
    return [...Array.from(this.processing.values()), ...this.queue].filter(
      (t) => t.data.conversationId === conversationId
    );
  }

  /**
   * 清理已完成的任务（避免内存泄漏）
   */
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [id, task] of this.processing.entries()) {
      if (
        (task.status === RenderTaskStatus.COMPLETED || task.status === RenderTaskStatus.FAILED) &&
        task.completedAt &&
        now - task.completedAt.getTime() > oneHour
      ) {
        this.processing.delete(id);
      }
    }

    // 清理队列中已完成的旧任务
    this.queue = this.queue.filter((task) => {
      if (
        (task.status === RenderTaskStatus.COMPLETED || task.status === RenderTaskStatus.FAILED) &&
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
 * 渲染队列单例
 */
let queueInstance: RenderQueue | null = null;

export function getRenderQueue(): RenderQueue {
  if (!queueInstance) {
    queueInstance = new RenderQueue({
      maxConcurrent: 2, // 最多 2 个并发渲染
      retryLimit: 3, // 失败重试 3 次
      timeout: 30000, // 30 秒超时
    });

    // 启动队列
    queueInstance.start().catch((error) => {
      console.error('[Render Queue] 启动失败:', error);
    });

    // 每小时清理一次已完成的任务
    setInterval(() => {
      queueInstance?.cleanup();
    }, 60 * 60 * 1000);
  }

  return queueInstance;
}
