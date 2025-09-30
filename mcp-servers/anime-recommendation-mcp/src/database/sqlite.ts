import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env from the project root, not from cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

export class SQLiteDatabase {
  private db: sqlite3.Database;
  private isInitialized = false;

  constructor(dbPath?: string) {
    const defaultPath = process.env.USER_DB_PATH || './data/users.db';
    const fullPath = path.resolve(dbPath || defaultPath);

    this.db = new sqlite3.Database(fullPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
      } else {
        console.log('Connected to SQLite database:', fullPath);
      }
    });

    // Enable foreign keys
    this.db.run("PRAGMA foreign_keys = ON");
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.createTables();
    this.isInitialized = true;
  }

  private async createTables(): Promise<void> {
    const createTablesSQL = `
      -- User taste profiles and preferences
      CREATE TABLE IF NOT EXISTS user_taste_profiles (
        username TEXT PRIMARY KEY,
        preference_data TEXT, -- JSON
        learning_data TEXT,   -- JSON
        mood_history TEXT,    -- JSON
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        profile_completeness REAL DEFAULT 0.0
      );

      -- User similarity calculations
      CREATE TABLE IF NOT EXISTS user_similarity_matrix (
        user1 TEXT,
        user2 TEXT,
        similarity_score REAL,
        common_anime INTEGER,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user1, user2)
      );

      -- User feedback and learning data
      CREATE TABLE IF NOT EXISTS user_anime_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        anime_id INTEGER, -- References anime.mal_id from PostgreSQL
        feedback_type TEXT,
        feedback_data TEXT, -- JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Interactive pattern discovery
      CREATE TABLE IF NOT EXISTS emotional_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_name TEXT UNIQUE,
        keywords TEXT, -- JSON array
        regex_variants TEXT, -- JSON array
        context_words TEXT, -- JSON array
        emotional_category TEXT,
        confidence REAL,
        source_anime TEXT, -- JSON array of anime IDs
        discovered_from TEXT, -- "manual_review_analysis" or "ai_validation"
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Pattern evidence and validation
      CREATE TABLE IF NOT EXISTS pattern_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_id INTEGER REFERENCES emotional_patterns(id),
        review_text TEXT,
        anime_id INTEGER,
        match_strength REAL,
        validated BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_user_feedback_username ON user_anime_feedback(username);
      CREATE INDEX IF NOT EXISTS idx_user_feedback_anime ON user_anime_feedback(anime_id);
      CREATE INDEX IF NOT EXISTS idx_pattern_evidence_pattern ON pattern_evidence(pattern_id);
      CREATE INDEX IF NOT EXISTS idx_pattern_evidence_anime ON pattern_evidence(anime_id);
      CREATE INDEX IF NOT EXISTS idx_emotional_patterns_category ON emotional_patterns(emotional_category);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(createTablesSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Singleton instance
let sqliteInstance: SQLiteDatabase | null = null;

export function getSQLiteDB(): SQLiteDatabase {
  if (!sqliteInstance) {
    sqliteInstance = new SQLiteDatabase();
  }
  return sqliteInstance;
}