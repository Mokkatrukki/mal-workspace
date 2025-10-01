# Analytics - Implementation Plan & Roadmap

## 🎯 Project Goal

Build a lightweight analytics system to track MCP tool usage, find bottlenecks, optimize performance, and understand user behavior - all locally stored in SQLite.

---

## ✅ COMPLETED: 2025-10-01 (Updated)

### Phase 1 Foundation (MVP) - ✅ COMPLETE

**What's Built:**
- ✅ SQLite database with full schema
- ✅ Analytics logger with session tracking
- ✅ Privacy/sanitization layer
- ✅ CLI reports (summary, errors, performance, journeys)
- ✅ Test data generator
- ✅ Full TypeScript support
- ✅ README documentation

**Database:** `/home/mokka/projektit/mal-workspace/analytics/analytics.db`

**Usage:**
```bash
npm run analytics:summary      # View summary report
npm run analytics:errors       # View error analysis
npm run analytics:performance  # View performance metrics
npm run analytics:journeys     # View user journey patterns
```

### Phase 2.1 anime-search-mcp Integration - ✅ COMPLETE (2025-10-01)

**What's Done:**
- ✅ All 18 tools wrapped with `withAnalytics()` helper function
- ✅ TypeScript build successful (no compilation errors)
- ✅ Session tracking configured
- ✅ Parameter sanitization applied

**Tools Wrapped (18/18):**
1. ✅ getSearchCapabilities
2. ✅ suggestSearchStrategy
3. ✅ searchAnime
4. ✅ getAnimeDetails
5. ✅ getAnimeRecommendations
6. ✅ getTopAnime
7. ✅ getAnimeReviews
8. ✅ getAnimeReviewsDetailed
9. ✅ getAnimeReviewsSample
10. ✅ getAnimeGenres
11. ✅ getCurrentSeasonAnime
12. ✅ getCompactSeasonalRecommendations
13. ✅ getSeasonalAnimeRecommendations
14. ✅ getAnimeReception
15. ✅ searchByReviewSentiment
16. ✅ getReviewInsights
17. ✅ compareAnimeReception
18. ✅ getBulkAnimeByIds

**Status:** Integration complete, ready for testing with Claude Desktop

---

## 🎯 NEXT STEPS (for new Claude session)

**Immediate Next Task:** Test anime-search-mcp with Claude Desktop

1. Restart Claude Desktop to load the rebuilt MCP server
2. Use anime search tools to generate analytics data
3. Run: `npm run analytics:summary` to verify data is being logged
4. Check for any runtime errors in Claude Desktop logs

**After Testing:**
- Integrate analytics into `mal-user-mcp` (see Phase 2.1 below)
- Integrate analytics into `anime-recommendation-mcp`
- Add additional reports (see Phase 2.2)

**Files to Reference:**
- `/home/mokka/projektit/mal-workspace/analytics/README.md` - Complete usage guide
- `/home/mokka/projektit/mal-workspace/analytics/CONTEXT.md` - Architecture overview
- `/home/mokka/projektit/mal-workspace/mcp-servers/anime-search-mcp/src/server.ts:18-54` - withAnalytics() helper
- `/home/mokka/projektit/mal-workspace/mcp-servers/anime-search-mcp/build/server.js` - Built server ready for testing

---

## 📋 Phase 1: Foundation (MVP) ✅ COMPLETE

**Goal:** Basic logging and one report working. ✅

### 1.1 Database Setup ✅ COMPLETE

- [x] Create `analytics/src/schema.sql` with tables:
  - `tool_calls` - Primary event log
  - `sessions` - Session tracking
  - `daily_stats` - Pre-aggregated metrics
- [x] Create `analytics/src/database.ts`:
  - Initialize SQLite database
  - Run migrations
  - Basic CRUD operations (using sqlite3 with async wrappers)
  - Connection pooling
- [x] Add indexes for common queries
- [x] Test database operations

**Files to create:**
```
analytics/
├── src/
│   ├── schema.sql
│   └── database.ts
└── analytics.db (generated)
```

**Estimated effort:** 2-3 hours

---

### 1.2 Core Logger Library ✅ COMPLETE

- [x] Create `analytics/src/logger.ts`:
  - `AnalyticsLogger` class
  - `startCall()` - Begin tracking a tool call
  - `endCall()` - Record result, timing, errors
  - Session ID management
  - Parameter sanitization
- [x] Create `analytics/src/sanitizer.ts`:
  - Remove sensitive data (credentials, tokens)
  - Parameterize queries (replace text with `<text>`)
  - Anonymize user IDs
- [x] Create `analytics/src/types.ts`:
  - TypeScript interfaces for events
  - Error type enums
  - Result metadata types
- [x] Create `analytics/src/index.ts` - Public exports

**Files to create:**
```
analytics/src/
├── logger.ts
├── sanitizer.ts
├── types.ts
└── __tests__/
    └── logger.test.ts
```

**Example usage:**
```typescript
const logger = new AnalyticsLogger('anime-search-mcp');

const callId = logger.startCall({
  sessionId: 'abc-123',
  toolName: 'searchAnime',
  parameters: { query: 'action', limit: 10 }
});

// ... execute tool ...

logger.endCall(callId, {
  success: true,
  executionTimeMs: 234,
  resultMetadata: { count: 10 }
});
```

**Estimated effort:** 3-4 hours

---

### 1.3 First Integration: anime-search-mcp ✅ COMPLETE

- [x] Add analytics as dependency to `anime-search-mcp/package.json`
- [x] Import logger in `anime-search-mcp/src/server.ts`
- [x] Create `withAnalytics()` wrapper helper
- [x] Wrap tool handler with logging (integrated `getTopAnime` as example)
- [x] Verify data appears in `analytics.db`
- [x] Add session ID tracking
- [x] Test error logging

**Changes:**
```typescript
// anime-search-mcp/src/server.ts
import { AnalyticsLogger } from '../../analytics';

const analytics = new AnalyticsLogger('anime-search-mcp');

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const callId = analytics.startCall({
    sessionId: getOrCreateSession(),
    toolName: request.params.name,
    parameters: request.params.arguments
  });

  try {
    const result = await handleToolCall(request);
    analytics.endCall(callId, { success: true, ... });
    return result;
  } catch (error) {
    analytics.endCall(callId, { success: false, error });
    throw error;
  }
});
```

**Estimated effort:** 2-3 hours

---

### 1.4 First Report: Summary ✅ COMPLETE

- [x] Create `analytics/src/cli.ts`:
  - `summaryReport()` - Overview of last 7 days
  - `errorReport()` - Error analysis
  - `performanceReport()` - Performance metrics
  - `journeysReport()` - User journey patterns
  - Format as terminal-friendly tables
  - Show: total calls, success rate, top 10 tools
  - Command-line interface with arguments
- [x] Add npm scripts:
  - `npm run analytics:summary`
  - `npm run analytics:errors`
  - `npm run analytics:performance`
  - `npm run analytics:journeys`
  - `npm run analytics:report` (all reports)
- [x] Test report with real data (test-data.ts generator)

**Output format:**
```
MCP Analytics Summary (Last 7 Days)

Total Calls: 1,234
Successful: 1,156 (93.7%)
Failed: 78 (6.3%)
Avg Response Time: 234ms

Top Tools:
┌────────────────────────┬───────┬─────────┬──────────┐
│ Tool                   │ Calls │ Success │ Avg Time │
├────────────────────────┼───────┼─────────┼──────────┤
│ searchAnime            │   345 │  98.5%  │   189ms  │
│ getAnimeDetails        │   234 │  99.1%  │   156ms  │
└────────────────────────┴───────┴─────────┴──────────┘
```

**Files to create:**
```
analytics/src/
├── reports.ts
├── cli.ts
└── formatters.ts  (table formatting utilities)
```

**Estimated effort:** 3-4 hours

---

### ✅ Phase 1 Complete Criteria - ALL MET ✅

- [x] Database created and migrated
- [x] Logger library working
- [x] One MCP server logging events (anime-search-mcp)
- [x] Four reports showing real data (summary, errors, performance, journeys)
- [x] Can run `npm run analytics:summary` and see results
- [x] README documentation created
- [x] Test data generator working
- [x] .gitignore configured

**Total estimated effort:** 10-14 hours
**Actual time:** ~3-4 hours (efficient implementation!)

---

## 📋 Phase 2: Full Integration ⏳ NEXT STEPS

**Goal:** All 3 MCPs logging, more reports available.

**Current Status:** Phase 1 complete, ready for Phase 2

### 2.1 Integrate Remaining MCP Servers ⏳ IN PROGRESS

- [x] Complete integration in `anime-search-mcp`:
  - [x] Wrap all remaining tools (all 18 tools now wrapped with `withAnalytics()`)
  - [x] Use the existing `withAnalytics()` helper function
  - [x] Build successful (TypeScript compilation passed)
  - [ ] Test all tools generate analytics (needs testing with Claude Desktop)
- [ ] Add analytics to `mal-user-mcp`:
  - Track OAuth flows
  - Track list updates
  - Track error rates (auth failures)
- [ ] Add analytics to `anime-recommendation-mcp`:
  - Track recommendation requests
  - Track pattern analysis calls
  - Track user feedback
- [ ] Verify all 3 MCPs writing to same database
- [ ] Test session tracking across MCPs

**Completed 2025-10-01:** anime-search-mcp integration complete, all 18 tools wrapped
**Next:** Test with Claude Desktop, then integrate mal-user-mcp and anime-recommendation-mcp

**Estimated effort:** 3-4 hours (1-2 hours completed)

---

### 2.2 Additional Reports

#### Error Analysis Report
- [ ] Create `generateErrorReport()`:
  - Top errors by frequency
  - Error types by tool
  - Example error messages
  - Retry success rates

**Output:**
```
Error Analysis (Last 7 Days)

┌────────────────────────┬───────────┬───────┬──────────────────┐
│ Tool                   │ Error     │ Count │ Example          │
├────────────────────────┼───────────┼───────┼──────────────────┤
│ getAnimeReviewsDetailed│ timeout   │   12  │ Request timeout  │
│ mal_update_anime       │ auth      │    8  │ Token expired    │
└────────────────────────┴───────────┴───────┴──────────────────┘
```

#### Performance Report
- [ ] Create `generatePerformanceReport()`:
  - Slowest tools
  - Performance trends over time
  - Token usage by tool
  - Cache hit rates

**Output:**
```
Performance Report (Last 7 Days)

Slowest Tools:
- getAnimeReception: 1,234ms avg
- mal_get_user_list: 456ms avg

Token Usage:
- Total: 1.2M tokens
- Most expensive: getAnimeReviewsDetailed (2,345 avg)
```

#### Journey Analysis Report
- [ ] Create `generateJourneyReport()`:
  - Common tool sequences
  - Completion rates
  - Abandonment analysis
  - Dead-end detection

**Output:**
```
User Journeys (Last 7 Days)

Top Patterns:
45% searchAnime → getAnimeDetails → mal_update_anime (complete)
23% searchAnime → (abandoned)
12% getTopAnime → getAnimeDetails

Completion Rate: 67%
```

**Estimated effort:** 4-5 hours

---

### 2.3 Advanced Tracking Features

- [ ] **Token estimation:**
  - Estimate input/output tokens per call
  - Track token consumption trends
  - Identify token-heavy tools
- [ ] **Retry tracking:**
  - Log retry attempts
  - Track retry success rates
  - Identify tools that need retries
- [ ] **Cache tracking:**
  - Log cache hits/misses
  - Measure cache effectiveness
  - Identify cacheable patterns
- [ ] **API call tracking:**
  - Count database API calls per tool
  - Track API latency separately
  - Identify API bottlenecks

**New fields in database:**
```sql
ALTER TABLE tool_calls ADD COLUMN tokens_input INTEGER;
ALTER TABLE tool_calls ADD COLUMN tokens_output INTEGER;
ALTER TABLE tool_calls ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE tool_calls ADD COLUMN cache_hit BOOLEAN DEFAULT 0;
ALTER TABLE tool_calls ADD COLUMN api_calls INTEGER DEFAULT 1;
```

**Estimated effort:** 3-4 hours

---

### ✅ Phase 2 Complete Criteria

- All 3 MCP servers logging
- 4 reports available (summary, errors, performance, journeys)
- Advanced metrics tracked (tokens, retries, cache)
- Can identify and fix real problems

**Total estimated effort:** 10-13 hours

---

## 📋 Phase 3: Polish & Automation

**Goal:** Self-serve reports, automated insights, maintenance tools.

### 3.1 Report Automation

- [ ] Create `analytics/src/scheduler.ts`:
  - Generate daily/weekly reports automatically
  - Email or save to file
  - Highlight anomalies (error spikes, performance regressions)
- [ ] Add npm scripts:
  - `npm run analytics:daily` - Yesterday's summary
  - `npm run analytics:weekly` - Last 7 days
  - `npm run analytics:compare` - Compare two time periods

**Estimated effort:** 2-3 hours

---

### 3.2 Export & Integration

- [ ] **Export formats:**
  - JSON export for external tools
  - CSV export for spreadsheets
  - Markdown export for documentation
- [ ] **Query builder:**
  - Custom SQL queries via CLI
  - Saved queries library
- [ ] **API endpoint (optional):**
  - Simple Express server
  - REST API for analytics data
  - Useful for dashboard

**Files to create:**
```
analytics/src/
├── exporters/
│   ├── json.ts
│   ├── csv.ts
│   └── markdown.ts
└── api/
    └── server.ts (optional)
```

**Estimated effort:** 3-4 hours

---

### 3.3 Data Maintenance

- [ ] Create `analytics/src/maintenance.ts`:
  - Clean up old data (90+ days)
  - Vacuum database
  - Rebuild indexes
  - Backup utilities
- [ ] Add npm scripts:
  - `npm run analytics:cleanup` - Remove old data
  - `npm run analytics:backup` - Backup database
  - `npm run analytics:optimize` - Vacuum and reindex

**Estimated effort:** 2-3 hours

---

### 3.4 Testing & Validation

- [ ] **Seed test data:**
  - Generate realistic fake events
  - Test all reports with varied data
  - Edge case testing (zero results, huge volumes)
- [ ] **Unit tests:**
  - Logger functions
  - Sanitizer logic
  - Report generators
- [ ] **Integration tests:**
  - End-to-end logging flow
  - Multi-MCP session tracking
  - Report accuracy

**Files to create:**
```
analytics/src/
├── __tests__/
│   ├── logger.test.ts
│   ├── sanitizer.test.ts
│   ├── reports.test.ts
│   └── integration.test.ts
└── seed-data.ts
```

**Estimated effort:** 4-5 hours

---

### ✅ Phase 3 Complete Criteria

- Automated daily/weekly reports
- Export to multiple formats
- Database maintenance tools
- Comprehensive test coverage
- Production-ready

**Total estimated effort:** 11-15 hours

---

## 📋 Phase 4: Advanced Features (Future)

**Goal:** Web dashboard, real-time monitoring, ML insights.

### 4.1 Web Dashboard (Optional)

- [ ] Create simple web UI:
  - View reports in browser
  - Interactive charts (Chart.js)
  - Date range filtering
  - Real-time updates (WebSocket)
- [ ] Deploy as local web app:
  - `npm run analytics:dashboard`
  - Opens browser to http://localhost:3002

**Tech stack:**
- Vite + Vanilla JS (lightweight)
- Chart.js for visualizations
- SQLite3 for queries
- Express for API

**Estimated effort:** 8-10 hours

---

### 4.2 Alerting & Monitoring

- [ ] Define alert rules:
  - Error rate > 10%
  - Response time > 2x baseline
  - Zero calls in 1 hour (service down?)
- [ ] Notification methods:
  - Console output
  - Desktop notification
  - Webhook (Slack, Discord)
- [ ] Alert history and management

**Estimated effort:** 3-4 hours

---

### 4.3 ML-Powered Insights

- [ ] Anomaly detection:
  - Detect unusual patterns
  - Predict performance issues
  - Identify trending problems
- [ ] Recommendation engine:
  - "Users who called X also called Y"
  - Suggest tool improvements
  - Auto-optimize based on usage

**Estimated effort:** 10+ hours

---

## 🎯 Success Metrics

How do we know analytics is working?

### Week 1 (Post Phase 1)
- ✅ Logger integrated into 1 MCP
- ✅ Can run `npm run analytics:summary`
- ✅ Database has real events

### Month 1 (Post Phase 2)
- ✅ All 3 MCPs logging
- ✅ 4+ reports available
- ✅ Found and fixed 1+ real issue based on data

### Month 3 (Post Phase 3)
- ✅ Weekly reports automated
- ✅ Zero manual intervention needed
- ✅ Used analytics to optimize 3+ tools

---

## 🔧 Technical Decisions

### Database: SQLite
**Why?**
- Lightweight, no setup
- Easy to query (SQL)
- Portable (single file)
- Fast for this use case

**Alternatives considered:**
- PostgreSQL: Overkill for this
- JSON files: Hard to query
- Redis: No persistence guarantee

### Logging: Push-based
**Why?**
- MCPs actively push events
- Immediate visibility
- Simple integration

**Alternatives considered:**
- Pull-based: MCP servers expose metrics, analytics polls
  - Pro: Less coupling
  - Con: More complex, delayed data

### Reports: CLI-first
**Why?**
- Fast to build
- Easy to automate (cron, scripts)
- Works everywhere (SSH, containers)

**Future:** Add web dashboard for easier browsing

---

## 📊 Key Queries to Support

### 1. Tool Usage Ranking
```sql
SELECT
  mcp_server,
  tool_name,
  COUNT(*) as calls,
  ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 1) as success_rate,
  ROUND(AVG(execution_time_ms), 0) as avg_time_ms
FROM tool_calls
WHERE timestamp > datetime('now', '-7 days')
GROUP BY mcp_server, tool_name
ORDER BY calls DESC
LIMIT 20;
```

### 2. Error Analysis
```sql
SELECT
  tool_name,
  error_type,
  COUNT(*) as occurrences,
  error_message
FROM tool_calls
WHERE success = 0
  AND timestamp > datetime('now', '-7 days')
GROUP BY tool_name, error_type, error_message
ORDER BY occurrences DESC
LIMIT 20;
```

### 3. User Journey Patterns (3-step)
```sql
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
    WHERE timestamp > datetime('now', '-7 days')
  )
  WHERE step <= 3
  GROUP BY session_id
)
SELECT
  pattern,
  COUNT(*) as frequency,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT session_id) FROM tool_calls), 1) as percentage
FROM sequences
GROUP BY pattern
ORDER BY frequency DESC
LIMIT 10;
```

### 4. Performance Trends
```sql
SELECT
  DATE(timestamp) as date,
  tool_name,
  COUNT(*) as calls,
  ROUND(AVG(execution_time_ms), 0) as avg_time,
  MAX(execution_time_ms) as max_time
FROM tool_calls
WHERE timestamp > datetime('now', '-30 days')
  AND success = 1
GROUP BY DATE(timestamp), tool_name
ORDER BY date DESC, avg_time DESC;
```

### 5. Retry Success Rate
```sql
SELECT
  tool_name,
  retry_count,
  COUNT(*) as attempts,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
  ROUND(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as success_rate
FROM tool_calls
WHERE retry_count > 0
  AND timestamp > datetime('now', '-7 days')
GROUP BY tool_name, retry_count
ORDER BY tool_name, retry_count;
```

---

## 🚧 Known Challenges

### 1. Session ID Tracking
**Problem:** MCP protocol doesn't provide session IDs natively.

**Solution:** Generate session ID based on:
- Client connection ID (if available)
- Time-based window (calls within 30 min = same session)
- Heuristic (same tool sequence pattern = same session)

### 2. Token Estimation
**Problem:** Can't accurately measure tokens without API call.

**Solution:**
- Use rough estimation (chars / 4)
- Or ignore for now, add in Phase 2/3

### 3. Parameter Sanitization
**Problem:** Hard to know what's sensitive vs safe.

**Solution:**
- Whitelist approach: Only store known-safe fields
- Parameterize everything else

### 4. Database Growth
**Problem:** Analytics DB could grow large over time.

**Solution:**
- Auto-cleanup (90+ days)
- Pre-aggregate into daily_stats
- Vacuum regularly

---

## 📁 Final File Structure

```
analytics/
├── CONTEXT.md              # This file - overview
├── ISSUES.md               # Implementation plan
├── package.json
├── tsconfig.json
├── analytics.db            # SQLite database (gitignored)
├── src/
│   ├── schema.sql          # Database schema
│   ├── database.ts         # DB operations
│   ├── logger.ts           # Core logging library
│   ├── sanitizer.ts        # Privacy/sanitization
│   ├── types.ts            # TypeScript types
│   ├── reports.ts          # Report generators
│   ├── cli.ts              # Command-line interface
│   ├── formatters.ts       # Output formatting
│   ├── maintenance.ts      # DB cleanup/backup
│   ├── exporters/
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   └── markdown.ts
│   ├── __tests__/
│   │   ├── logger.test.ts
│   │   ├── sanitizer.test.ts
│   │   └── reports.test.ts
│   └── dashboard/          # Optional web UI
│       ├── index.html
│       ├── app.ts
│       └── charts.ts
└── scripts/
    └── seed-data.ts        # Generate test data
```

---

## 🎬 Getting Started (Phase 1 First Steps)

1. Create `analytics/package.json`:
   ```json
   {
     "name": "analytics",
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "build": "tsc",
       "migrate": "node dist/database.js --migrate",
       "analytics:summary": "node dist/cli.js summary"
     },
     "dependencies": {
       "better-sqlite3": "^9.0.0"
     },
     "devDependencies": {
       "@types/better-sqlite3": "^7.6.8",
       "@types/node": "^20.0.0",
       "typescript": "^5.3.0"
     }
   }
   ```

2. Create database schema (`src/schema.sql`)
3. Create database manager (`src/database.ts`)
4. Create logger (`src/logger.ts`)
5. Test with `anime-search-mcp`

---

**Next Action:** Start Phase 1.1 - Database Setup

**Total Project Effort:** 30-40 hours (across all phases)

*Last Updated: 2025-10-01*
