import { getPuppeteerManager } from './puppeteer-manager';
import { getTemplate, TemplateType } from './templates';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ConversationRepository } from '../models/conversation.repository';

/**
 * 渲染任务类型
 */
export enum RenderTaskType {
  BENTO = 'bento',
  NEWSLETTER = 'newsletter',
  RETRO_LETTER = 'retro_letter',
  XIAOHONGSHU = 'xiaohongshu',
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
  title?: string;
}

/**
 * 渲染任务依赖
 */
export interface RenderTaskDependency {
  conversationId: number;
  aiTaskTypes: RenderTaskType[];
}

/**
 * 渲染任务
 */
export interface RenderTask {
  id: string;
  type: RenderTaskType;
  data: RenderTaskData;
  status: RenderTaskStatus;
  dependencies?: RenderTaskDependency; // 任务依赖
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
   * 检查任务依赖是否满足
   */
  private canExecute(task: RenderTask): boolean {
    // 如果没有依赖，可以执行
    if (!task.dependencies) {
      return true;
    }

    // 检查是否超时（等待超过 5 分钟）
    const timeout = 5 * 60 * 1000; // 5 分钟
    if (Date.now() - task.createdAt.getTime() > timeout) {
      console.warn(
        `[Render Queue] 任务 ${task.id} 等待依赖超时，标记为失败`
      );
      task.status = RenderTaskStatus.FAILED;
      task.error = 'Dependency timeout after 5 minutes';
      task.completedAt = new Date();
      return false;
    }

    // 检查 AI 任务是否完成
    const { getAITaskQueue } = require('../ai/ai-queue');
    const aiQueue = getAITaskQueue();
    const aiTasks = aiQueue.getConversationTasks(task.data.conversationId);

    // 只需要 social_media_summary 完成就可以开始渲染
    const socialMediaSummaryTask = aiTasks.find(
      (t: any) => t.type === 'social_media_summary'
    );

    const isReady = socialMediaSummaryTask &&
      (socialMediaSummaryTask.status === 'completed' || socialMediaSummaryTask.status === 'failed');

    if (!isReady) {
      const status = socialMediaSummaryTask?.status || 'not found';
      console.log(
        `[Render Queue] 任务 ${task.id} 等待 social_media_summary 完成 (当前状态: ${status})`
      );
    }

    return isReady;
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

    // 检查依赖是否满足
    if (!this.canExecute(task)) {
      // 依赖未满足，跳过此任务
      return null;
    }

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
        // 设置固定视口（3:4 宽高比，参考小红书流行尺寸）
        const VIEWPORT_WIDTH = 1080;
        const VIEWPORT_HEIGHT = 1440; // 1080:1440 = 3:4 比例

        await instance.page.setViewport({
          width: VIEWPORT_WIDTH,
          height: VIEWPORT_HEIGHT,
          deviceScaleFactor: 2, // 2x 像素密度，提高清晰度
        });

        // 获取 HTML 模板（转换类型）
        const template = getTemplate(task.type as unknown as TemplateType);
        const html = template.generateHTML(task.data);

        // 渲染页面
        await instance.page.setContent(html, {
          waitUntil: 'domcontentloaded', // 使用更快的等待策略
          timeout: this.config.timeout,
        });

        // 等待字体加载
        await instance.page.evaluateHandle('document.fonts.ready');

        // 计算内容高度并决定是否分页
        // @ts-ignore - 代码在浏览器环境中执行
        const contentInfo = await instance.page.evaluate(() => {
          // @ts-ignore
          const body = document.body;
          // @ts-ignore
          const content = body.querySelector('.summary, .markdown-content, .content');
          return {
            totalHeight: body.scrollHeight,
            contentHeight: content ? content.scrollHeight : 0,
            bodyHeight: body.offsetHeight,
            scrollWidth: body.scrollWidth
          };
        });

        // 设置每页最大高度
        const MAX_PAGE_HEIGHT = 3000; // 每页最大 3000px
        const needsPagination = contentInfo.totalHeight > MAX_PAGE_HEIGHT;

        let imageUrls: string[] = [];

        if (needsPagination) {
          // 需要分页 - 为每页创建完整的容器结构
          const pageCount = Math.ceil(contentInfo.totalHeight / MAX_PAGE_HEIGHT);
          console.log(`[Render Queue] 内容过长 (${contentInfo.totalHeight}px)，将分 ${pageCount} 页渲染`);

          // 确保渲染目录存在
          const rendersDir = join(__dirname, '../../public/renders');
          await mkdir(rendersDir, { recursive: true });

          const timestamp = Date.now();

          // 逐页截图 - 每页都使用完整的视口
          for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
            // 使用 JavaScript 控制只显示当前页的内容
            // @ts-ignore - 代码在浏览器环境中执行
            await instance.page.evaluate((currentPage: any, totalPages: any, maxPageHeight: any) => {
              // @ts-ignore
              const doc: any = document;
              const content = doc.querySelector('.summary, .markdown-content, .content');
              if (!content) return;

              // 保存原始样式以便恢复
              const originalOverflow = content.style.overflow;
              const originalPosition = content.style.position;

              // 设置原始内容容器为固定高度，避免其影响截图
              content.style.overflow = 'hidden';
              content.style.height = `${maxPageHeight}px`;

              // 创建一个克隆的内容容器，只包含当前页的内容
              const originalContent = content.innerHTML;
              const wrapper = doc.createElement('div');
              wrapper.style.position = 'relative';  // 使用 relative 定位
              wrapper.style.width = '100%';
              // 修复：使用完整的视口高度，而不是当前页内容高度
              // 这样可以确保每一页都使用相同的容器尺寸
              wrapper.style.height = `${maxPageHeight}px`;
              wrapper.style.overflow = 'hidden';

              // 创建内容副本，并设置偏移
              const clonedContent = doc.createElement('div');
              clonedContent.innerHTML = originalContent;
              clonedContent.style.position = 'absolute';
              clonedContent.style.top = `-${(currentPage - 1) * maxPageHeight}px`;
              clonedContent.style.left = '0';
              clonedContent.style.width = '100%';
              clonedContent.className = content.className;

              wrapper.appendChild(clonedContent);

              // 隐藏原始内容，显示分页内容
              content.style.visibility = 'hidden';
              content.parentElement?.insertBefore(wrapper, content.nextSibling);

              // @ts-ignore - 存储引用以便恢复
              const win: any = window;
              win._paginationWrapper = wrapper;
              win._paginationContent = content;
              win._originalOverflow = originalOverflow;
              win._originalPosition = originalPosition;
            }, pageNum, pageCount, MAX_PAGE_HEIGHT);

            // 等待 DOM 更新
            await new Promise(resolve => setTimeout(resolve, 200));

            // 生成文件名：conversationId-templateType-pageNum-timestamp.png
            const filename = `${task.data.conversationId}-${task.type}-${pageNum}-${timestamp}.png`;
            const imagePath = join(rendersDir, filename);
            const imageUrl = `/public/renders/${filename}`;

            // 截图完整视口（固定尺寸 1080x1440）
            const buffer = await instance.page.screenshot({
              type: 'png',
            });

            await writeFile(imagePath, buffer);
            imageUrls.push(imageUrl);

            console.log(`[Render Queue] 第 ${pageNum}/${pageCount} 页完成，保存到 ${imageUrl}`);

            // 恢复原始内容
            // @ts-ignore - 代码在浏览器环境中执行
            await instance.page.evaluate(() => {
              // @ts-ignore
              const win: any = window;
              const wrapper = win._paginationWrapper;
              const content = win._paginationContent;
              if (wrapper && content) {
                wrapper.remove();
                content.style.visibility = 'visible';
                // 恢复原始样式
                if (win._originalOverflow !== undefined) {
                  content.style.overflow = win._originalOverflow;
                }
                if (win._originalPosition !== undefined) {
                  content.style.position = win._originalPosition;
                }
                // 清除设置的 height
                content.style.height = '';
              }
              delete win._paginationWrapper;
              delete win._paginationContent;
              delete win._originalOverflow;
              delete win._originalPosition;
            });

            // 等待 DOM 恢复
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // 只保存第一个 URL 作为结果（兼容现有逻辑）
          task.result = {
            imagePath: join(__dirname, '../../public', imageUrls[0]),
            imageUrl: imageUrls[0],
          };
        } else {
          // 不需要分页，单页渲染（使用完整视口高度）
          const rendersDir = join(__dirname, '../../public/renders');
          await mkdir(rendersDir, { recursive: true });

          // 生成文件名：conversationId-templateType-timestamp.png
          const filename = `${task.data.conversationId}-${task.type}-${Date.now()}.png`;
          const imagePath = join(rendersDir, filename);
          const imageUrl = `/public/renders/${filename}`;

          // 使用完整视口截图（3:4 比例）
          const buffer = await instance.page.screenshot({
            type: 'png',
            clip: {
              x: 0,
              y: 0,
              width: VIEWPORT_WIDTH,
              height: VIEWPORT_HEIGHT
            }
          });
          await writeFile(imagePath, buffer);

          imageUrls.push(imageUrl);

          // 保存结果
          task.result = {
            imagePath,
            imageUrl,
          };

          console.log(`[Render Queue] 单页渲染完成，保存到 ${imageUrl}`);
        }

        // 追加所有图片 URL 到对话
        const conversationRepo = new ConversationRepository();
        for (const url of imageUrls) {
          conversationRepo.appendImageUrl(task.data.conversationId, url);
        }

        task.renderTime = Date.now() - startTime;
        task.status = RenderTaskStatus.COMPLETED;
        task.completedAt = new Date();

        console.log(
          `[Render Queue] 任务 ${task.id} 完成，共 ${imageUrls.length} 张图片，耗时 ${task.renderTime}ms`
        );

        // 发送完成事件到前端（用于一键生成功能的进度更新）
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('render-complete', {
            detail: {
              conversationId: task.data.conversationId,
              template: task.type,
              imageUrl: imageUrls[0],
            }
          }));
        }
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
