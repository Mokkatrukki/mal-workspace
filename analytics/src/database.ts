/**
 * Database manager for MCP Analytics
 * Handles SQLite operations, migrations, and queries
 */

import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import type {
  ToolCallEvent,
  ToolCallRecord,
  Session,
  SessionRecord,
  DailyStatsRecord,
  ToolUsageStats,
  ErrorStats,
  JourneyPattern,
  PerformanceMetric
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Promisified sqlite3 wrapper for async/await
class AsyncDatabase {
  private db: sqlite3.Database;

  constructor(path: string) {
    this.db = new sqlite3.Database(path);
  }

  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export class AnalyticsDatabase {
  private db: AsyncDatabase;
  private dbPath: string;

  constructor(dbPath: string = join(__dirname, '..', 'analytics.db')) {
    this.dbPath = dbPath;
    this.db = new AsyncDatabase(dbPath);
  }

  /**
   * Initialize database schema from schema.sql
   */
  async migrate(): Promise<void> {
    // Try dist first, then fall back to src
    let schemaPath = join(__dirname, 'schema.sql');
    try {
      readFileSync(schemaPath, 'utf-8');
    } catch {
      // If not in dist, try src directory
      schemaPath = join(__dirname, '..', 'src', 'schema.sql');
    }
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute the entire schema at once (SQLite handles it better this way)
    await this.db.exec(schema);
  }

  /**
   * Record a tool call event
   */
  async recordToolCall(event: ToolCallEvent): Promise<number> {
    const result = await this.db.run(`
      INSERT INTO tool_calls (
        timestamp, session_id, sequence_num,
        mcp_server, tool_name, parameters,
        execution_time_ms, success, error_type, error_message,
        result_metadata, tokens_input, tokens_output,
        retry_count, cache_hit
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?
      )
    `, [
      event.timestamp,
      event.sessionId,
      event.sequenceNum,
      event.mcpServer,
      event.toolName,
      event.parameters ? JSON.stringify(event.parameters) : null,
      event.executionTimeMs ?? null,
      event.success ? 1 : 0,
      event.errorType ?? null,
      event.errorMessage ?? null,
      event.resultMetadata ? JSON.stringify(event.resultMetadata) : null,
      event.tokensInput ?? null,
      event.tokensOutput ?? null,
      event.retryCount ?? 0,
      event.cacheHit ? 1 : 0
    ]);

    return result.lastID;
  }

  /**
   * Create or update a session
   */
  async upsertSession(session: Session): Promise<void> {
    await this.db.run(`
      INSERT INTO sessions (
        session_id, started_at, ended_at,
        total_calls, successful_calls, total_execution_time_ms,
        outcome, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        ended_at = excluded.ended_at,
        total_calls = excluded.total_calls,
        successful_calls = excluded.successful_calls,
        total_execution_time_ms = excluded.total_execution_time_ms,
        outcome = excluded.outcome,
        context = excluded.context
    `, [
      session.sessionId,
      session.startedAt,
      session.endedAt ?? null,
      session.totalCalls,
      session.successfulCalls,
      session.totalExecutionTimeMs,
      session.outcome ?? null,
      session.context ? JSON.stringify(session.context) : null
    ]);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | undefined> {
    const row = await this.db.get(`
      SELECT * FROM sessions WHERE session_id = ?
    `, [sessionId]) as SessionRecord | undefined;

    if (!row) return undefined;

    return {
      sessionId: row.session_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      totalCalls: row.total_calls,
      successfulCalls: row.successful_calls,
      totalExecutionTimeMs: row.total_execution_time_ms,
      outcome: row.outcome as any,
      context: row.context ? JSON.parse(row.context) : undefined
    };
  }

  /**
   * Get tool usage statistics for a date range
   */
  async getToolUsageStats(fromDate: string, toDate: string): Promise<ToolUsageStats[]> {
    const rows = await this.db.all(`
      SELECT
        mcp_server,
        tool_name,
        COUNT(*) as calls,
        ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 1) as success_rate,
        ROUND(AVG(execution_time_ms), 0) as avg_time_ms,
        SUM(COALESCE(tokens_input, 0) + COALESCE(tokens_output, 0)) as total_tokens
      FROM tool_calls
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY mcp_server, tool_name
      ORDER BY calls DESC
    `, [fromDate, toDate]);

    return rows.map((row: any) => ({
      mcpServer: row.mcp_server,
      toolName: row.tool_name,
      calls: row.calls,
      successRate: row.success_rate,
      avgTimeMs: row.avg_time_ms ?? 0,
      totalTokens: row.total_tokens
    }));
  }

  /**
   * Get error statistics for a date range
   */
  async getErrorStats(fromDate: string, toDate: string): Promise<ErrorStats[]> {
    const rows = await this.db.all(`
      SELECT
        tool_name,
        error_type,
        COUNT(*) as count,
        error_message
      FROM tool_calls
      WHERE success = 0
        AND timestamp >= ? AND timestamp <= ?
      GROUP BY tool_name, error_type, error_message
      ORDER BY count DESC
      LIMIT 20
    `, [fromDate, toDate]);

    return rows.map((row: any) => ({
      toolName: row.tool_name,
      errorType: row.error_type ?? 'unknown',
      count: row.count,
      exampleMessage: row.error_message
    }));
  }

  /**
   * Get common journey patterns
   */
  async getJourneyPatterns(fromDate: string, toDate: string, limit: number = 10): Promise<JourneyPattern[]> {
    const rows = await this.db.all(`
      WITH sequences AS (
        SELECT
          session_id,
          GROUP_CONCAT(tool_name, ' → ') as pattern
        FROM (
          SELECT
            session_id,
            tool_name,
            ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp) as step
          FROM tool_calls
          WHERE timestamp >= ? AND timestamp <= ?
        )
        WHERE step <= 3
        GROUP BY session_id
      )
      SELECT
        pattern,
        COUNT(*) as frequency,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT session_id) FROM tool_calls WHERE timestamp >= ? AND timestamp <= ?), 1) as percentage
      FROM sequences
      GROUP BY pattern
      ORDER BY frequency DESC
      LIMIT ?
    `, [fromDate, toDate, fromDate, toDate, limit]);

    return rows.map((row: any) => ({
      pattern: row.pattern,
      frequency: row.frequency,
      percentage: row.percentage
    }));
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(fromDate: string, toDate: string): Promise<PerformanceMetric[]> {
    const rows = await this.db.all(`
      SELECT
        tool_name,
        ROUND(AVG(execution_time_ms), 0) as avg_time_ms,
        MAX(execution_time_ms) as max_time_ms,
        COUNT(*) as calls,
        ROUND(AVG(COALESCE(tokens_input, 0) + COALESCE(tokens_output, 0)), 0) as avg_tokens
      FROM tool_calls
      WHERE success = 1
        AND timestamp >= ? AND timestamp <= ?
        AND execution_time_ms IS NOT NULL
      GROUP BY tool_name
      ORDER BY avg_time_ms DESC
    `, [fromDate, toDate]);

    return rows.map((row: any) => ({
      toolName: row.tool_name,
      avgTimeMs: row.avg_time_ms,
      maxTimeMs: row.max_time_ms,
      calls: row.calls,
      avgTokens: row.avg_tokens > 0 ? row.avg_tokens : undefined
    }));
  }

  /**
   * Get summary statistics
   */
  async getSummaryStats(fromDate: string, toDate: string): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    avgResponseTime: number;
    totalTokens: number;
  }> {
    const row = await this.db.get(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_calls,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
        ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 1) as success_rate,
        ROUND(AVG(execution_time_ms), 0) as avg_response_time,
        SUM(COALESCE(tokens_input, 0) + COALESCE(tokens_output, 0)) as total_tokens
      FROM tool_calls
      WHERE timestamp >= ? AND timestamp <= ?
    `, [fromDate, toDate]);

    return {
      totalCalls: row.total_calls ?? 0,
      successfulCalls: row.successful_calls ?? 0,
      failedCalls: row.failed_calls ?? 0,
      successRate: row.success_rate ?? 0,
      avgResponseTime: row.avg_response_time ?? 0,
      totalTokens: row.total_tokens ?? 0
    };
  }

  /**
   * Clean up old data (older than retentionDays)
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const result = await this.db.run(`
      DELETE FROM tool_calls
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `, [retentionDays]);

    return result.changes;
  }

  /**
   * Optimize database (vacuum and reindex)
   */
  async optimize(): Promise<void> {
    await this.db.exec('VACUUM');
    await this.db.exec('REINDEX');
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}

// Allow running migrations from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.includes('--migrate')) {
    console.log('Running database migrations...');
    const db = new AnalyticsDatabase();

    db.migrate()
      .then(() => {
        console.log('✅ Database migrations completed successfully');
        return db.close();
      })
      .catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      });
  }
}
