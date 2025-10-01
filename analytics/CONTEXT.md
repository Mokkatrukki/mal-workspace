# MCP Analytics - Context

**Track what works, fix what doesn't** - Data-driven insights for MCP tool usage.

## What Is This?

A lightweight analytics system that tracks how the 3 MCP servers are being used, what tools are called, what fails, and what patterns emerge. Think of it as "Google Analytics for your MCP tools" - but local, privacy-focused, and actionable.

## The 30-Second Summary

MCP servers log every tool call → SQLite database → Reporting CLI shows patterns → You optimize based on real usage data.

```
anime-search-mcp    ┐
mal-user-mcp        ├─→ Analytics Logger → SQLite → Reports → Insights
anime-recommendation-mcp ┘
```

## Why Track This?

1. **Find broken tools** - Which tools have high error rates?
2. **Optimize performance** - Which tools are slow? Worth caching?
3. **Understand user flows** - What do users actually do? Search → Details → Add to list?
4. **Improve UX** - Where do users get stuck or give up?
5. **Focus development** - Which tools are heavily used vs ignored?
6. **Testing** - Real usage patterns become test cases

## What We Track

### Per Tool Call
- **Identity**: Which MCP server, which tool
- **Timing**: When called, how long it took
- **Parameters**: What was requested (sanitized for privacy)
- **Result**: Success/failure, error messages, result metadata
- **Context**: Session ID, sequence number (for flow tracking)
- **Resources**: Tokens used (input/output), API calls made, retries

### Aggregated Metrics
- Tool usage frequency
- Success/error rates
- Average execution times
- Token consumption
- User journey patterns
- Search abandonment rates
- Retry patterns

## Database Schema

**SQLite database: `analytics/analytics.db`**

### Tables

#### `tool_calls`
Primary event log - every tool call recorded.

```sql
CREATE TABLE tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,              -- ISO 8601
  session_id TEXT NOT NULL,             -- Groups related calls
  sequence_num INTEGER NOT NULL,        -- Order within session

  mcp_server TEXT NOT NULL,             -- 'anime-search-mcp', 'mal-user-mcp', etc.
  tool_name TEXT NOT NULL,              -- 'searchAnime', 'mal_update_anime', etc.

  parameters TEXT,                      -- JSON (sanitized)

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

CREATE INDEX idx_timestamp ON tool_calls(timestamp);
CREATE INDEX idx_session ON tool_calls(session_id);
CREATE INDEX idx_tool ON tool_calls(mcp_server, tool_name);
CREATE INDEX idx_success ON tool_calls(success);
```

#### `sessions`
Session metadata - groups of related tool calls.

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  total_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  total_execution_time_ms INTEGER DEFAULT 0,
  outcome TEXT,                         -- 'completed', 'abandoned', 'error'
  context TEXT                          -- JSON: user agent, source, etc.
);
```

#### `daily_stats`
Pre-aggregated daily statistics for fast reporting.

```sql
CREATE TABLE daily_stats (
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
```

## Privacy & Sanitization

### What We DON'T Store
- ❌ User credentials or auth tokens
- ❌ Full review text or user-generated content
- ❌ Personally identifiable information
- ❌ MAL usernames or email addresses
- ❌ Sensitive search queries (parameterized only)

### What We DO Store
- ✅ Tool names and call patterns
- ✅ Parameter types/structure (not values if sensitive)
- ✅ Timing and performance metrics
- ✅ Error types and messages
- ✅ Aggregated statistics
- ✅ Session flows (anonymized)

### Sanitization Rules
```typescript
// Example: Sanitize parameters
{
  query: "dark fantasy anime" → query: "<text>"
  genres: "1,10,22" → genres: "<3 items>"
  limit: 10 → limit: 10  // numeric OK
  anime_id: 12345 → anime_id: "<id>"  // hide specific IDs
}
```

## Components

### 1. Logger (`src/logger.ts`)
Core logging library used by all 3 MCP servers.

**Usage:**
```typescript
import { AnalyticsLogger } from '../analytics/src/logger';

const logger = new AnalyticsLogger('anime-search-mcp');

// Before tool execution
const callId = logger.startCall({
  sessionId: getSessionId(),
  toolName: 'searchAnime',
  parameters: { query, genres, limit }
});

// After tool execution
logger.endCall(callId, {
  success: true,
  executionTimeMs: 234,
  resultMetadata: { count: 10, truncated: false },
  tokensInput: 150,
  tokensOutput: 800
});
```

### 2. Database Manager (`src/database.ts`)
Handles SQLite operations, migrations, and queries.

- Initialize database schema
- Store tool call events
- Aggregate statistics
- Clean up old data

### 3. Reporting CLI (`src/reports.ts`)
Command-line tool for viewing analytics.

**Commands:**
```bash
# Quick summary
npm run analytics:summary

# Top tools by usage
npm run analytics:top-tools

# Error analysis
npm run analytics:errors

# User journey patterns
npm run analytics:journeys

# Performance report
npm run analytics:performance

# Custom time range
npm run analytics:report -- --from=2025-10-01 --to=2025-10-07

# Export to JSON
npm run analytics:export -- --format=json > report.json
```

### 4. Dashboard (Future - Optional)
Simple web UI for browsing analytics.

```
analytics/dashboard/
├── index.html       # Static HTML + JS
├── api.ts           # Minimal Express server
└── charts.js        # Chart.js visualizations
```

## Integration Points

### MCP Server Integration

Each MCP server imports the logger:

```typescript
// anime-search-mcp/src/server.ts
import { AnalyticsLogger } from '../../analytics/src/logger';

const analytics = new AnalyticsLogger('anime-search-mcp');

// Wrap tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // ... existing code
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const callId = analytics.startCall({
    sessionId: getSessionId(request),
    toolName: request.params.name,
    parameters: request.params.arguments
  });

  try {
    const result = await executeTool(request);

    analytics.endCall(callId, {
      success: true,
      executionTimeMs: Date.now() - startTime,
      resultMetadata: extractMetadata(result),
      tokensInput: estimateTokens(request.params.arguments),
      tokensOutput: estimateTokens(result)
    });

    return result;
  } catch (error) {
    analytics.endCall(callId, {
      success: false,
      executionTimeMs: Date.now() - startTime,
      errorType: classifyError(error),
      errorMessage: error.message
    });

    throw error;
  }
});
```

### Session Tracking

Sessions are tracked automatically:
- Session ID = per-conversation with Claude
- Generated on first tool call in conversation
- Persists across multiple tool calls
- Ends after inactivity timeout (30 min) or explicit end

## Key Metrics & Reports

### 1. Tool Usage Summary
```
MCP Analytics Summary (Last 7 Days)

Total Calls: 1,234
Successful: 1,156 (93.7%)
Failed: 78 (6.3%)
Avg Response Time: 234ms

Top 10 Tools:
┌─────────────────────────────────┬───────┬─────────┬──────────┐
│ Tool                            │ Calls │ Success │ Avg Time │
├─────────────────────────────────┼───────┼─────────┼──────────┤
│ anime-search-mcp/searchAnime    │   345 │  98.5%  │   189ms  │
│ anime-search-mcp/getAnimeDetails│   234 │  99.1%  │   156ms  │
│ mal-user-mcp/mal_get_user_list  │   123 │  95.2%  │   412ms  │
│ ...                             │   ... │   ...   │    ...   │
└─────────────────────────────────┴───────┴─────────┴──────────┘
```

### 2. Error Analysis
```
Top Errors (Last 7 Days)

┌────────────────────────┬───────────────┬───────┬──────────────────┐
│ Tool                   │ Error Type    │ Count │ Example          │
├────────────────────────┼───────────────┼───────┼──────────────────┤
│ getAnimeReviewsDetailed│ timeout       │   12  │ Request timeout  │
│ mal_update_anime       │ auth          │    8  │ Token expired    │
│ searchAnime            │ validation    │    5  │ Invalid genre ID │
└────────────────────────┴───────────────┴───────┴──────────────────┘
```

### 3. User Journey Patterns
```
Common Tool Sequences (Last 7 Days)

45% searchAnime → getAnimeDetails → mal_update_anime
23% searchAnime → (abandoned)
12% getTopAnime → getAnimeDetails
8%  mal_get_user_list → getAnimeDetails
...

Completion Rate: 67% (users who start a flow and finish it)
Abandonment: 23% (searches with no follow-up)
```

### 4. Performance Report
```
Performance Metrics (Last 7 Days)

Slowest Tools:
- getAnimeReception: 1,234ms avg (consider caching)
- mal_get_user_list: 456ms avg (MAL API dependency)
- getAnimeReviewsDetailed: 389ms avg (large payload)

Fastest Tools:
- getAnimeGenres: 12ms avg (cached)
- searchAnime: 156ms avg (database optimized)

Token Usage:
- Total tokens: 1.2M
- Avg per call: 972 tokens
- Most expensive: getAnimeReviewsDetailed (2,345 avg tokens)
```

### 5. Retry Analysis
```
Retry Patterns (Last 7 Days)

Tools with retries:
- searchAnime: 45 calls retried (13% of total)
- mal_update_anime: 12 calls retried (9% of total)

Retry success rate:
- 1st retry: 78% successful
- 2nd retry: 45% successful
- 3+ retries: 12% successful

Insight: After 2 retries, success is unlikely. Consider failing faster.
```

## Development Workflow

### Setup
```bash
cd analytics
npm install
npm run build
npm run migrate  # Initialize database
```

### Testing
```bash
# Generate fake data for testing reports
npm run seed:test-data

# Run reports
npm run analytics:summary
```

### Integration
Each MCP server's `package.json` adds:
```json
{
  "dependencies": {
    "../../analytics": "workspace:*"
  }
}
```

Then import:
```typescript
import { AnalyticsLogger } from '../../analytics';
```

## Configuration

**Environment Variables:**
```bash
ANALYTICS_DB_PATH=./analytics/analytics.db
ANALYTICS_ENABLED=true
ANALYTICS_LOG_LEVEL=info
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_SESSION_TIMEOUT_MIN=30
```

## Maintenance

### Regular Tasks
- Review weekly reports
- Clean up old data (90+ days)
- Optimize slow tools based on metrics
- Update error handling for common failures

### Database Cleanup
```sql
-- Remove events older than 90 days
DELETE FROM tool_calls WHERE timestamp < date('now', '-90 days');

-- Vacuum to reclaim space
VACUUM;
```

## Future Enhancements

### Phase 2
- Web dashboard with charts
- Real-time monitoring
- Alerting (error rate spikes)
- A/B testing support (compare tool versions)

### Phase 3
- Machine learning insights
- Anomaly detection
- Predictive performance modeling
- Integration with external analytics

## Quick Start

1. Build analytics package:
   ```bash
   cd analytics
   npm install && npm run build
   ```

2. Integrate into MCP servers (see `ISSUES.md` for checklist)

3. Run reports:
   ```bash
   npm run analytics:summary
   ```

4. Iterate based on insights!

---

**Key Files:**
- `ISSUES.md` - Implementation plan and roadmap
- `src/schema.sql` - Database schema
- `src/logger.ts` - Core logging library
- `src/reports.ts` - Reporting CLI

**Philosophy:**
- Lightweight, local, privacy-focused
- Actionable insights over vanity metrics
- Easy to integrate, easy to query
- Built for iteration and improvement
