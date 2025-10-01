/**
 * TypeScript type definitions for MCP Analytics
 */

// Error types for classification
export type ErrorType =
  | 'network'
  | 'validation'
  | 'auth'
  | 'timeout'
  | 'database'
  | 'not_found'
  | 'rate_limit'
  | 'unknown';

// Session outcome states
export type SessionOutcome =
  | 'completed'
  | 'abandoned'
  | 'error'
  | 'in_progress';

// Tool call event - what gets logged
export interface ToolCallEvent {
  timestamp: string;          // ISO 8601
  sessionId: string;
  sequenceNum: number;

  mcpServer: string;          // 'anime-search-mcp', 'mal-user-mcp', etc.
  toolName: string;           // 'searchAnime', 'mal_update_anime', etc.

  parameters?: Record<string, any>;  // Will be sanitized

  executionTimeMs?: number;
  success: boolean;
  errorType?: ErrorType;
  errorMessage?: string;

  resultMetadata?: Record<string, any>;

  tokensInput?: number;
  tokensOutput?: number;

  retryCount?: number;
  cacheHit?: boolean;
}

// Parameters for starting a tool call
export interface StartCallParams {
  sessionId: string;
  toolName: string;
  parameters?: Record<string, any>;
}

// Parameters for ending a tool call
export interface EndCallParams {
  success: boolean;
  executionTimeMs: number;
  errorType?: ErrorType;
  errorMessage?: string;
  resultMetadata?: Record<string, any>;
  tokensInput?: number;
  tokensOutput?: number;
  retryCount?: number;
  cacheHit?: boolean;
}

// Session data
export interface Session {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  totalCalls: number;
  successfulCalls: number;
  totalExecutionTimeMs: number;
  outcome?: SessionOutcome;
  context?: Record<string, any>;
}

// Daily statistics
export interface DailyStats {
  date: string;              // YYYY-MM-DD
  mcpServer: string;
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  avgExecutionTimeMs: number;
  totalTokens: number;
}

// Tool call record from database
export interface ToolCallRecord {
  id: number;
  timestamp: string;
  session_id: string;
  sequence_num: number;
  mcp_server: string;
  tool_name: string;
  parameters?: string;       // JSON string
  execution_time_ms?: number;
  success: boolean;
  error_type?: string;
  error_message?: string;
  result_metadata?: string;  // JSON string
  tokens_input?: number;
  tokens_output?: number;
  retry_count: number;
  cache_hit: boolean;
}

// Session record from database
export interface SessionRecord {
  session_id: string;
  started_at: string;
  ended_at?: string;
  total_calls: number;
  successful_calls: number;
  total_execution_time_ms: number;
  outcome?: string;
  context?: string;          // JSON string
}

// Daily stats record from database
export interface DailyStatsRecord {
  date: string;
  mcp_server: string;
  tool_name: string;
  call_count: number;
  success_count: number;
  error_count: number;
  avg_execution_time_ms?: number;
  total_tokens?: number;
}

// Report types
export interface ToolUsageStats {
  mcpServer: string;
  toolName: string;
  calls: number;
  successRate: number;
  avgTimeMs: number;
  totalTokens?: number;
}

export interface ErrorStats {
  toolName: string;
  errorType: string;
  count: number;
  exampleMessage?: string;
}

export interface JourneyPattern {
  pattern: string;           // e.g., "searchAnime → getAnimeDetails → mal_update_anime"
  frequency: number;
  percentage: number;
}

export interface PerformanceMetric {
  toolName: string;
  avgTimeMs: number;
  maxTimeMs: number;
  calls: number;
  avgTokens?: number;
}

// Logger configuration
export interface AnalyticsConfig {
  dbPath?: string;
  enabled?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  retentionDays?: number;
  sessionTimeoutMin?: number;
}

// Active call tracking (in-memory)
export interface ActiveCall {
  id: string;
  mcpServer: string;
  sessionId: string;
  sequenceNum: number;
  toolName: string;
  parameters?: Record<string, any>;
  startTime: number;
}
