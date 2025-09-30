# MAL Workspace - MCP Servers

Official MCP (Model Context Protocol) servers for MyAnimeList integration and anime recommendations.

## 📁 Active MCP Servers

### 1. **anime-search-mcp** ✅
- **Status**: Active
- **Purpose**: Comprehensive anime search and information retrieval
- **Features**:
  - Search anime by title, genres, score, year, season
  - Get detailed anime information
  - Review summaries and sentiment analysis
  - Bulk anime lookup for user lists
  - Reception analysis and patterns
- **Dependencies**: Requires own-mal-db API server running on port 3001

### 2. **anime-recommendation-mcp** ✅
- **Status**: Active (Fixed 2025-09-30)
- **Purpose**: Anime recommendation engine with pattern discovery
- **Features**:
  - Interactive pattern discovery from reviews
  - User taste profiling
  - Mood-based recommendations
  - Emotional pattern library
- **Dependencies**: SQLite for user data, anime-search-mcp for anime data

### 3. **mal-user-mcp** ✅
- **Status**: Active
- **Purpose**: MyAnimeList user account integration
- **Features**:
  - OAuth 2.0 authentication with MAL
  - User anime list management
  - Update watching progress, scores, status
  - Bulk operations on anime lists
- **Dependencies**: MyAnimeList API access

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Start PostgreSQL database
cd /home/mokka/projektit/own-mal-db
docker-compose up -d

# 2. Start API server
npm run dev  # Runs on port 3001
```

### Building MCP Servers
```bash
# Build all servers
cd /home/mokka/projektit/mal-workspace/mcp-servers/anime-search-mcp
npm run build

cd /home/mokka/projektit/mal-workspace/mcp-servers/anime-recommendation-mcp
npm run build

cd /home/mokka/projektit/mal-workspace/mcp-servers/mal-user-mcp
npm run build
```

## 🔧 Configuration

MCP servers are configured in Claude Desktop config. Typical setup:

```json
{
  "mcpServers": {
    "anime-search": {
      "command": "node",
      "args": ["/home/mokka/projektit/mal-workspace/mcp-servers/anime-search-mcp/build/server.js"]
    },
    "anime-recommendation": {
      "command": "node",
      "args": ["/home/mokka/projektit/mal-workspace/mcp-servers/anime-recommendation-mcp/build/server.js"]
    },
    "mal-user": {
      "command": "node",
      "args": ["/home/mokka/projektit/mal-workspace/mcp-servers/mal-user-mcp/build/server.js"]
    }
  }
}
```

## 📊 System Architecture

```
┌─────────────────────────────────────────────────┐
│           Claude Desktop / Claude Code          │
│              (MCP Client)                       │
└────────────┬────────────────────────────────────┘
             │
             ├──► anime-search-mcp
             │    └──► own-mal-db API (port 3001)
             │         └──► PostgreSQL (port 5433)
             │
             ├──► anime-recommendation-mcp
             │    ├──► SQLite (user data)
             │    └──► anime-search-mcp (anime data)
             │
             └──► mal-user-mcp
                  └──► MyAnimeList API (OAuth 2.0)
```

## ⚠️ Deprecated Versions

The following folders are DEPRECATED and should not be used:
- `/home/mokka/projektit/DEPRECATED-anime-search-mcp/`
- `/home/mokka/projektit/DEPRECATED-mal-user-mcp/`

All active development happens in this directory (`mal-workspace/mcp-servers/`).

## 📝 Recent Changes

### 2025-09-30
- ✅ Fixed anime-recommendation-mcp connection issues
  - Converted from CommonJS to ES modules
  - Updated to use McpServer class from modern MCP SDK
  - Now matches anime-search-mcp architecture pattern
- ✅ Improved error messages in anime-search-mcp
  - Clear indication when API server isn't running
  - Troubleshooting steps included in errors
- ✅ Marked old standalone MCP servers as deprecated

## 🐛 Troubleshooting

### "API Server not running" error
```bash
# Start the API server
cd /home/mokka/projektit/own-mal-db
npm run dev

# Verify it's running
curl http://localhost:3001/api/anime/genres
```

### MCP server not connecting in Claude Desktop
1. Rebuild the server: `npm run build`
2. Check Claude Desktop logs
3. Restart Claude Desktop
4. Verify the server runs standalone: `node build/server.js`

## 📚 Documentation

- See individual server README files for detailed documentation
- Check ISSUES.md in mal-workspace root for known issues
- CLAUDE.md files contain AI assistant guidance for each server