import puppeteer, { Browser, Page } from 'puppeteer';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Puppeteer 实例包装器
 */
interface PuppeteerInstance {
  id: string;
  browser: Browser;
  page: Page;
  inUse: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Puppeteer 管理器配置
 */
export interface PuppeteerManagerConfig {
  poolSize: number; // 实例池大小
  maxPageAge: number; // 页面最大存活时间（毫秒）
  launchTimeout: number; // 启动超时（毫秒）
  headless: boolean;
}

/**
 * Puppeteer 管理器
 * 管理 Chrome 实例池，提供实例获取和释放
 */
export class PuppeteerManager {
  private pool: Map<string, PuppeteerInstance> = new Map();
  private config: PuppeteerManagerConfig;
  private initialized = false;

  constructor(config?: Partial<PuppeteerManagerConfig>) {
    this.config = {
      poolSize: config?.poolSize || 3,
      maxPageAge: config?.maxPageAge || 10 * 60 * 1000, // 10 分钟
      launchTimeout: config?.launchTimeout || 30000, // 30 秒
      headless: config?.headless ?? true,
    };
  }

  /**
   * 初始化实例池
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log(`[Puppeteer Manager] 初始化实例池（大小: ${this.config.poolSize}）...`);

    // 获取 Chrome 可执行文件路径
    const executablePath = await this.getChromePath();

    // 预启动实例
    const launchPromises = Array.from({ length: this.config.poolSize }, (_, i) =>
      this.launchInstance(i.toString(), executablePath)
    );

    await Promise.all(launchPromises);

    this.initialized = true;
    console.log(`[Puppeteer Manager] 实例池初始化完成（${this.pool.size} 个实例）`);

    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 获取 Chrome 可执行文件路径（macOS）
   */
  private async getChromePath(): Promise<string> {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
      '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];

    for (const path of possiblePaths) {
      try {
        await execAsync(`test -f "${path}"`);
        console.log(`[Puppeteer Manager] 使用 Chrome: ${path}`);
        return path;
      } catch {
        // 文件不存在，继续查找
      }
    }

    // 如果都找不到，返回 undefined 让 Puppeteer 自己找
    console.log('[Puppeteer Manager] 未找到系统 Chrome，使用 Puppeteer 内置');
    return undefined as any;
  }

  /**
   * 启动单个实例
   */
  private async launchInstance(id: string, executablePath?: string): Promise<void> {
    try {
      const browser = await puppeteer.launch({
        headless: this.config.headless,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      });

      const page = await browser.newPage();

      // 设置视口大小（@2x 高清）
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 2,
      });

      const instance: PuppeteerInstance = {
        id: `instance-${id}`,
        browser,
        page,
        inUse: false,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      this.pool.set(instance.id, instance);
      console.log(`[Puppeteer Manager] 实例 ${instance.id} 启动成功`);
    } catch (error) {
      console.error(`[Puppeteer Manager] 实例 ${id} 启动失败:`, error);
      throw error;
    }
  }

  /**
   * 获取一个可用实例
   */
  async acquire(): Promise<PuppeteerInstance> {
    if (!this.initialized) {
      await this.initialize();
    }

    // 查找空闲实例
    const availableInstance = Array.from(this.pool.values()).find((inst) => !inst.inUse);

    if (availableInstance) {
      availableInstance.inUse = true;
      availableInstance.lastUsedAt = new Date();
      console.log(`[Puppeteer Manager] 获取实例 ${availableInstance.id}`);
      return availableInstance;
    }

    // 如果没有空闲实例，等待
    console.log('[Puppeteer Manager] 所有实例忙碌，等待空闲实例...');
    return this.waitForAvailableInstance();
  }

  /**
   * 等待可用实例
   */
  private async waitForAvailableInstance(maxWait = 30000): Promise<PuppeteerInstance> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const availableInstance = Array.from(this.pool.values()).find((inst) => !inst.inUse);
      if (availableInstance) {
        availableInstance.inUse = true;
        availableInstance.lastUsedAt = new Date();
        return availableInstance;
      }

      // 等待 100ms 后重试
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error('等待可用实例超时');
  }

  /**
   * 释放实例
   */
  release(instance: PuppeteerInstance): void {
    instance.inUse = false;
    instance.lastUsedAt = new Date();
    console.log(`[Puppeteer Manager] 释放实例 ${instance.id}`);
  }

  /**
   * 重启实例（如果出错或过期）
   */
  async restart(instance: PuppeteerInstance): Promise<void> {
    console.log(`[Puppeteer Manager] 重启实例 ${instance.id}...`);

    try {
      await instance.browser.close();
    } catch (error) {
      console.error(`[Puppeteer Manager] 关闭实例失败:`, error);
    }

    this.pool.delete(instance.id);

    // 重新启动
    const id = instance.id.replace('instance-', '');
    await this.launchInstance(id);
  }

  /**
   * 定期清理过期实例
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // 每分钟清理一次
  }

  /**
   * 清理过期实例
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredInstances: PuppeteerInstance[] = [];

    for (const instance of this.pool.values()) {
      const age = now - instance.lastUsedAt.getTime();
      if (age > this.config.maxPageAge && !instance.inUse) {
        expiredInstances.push(instance);
      }
    }

    if (expiredInstances.length > 0) {
      console.log(`[Puppeteer Manager] 清理 ${expiredInstances.length} 个过期实例`);
      for (const instance of expiredInstances) {
        this.restart(instance).catch((error) => {
          console.error(`[Puppeteer Manager] 重启实例失败:`, error);
        });
      }
    }
  }

  /**
   * 获取池状态
   */
  getPoolStatus(): {
    total: number;
    inUse: number;
    available: number;
  } {
    const instances = Array.from(this.pool.values());
    const inUse = instances.filter((inst) => inst.inUse).length;

    return {
      total: instances.length,
      inUse,
      available: instances.length - inUse,
    };
  }

  /**
   * 关闭所有实例
   */
  async closeAll(): Promise<void> {
    console.log('[Puppeteer Manager] 关闭所有实例...');

    const closePromises = Array.from(this.pool.values()).map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        console.error(`[Puppeteer Manager] 关闭实例失败:`, error);
      }
    });

    await Promise.all(closePromises);
    this.pool.clear();
    this.initialized = false;

    console.log('[Puppeteer Manager] 所有实例已关闭');
  }
}

/**
 * Puppeteer 管理器单例
 */
let managerInstance: PuppeteerManager | null = null;

export function getPuppeteerManager(): PuppeteerManager {
  if (!managerInstance) {
    managerInstance = new PuppeteerManager({
      poolSize: 3,
      maxPageAge: 10 * 60 * 1000,
      launchTimeout: 30000,
      headless: true,
    });
  }

  return managerInstance;
}
