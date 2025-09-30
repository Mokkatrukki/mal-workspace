# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **anime recommendation MCP server** that provides sophisticated anime recommendation capabilities by integrating three related components:

- **anime-recommendation-mcp** (this project) - The main recommendation engine MCP server
- **own-mal-db** (../own-mal-db) - Local PostgreSQL database with 5.9K+ anime and 111K+ reviews
- **anime-search-mcp** (../anime-search-mcp) - Anime search and discovery MCP server
- **mal-user-mcp** (../mal-user-mcp) - MyAnimeList user account integration MCP server

## Architecture

The recommendation system uses a **dual-database architecture** for optimal separation of concerns:

### SQLite Database (User Data)
- **User taste profiles** - Personal preferences and learning data
- **User feedback** - Ratings, sentiment, and personal responses
- **User similarity calculations** - Cached similarity scores between users
- **Mood history** - Temporal mood and context data

### PostgreSQL Database (Anime Data)
- **Anime metadata** - Titles, genres, studios, statistics (from own-mal-db)
- **Reviews and sentiment** - 111K+ analyzed reviews with sentiment scores
- **AI analysis results** - Generated theme analysis and appeal descriptions
- **External ratings** - Cross-platform rating aggregation
- **Reception data** - Community opinion patterns and polarization metrics

### Integration Strategy
```typescript
// SQLite for user-specific data
const userDb = new SQLiteDatabase('./data/users.db');

// PostgreSQL for anime data (shared with other services)
const animeDb = new PostgreSQLConnection(process.env.DATABASE_URL);

// Application-layer joins for recommendations
const recommendations = await generateRecommendations({
  userProfile: await userDb.getUserProfile(username),
  animeData: await animeDb.getAnimeWithFilters(filters)
});
```

## Key Components

### MCP Tool Categories
The system implements these MCP tool categories (see `recommendation-mcp-design.md`):

1. **User Profile Management** - Create/manage user taste profiles (SQLite)
2. **Taste Profiling & Learning** - Dynamic preference discovery through questions (SQLite)
3. **Mood-Based Recommendations** - Context-aware suggestions based on current mood (SQLite + PostgreSQL)
4. **Advanced Recommendation Algorithms** - Multiple recommendation strategies (Both databases)
5. **Community & Similarity Analysis** - Find users with similar tastes (SQLite)
6. **AI Analysis Tools** - Generate intelligent anime explanations (PostgreSQL)
7. **Cross-Platform Integration** - Import from MAL, Crunchyroll, etc. (PostgreSQL)
8. **Interactive Pattern Discovery** - Build emotional pattern library through guided review analysis (SQLite)

### Database Schema

#### SQLite Schema (User Data)
```sql
-- User taste profiles and preferences
CREATE TABLE user_taste_profiles (
  username TEXT PRIMARY KEY,
  preference_data TEXT, -- JSON
  learning_data TEXT,   -- JSON
  mood_history TEXT,    -- JSON
  last_active DATETIME,
  profile_completeness REAL
);

-- User similarity calculations
CREATE TABLE user_similarity_matrix (
  user1 TEXT,
  user2 TEXT,
  similarity_score REAL,
  common_anime INTEGER,
  calculated_at DATETIME,
  PRIMARY KEY (user1, user2)
);

-- User feedback and learning data
CREATE TABLE user_anime_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  anime_id INTEGER, -- References anime.mal_id from PostgreSQL
  feedback_type TEXT,
  feedback_data TEXT, -- JSON
  created_at DATETIME
);

-- Interactive pattern discovery
CREATE TABLE emotional_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_name TEXT UNIQUE,
  keywords TEXT, -- JSON array
  regex_variants TEXT, -- JSON array
  context_words TEXT, -- JSON array
  emotional_category TEXT,
  confidence REAL,
  source_anime TEXT, -- JSON array of anime IDs
  discovered_from TEXT, -- "manual_review_analysis" or "ai_validation"
  created_at DATETIME,
  updated_at DATETIME
);

-- Pattern evidence and validation
CREATE TABLE pattern_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id INTEGER REFERENCES emotional_patterns(id),
  review_text TEXT,
  anime_id INTEGER,
  match_strength REAL,
  validated BOOLEAN DEFAULT FALSE,
  created_at DATETIME
);
```

#### PostgreSQL Schema Extensions
```sql
-- AI-generated anime analyses (extends existing anime data)
CREATE TABLE ai_anime_analyses (
  anime_id INTEGER PRIMARY KEY REFERENCES anime(mal_id),
  themes_analysis TEXT,
  appeal_analysis TEXT,
  target_audience TEXT,
  comparison_points JSONB,
  generated_at TIMESTAMP,
  model_version VARCHAR(50)
);

-- External platform ratings
CREATE TABLE external_ratings (
  id SERIAL PRIMARY KEY,
  anime_id INTEGER REFERENCES anime(mal_id),
  platform VARCHAR(50),
  rating FLOAT,
  rating_scale VARCHAR(20),
  sample_size INTEGER,
  scraped_at TIMESTAMP
);
```

## Development Setup

### 1. Initialize Project Structure
```bash
npm init -y
npm install @modelcontextprotocol/sdk sqlite3 pg zod express cors dotenv
npm install -D typescript @types/node @types/sqlite3 @types/pg tsx
```

### 2. Create Source Structure
```
src/
├── server.ts              # Main MCP server entry point
├── database/
│   ├── sqlite.ts          # SQLite connection for user data
│   ├── postgres.ts        # PostgreSQL connection for anime data
│   └── migrations/        # Schema migrations for both databases
├── services/
│   ├── userProfile.ts     # User taste profile management (SQLite)
│   ├── recommendations.ts # Core recommendation algorithms (Both DBs)
│   ├── similarity.ts      # User similarity calculations (SQLite)
│   └── aiAnalysis.ts      # AI-generated content analysis (PostgreSQL)
├── tools/
│   ├── profileTools.ts    # User profile MCP tools
│   ├── tasteTools.ts      # Taste learning MCP tools
│   ├── moodTools.ts       # Mood-based recommendation tools
│   └── analysisTools.ts   # AI analysis tools
└── types/
    └── recommendation.ts  # TypeScript definitions
```

### 3. Environment Configuration
```bash
# PostgreSQL (anime data) - connects to ../own-mal-db
DATABASE_URL=postgresql://mal_user:password@localhost:5432/mal_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mal_db
DB_USER=mal_user
DB_PASSWORD=your_password

# SQLite (user data) - local file
USER_DB_PATH=./data/users.db

# API Integration
LOCAL_API_BASE=http://localhost:3000/api/anime
CLEAN_API_BASE=http://localhost:3000/api/anime/clean

# Optional: AI Analysis
OPENAI_API_KEY=your_key_if_using_ai_analysis
```

## Commands

```bash
# Development
npm run dev          # Start MCP server in development mode
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production MCP server

# Database
npm run db:migrate:sqlite    # Run user database migrations (SQLite)
npm run db:migrate:postgres  # Run anime analysis migrations (PostgreSQL)
npm run db:seed:users        # Seed initial user data if needed

# Code Quality
npm run lint         # Lint TypeScript code
npm run type-check   # Check TypeScript types without building
```

## Integration Dependencies

This MCP server depends on:

1. **../own-mal-db** - Must be running with populated anime data
   - Start with: `cd ../own-mal-db && npm run dev`
   - API available at: `http://localhost:3000`
   - Contains anime metadata, reviews, and reception data

2. **../anime-search-mcp** - For anime discovery functionality
   - Provides search capabilities and metadata enrichment
   - See `REQUIREMENTS_anime-search-mcp.md` for needed enhancements

3. **../mal-user-mcp** - For user account integration
   - Provides MAL account access and list management
   - See `REQUIREMENTS_mal-user-mcp.md` for needed features

## Key Implementation Phases

### Phase 1: Interactive Pattern Discovery & Basic Profiles
- SQLite database setup for user profiles and emotional patterns
- Interactive pattern discovery MCP tools
- Build emotional pattern library through guided review analysis
- User profile creation and storage with pattern-based preferences

### Phase 2: Mood-Based Recommendation Engine
- Mood capture and analysis tools (SQLite)
- Context-aware recommendation algorithms using discovered patterns
- Temporal recommendation patterns based on emotional states

### Phase 3: Mass Analysis & Validation
- Apply discovered patterns to 111K+ reviews (PostgreSQL)
- Validate pattern accuracy and expand library
- Build user similarity engine based on emotional viewing patterns

### Phase 4: Advanced Recommendation Systems
- Multi-strategy recommendation algorithms
- AI-enhanced explanations and insights
- Cross-platform rating integration and normalization

### Phase 5: Community & Analytics
- Community preference mapping and similarity analysis
- Advanced analytics and comparative recommendation systems
- Continuous pattern learning and system improvement

## Data Flow Architecture

```
User Request → MCP Tools → Recommendation Service
                              ↓
                    ┌─────────────────────┐
                    │   Recommendation    │
                    │     Algorithm       │
                    └─────────────────────┘
                         ↓           ↓
              ┌─────────────────┐ ┌─────────────────┐
              │   SQLite DB     │ │  PostgreSQL DB  │
              │  (User Data)    │ │  (Anime Data)   │
              │                 │ │                 │
              │ • Profiles      │ │ • Anime Info    │
              │ • Preferences   │ │ • Reviews       │
              │ • Feedback      │ │ • AI Analysis   │
              │ • Similarity    │ │ • Reception     │
              └─────────────────┘ └─────────────────┘
```

## Performance Considerations

- **SQLite** for fast user profile queries (single-user focused)
- **PostgreSQL** for complex anime data joins (multi-user capable)
- Cache similarity calculations in SQLite
- Pre-calculate common anime analysis patterns in PostgreSQL
- Use JSONB fields efficiently for flexible preference storage
- Batch user preference updates to avoid frequent SQLite writes

## Security & Privacy

- **User data isolation** - Personal preferences in separate SQLite database
- **Anime data sharing** - Public anime data can be shared across services
- **Backup strategies** - Different retention policies for user vs anime data
- **Data portability** - Easy to export/import individual user profiles
- **Privacy by design** - User data never mixed with shared anime database

## Testing Strategy

1. **Unit Tests** - Test recommendation algorithms independently
2. **Database Tests** - Test both SQLite and PostgreSQL integrations
3. **MCP Inspector** - Use `npx @modelcontextprotocol/inspector` for tool testing
4. **Integration Tests** - Test data flow between both databases
5. **End-to-End Workflows** - Test complete user preference learning flows