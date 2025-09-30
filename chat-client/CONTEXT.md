# chat-client - Context

**Interactive Chat Interface with AI and MCP Integration**

⚠️ **STATUS: TRANSITIONING TO WEB APPLICATION**

## What Is This?

Originally a CLI test client, now evolving into a web-based chat interface where you can interact with AI assistants that use MCP tools to help with anime discovery, recommendations, and list management.

## Vision

A chat-based website where:
- You chat with AI about anime
- AI uses MCP servers (anime-search, mal-user, recommendation) as tools
- Different components/agents handle different tasks
- Real-time recommendations and search
- MAL account integration
- Smart recommendations based on your preferences

**Think**: ChatGPT-style interface but specialized for anime, with direct database access and MAL integration.

## Current Status

**Legacy CLI Client** (Working):
- ✅ Terminal-based interactive menu
- ✅ Tests MCP servers
- ✅ Useful for debugging
- 🔄 Will be replaced by web interface

**Web Application** (Planned):
- ❌ Not started yet
- Will have chat UI
- Will integrate AI (Claude, OpenAI, or custom)
- Will use MCP servers as tools
- Will have modern web interface

## Current CLI Version

### What It Does Now

Interactive terminal menu that connects to MCP servers:
```
🎌 MAL Chat Client

What would you like to do?
  🔍 Search anime
  ⭐ Get recommendations
  📊 Get seasonal anime
  🎭 Get genres
  👤 User operations (MAL)
  🔧 List all tools
  ❌ Exit
```

**Use Cases**:
- Testing MCP servers
- Debugging tool calls
- Development playground
- Quick manual tests

## Future Web Application

### Planned Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Chat Interface                       │
│              (React/Next.js + Tailwind CSS)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Chat UI Component                      │ │
│  │  User: "Find action anime from 2023"                   │ │
│  │  AI: *uses anime-search-mcp* "Here are 5 results..."   │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              AI Agent System                            │ │
│  │    (Claude API / OpenAI / Custom LLM)                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              MCP Client Manager                         │ │
│  │  Connects to all 3 MCP servers                         │ │
│  └───┬──────────────────┬─────────────────┬───────────────┘ │
│      ↓                  ↓                 ↓                  │
│  ┌─────────┐      ┌──────────┐     ┌──────────────┐        │
│  │ anime-  │      │   mal-   │     │ recommendation│        │
│  │ search  │      │   user   │     │     -mcp      │        │
│  │  -mcp   │      │   -mcp   │     │               │        │
│  └─────────┘      └──────────┘     └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Planned Features

**Chat Interface**:
- Natural language anime queries
- AI-powered responses
- Real-time search results
- Recommendation cards with images
- MAL account sync

**Different Agents/Components**:
- **Search Agent**: Handles anime discovery
- **Recommendation Agent**: Personal recommendations
- **MAL Agent**: Manages your MAL list
- **Review Analyzer**: Analyzes sentiment and reception
- **Seasonal Guide**: Current season highlights

**User Experience**:
- Beautiful anime cards with images
- Interactive filters and sorting
- Mood-based discovery
- Watch list management
- Progress tracking

**Technology Stack** (Planned):
- Frontend: React/Next.js
- Styling: Tailwind CSS
- AI: Claude API or OpenAI
- State: React Query / Zustand
- MCP: Custom MCP client for web

## Current CLI Implementation

### Directory Structure

```
chat-client/
├── src/
│   ├── index.ts        # Main CLI interface (will be deprecated)
│   └── mcp-client.ts   # MCP connection manager (will be reused)
├── package.json
└── tsconfig.json
```

### Commands (Current CLI)

```bash
# Start CLI client (current)
npm run dev

# Or from workspace root
npm run dev:chat
```

### How CLI Works (Current)

```
1. Start CLI client
2. Connect to all 3 MCP servers (stdio)
3. Show interactive menu
4. User selects action
5. Call MCP tool
6. Display results
7. Loop back to menu
```

## Migration Plan

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Next.js project
- [ ] Design chat UI mockups
- [ ] Research MCP client for web
- [ ] Plan architecture

### Phase 2: Basic Web UI (Weeks 3-4)
- [ ] Create chat interface
- [ ] Implement message history
- [ ] Add loading states
- [ ] Style with Tailwind

### Phase 3: MCP Integration (Weeks 5-6)
- [ ] Adapt MCP client for web/server
- [ ] Connect to anime-search-mcp
- [ ] Connect to mal-user-mcp
- [ ] Connect to recommendation-mcp

### Phase 4: AI Integration (Weeks 7-8)
- [ ] Integrate Claude API / OpenAI
- [ ] Tool calling system
- [ ] Natural language processing
- [ ] Response formatting

### Phase 5: Features (Weeks 9-10)
- [ ] Anime cards and images
- [ ] Search filters
- [ ] MAL authentication flow
- [ ] Recommendation interface
- [ ] User preferences

### Phase 6: Polish (Weeks 11-12)
- [ ] Animations and transitions
- [ ] Mobile responsive
- [ ] Error handling
- [ ] Performance optimization
- [ ] Deployment

## Current CLI Configuration

**MCP Server Paths** (in `src/index.ts`):
```typescript
const MCP_SERVERS: MCPServer[] = [
  {
    name: 'anime-search',
    command: 'node',
    args: ['../mcp-servers/anime-search-mcp/build/server.js'],
  },
  {
    name: 'mal-user',
    command: 'node',
    args: ['../mcp-servers/mal-user-mcp/build/server.js'],
  },
  {
    name: 'recommendation',
    command: 'node',
    args: ['../mcp-servers/anime-recommendation-mcp/build/server.js'],
  },
];
```

## Dependencies

**Current CLI**:
- inquirer (interactive prompts)
- chalk (colors)
- ora (spinners)
- @modelcontextprotocol/sdk

**Future Web App** (Planned):
- Next.js / React
- Tailwind CSS
- Claude API / OpenAI SDK
- MCP client (custom for web)
- React Query
- Zustand or Redux

## Troubleshooting (Current CLI)

**"Cannot find module" errors?**
```bash
npm run mcp:build-all
```

**"Connection failed"?**
```bash
# Check MCP servers can run
node mcp-servers/anime-search-mcp/build/server.js
```

**Database errors?**
```bash
npm run docker:up
npm run db:dev
```

## Key Differences: CLI vs Web

| Aspect | Current CLI | Future Web |
|--------|-------------|------------|
| Interface | Terminal menu | Chat UI in browser |
| AI | None (manual) | Claude/OpenAI integrated |
| MCP Connection | stdio (local) | WebSocket/HTTP (server) |
| State | None | Persistent chat history |
| Auth | None | User accounts + MAL OAuth |
| Deployment | Local only | Web hosting |

## Why Migrate to Web?

**CLI Limitations**:
- No images/visual appeal
- Terminal-only (limited audience)
- No AI integration
- Manual operation
- Limited UX

**Web Advantages**:
- Beautiful visual interface
- AI-powered natural language
- Accessible to everyone
- Modern UX patterns
- Easy to share and deploy

## Integration Points

**Current**:
- Connects to 3 MCP servers via stdio
- Local testing only

**Future**:
- MCP servers run on backend
- Frontend connects via API/WebSocket
- AI agent orchestrates MCP tool calls
- Web-based authentication

## Related Files

- `./ISSUES.md` - Migration roadmap and todos
- `../../mcp-servers/*/CONTEXT.md` - MCP server docs
- `../../QUICKSTART.md` - Current setup
- Future: `/web-app/` directory for new web application

## Next Steps

1. **Keep CLI working** - Still useful for testing
2. **Start web planning** - UI mockups, tech decisions
3. **Research MCP for web** - How to connect MCP from browser/server
4. **Prototype chat UI** - Basic Next.js chat interface
5. **Gradual migration** - Keep both while building web version

---

*Last Updated: 2025-09-30*
*Status: CLI working, Web application planned*
*Priority: Plan web architecture, start UI prototypes*
