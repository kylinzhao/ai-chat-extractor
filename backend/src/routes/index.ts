import { FastifyInstance } from 'fastify';
import { conversationRoutes } from './conversations';
import { aiRoutes } from './ai';

export async function registerRoutes(server: FastifyInstance) {
  // Register conversation routes
  await server.register(conversationRoutes, { prefix: '/api' });

  // Register AI routes
  await server.register(aiRoutes, { prefix: '/api' });

  // Future routes can be registered here
  // await server.register(summaryRoutes, { prefix: '/api' });
  // await server.register(adminRoutes, { prefix: '/api/admin' });
}
