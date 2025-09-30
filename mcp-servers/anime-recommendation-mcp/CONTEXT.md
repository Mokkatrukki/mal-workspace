# anime-recommendation-mcp - Context

**Smart Anime Recommendations with Emotional Pattern Learning**

⚠️ **STATUS: WORK IN PROGRESS - NOT FULLY TESTED YET**

## What Is This?

MCP server that provides intelligent anime recommendations by learning your taste through emotional patterns discovered in reviews. Uses dual databases: SQLite for your personal preferences, PostgreSQL for anime data.

## One-Liner

Learns what you emotionally respond to in anime → discovers patterns in reviews → recommends anime that match your emotional preferences.

## Current Status

⚠️ **WORK IN PROGRESS**
- ✅ User Profile System - SQLite database created
- ✅ Pattern Tools - All pattern discovery tools implemented
- ✅ SQLite Migrations - Schema ready
- ⚠️ PostgreSQL Integration - Needs connection to v1 API
- ⚠️ Recommendation Engine - Core algorithm WIP
- ❌ NOT TESTED - Many features untested in production
- ❌ No PostgreSQL Connection Yet - Currently isolated from anime data

**Use at your own risk!** This is experimental.

## What It Does (When Complete)

Unlike simple "genre matching", this server will:
1. **Learn your emotional preferences** through interactive questions
2. **Discover emotional patterns** in reviews (what makes anime "exciting" vs "moving")
3. **Build your taste profile** in SQLite database
4. **Recommend based on feelings** ("I want something emotionally powerful" not just "I want drama")
5. **Adapt to your mood** ("I'm tired, suggest something light")

**Key Innovation**: Pattern Discovery System
- Analyzes 111K+ reviews to find emotional patterns
- "Heart-wrenching" vs "feel-good" vs "thought-provoking"
- Learns what words/phrases indicate specific appeals
- Applies patterns to find anime matching your mood

## Tools Provided to Claude

### User Profile Management
- `createUserProfile` - Create your taste profile
- `getUserProfile` - View your preferences
- `updateUserPreferences` - Modify settings
- `deleteUserProfile` - Remove all data
- `askTasteQuestions` - Interactive preference learning

### Feedback & Learning
- `recordUserFeedback` - Record how you felt about anime
- `getUserFeedback` - View your feedback history
- `setCurrentMood` - Tell the system your current mood
- `getCurrentMood` - Check saved mood

### Pattern Discovery (The Innovation!)
- `saveEmotionalPattern` - Save discovered pattern
- `getStoredPatterns` - View all patterns
- `analyzeReviewForPatterns` - Check if review matches patterns
- `updatePatternFromEvidence` - Improve pattern accuracy
- `runMassPatternAnalysis` - Apply patterns to all 111K reviews
- `getPatternEvidence` - See examples of pattern matches
- `validatePatternEvidence` - Mark matches as correct/incorrect

⚠️ **Note**: Tools are implemented but not thoroughly tested.

## Architecture

### Dual-Database Design

```
┌─────────────────────────────────────────────────────────────┐
│                  anime-recommendation-mcp                    │
│                    ⚠️ WIP - NOT COMPLETE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐      ┌─────────────────────────┐ │
│  │   SQLite Database    │      │  PostgreSQL Database    │ │
│  │   (User Data)        │      │  (Anime Data)           │ │
│  │     ✅ Working       │      │  ⚠️ Not Connected       │ │
│  │                      │      │                         │ │
│  │ • Your preferences   │      │ • 5,900+ anime         │ │
│  │ • Your feedback      │      │ • 111K+ reviews        │ │
│  │ • Emotional patterns │      │ • Sentiment analysis   │ │
│  │ • Mood history       │      │ • Reception data       │ │
│  └──────────────────────┘      └─────────────────────────┘ │
│           ↓                              ↓                  │
│           └──────────────┬───────────────┘                  │
│                          ↓                                  │
│              ┌────────────────────────┐                     │
│              │ Recommendation Engine  │                     │
│              │    ⚠️ WIP - UNTESTED   │                     │
│              └────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

**Why Two Databases?**
- SQLite: Fast, local, personal data (just yours)
- PostgreSQL: Shared anime data (used by all MCP servers)
- Clean separation: Your taste ≠ Anime metadata

### Pattern Discovery System

**The Core Innovation** (When finished):
```
1. You tell us: "I loved this anime because it was emotionally powerful"
2. We analyze: What do reviews say about it?
3. We discover: Words like "heart-wrenching", "tears", "emotional rollercoaster"
4. We save pattern: emotional_powerful = ["heart-wrenching", "tears", "moved me"]
5. We apply: Find other anime with these patterns in reviews
6. We learn: Your feedback validates/improves patterns
```

**Example Pattern**:
```json
{
  "pattern_name": "heart_wrenching",
  "keywords": ["tears", "cried", "emotional", "heart-wrenching"],
  "context_words": ["character death", "sacrifice", "goodbye"],
  "emotional_category": "sadness_catharsis",
  "confidence": 0.85
}
```

## Database Locations

**SQLite (User Data)**:
```
./data/users.db  (✅ Working)
```

**PostgreSQL (Anime Data)**:
```
postgresql://mal_user:password@localhost:5433/mal_db  (⚠️ Not connected)
```

## Directory Structure

```
anime-recommendation-mcp/
├── src/
│   ├── server.ts                # Main MCP server
│   ├── database/
│   │   ├── sqlite.ts            # SQLite connection (users) ✅
│   │   └── migrations/
│   │       └── sqlite.ts        # User DB schema ✅
│   ├── services/
│   │   ├── userProfile.ts       # Profile management ✅
│   │   └── patternAnalysis.ts   # Pattern discovery ⚠️ WIP
│   ├── tools/
│   │   ├── profileTools.ts      # User profile tools ✅
│   │   └── patternTools.ts      # Pattern discovery tools ⚠️ Untested
│   └── types/
│       └── recommendation.ts    # TypeScript types ✅
├── data/
│   └── users.db                 # SQLite database (auto-created) ✅
├── build/                       # Compiled JavaScript
├── CLAUDE.md                    # Detailed design doc
└── .mcp.json                    # MCP server config
```

## Technology Stack

- **MCP SDK**: @modelcontextprotocol/sdk
- **SQLite**: better-sqlite3 (user data)
- **PostgreSQL**: pg (anime data - not fully integrated yet)
- **Runtime**: Node.js + TypeScript
- **Transport**: stdio

## Commands

```bash
# Development
npm run dev              # Start with tsx (hot reload)
npm run build            # Compile TypeScript
npm start                # Start production server

# Database
npm run db:migrate       # Run SQLite migrations

# Use in Claude Desktop (experimental!)
# Add to ~/.config/claude/claude_desktop_config.json
```

## Configuration

**Environment Variables**:
```env
# SQLite (user data)
USER_DB_PATH=./data/users.db

# PostgreSQL (anime data) - ⚠️ NOT CONNECTED YET
DATABASE_URL=postgresql://mal_user:password@localhost:5433/mal_db

# Optional
LOG_LEVEL=info
```

**Claude Desktop Config**:
```json
{
  "mcpServers": {
    "anime-recommendation": {
      "command": "node",
      "args": ["/path/to/mal-workspace/mcp-servers/anime-recommendation-mcp/build/server.js"],
      "env": {
        "USER_DB_PATH": "/path/to/mal-workspace/mcp-servers/anime-recommendation-mcp/data/users.db"
      }
    }
  }
}
```

## Example Usage (Experimental)

**In Claude Desktop**:
- "Create a profile for me"
- "Ask me taste questions to learn my preferences"
- "I loved Steins;Gate because it was mind-bending. Save that pattern."
- "Find anime that are emotionally powerful" ⚠️ May not work yet
- "I'm in the mood for something light and funny" ⚠️ May not work yet
- "Show me my feedback history"

## Integration Points

**Uses**:
- `own-mal-db` PostgreSQL (⚠️ needs v1 API integration - see ISSUES.md)
- SQLite for user data (✅ working)

**Used by**:
- Claude Desktop (experimental)
- Chat client (testing)

**Could integrate with**:
- `mal-user-mcp` - Import MAL list → learn from your ratings
- `anime-search-mcp` - Search → Save patterns → Recommend

## Known Limitations

1. ⚠️ **NOT FULLY TESTED** - Many features untested
2. ⚠️ **No PostgreSQL connection** - Isolated from anime data
3. ⚠️ **Pattern discovery manual** - Needs interactive analysis
4. ⚠️ **No automatic recommendations** - Tools ready, algorithm WIP
5. ⚠️ **Recommendation engine incomplete** - Core logic not finished
6. ⚠️ **No v1 API integration** - Should use `/api/v1/*` endpoints

## What Makes This Special? (When Complete)

### vs. Traditional Recommendation Systems

| Traditional | This System (Planned) |
|-------------|-------------|
| "You liked Action, here's more Action" | "You like intense psychological thrillers that make you think" |
| Genre matching | Emotional pattern matching |
| Collaborative filtering | Pattern discovery + collaborative |
| Static preferences | Mood-aware, adapts to context |
| Black box | Explainable (shows matching patterns) |

### The Pattern Library (Vision)

Instead of just genres, we learn:
- **Emotional appeals**: heart-wrenching, uplifting, thrilling
- **Narrative styles**: slow-burn, fast-paced, plot-twist-heavy
- **Character types**: complex protagonists, found family, morally gray
- **Thematic elements**: existential, coming-of-age, redemption

## Development Status

**Phase 1: Foundation** ✅
- [x] SQLite database setup
- [x] User profile schema
- [x] Pattern storage schema
- [x] MCP server structure

**Phase 2: Tools** ⚠️ Partially Done
- [x] User profile tools
- [x] Pattern discovery tools (untested)
- [ ] Recommendation algorithm
- [ ] PostgreSQL integration

**Phase 3: Intelligence** ❌ Not Started
- [ ] Pattern learning from reviews
- [ ] Mood-based recommendations
- [ ] Taste profile evolution
- [ ] Similarity calculations

**Phase 4: Integration** ❌ Not Started
- [ ] MAL list import
- [ ] Cross-MCP communication
- [ ] v1 API migration
- [ ] Real-world testing

## Related Files

- `./CLAUDE.md` - Detailed design document
- `./ISSUES.md` - Known issues and roadmap (IMPORTANT - see migration tasks)
- `../../database/own-mal-db/CONTEXT.md` - Anime data source
- `../../ARCHITECTURE.md` - Overall system design
