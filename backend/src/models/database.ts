import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schema);
    console.log('Database initialized successfully');
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }

  // Helper method to run transactions
  transaction<T>(fn: (db: Database.Database) => T): T {
    return this.db.transaction(fn) as T;
  }

  // Helper method to check if a record exists
  exists(table: string, id: number): boolean {
    const result = this.db
      .prepare(`SELECT 1 FROM ${table} WHERE id = ?`)
      .get(id);
    return !!result;
  }
}

let dbInstance: AppDatabase | null = null;

export function initDatabase(dbPath: string): AppDatabase {
  if (!dbInstance) {
    dbInstance = new AppDatabase(dbPath);
  }
  return dbInstance;
}

export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return dbInstance;
}
