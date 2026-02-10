import { getDatabase } from './database';

export interface SummaryGroup {
  id?: number;
  conversation_id: number;
  detailed_summary?: string;
  social_summary?: string;
  rendered_image_path?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  prompt_version_id?: number;
  created_at?: string;
  updated_at?: string;
}

export class SummaryGroupRepository {
  private get db() {
    return getDatabase().getDatabase();
  }

  create(summaryGroup: SummaryGroup): number {
    const stmt = this.db.prepare(`
      INSERT INTO summary_groups (
        conversation_id, detailed_summary, social_summary, rendered_image_path,
        status, error_message, prompt_version_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      summaryGroup.conversation_id,
      summaryGroup.detailed_summary || null,
      summaryGroup.social_summary || null,
      summaryGroup.rendered_image_path || null,
      summaryGroup.status || 'pending',
      summaryGroup.error_message || null,
      summaryGroup.prompt_version_id || null
    );

    return result.lastInsertRowid as number;
  }

  findById(id: number): SummaryGroup | undefined {
    const stmt = this.db.prepare('SELECT * FROM summary_groups WHERE id = ?');
    return this.mapRowToSummaryGroup(stmt.get(id) as any);
  }

  findByConversationId(conversationId: number): SummaryGroup | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM summary_groups WHERE conversation_id = ?'
    );
    return this.mapRowToSummaryGroup(stmt.get(conversationId) as any);
  }

  findAll(options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): SummaryGroup[] {
    const conditions: string[] = [];
    const params: any[] = [];

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
      SELECT * FROM summary_groups
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause} ${offsetClause}
    `);

    const rows = stmt.all(...params) as any[];
    return rows
      .map(row => this.mapRowToSummaryGroup(row))
      .filter((item): item is SummaryGroup => item !== undefined);
  }

  update(id: number, updates: Partial<SummaryGroup>): boolean {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id') return;
      fields.push(`${key} = ?`);
      params.push(value);
    });

    if (fields.length === 0) return false;

    fields.push('updated_at = datetime("now")');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE summary_groups
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...params);
    return result.changes > 0;
  }

  updateByConversationId(
    conversationId: number,
    updates: Partial<SummaryGroup>
  ): boolean {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'conversation_id') return;
      fields.push(`${key} = ?`);
      params.push(value);
    });

    if (fields.length === 0) return false;

    fields.push('updated_at = datetime("now")');
    params.push(conversationId);

    const stmt = this.db.prepare(`
      UPDATE summary_groups
      SET ${fields.join(', ')}
      WHERE conversation_id = ?
    `);

    const result = stmt.run(...params);
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM summary_groups WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  private mapRowToSummaryGroup(row: any): SummaryGroup | undefined {
    if (!row) return undefined;

    return {
      id: row.id,
      conversation_id: row.conversation_id,
      detailed_summary: row.detailed_summary,
      social_summary: row.social_summary,
      rendered_image_path: row.rendered_image_path,
      status: row.status,
      error_message: row.error_message,
      prompt_version_id: row.prompt_version_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
