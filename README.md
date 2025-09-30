# MAL Workspace

Unified workspace for MyAnimeList database, MCP servers, scrapers, and chat client.

## 🚀 Quick Start

```bash
# Install all dependencies
npm install

# Start PostgreSQL database
npm run docker:up

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Start the API server
npm run db:dev
```

## 📁 Project Structure

```
mal-workspace/
├── database/own-mal-db/         # PostgreSQL database + REST API
├── mcp-servers/                 # MCP servers for Claude
│   ├── anime-search-mcp/
│   ├── mal-user-mcp/
│   └── anime-recommendation-mcp/
├── chat-client/                 # Interactive CLI client
├── shared/types/                # Shared TypeScript types
└── docker-compose.yml           # Infrastructure
```

## 🔧 Available Commands

### Database Operations
```bash
npm run db:dev          # Start development server
npm run db:start        # Start production server
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed initial data
```

### Web Scrapers
```bash
npm run scraper:anime          # Scrape anime data
npm run scraper:reviews        # Scrape reviews
npm run scraper:check-stats    # Check database stats
npm run scraper:track-growth   # Track data growth
```

### MCP Servers
```bash
npm run mcp:build-all          # Build all MCP servers
npm run mcp:anime-search       # Start anime search MCP
npm run mcp:mal-user           # Start user operations MCP
npm run mcp:recommendation     # Start recommendation MCP
```

### Chat Client
```bash
npm run dev:chat               # Start interactive chat client
```

### Docker Operations
```bash
npm run docker:up              # Start all containers
npm run docker:down            # Stop all containers
npm run docker:logs            # View container logs
```

## 🎯 Using MCP Servers with Claude

1. Build the MCP servers:
```bash
npm run mcp:build-all
```

2. Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "anime-search": {
      "command": "node",
      "args": ["/absolute/path/to/mal-workspace/mcp-servers/anime-search-mcp/build/server.js"]
    },
    "mal-user": {
      "command": "node",
      "args": ["/absolute/path/to/mal-workspace/mcp-servers/mal-user-mcp/build/server.js"]
    },
    "anime-recommendation": {
      "command": "node",
      "args": ["/absolute/path/to/mal-workspace/mcp-servers/anime-recommendation-mcp/build/server.js"]
    }
  }
}
```

3. Restart Claude Desktop

## 💬 Using the Chat Client

The chat client provides an interactive CLI to test MCP functionality:

```bash
cd chat-client
npm install
npm run dev
```

Features:
- 🔍 Search anime by name
- ⭐ Get personalized recommendations
- 📊 Browse seasonal anime
- 🎭 Filter by genres
- 👤 User operations (with MAL OAuth)

## ⚙️ Configuration

### Database Configuration

Copy environment file and configure:
```bash
cp database/own-mal-db/env.example database/own-mal-db/.env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://mal_user:your_password@localhost:5433/mal_db
PORT=3001
NODE_ENV=development
```

### MAL User MCP (OAuth)

For user operations, configure OAuth:
```bash
cp mcp-servers/mal-user-mcp/.env.example mcp-servers/mal-user-mcp/.env
```

Get credentials from: https://myanimelist.net/apiconfig

## 📊 API Documentation

Once the API is running, visit:
```
http://localhost:3001/docs
```

Interactive API documentation powered by Scalar.

## 🛠️ Development

### Adding a New MCP Server

1. Create directory in `mcp-servers/`
2. Add to workspace in root `package.json`
3. Add npm script for easy access
4. Update `ARCHITECTURE.md`

### Running Tests

```bash
# Run tests in specific workspace
npm run test --workspace=database/own-mal-db
```

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture
- **[database/own-mal-db/README.md](./database/own-mal-db/README.md)** - Database docs
- **[mcp-servers/anime-search-mcp/README.md](./mcp-servers/anime-search-mcp/README.md)** - Anime search MCP
- **[mcp-servers/mal-user-mcp/README.md](./mcp-servers/mal-user-mcp/README.md)** - User operations MCP

## 🔄 Migrating from Old Structure

This workspace consolidates separate projects:
- `../own-mal-db` → `database/own-mal-db`
- `../anime-search-mcp` → `mcp-servers/anime-search-mcp`
- `../mal-user-mcp` → `mcp-servers/mal-user-mcp`
- `../anime-recommendation-mcp` → `mcp-servers/anime-recommendation-mcp`

Original folders can be archived after confirming workspace works correctly.

## 🐛 Troubleshooting

### Database connection fails
```bash
# Check if PostgreSQL is running
npm run docker:logs

# Verify connection settings in .env
```

### MCP server not connecting
```bash
# Rebuild the servers
npm run mcp:build-all

# Check absolute paths in Claude config
```

### Scraper rate limited
- Scrapers implement checkpoint system
- Resume from last successful checkpoint
- Adjust rate limits in crawler scripts

## 🤝 Contributing

1. Work within workspace packages
2. Use shared types from `shared/types`
3. Update documentation
4. Test MCP functionality before committing

## 📝 License

MIT - See LICENSE in individual packages

## 🙏 Credits

- MyAnimeList for anime data
- Jikan API for unofficial MAL API
- Anthropic for MCP SDK

---

**Author**: Leo Vainio
**Version**: 1.0.0