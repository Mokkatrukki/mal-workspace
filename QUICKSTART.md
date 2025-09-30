# Quick Start Guide

Get everything running in 5 minutes.

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- npm

## 1. Clone & Install (30 seconds)

```bash
cd /home/mokka/projektit/mal-workspace
npm install
```

## 2. Start Database (1 minute)

```bash
# Start PostgreSQL container
npm run docker:up

# Run migrations
npm run db:migrate

# Start API server
npm run db:dev
```

API now running at: `http://localhost:3001`

## 3. Test It Works (30 seconds)

```bash
# Check if database is up
docker ps

# Test API
curl http://localhost:3001/api/anime?limit=1
```

## 4. Build MCP Servers (1 minute)

```bash
npm run mcp:build-all
```

## 5. Try Chat Client (30 seconds)

```bash
npm run dev:chat
```

You'll see an interactive menu to search anime, get recommendations, etc.

## OR: Connect to Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "anime-search": {
      "command": "node",
      "args": ["/home/mokka/projektit/mal-workspace/mcp-servers/anime-search-mcp/build/server.js"]
    },
    "mal-user": {
      "command": "node",
      "args": ["/home/mokka/projektit/mal-workspace/mcp-servers/mal-user-mcp/build/server.js"]
    },
    "anime-recommendation": {
      "command": "node",
      "args": ["/home/mokka/projektit/mal-workspace/mcp-servers/anime-recommendation-mcp/build/server.js"]
    }
  }
}
```

Restart Claude Desktop. You can now ask: "Search for action anime from 2023"

## Essential Commands

### Database

```bash
npm run docker:up         # Start PostgreSQL
npm run docker:down       # Stop PostgreSQL
npm run db:dev            # Start API server
npm run db:migrate        # Run migrations
npm run scraper:anime     # Scrape more anime data
npm run scraper:reviews   # Scrape reviews
```

### MCP Servers

```bash
npm run mcp:build-all           # Build all servers
npm run mcp:anime-search        # Start anime-search server
npm run mcp:mal-user            # Start mal-user server
npm run mcp:recommendation      # Start recommendation server
```

### Chat Client

```bash
npm run dev:chat          # Start interactive chat
```

### Useful Checks

```bash
# Database stats
npm run scraper:check-stats

# Database status
docker exec -it mal-db-container psql -U mal_user -d mal_db -c "\dt"

# Test API
curl http://localhost:3001/api/anime/clean/20
```

## Troubleshooting

**Database won't start?**
```bash
npm run docker:down
npm run docker:up
```

**Port 3001 in use?**
```bash
# Change PORT in database/own-mal-db/.env
PORT=3002
```

**MCP server build fails?**
```bash
cd mcp-servers/[server-name]
npm install
npm run build
```

**Chat client can't connect?**
```bash
# Make sure all MCP servers are built
npm run mcp:build-all

# Check paths in chat-client/src/index.ts
```

## Next Steps

1. **More data?** Run scrapers: `npm run scraper:anime`
2. **MAL integration?** Set up OAuth in `mcp-servers/mal-user-mcp/.env`
3. **Development?** Read component-specific `CONTEXT.md` files
4. **Issues?** Check component-specific `ISSUES.md` files

## File Structure Quick Reference

```
mal-workspace/
├── database/own-mal-db/          # Work here for DB/API changes
├── mcp-servers/
│   ├── anime-search-mcp/        # Work here for search features
│   ├── mal-user-mcp/            # Work here for MAL account features
│   └── anime-recommendation-mcp/ # Work here for recommendation engine
└── chat-client/                  # Work here for testing client
```

Each folder has:
- `CONTEXT.md` - What it does, how it works
- `ISSUES.md` - Known bugs, planned features

## Key URLs

- API Documentation: `http://localhost:3001/docs`
- Database: `postgresql://mal_user:your_password@localhost:5433/mal_db`
- Chat Client: Run with `npm run dev:chat`

## Environment Files

Copy `.env.example` to `.env` in these locations:

1. `database/own-mal-db/.env` - Database config
2. `mcp-servers/mal-user-mcp/.env` - MAL OAuth credentials
3. `mcp-servers/anime-recommendation-mcp/.env` - Optional settings

See `.env.example` files for required variables.
