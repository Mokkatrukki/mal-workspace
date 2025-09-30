# MAL Workspace - Context for Claude

**Start here every conversation** - This gives you the big picture.

## What Is This?

A complete MyAnimeList (MAL) data ecosystem with AI-powered anime recommendations. Think of it as your personal anime database + search engine + recommendation system + MAL account manager - all designed to work with AI assistants like Claude.

## The 30-Second Summary

You scrape anime data from MAL → store it in PostgreSQL → expose it through MCP servers → Claude (or other AI) can search anime, manage your MAL list, and give personalized recommendations → You can also test it with a chat client.

```
Jikan API → Scrapers → PostgreSQL → MCP Servers → Claude Desktop / Chat Client
                                         ↓
                                   AI Recommendations
```

## Project Structure

```
mal-workspace/
├── database/own-mal-db/           # PostgreSQL DB + REST API (5.9K anime, 111K reviews)
├── mcp-servers/                   # AI assistant tools (MCP = Model Context Protocol)
│   ├── anime-search-mcp/         # Search, filter, browse anime
│   ├── mal-user-mcp/             # Manage your MAL account (OAuth)
│   └── anime-recommendation-mcp/ # Smart recommendations with learning
└── chat-client/                   # CLI to test everything
```

## The Five Components

| Component | What It Does | One-Liner |
|-----------|-------------|-----------|
| **own-mal-db** | PostgreSQL database + API | Your personal anime data warehouse |
| **anime-search-mcp** | Search & browse tools | "Hey Claude, find me action anime from 2023" |
| **mal-user-mcp** | MAL account integration | "Add this to my watchlist" |
| **anime-recommendation-mcp** | Smart recommendations | Learns your taste, recommends based on mood |
| **chat-client** | Testing interface | Interactive CLI to try everything |

## Current Status

- ✅ Database has 5,900+ anime with 111,000+ reviews
- ✅ All 3 MCP servers working and connected to Claude Desktop
- ✅ Chat client can test all functionality
- 🔨 Recommendation engine is in active development (pattern learning system)

## Quick Start

```bash
# Start database
npm run docker:up
npm run db:dev

# Build all MCP servers
npm run mcp:build-all

# Test with chat client
npm run dev:chat

# Or add to Claude Desktop config:
~/.config/claude/claude_desktop_config.json
```

## When Working On Specific Components

Each component has its own **CONTEXT.md** and **ISSUES.md**:

- Read `database/own-mal-db/CONTEXT.md` when working on the database
- Read `mcp-servers/anime-search-mcp/CONTEXT.md` when working on search
- Read `mcp-servers/mal-user-mcp/CONTEXT.md` when working on MAL integration
- Read `mcp-servers/anime-recommendation-mcp/CONTEXT.md` when working on recommendations
- Read `chat-client/CONTEXT.md` when working on the test client

## The Flow

1. **Data Collection**: Scrapers pull from Jikan API → PostgreSQL
2. **Data Access**: MCP servers expose data as tools for AI
3. **AI Integration**: Claude uses tools to help users find/manage anime
4. **User Interface**: Chat client or Claude Desktop

## Key Technologies

- **Language**: TypeScript
- **Database**: PostgreSQL 16 (anime data) + SQLite (user preferences)
- **MCP SDK**: @modelcontextprotocol/sdk (AI tool protocol)
- **API**: Express REST API
- **Runtime**: Node.js 18+

## Important Files

- `ARCHITECTURE.md` - Deep technical architecture
- `QUICKSTART.md` - Fast setup guide (see next task)
- `package.json` - Workspace commands (npm run scripts)
- `docker-compose.yml` - Database containers

## Data Highlights

- **5,900+ anime** with full metadata (titles, genres, episodes, scores)
- **111,000+ reviews** with sentiment analysis
- **Reception data** - polarization scores, sentiment patterns
- **Seasonal tracking** - current and upcoming anime

## Development Philosophy

- **Monorepo**: Everything in one place, easy to find
- **MCP-first**: Built for AI assistants from the ground up
- **Local-first**: Your data, your control (no external API dependencies)
- **Learning system**: Recommendation engine learns from your feedback

## What Makes This Special?

1. **Complete data ownership** - You control the database
2. **AI-native** - Built specifically for AI assistants
3. **Smart recommendations** - Not just "similar anime", learns your emotional preferences
4. **Real MAL integration** - Actually updates your MAL account
5. **Pattern discovery** - Finds emotional patterns in reviews to understand appeal

## Need More Detail?

- Full architecture → `ARCHITECTURE.md`
- Component specifics → Each folder's `CONTEXT.md`
- Known issues → Each folder's `ISSUES.md`
- Setup instructions → `QUICKSTART.md` (coming next)
