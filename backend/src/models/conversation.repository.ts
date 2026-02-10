import { getDatabase } from './database';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: string;
}

export interface Conversation {
  id?: number;
  platform: 'Gemini' | 'Doubao';
  model_version?: string;
  captured_at: string;
  messages: Message[];
  image_urls?: string[];
  social_media_summary?: string;
  detailed_summary?: string;
  visibility?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export class ConversationRepository {
  private get db() {
    return getDatabase().getDatabase();
  }

  create(conversation: Conversation): number {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (
        platform, model_version, captured_at, messages, image_urls, visibility, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      conversation.platform,
      conversation.model_version || null,
      conversation.captured_at,
      JSON.stringify(conversation.messages),
      conversation.image_urls ? JSON.stringify(conversation.image_urls) : null,
      conversation.visibility || 0,
      conversation.status || 'processing'
    );

    return result.lastInsertRowid as number;
  }

  findById(id: number): Conversation | undefined {
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return undefined;

    return this.mapRowToConversation(row);
  }

  findAll(options: {
    visibility?: number;
    platform?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Conversation[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.visibility !== undefined) {
      conditions.push('visibility = ?');
      params.push(options.visibility);
    }

    if (options.platform) {
      conditions.push('platform = ?');
      params.push(options.platform);
    }

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ?` : '';
    const offsetClause = options.offset ? `OFFSET ?` : '';

    if (options.limit) params.push(options.limit);
    if (options.offset) params.push(options.offset);

    const stmt = this.db.prepare(`
      SELECT * FROM conversations
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause} ${offsetClause}
    `);

    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.mapRowToConversation(row));
  }

  update(id: number, updates: Partial<Conversation>): boolean {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      if (key === 'messages' || key === 'image_urls') {
        fields.push(`${key} = ?`);
        params.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) return false;

    fields.push('updated_at = datetime(\'now\')');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE conversations
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...params);
    return result.changes > 0;
  }

  appendImageUrl(id: number, imageUrl: string): boolean {
    const conversation = this.findById(id);
    if (!conversation) return false;

    const currentUrls = conversation.image_urls || [];
    const updatedUrls = [...currentUrls, imageUrl];

    return this.update(id, { image_urls: updatedUrls });
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  batchUpdateVisibility(ids: number[], visibility: number): number {
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET visibility = ?, updated_at = datetime('now')
      WHERE id = ?
    `);

    const updateMany = this.db.transaction((ids: number[]) => {
      let count = 0;
      for (const id of ids) {
        const result = stmt.run(visibility, id);
        count += result.changes;
      }
      return count;
    });

    return updateMany(ids);
  }

  batchDelete(ids: number[]): number {
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');

    const deleteMany = this.db.transaction((ids: number[]) => {
      let count = 0;
      for (const id of ids) {
        const result = stmt.run(id);
        count += result.changes;
      }
      return count;
    });

    return deleteMany(ids);
  }

  count(options: { visibility?: number; platform?: string; status?: string } = {}): number {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.visibility !== undefined) {
      conditions.push('visibility = ?');
      params.push(options.visibility);
    }

    if (options.platform) {
      conditions.push('platform = ?');
      params.push(options.platform);
    }

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM conversations ${whereClause}`);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  private mapRowToConversation(row: any): Conversation {
    return {
      id: row.id,
      platform: row.platform,
      model_version: row.model_version,
      captured_at: row.captured_at,
      messages: JSON.parse(row.messages),
      image_urls: row.image_urls ? JSON.parse(row.image_urls) : undefined,
      social_media_summary: row.social_media_summary,
      detailed_summary: row.detailed_summary,
      visibility: row.visibility,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
