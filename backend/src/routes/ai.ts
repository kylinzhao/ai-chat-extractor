import { FastifyInstance } from 'fastify';
import { getAITaskQueue, AITaskType } from '../ai/ai-queue';
import { getPromptManager } from '../ai/prompts';
import { getSiliconFlowClient } from '../ai/siliconflow.client';
import { ConversationRepository } from '../models/conversation.repository';

/**
 * AI 相关路由
 */
export async function aiRoutes(fastify: FastifyInstance) {
  // 测试 AI 连接
  fastify.get('/ai/test', async (_request, reply) => {
    try {
      const client = getSiliconFlowClient();
      const isConnected = await client.testConnection();
      const model = client.getModel();

      return reply.send({
        status: 'ok',
        connected: isConnected,
        model,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to test AI connection',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 获取可用的提示词模板列表
  fastify.get('/ai/prompts', async (_request, reply) => {
    try {
      const promptManager = getPromptManager();
      const templates = promptManager.listTemplates();

      return reply.send({
        templates: templates.map((t) => ({
          name: t.name,
          description: t.description,
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to get prompt templates',
      });
    }
  });

  // 为对话生成 AI 内容
  fastify.post('/ai/conversations/:id/generate', async (request, reply) => {
    try {
      const conversationId = parseInt((request.params as { id: string }).id);
      const body = request.body as any;

      // 验证对话 ID
      if (isNaN(conversationId)) {
        return reply.status(400).send({ error: 'Invalid conversation ID' });
      }

      // 验证任务类型
      const taskType: AITaskType = body.type || AITaskType.DETAILED_SUMMARY;
      if (!Object.values(AITaskType).includes(taskType)) {
        return reply.status(400).send({
          error: 'Invalid task type',
          validTypes: Object.values(AITaskType),
        });
      }

      // 从数据库获取对话数据
      const conversationRepo = new ConversationRepository();
      const conversation = conversationRepo.findById(conversationId);

      if (!conversation) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }

      // 将任务添加到队列
      const queue = getAITaskQueue();
      const task = queue.addTask(taskType, conversationId, conversation);

      return reply.status(202).send({
        taskId: task.id,
        status: task.status,
        message: '任务已加入队列',
        type: taskType,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 查询任务状态
  fastify.get('/ai/tasks/:taskId', async (request, reply) => {
    try {
      const taskId = (request.params as { taskId: string }).taskId;
      const queue = getAITaskQueue();
      const task = queue.getTask(taskId);

      if (!task) {
        return reply.status(404).send({
          error: 'Task not found',
        });
      }

      return reply.send({
        id: task.id,
        type: task.type,
        conversationId: task.conversationId,
        status: task.status,
        result: task.result,
        error: task.error,
        retryCount: task.retryCount,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        usage: task.usage,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // 获取队列状态
  fastify.get('/ai/queue/status', async (_request, reply) => {
    try {
      const queue = getAITaskQueue();
      const status = queue.getQueueStatus();

      return reply.send({
        queue: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // 检查文本中的禁用词
  fastify.post('/ai/check-forbidden-words', async (request, reply) => {
    try {
      const body = request.body as any;
      const { text, templateName } = body;

      if (!text || !templateName) {
        return reply.status(400).send({
          error: 'Missing required fields',
          required: ['text', 'templateName'],
        });
      }

      const promptManager = getPromptManager();
      const checkResult = promptManager.checkForbiddenWords(text, templateName);

      return reply.send({
        hasViolation: checkResult.hasViolation,
        foundWords: checkResult.foundWords,
        count: checkResult.foundWords.length,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });

  // 清理文本中的禁用词
  fastify.post('/ai/clean-forbidden-words', async (request, reply) => {
    try {
      const body = request.body as any;
      const { text, templateName } = body;

      if (!text || !templateName) {
        return reply.status(400).send({
          error: 'Missing required fields',
          required: ['text', 'templateName'],
        });
      }

      const promptManager = getPromptManager();
      const cleanedText = promptManager.cleanForbiddenWords(text, templateName);
      const checkResult = promptManager.checkForbiddenWords(cleanedText, templateName);

      return reply.send({
        originalText: text,
        cleanedText,
        hasRemainingViolations: checkResult.hasViolation,
        remainingWords: checkResult.foundWords,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });
}
