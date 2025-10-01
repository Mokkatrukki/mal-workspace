# MCP Analytics

**Track what works, fix what doesn't** - Lightweight analytics for MCP tool usage.

## What's Built (Phase 1 - MVP Complete ✅)

### Core System
- ✅ **SQLite Database** - Stores tool calls, sessions, and metrics
- ✅ **Analytics Logger** - Easy integration for MCP servers
- ✅ **Privacy Layer** - Sanitizes sensitive data automatically
- ✅ **Session Tracking** - Groups related tool calls
- ✅ **CLI Reports** - View analytics from terminal

### Database Schema
- `tool_calls` - Every tool call recorded with timing, success/failure, errors
- `sessions` - Groups of related calls with outcomes
- `daily_stats` - Pre-aggregated metrics (future use)

### Integration Status
- ✅ **anime-search-mcp** - Integrated (`getTopAnime` tool instrumented as example)
- ⏳ **mal-user-mcp** - Not yet integrated
- ⏳ **anime-recommendation-mcp** - Not yet integrated

## Quick Start

### 1. Install Dependencies
```bash
cd analytics
npm install
npm run build
```

### 2. Run Database Migrations
```bash
npm run migrate
```

### 3. Integrate into MCP Server
Add to your MCP server's `package.json`:
```json
{
  "dependencies": {
    "analytics": "file:../../analytics"
  }
}
```

Then in your server code:
```typescript
import { AnalyticsLogger } from 'analytics';

const analytics = new AnalyticsLogger('your-mcp-server-name', {
  dbPath: '../../analytics/analytics.db'
});

let sessionId = AnalyticsLogger.generateSessionId();

// Wrap tool execution
server.tool("yourTool", schema, async (params) => {
  const callId = analytics.startCall({
    sessionId,
    toolName: "yourTool",
    parameters: params
  });

  const startTime = Date.now();

  try {
    const result = await yourToolLogic(params);

    analytics.endCall(callId, {
      success: true,
      executionTimeMs: Date.now() - startTime
    });

    return result;
  } catch (error) {
    analytics.endCall(callId, {
      success: false,
      executionTimeMs: Date.now() - startTime,
      errorMessage: error.message
    });

    throw error;
  }
});
```

## View Reports

### Summary Report (Default)
```bash
npm run analytics:summary       # Last 7 days
npm run analytics:summary 30    # Last 30 days
```

Output:
```
📊 MCP Analytics Summary (Last 7 Days)

Total Calls:     5
Successful:      4 (80.0%)
Failed:          1 (20.0%)
Avg Response:    106ms
Total Tokens:    1,050

Top Tools:
─────────────────────────────────────────────────
Tool                     │ Calls │ Success │ Time
─────────────────────────────────────────────────
anime-search/searchAnime │ 2     │ 50.0%   │ 100ms
anime-search/getTopAnime │ 1     │ 100.0%  │ 200ms
```

### Error Analysis
```bash
npm run analytics:errors
```

### Performance Metrics
```bash
npm run analytics:performance
```

### User Journey Patterns
```bash
npm run analytics:journeys
```

### Full Report (All of the Above)
```bash
npm run analytics:report
```

## Test Data

Generate sample data for testing:
```bash
node dist/test-data.js
```

## Configuration

Environment variables:
```bash
ANALYTICS_DB_PATH=./analytics.db          # Database location
ANALYTICS_ENABLED=true                     # Enable/disable analytics
ANALYTICS_LOG_LEVEL=info                   # debug, info, warn, error
ANALYTICS_RETENTION_DAYS=90                # Data retention period
```

## Database Location

The analytics database is stored at:
```
/home/mokka/projektit/mal-workspace/analytics/analytics.db
```

All MCP servers should point to this shared database for unified analytics.

## Privacy & Security

### What We Track
✅ Tool names and call patterns
✅ Parameter types/structure (NOT actual values for sensitive fields)
✅ Timing and performance metrics
✅ Error types and messages (sanitized)
✅ Aggregated statistics

### What We DON'T Track
❌ User credentials or auth tokens
❌ Full review text or user-generated content
❌ Personally identifiable information
❌ MAL usernames or email addresses
❌ Sensitive search queries (parameterized only)

### Sanitization Rules
- Passwords, tokens, secrets → `<redacted>`
- Search queries → `<text>`
- User IDs → `<id>`
- Long strings → `<long_text>`
- Arrays → `<N items>`

## Next Steps (Phase 2)

- [ ] Integrate into `mal-user-mcp`
- [ ] Integrate into `anime-recommendation-mcp`
- [ ] Create additional reports (journeys, retry analysis)
- [ ] Add export functionality (JSON, CSV)
- [ ] Database cleanup/maintenance scripts
- [ ] Optional: Web dashboard

## Files Structure

```
analytics/
├── src/
│   ├── schema.sql          # Database schema
│   ├── database.ts         # DB manager
│   ├── logger.ts           # Analytics logger
│   ├── sanitizer.ts        # Privacy layer
│   ├── types.ts            # TypeScript types
│   ├── cli.ts              # Report CLI
│   ├── index.ts            # Public API
│   └── test-data.ts        # Test data generator
├── dist/                   # Compiled JS
├── analytics.db            # SQLite database
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

**Database not found?**
```bash
npm run migrate
```

**No data showing?**
```bash
# Generate test data
node dist/test-data.js

# Check database
sqlite3 analytics.db "SELECT COUNT(*) FROM tool_calls;"
```

**Integration not working?**
- Make sure MCP server has `analytics` dependency installed
- Check database path is correct (relative to MCP server location)
- Verify `npm run build` was run in analytics directory
