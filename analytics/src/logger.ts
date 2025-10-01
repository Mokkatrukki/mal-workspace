/**
 * Core analytics logger for MCP servers
 * Tracks tool calls, sessions, and performance metrics
 */

import { randomUUID } from 'crypto';
import { AnalyticsDatabase } from './database.js';
import {
  sanitizeParameters,
  sanitizeResultMetadata,
  classifyError,
  sanitizeErrorMessage,
  estimateTokens
} from './sanitizer.js';
import type {
  AnalyticsConfig,
  StartCallParams,
  EndCallParams,
  ToolCallEvent,
  Session,
  ActiveCall
} from './types.js';

export class AnalyticsLogger {
  private mcpServer: string;
  private db: AnalyticsDatabase;
  private config: Required<AnalyticsConfig>;
  private activeCalls: Map<string, ActiveCall> = new Map();
  private sessionSequence: Map<string, number> = new Map();

  constructor(
    mcpServer: string,
    config: AnalyticsConfig = {}
  ) {
    this.mcpServer = mcpServer;

    this.config = {
      dbPath: config.dbPath ?? process.env.ANALYTICS_DB_PATH ?? 'analytics.db',
      enabled: config.enabled ?? (process.env.ANALYTICS_ENABLED !== 'false'),
      logLevel: config.logLevel ?? 'info',
      retentionDays: config.retentionDays ?? 90,
      sessionTimeoutMin: config.sessionTimeoutMin ?? 30
    };

    this.db = new AnalyticsDatabase(this.config.dbPath);

    // Run migrations if needed (async)
    this.db.migrate().catch(error => {
      if (this.config.logLevel === 'debug') {
        console.error('[Analytics] Migration error (may be already migrated):', error);
      }
    });
  }

  /**
   * Start tracking a tool call
   * Returns a call ID that should be used with endCall()
   */
  startCall(params: StartCallParams): string {
    if (!this.config.enabled) {
      return 'disabled';
    }

    const callId = randomUUID();
    const sequenceNum = this.getNextSequence(params.sessionId);

    const activeCall: ActiveCall = {
      id: callId,
      mcpServer: this.mcpServer,
      sessionId: params.sessionId,
      sequenceNum,
      toolName: params.toolName,
      parameters: params.parameters,
      startTime: Date.now()
    };

    this.activeCalls.set(callId, activeCall);

    // Ensure session exists
    this.ensureSession(params.sessionId);

    return callId;
  }

  /**
   * End tracking a tool call and record to database
   */
  endCall(callId: string, params: EndCallParams): void {
    if (!this.config.enabled || callId === 'disabled') {
      return;
    }

    const activeCall = this.activeCalls.get(callId);
    if (!activeCall) {
      if (this.config.logLevel === 'debug') {
        console.warn('[Analytics] No active call found for ID:', callId);
      }
      return;
    }

    // Create tool call event
    const event: ToolCallEvent = {
      timestamp: new Date().toISOString(),
      sessionId: activeCall.sessionId,
      sequenceNum: activeCall.sequenceNum,
      mcpServer: this.mcpServer,
      toolName: activeCall.toolName,
      parameters: sanitizeParameters(activeCall.parameters),
      executionTimeMs: params.executionTimeMs,
      success: params.success,
      errorType: params.errorType,
      errorMessage: params.errorMessage ? sanitizeErrorMessage(params.errorMessage) : undefined,
      resultMetadata: sanitizeResultMetadata(params.resultMetadata),
      tokensInput: params.tokensInput ?? (activeCall.parameters ? estimateTokens(activeCall.parameters) : undefined),
      tokensOutput: params.tokensOutput,
      retryCount: params.retryCount ?? 0,
      cacheHit: params.cacheHit ?? false
    };

    // Record to database asynchronously (fire and forget)
    Promise.all([
      this.db.recordToolCall(event),
      this.updateSession(activeCall.sessionId, params.success, params.executionTimeMs)
    ])
      .then(() => {
        if (this.config.logLevel === 'debug') {
          console.log('[Analytics] Recorded:', {
            tool: event.toolName,
            success: event.success,
            timeMs: event.executionTimeMs
          });
        }
      })
      .catch(error => {
        if (this.config.logLevel === 'error' || this.config.logLevel === 'debug') {
          console.error('[Analytics] Failed to record call:', error);
        }
      });

    // Clean up active call
    this.activeCalls.delete(callId);
  }

  /**
   * Record a tool call error without startCall
   * Useful for quick error logging
   */
  logError(sessionId: string, toolName: string, error: Error | unknown): void {
    if (!this.config.enabled) {
      return;
    }

    const sequenceNum = this.getNextSequence(sessionId);

    const event: ToolCallEvent = {
      timestamp: new Date().toISOString(),
      sessionId,
      sequenceNum,
      mcpServer: this.mcpServer,
      toolName,
      success: false,
      errorType: classifyError(error),
      errorMessage: sanitizeErrorMessage(error)
    };

    // Record asynchronously (fire and forget)
    Promise.all([
      this.db.recordToolCall(event),
      this.updateSession(sessionId, false, 0)
    ]).catch(dbError => {
      if (this.config.logLevel === 'error' || this.config.logLevel === 'debug') {
        console.error('[Analytics] Failed to log error:', dbError);
      }
    });
  }

  /**
   * Ensure session exists in database
   */
  private async ensureSession(sessionId: string): Promise<void> {
    const existing = await this.db.getSession(sessionId);
    if (!existing) {
      const session: Session = {
        sessionId,
        startedAt: new Date().toISOString(),
        totalCalls: 0,
        successfulCalls: 0,
        totalExecutionTimeMs: 0,
        outcome: 'in_progress'
      };

      await this.db.upsertSession(session);
    }
  }

  /**
   * Update session statistics
   */
  private async updateSession(sessionId: string, success: boolean, executionTimeMs: number): Promise<void> {
    const session = await this.db.getSession(sessionId);
    if (!session) return;

    session.totalCalls += 1;
    if (success) {
      session.successfulCalls += 1;
    }
    session.totalExecutionTimeMs += executionTimeMs;
    session.endedAt = new Date().toISOString();

    // Update outcome based on success rate
    if (session.totalCalls > 0) {
      const successRate = session.successfulCalls / session.totalCalls;
      if (successRate === 0) {
        session.outcome = 'error';
      } else if (successRate === 1) {
        session.outcome = 'completed';
      } else {
        session.outcome = 'completed'; // Partial success still counts as completed
      }
    }

    await this.db.upsertSession(session);
  }

  /**
   * Get next sequence number for session
   */
  private getNextSequence(sessionId: string): number {
    const current = this.sessionSequence.get(sessionId) ?? 0;
    const next = current + 1;
    this.sessionSequence.set(sessionId, next);
    return next;
  }

  /**
   * Generate a session ID (can be overridden by caller)
   */
  static generateSessionId(): string {
    return randomUUID();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Helper function to wrap tool execution with automatic logging
 */
export async function withAnalytics<T>(
  logger: AnalyticsLogger,
  sessionId: string,
  toolName: string,
  parameters: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  const callId = logger.startCall({ sessionId, toolName, parameters });
  const startTime = Date.now();

  try {
    const result = await fn();

    logger.endCall(callId, {
      success: true,
      executionTimeMs: Date.now() - startTime,
      resultMetadata: {
        hasResult: !!result
      }
    });

    return result;
  } catch (error) {
    logger.endCall(callId, {
      success: false,
      executionTimeMs: Date.now() - startTime,
      errorType: classifyError(error),
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}
