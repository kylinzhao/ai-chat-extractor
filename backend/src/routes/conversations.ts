import { FastifyInstance } from 'fastify';
import { ConversationRepository } from '../models/conversation.repository';
import { SummaryGroupRepository } from '../models/summary-group.repository';
import { getAITaskQueue, AITaskType } from '../ai/ai-queue';
import { getRenderQueue, RenderTaskType } from '../rendering/render-queue';

const conversationRepo = new ConversationRepository();
const summaryGroupRepo = new SummaryGroupRepository();

// 自动生成开关（从环境变量读取，默认启用）
const AUTO_GENERATION_ENABLED = process.env.AUTO_GENERATION_ENABLED !== 'false';

export async function conversationRoutes(fastify: FastifyInstance) {
  // POST /api/conversations - Create a new conversation
  fastify.post('/conversations', async (request, reply) => {
    try {
      const body = request.body as any;

      // Validate required fields
      if (!body.platform || !body.messages || !body.captured_at) {
        return reply.status(400).send({
          error: 'Missing required fields',
          required: ['platform', 'messages', 'captured_at'],
        });
      }

      // Validate platform
      if (!['Gemini', 'Doubao'].includes(body.platform)) {
        return reply.status(400).send({
          error: 'Invalid platform',
          validPlatforms: ['Gemini', 'Doubao'],
        });
      }

      // Validate messages array
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return reply.status(400).send({
          error: 'Messages must be a non-empty array',
        });
      }

      // Create conversation
      const conversationId = conversationRepo.create({
        platform: body.platform,
        model_version: body.model_version,
        captured_at: body.captured_at,
        messages: body.messages,
        image_urls: body.image_urls,
        visibility: 0, // Default to hidden
        status: 'processing',
      });

      // Create associated summary group
      const summaryGroupId = summaryGroupRepo.create({
        conversation_id: conversationId,
        status: 'pending',
      });

      fastify.log.info(`Created conversation ${conversationId} from ${body.platform}`);

      // 异步触发生成任务（不阻塞响应）
      if (AUTO_GENERATION_ENABLED) {
        setImmediate(() => {
          triggerAutoGeneration(fastify, conversationId).catch(error => {
            fastify.log.error(`[Auto-Generation] Failed to trigger tasks for conversation ${conversationId}:`, error);
          });
        });
      }

      return reply.status(201).send({
        id: conversationId,
        summaryGroupId,
        message: 'Conversation created successfully',
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to create conversation',
      });
    }
  });

  // GET /api/conversations - List all conversations (with filters and pagination)
  fastify.get('/conversations', async (request, reply) => {
    try {
      const query = request.query as any;
      const visibility = query.visibility !== undefined ? parseInt(query.visibility) : undefined;
      const platform = query.platform;
      const status = query.status;
      const limit = query.limit ? parseInt(query.limit) : 50;
      const offset = query.offset ? parseInt(query.offset) : 0;

      const conversations = conversationRepo.findAll({
        visibility,
        platform,
        status,
        limit,
        offset,
      });

      const total = conversationRepo.count({ visibility, platform, status });

      return {
        data: conversations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch conversations',
      });
    }
  });

  // GET /api/conversations/:id - Get a single conversation
  fastify.get<{ Params: { id: string } }>('/conversations/:id', async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const conversation = conversationRepo.findById(id);

      if (!conversation) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Conversation ${id} not found`,
        });
      }

      // Get associated summary group
      const summaryGroup = summaryGroupRepo.findByConversationId(id);

      return {
        ...conversation,
        summaryGroup,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch conversation',
      });
    }
  });

  // GET /api/conversations/:id/status - Get generation task status
  fastify.get<{ Params: { id: string } }>('/conversations/:id/status', async (request, reply) => {
    try {
      const id = parseInt(request.params.id);

      // Check if conversation exists
      const conversation = conversationRepo.findById(id);
      if (!conversation) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Conversation ${id} not found`,
        });
      }

      // Get AI tasks
      const aiQueue = getAITaskQueue();
      const aiTasks = aiQueue.getConversationTasks(id);

      // Get render tasks
      const renderQueue = getRenderQueue();
      const renderTasks = renderQueue.getConversationTasks(id);

      // Combine into unified format
      const tasks = [
        ...aiTasks.map(t => ({
          type: t.type,
          category: 'ai' as const,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          completedAt: t.completedAt?.toISOString(),
          error: t.error,
        })),
        ...renderTasks.map(t => ({
          type: t.type,
          category: 'render' as const,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          completedAt: t.completedAt?.toISOString(),
          error: t.error,
        })),
      ];

      return {
        conversationId: id,
        tasks,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch task status',
      });
    }
  });

  // PATCH /api/conversations/:id - Update a conversation
  fastify.patch<{ Params: { id: string } }>('/conversations/:id', async (request, reply) => {
    try {
      const id = parseInt(request.params.id);
      const updates = request.body as any;

      // Check if conversation exists
      const existing = conversationRepo.findById(id);
      if (!existing) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Conversation ${id} not found`,
        });
      }

      // Update conversation
      const updated = conversationRepo.update(id, updates);

      if (!updated) {
        return reply.status(400).send({
          error: 'Update failed',
          message: 'No fields were updated',
        });
      }

      // If updating summary group related fields
      if (updates.detailed_summary || updates.social_summary) {
        summaryGroupRepo.updateByConversationId(id, updates);
      }

      const conversation = conversationRepo.findById(id);
      const summaryGroup = summaryGroupRepo.findByConversationId(id);

      return {
        ...conversation,
        summaryGroup,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to update conversation',
      });
    }
  });

  // DELETE /api/conversations/:id - Delete a conversation
  fastify.delete<{ Params: { id: string } }>('/conversations/:id', async (request, reply) => {
    try {
      const id = parseInt(request.params.id);

      // Check if conversation exists
      const existing = conversationRepo.findById(id);
      if (!existing) {
        return reply.status(404).send({
          error: 'Not found',
          message: `Conversation ${id} not found`,
        });
      }

      const deleted = conversationRepo.delete(id);

      if (!deleted) {
        return reply.status(500).send({
          error: 'Delete failed',
          message: 'Failed to delete conversation',
        });
      }

      fastify.log.info(`Deleted conversation ${id}`);

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to delete conversation',
      });
    }
  });

  // POST /api/conversations/batch-update-visibility - Batch update visibility
  fastify.post('/conversations/batch-update-visibility', async (request, reply) => {
    try {
      const body = request.body as { ids: number[]; visibility: number };

      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        return reply.status(400).send({
          error: 'Invalid request',
          message: 'ids must be a non-empty array',
        });
      }

      if (typeof body.visibility !== 'number') {
        return reply.status(400).send({
          error: 'Invalid request',
          message: 'visibility must be a number (0 or 1)',
        });
      }

      const count = conversationRepo.batchUpdateVisibility(body.ids, body.visibility);

      fastify.log.info(`Updated visibility for ${count} conversations`);

      return {
        updated: count,
        message: `Updated ${count} conversations`,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to batch update visibility',
      });
    }
  });

  // POST /api/conversations/batch-delete - Batch delete conversations
  fastify.post('/conversations/batch-delete', async (request, reply) => {
    try {
      const body = request.body as { ids: number[] };

      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        return reply.status(400).send({
          error: 'Invalid request',
          message: 'ids must be a non-empty array',
        });
      }

      const count = conversationRepo.batchDelete(body.ids);

      fastify.log.info(`Deleted ${count} conversations`);

      return {
        deleted: count,
        message: `Deleted ${count} conversations`,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to batch delete conversations',
      });
    }
  });
}

/**
 * 触发自动生成任务
 * 在对话创建成功后自动调用，不阻塞采集接口的响应
 */
async function triggerAutoGeneration(fastify: FastifyInstance, conversationId: number) {
  try {
    const conversation = conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    fastify.log.info(`[Auto-Generation] Triggering tasks for conversation ${conversationId}`);

    // 获取任务队列
    const aiQueue = getAITaskQueue();
    const renderQueue = getRenderQueue();

    // 触发 AI 社交媒体摘要生成
    aiQueue.addTask(AITaskType.SOCIAL_MEDIA_SUMMARY, conversationId, conversation);
    fastify.log.info(`[Auto-Generation] Triggered social_media_summary task for conversation ${conversationId}`);

    // 触发 AI 详细汇总生成
    aiQueue.addTask(AITaskType.DETAILED_SUMMARY, conversationId, conversation);
    fastify.log.info(`[Auto-Generation] Triggered detailed_summary task for conversation ${conversationId}`);

    // 触发图片渲染（Bento UI 作为默认模板）
    const renderData = {
      conversationId,
      platform: conversation.platform,
      socialMediaSummary: conversation.social_media_summary || '',
      detailedSummary: conversation.detailed_summary || '',
      messageCount: conversation.messages.length,
      capturedAt: conversation.captured_at,
      imageUrl: conversation.image_urls?.[0] || '',
    };
    renderQueue.addTask(RenderTaskType.BENTO, renderData);
    fastify.log.info(`[Auto-Generation] Triggered bento render task for conversation ${conversationId}`);
  } catch (error) {
    fastify.log.error(`[Auto-Generation] Error triggering tasks for conversation ${conversationId}:`);
    fastify.log.error(error);
    throw error;
  }
}
