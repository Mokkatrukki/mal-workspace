# Current Issues

## Active Issues (2025-09-30)

### 1. anime-recommendation MCP Server Connection Fixed ✅
**Status**: FIXED (2025-09-30)
**Location**: `mcp-servers/anime-recommendation-mcp`
**Solution Applied**:
- Converted from CommonJS to ES modules (`"type": "module"`)
- Updated TypeScript config to use `"module": "NodeNext"`
- Migrated from old `Server` class to new `McpServer` class from `@modelcontextprotocol/sdk/server/mcp.js`
- Updated tool registration to use `.tool()` method instead of request handlers
- Removed incompatible `onerror` handler

**Root Cause**:
The server was using an outdated MCP SDK API pattern (CommonJS + old Server class) while the working anime-search-mcp used the newer ES module pattern with McpServer class. This caused connection failures in Claude Desktop.

---

### 2. anime-search MCP Minor Fetch Warning ⚠️
**Status**: Partially Working
**Location**: `mcp-servers/anime-search-mcp`
**Error**:
```
Failed to get search capabilities: fetch failed
```

**Impact**: Basic functions work, but full capabilities unavailable
**What Works**:
- ✅ searchAnime
- ✅ getAnimeDetails
- ✅ getTopAnime
- ✅ getSeasonalAnimeRecommendations
- ✅ getAnimeRecommendations
- ✅ getAnimeReviews
- ✅ getAnimeGenres

---

## Working Components ✅

### MCP Servers Status
1. ✅ **mal-user-mcp** - Fully authenticated and working
   - Token expires: 10/24/2025
   - Can get user info, anime list, update/remove anime

2. ⚠️ **anime-search-mcp** - Working with minor warning
   - All basic functions operational
   - Fetch warning can be ignored for now

3. ✅ **anime-recommendation-mcp** - Fixed and working
   - Converted to ES modules matching anime-search-mcp pattern
   - Now using McpServer class from modern MCP SDK

### Database & API
- ✅ PostgreSQL 16 running (port 5433)
- ✅ All 8 tables created and migrated
- ✅ Database seeded with 37 genres and 26 studios
- ✅ API server can run on port 3001

---

## Environment

- **Node.js**: v24.8.0
- **Database**: PostgreSQL 16 (port 5433)
- **API Port**: 3001
- **Platform**: Linux 6.12.48-1-MANJARO