import { getDatabase } from '../models/database';

/**
 * API 使用记录
 */
export interface APIUsageLog {
  id?: number;
  conversationId?: number;
  taskType?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  responseTime: number; // 毫秒
  status: 'success' | 'error';
  errorMessage?: string;
  timestamp: string;
}

/**
 * API 使用统计
 */
export interface APIUsageStats {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  model: string;
  dailyStats?: {
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }[];
}

/**
 * API 使用日志记录器
 */
export class UsageLogger {
  /**
   * 记录 API 使用
   */
  static log(usage: APIUsageLog): void {
    try {
      const db = getDatabase().getDatabase();

      const stmt = db.prepare(`
        INSERT INTO api_usage_log (
          conversation_id, task_type, model, prompt_tokens, completion_tokens,
          total_tokens, cost, response_time, status, error_message, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        usage.conversationId || null,
        usage.taskType || null,
        usage.model,
        usage.promptTokens,
        usage.completionTokens,
        usage.totalTokens,
        usage.cost,
        usage.responseTime,
        usage.status,
        usage.errorMessage || null,
        usage.timestamp
      );

      console.log(`[Usage Logger] Logged API usage: ${usage.totalTokens} tokens, ¥${usage.cost.toFixed(4)}`);
    } catch (error) {
      console.error('[Usage Logger] Failed to log usage:', error);
    }
  }

  /**
   * 获取使用统计
   */
  static getStats(startDate?: string, endDate?: string): APIUsageStats {
    try {
      const db = getDatabase().getDatabase();

      let whereClause = '1=1';
      const params: any[] = [];

      if (startDate) {
        whereClause += ' AND timestamp >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND timestamp <= ?';
        params.push(endDate);
      }

      // 获取基本统计
      const statsStmt = db.prepare(`
        SELECT
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_requests,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_requests,
          SUM(total_tokens) as total_tokens,
          SUM(cost) as total_cost,
          AVG(response_time) as avg_response_time,
          model
        FROM api_usage_log
        WHERE ${whereClause}
      `);

      const stats: any = statsStmt.get(...params);

      return {
        totalRequests: stats.total_requests || 0,
        successRequests: stats.success_requests || 0,
        failedRequests: stats.failed_requests || 0,
        totalTokens: stats.total_tokens || 0,
        totalCost: stats.total_cost || 0,
        averageResponseTime: stats.avg_response_time || 0,
        model: stats.model || 'unknown',
      };
    } catch (error) {
      console.error('[Usage Logger] Failed to get stats:', error);
      return {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        model: 'unknown',
      };
    }
  }

  /**
   * 获取每日统计
   */
  static getDailyStats(days: number = 7): APIUsageStats['dailyStats'] {
    try {
      const db = getDatabase().getDatabase();

      const stmt = db.prepare(`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as requests,
          SUM(total_tokens) as tokens,
          SUM(cost) as cost
        FROM api_usage_log
        WHERE timestamp >= DATE('now', '-${days} days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `);

      const stats: any[] = stmt.all();
      return stats.map((s) => ({
        date: s.date,
        requests: s.requests,
        tokens: s.tokens || 0,
        cost: s.cost || 0,
      }));
    } catch (error) {
      console.error('[Usage Logger] Failed to get daily stats:', error);
      return [];
    }
  }

  /**
   * 获取最近的错误
   */
  static getRecentErrors(limit: number = 10): any[] {
    try {
      const db = getDatabase().getDatabase();

      const stmt = db.prepare(`
        SELECT
          id,
          conversation_id,
          task_type,
          model,
          error_message,
          timestamp
        FROM api_usage_log
        WHERE status = 'error'
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      return stmt.all(limit);
    } catch (error) {
      console.error('[Usage Logger] Failed to get recent errors:', error);
      return [];
    }
  }

  /**
   * 清理旧日志（保留最近 N 天）
   */
  static cleanup(daysToKeep: number = 30): void {
    try {
      const db = getDatabase().getDatabase();

      const stmt = db.prepare(`
        DELETE FROM api_usage_log
        WHERE timestamp < DATE('now', '-${daysToKeep} days')
      `);

      const result = stmt.run();
      console.log(`[Usage Logger] Cleaned up ${result.changes} old log entries`);
    } catch (error) {
      console.error('[Usage Logger] Failed to cleanup logs:', error);
    }
  }
}
