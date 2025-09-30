# anime-search-mcp - Context

**AI-Powered Anime Search & Discovery for Claude**

## What Is This?

MCP (Model Context Protocol) server that lets Claude search, browse, and analyze anime from your local database. It's the main search engine that Claude uses to help you find anime.

## One-Liner

Exposes anime database as AI-friendly tools → Claude can search anime, get recommendations, analyze reviews, and understand sentiment patterns.

## What It Does

When you ask Claude "Find me action anime from 2023", this MCP server:
1. Takes the request
2. Queries your local anime database
3. Returns results in AI-friendly format
4. Claude shows you the results naturally

**Key Features**:
- 🔍 Advanced search (by title, genre, year, score)
- 📊 Review analysis with sentiment scoring
- 🎯 Reception analysis (find polarizing/underrated anime)
- 📈 Seasonal anime discovery
- 🎨 Multiple response formats (compact format saves 94% tokens!)
- 💡 Smart fallback strategies when searches fail

## Tools Provided to Claude

### Search & Discovery
- `searchAnime` - Main search with filters
- `getAnimeDetails` - Detailed info for specific anime
- `getTopAnime` - Popular and trending lists
- `getAnimeGenres` - List all available genres
- `getBulkAnimeByIds` - Get multiple anime at once (perfect for MAL lists)

### Seasonal & Current
- `getCurrentSeasonAnime` - What's airing now
- `getCompactSeasonalRecommendations` - Any season/year (ultra-compact)
- `getSeasonalAnimeRecommendations` - Legacy (full format)

### Reviews & Sentiment
- `getAnimeReviews` - Review summary (ALWAYS USE THIS FIRST)
- `getAnimeReviewsSample` - 10 balanced reviews with full text
- `getAnimeReviewsDetailed` - All reviews (heavy, use sparingly)
- `getAnimeReception` - Sentiment analysis & polarization
- `searchByReviewSentiment` - Find by emotional patterns
- `compareAnimeReception` - Compare two anime
- `getReviewInsights` - Database-wide sentiment insights

### Utility
- `getSearchCapabilities` - Show all available search options
- `suggestSearchStrategy` - AI suggests optimal search parameters
- `getAnimeRecommendations` - Similar anime suggestions

## Current Status

⚠️ **USING LEGACY API** - Currently connects to:
- `http://localhost:3001/api/anime/*` (old endpoints)
- Should migrate to: `http://localhost:3001/api/v1/*`

## API Endpoints Used

**Current (Legacy)**:
```typescript
const LOCAL_API_BASE = "http://localhost:3001/api/anime";
```

**Target (v1)**:
```typescript
// Should be updated to:
const API_BASE = "http://localhost:3001/api/v1";
```

## Directory Structure

```
anime-search-mcp/
├── src/
│   └── server.ts           # Main MCP server (3500+ lines!)
├── build/
│   └── server.js           # Compiled JavaScript
├── package.json
└── tsconfig.json
```

**Note**: Entire server is in one file (`server.ts`). Could benefit from splitting into modules.

## Technology Stack

- **MCP SDK**: @modelcontextprotocol/sdk
- **Runtime**: Node.js + TypeScript
- **Data Source**: Local database via Express API
- **Transport**: stdio (standard input/output)

## How It Works

```
Claude Desktop
    ↓ (asks: "find action anime")
MCP Protocol (stdio)
    ↓
anime-search-mcp server.ts
    ↓
HTTP fetch to localhost:3001/api/anime/*
    ↓
own-mal-db Express API
    ↓
PostgreSQL database
    ↓
Results back to Claude
```

## Response Formats

**Compact Format** (default for most tools):
```json
{
  "id": 20,
  "t": "Naruto",
  "sc": 7.98,
  "g": ["Action", "Comedy"]
}
```

**Clean Format**:
```json
{
  "id": 20,
  "title": "Naruto",
  "score": 7.98,
  "genres": ["Action", "Comedy"]
}
```

**Standard Format** (full database fields)

The compact format saves 94% of tokens - perfect for AI!

## Key Features

### Smart Search
- Full-text search with ranking
- Multiple filters (genre, year, score, type, status)
- Sort by any field
- Pagination support

### Sentiment Analysis
- Reviews analyzed for emotional content
- Find polarizing anime (love it or hate it)
- Discover underrated gems
- Compare reception between anime

### Seasonal Discovery
- Current season anime
- Any past/future season
- Continuing vs new anime
- Ultra-compact format option

### Intelligent Fallbacks
When search fails, automatically:
- Suggests related searches
- Provides genre alternatives
- Recommends parameter adjustments
- Explains why search failed

## Commands

```bash
# Development
npm run dev              # Start with nodemon (hot reload)
npm run build            # Compile TypeScript
npm start                # Start production server

# Testing
npm run test             # Test with MCP inspector

# Use in Claude Desktop
# Add to ~/.config/claude/claude_desktop_config.json
```

## Configuration

**Environment**: None needed (uses hardcoded localhost:3001)

**Claude Desktop Config**:
```json
{
  "mcpServers": {
    "anime-search": {
      "command": "node",
      "args": ["/path/to/mal-workspace/mcp-servers/anime-search-mcp/build/server.js"]
    }
  }
}
```

## Dependencies

**Database Requirements**:
- `own-mal-db` must be running on port 3001
- Database must have anime data (5,900+ anime)
- Reviews table needed for sentiment features

## Integration Points

**Used by**:
- Claude Desktop (primary user)
- Chat client (testing)
- Any MCP-compatible AI assistant

**Depends on**:
- `own-mal-db` API (must be running)

## Example Usage

**In Claude Desktop**:
- "Find action anime from 2023"
- "What's airing this season?"
- "Find underrated psychological thriller anime"
- "Compare reception of Naruto and One Piece"
- "Show me polarizing anime with high scores"

## Performance Notes

- Compact format reduces token usage by 94%
- `getBulkAnimeByIds` fetches multiple anime in one call
- Review summaries avoid loading full text unnecessarily
- Fallback strategies prevent repeated failed searches

## Known Quirks

1. **Single File**: Entire server in `server.ts` (3500+ lines)
2. **Legacy API**: Uses old `/api/anime/*` endpoints
3. **Hardcoded URL**: API base URL not configurable via env
4. **No Caching**: Every request hits the database
5. **Limited Error Context**: Some API errors not fully exposed to Claude

## Troubleshooting

**MCP server won't start?**
```bash
# Check if built
npm run build
node build/server.js

# Test database connection
curl http://localhost:3001/api/anime?limit=1
```

**Claude can't find anime?**
- Check database has data: `curl http://localhost:3001/api/anime?limit=5`
- Verify API is running: `curl http://localhost:3001`
- Check Claude Desktop logs for errors

**Tool not working?**
- Restart Claude Desktop after rebuilding
- Check MCP inspector: `npm run test`
- Verify tool name matches what Claude sees

## Related Files

- `../../database/own-mal-db/CONTEXT.md` - API this connects to
- `../../database/own-mal-db/ISSUES.md` - API migration info
- `./ISSUES.md` - Known issues and planned improvements
- `../../ARCHITECTURE.md` - Overall system design
