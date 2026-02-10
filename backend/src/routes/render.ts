import { FastifyInstance } from 'fastify';
import { getRenderQueue, RenderTaskType } from '../rendering/render-queue';
import { getTemplateManager } from '../rendering/templates';
import { getPuppeteerManager } from '../rendering/puppeteer-manager';
import { ConversationRepository } from '../models/conversation.repository';

/**
 * 渲染相关路由
 */
export async function renderRoutes(fastify: FastifyInstance) {
  // 获取可用的渲染模板列表
  fastify.get('/render/templates', async (_request, reply) => {
    try {
      const templateManager = getTemplateManager();
      const templates = templateManager.listTemplates();

      return reply.send({
        templates: templates.map((t) => ({
          type: t.type,
          name: t.name,
          description: t.description,
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to get templates',
      });
    }
  });

  // 为对话生成渲染图片
  fastify.post('/render/conversations/:id/generate', async (request, reply) => {
    try {
      const conversationId = parseInt((request.params as { id: string }).id);
      const body = request.body as any;
      const regenerate = body.regenerate === true;

      // 验证对话 ID
      if (isNaN(conversationId)) {
        return reply.status(400).send({ error: 'Invalid conversation ID' });
      }

      // 验证模板类型
      const templateType: RenderTaskType = body.template || RenderTaskType.BENTO;
      if (!Object.values(RenderTaskType).includes(templateType)) {
        return reply.status(400).send({
          error: 'Invalid template type',
          validTypes: Object.values(RenderTaskType),
        });
      }

      // 从数据库获取对话数据
      const conversationRepo = new ConversationRepository();
      const conversation = conversationRepo.findById(conversationId);

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      if (regenerate) {
        fastify.log.info(`[Render] Regenerating ${templateType} for conversation ${conversationId}`);
        // Note: Image URLs will be appended after render completes
        // The render queue handles task completion and will add new URLs to the conversation
      }

      // TODO: 获取 AI 生成的摘要
      // 临时：使用空字符串或从 body 获取
      const taskData = {
        conversationId: conversation.id || conversationId,
        platform: conversation.platform,
        socialMediaSummary: body.socialMediaSummary || conversation.social_media_summary || undefined,
        detailedSummary: body.detailedSummary || conversation.detailed_summary || undefined,
        messageCount: conversation.messages.length,
        capturedAt: conversation.captured_at,
        imageUrl: conversation.image_urls?.[0],
      };

      // 将任务添加到队列
      const queue = getRenderQueue();
      const task = queue.addTask(templateType, taskData);

      return reply.status(202).send({
        taskId: task.id,
        status: task.status,
        message: regenerate ? '重新渲染任务已加入队列' : '渲染任务已加入队列',
        template: templateType,
        regenerate,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 查询渲染任务状态
  fastify.get('/render/tasks/:taskId', async (request, reply) => {
    try {
      const taskId = (request.params as { taskId: string }).taskId;
      const queue = getRenderQueue();
      const task = queue.getTask(taskId);

      if (!task) {
        return reply.status(404).send({
          error: 'Task not found',
        });
      }

      return reply.send({
        id: task.id,
        type: task.type,
        conversationId: task.data.conversationId,
        status: task.status,
        result: task.result,
        error: task.error,
        retryCount: task.retryCount,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        renderTime: task.renderTime,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // 获取队列状态
  fastify.get('/render/queue/status', async (_request, reply) => {
    try {
      const queue = getRenderQueue();
      const status = queue.getQueueStatus();
      const manager = getPuppeteerManager();
      const poolStatus = manager.getPoolStatus();

      return reply.send({
        queue: status,
        pool: poolStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // 获取对话的所有渲染任务
  fastify.get('/render/conversations/:id/tasks', async (request, reply) => {
    try {
      const conversationId = parseInt((request.params as { id: string }).id);

      if (isNaN(conversationId)) {
        return reply.status(400).send({ error: 'Invalid conversation ID' });
      }

      const queue = getRenderQueue();
      const tasks = queue.getConversationTasks(conversationId);

      return reply.send({
        conversationId,
        tasks: tasks.map((task) => ({
          id: task.id,
          type: task.type,
          status: task.status,
          result: task.result,
          error: task.error,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          renderTime: task.renderTime,
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // Puppeteer 健康检查
  fastify.get('/render/health', async (_request, reply) => {
    try {
      const manager = getPuppeteerManager();
      const poolStatus = manager.getPoolStatus();

      return reply.send({
        status: 'ok',
        pool: poolStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Puppeteer health check failed',
      });
    }
  });
}
