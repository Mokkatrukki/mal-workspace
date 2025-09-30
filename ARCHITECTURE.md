# MAL Workspace Architecture

## Overview

This monorepo contains all components for the MyAnimeList (MAL) database system, including the database, API, MCP servers, scrapers, and a chat client.

## Project Structure

```
mal-workspace/
├── database/                    # Database and API
│   └── own-mal-db/             # PostgreSQL database with REST API
│       ├── src/
│       │   ├── api/            # REST API endpoints
│       │   ├── cli/            # CLI tools
│       │   ├── scripts/        # Data scrapers/crawlers
│       │   ├── services/       # Business logic
│       │   └── database/       # DB connection & migrations
│       └── docker-compose.yml  # Database container
│
├── mcp-servers/                 # Model Context Protocol servers
│   ├── anime-search-mcp/       # Anime search & recommendations
│   ├── mal-user-mcp/           # User account operations (OAuth)
│   └── anime-recommendation-mcp/ # Advanced recommendations
│
├── chat-client/                 # Interactive chat client
│   └── src/
│       ├── mcp-client.ts       # MCP client manager
│       └── index.ts            # CLI interface
│
├── shared/                      # Shared utilities
│   └── types/                  # TypeScript type definitions
│
├── package.json                 # Workspace configuration
├── docker-compose.yml          # All services
└── README.md                   # Getting started guide
```

## Components

### 1. Database (own-mal-db)

**Purpose**: PostgreSQL database with anime data from MyAnimeList

**Key Features**:
- PostgreSQL database with anime, genres, reviews, and more
- REST API (Express) for accessing data
- Migration scripts for schema updates
- Comprehensive anime metadata storage

**Database Schema**:
- `anime` - Core anime data (titles, scores, episodes, etc.)
- `genres` - Genre/theme definitions
- `anime_genres` - Many-to-many relationship
- `reviews` - User reviews with ratings
- `recommendations` - Related anime suggestions

**Technology**: Node.js, Express, PostgreSQL, TypeScript

### 2. Web Scrapers

**Purpose**: Collect anime data from various sources

**Scrapers**:
- `crawlAnime.ts` - Main anime data crawler
- `reviewCrawler.ts` - Collect anime reviews
- `checkDatabaseStats.ts` - Monitor database stats
- `trackGrowth.ts` - Track data growth over time

**Usage**:
```bash
npm run scraper:anime          # Run anime crawler
npm run scraper:reviews        # Collect reviews
npm run scraper:check-stats    # Check DB statistics
```

**Note**: Scrapers respect rate limits and use checkpoint system for resumable crawling.

### 3. MCP Servers

**Purpose**: Expose anime data through Model Context Protocol for AI assistants (Claude)

#### anime-search-mcp
- Search anime by name/keyword
- Get top anime by score
- Get seasonal recommendations
- Browse by genre/theme
- Review sentiment analysis

#### mal-user-mcp
- User authentication (OAuth 2.0)
- Manage anime list (add/update/delete)
- Track watch progress
- Update scores and status

#### anime-recommendation-mcp
- Personalized recommendations
- Genre-based filtering
- Score-based filtering
- Similarity algorithms

**Technology**: @modelcontextprotocol/sdk, TypeScript

**Usage in Claude**:
Add to your MCP config (`~/.config/claude/claude_desktop_config.json`):
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

### 4. Chat Client

**Purpose**: Interactive CLI for testing and using MCP servers

**Features**:
- Connect to multiple MCP servers simultaneously
- Interactive menu-driven interface
- Search anime, get recommendations
- Test MCP functionality
- Beautiful CLI with colors and spinners

**Usage**:
```bash
cd chat-client
npm install
npm run dev
```

### 5. Shared Types

**Purpose**: Common TypeScript types used across projects

**Includes**:
- Anime interface
- Genre interface
- Review interface
- MCP request/response types
- Search options

## Data Flow

```
┌─────────────────┐
│  Jikan API      │ (MyAnimeList unofficial API)
│  (MAL Data)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Scrapers      │ (crawlAnime.ts, reviewCrawler.ts)
│                 │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PostgreSQL DB  │
│                 │
└────────┬────────┘
         │
    ┌────┴────────────────┬───────────────┐
    ↓                     ↓               ↓
┌─────────┐      ┌──────────────┐  ┌──────────────┐
│REST API │      │ MCP Servers  │  │ Chat Client  │
└─────────┘      └──────────────┘  └──────────────┘
                         ↓
                 ┌──────────────┐
                 │    Claude    │
                 │  (AI Agent)  │
                 └──────────────┘
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL (or use Docker)
- npm or pnpm

### Installation

```bash
# Clone and install
cd /path/to/mal-workspace
npm install

# Start database
npm run docker:up

# Run migrations
npm run db:migrate
npm run db:seed

# Start API server
npm run db:dev
```

### Running Scrapers

```bash
# Scrape anime data
npm run scraper:anime

# Collect reviews
npm run scraper:reviews
```

### Using MCP Servers

1. Build all MCP servers:
```bash
npm run mcp:build-all
```

2. Add to Claude desktop config or run individually:
```bash
npm run mcp:anime-search
npm run mcp:mal-user
npm run mcp:recommendation
```

### Using Chat Client

```bash
npm run dev:chat
```

## Development

### Workspace Commands

```bash
npm run build              # Build all packages
npm run install:all        # Install all dependencies

# Database
npm run db:dev            # Start dev server
npm run db:migrate        # Run migrations
npm run db:seed           # Seed data

# Scrapers
npm run scraper:anime     # Run anime crawler
npm run scraper:reviews   # Run review crawler

# MCP Servers
npm run mcp:anime-search  # Start anime search MCP
npm run mcp:mal-user      # Start user MCP
npm run mcp:build-all     # Build all MCPs

# Docker
npm run docker:up         # Start containers
npm run docker:down       # Stop containers
npm run docker:logs       # View logs
```

### Adding New MCP Server

1. Create new directory in `mcp-servers/`
2. Add workspace reference in root `package.json`
3. Add script command for easy access
4. Document in this file

## Environment Variables

Copy `.env.example` files in each project and configure:

**Database (.env)**:
```env
DATABASE_URL=postgresql://mal_user:password@localhost:5433/mal_db
DB_HOST=localhost
DB_PORT=5433
DB_NAME=mal_db
DB_USER=mal_user
DB_PASSWORD=your_password
PORT=3001
```

**MAL User MCP (.env)**:
```env
MAL_CLIENT_ID=your_client_id
MAL_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:3000/oauth/callback
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js >= 18
- **Database**: PostgreSQL 16
- **API Framework**: Express
- **MCP SDK**: @modelcontextprotocol/sdk
- **CLI Tools**: inquirer, chalk, ora
- **Build Tool**: tsc (TypeScript compiler)

## API Documentation

REST API documentation available at: `http://localhost:3001/docs`

Uses Scalar for interactive API docs.

## Migration from Separate Projects

This workspace consolidates:
- `../own-mal-db` → `database/own-mal-db`
- `../anime-search-mcp` → `mcp-servers/anime-search-mcp`
- `../mal-user-mcp` → `mcp-servers/mal-user-mcp`
- `../anime-recommendation-mcp` → `mcp-servers/anime-recommendation-mcp`

Original folders can be archived/deleted after testing workspace setup.

## Future Enhancements

- [ ] Web UI for data visualization
- [ ] GraphQL API
- [ ] Redis caching layer
- [ ] Advanced recommendation algorithms
- [ ] Real-time notifications
- [ ] User profile system
- [ ] Social features (comments, ratings)

## Contributing

1. Work in workspace packages
2. Use shared types from `shared/types`
3. Follow existing code style
4. Test MCP servers before committing
5. Update this documentation

## License

MIT - See LICENSE in each package