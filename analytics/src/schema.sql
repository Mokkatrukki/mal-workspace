-- MCP Analytics Database Schema
-- SQLite database for tracking tool calls, sessions, and performance metrics

-- Primary event log - every tool call recorded
CREATE TABLE IF NOT EXISTS tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,              -- ISO 8601 format
  session_id TEXT NOT NULL,             -- Groups related calls
  sequence_num INTEGER NOT NULL,        -- Order within session

  mcp_server TEXT NOT NULL,             -- 'anime-search-mcp', 'mal-user-mcp', etc.
  tool_name TEXT NOT NULL,              -- 'searchAnime', 'mal_update_anime', etc.

  parameters TEXT,                      -- JSON (sanitized for privacy)

  execution_time_ms INTEGER,            -- How long did it take?
  success BOOLEAN NOT NULL,             -- Did it work?
  error_type TEXT,                      -- 'network', 'validation', 'auth', etc.
  error_message TEXT,                   -- Error details

  result_metadata TEXT,                 -- JSON: { count, truncated, etc. }

  tokens_input INTEGER,                 -- Tokens consumed (if trackable)
  tokens_output INTEGER,

  retry_count INTEGER DEFAULT 0,        -- How many retries?
  cache_hit BOOLEAN DEFAULT 0           -- Was this cached?
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_timestamp ON tool_calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_tool ON tool_calls(mcp_server, tool_name);
CREATE INDEX IF NOT EXISTS idx_success ON tool_calls(success);
CREATE INDEX IF NOT EXISTS idx_error_type ON tool_calls(error_type);

-- Session metadata - groups of related tool calls
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  total_execution_time_ms INTEGER DEFAULT 0,
  outcome TEXT,                         -- 'completed', 'abandoned', 'error'
  context TEXT                          -- JSON: user agent, source, etc.
);

CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_outcome ON sessions(outcome);

-- Pre-aggregated daily statistics for fast reporting
CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT NOT NULL,                   -- YYYY-MM-DD
  mcp_server TEXT NOT NULL,
  tool_name TEXT NOT NULL,

  call_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  avg_execution_time_ms INTEGER,
  total_tokens INTEGER,

  PRIMARY KEY (date, mcp_server, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
