# Anime Database with Smart Crawler

A complete anime database system that crawls data from MyAnimeList via Jikan API, stores it in PostgreSQL, and provides a REST API for querying. Includes an intelligent review crawler that prioritizes popular anime.

## 🎯 Features

- **Smart Data Crawler**: Interactive CLI for collecting anime data and reviews
- **Review Intelligence**: Sentiment analysis and reception insights from user reviews
- **PostgreSQL Database**: Optimized schema with full-text search
- **REST API**: Clean endpoints for searching and retrieving anime data
- **MCP Integration**: Compatible with Claude's Model Context Protocol
- **Prioritized Crawling**: Focuses on popular anime first for maximum value

## 🏗️ Architecture

```
src/
├── api/routes/          # Express.js REST API routes
├── database/           # PostgreSQL schema, connection, migrations
├── services/           # Business logic and data access layer
├── scripts/            # Data crawling and utility scripts
├── types/              # TypeScript type definitions
└── index.ts           # Main application entry point
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 12+
- **npm**

### Installation

1. **Clone and install dependencies**:
```bash
git clone <your-repo>
cd own-mal-db
npm install
```

2. **Set up PostgreSQL database**:
```sql
-- Connect to PostgreSQL as superuser
createdb mal_db
createuser mal_user -P  # Enter password when prompted

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE mal_db TO mal_user;
```

3. **Configure environment**:
```bash
cp env.example .env
# Edit .env with your database credentials
```

Example `.env`:
```env
DATABASE_URL=postgresql://mal_user:your_password@localhost:5432/mal_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mal_db
DB_USER=mal_user
DB_PASSWORD=your_password
PORT=3000
NODE_ENV=development
```

4. **Run database migration**:
```bash
npm run db:migrate
npm run db:migrate:tv-special
npm run db:migrate:reviews
```

5. **🎯 IMPORTANT: Populate database with data**:
```bash
# Start the interactive crawler to get initial data
npm run anime

# Follow the prompts:
# - Choose option 2 to add new anime (start with ~1000 anime)
# - Choose option 3 to get reviews for new anime
# - Choose option 1 to get more reviews for existing anime
```

6. **Start the API server**:
```bash
npm run dev
```

Your API will be available at `http://localhost:3000`

## 🎮 Data Collection with Interactive Crawler

The system includes a smart interactive crawler for collecting anime data and reviews:

```bash
npm run anime
```

### Main Operations:

**1. Get more reviews for existing anime**
- Adds reviews to anime that have few/no reviews
- Prioritizes popular anime first (by member count)
- You specify: how many anime to process, target reviews per anime
- Shows real-time progress and API calls

**2. Add new anime to database**
- Crawls new anime data from Jikan API
- You control: how many anime, genres, pages per genre
- Adds basic anime information (titles, scores, genres, etc.)

**3. Get reviews for new anime**
- Finds anime with no reviews
- Prioritizes popular anime first
- Fetches reviews with sentiment analysis

### Example Workflow:

```bash
# Start with empty database
npm run anime

# First: Add basic anime data
# Choose option 2, get ~1000 anime

# Then: Get reviews for popular anime
# Choose option 3, process ~200 anime with 50 reviews each

# Finally: Expand review coverage
# Choose option 1, target 50+ reviews per anime
```

The crawler automatically:
- **Handles rate limiting** (respects Jikan API limits)
- **Shows progress** with real-time updates
- **Prioritizes popular anime** (by member count)
- **Performs sentiment analysis** on reviews
- **Updates reception data** automatically

## 📊 API Documentation

🎉 **NEW: Interactive API Documentation available at** `http://localhost:3001/api/docs`

### API Versions

#### ✅ **v1 API** (Recommended) - `/api/v1/*`
- **Status**: Active, current version
- **Documentation**: Full OpenAPI 3.0 specification
- **Interactive Docs**: http://localhost:3001/api/docs
- **Format Support**: `?format=standard|clean|compact`

#### ⚠️ **Legacy API** (Deprecated) - `/api/anime/*`
- **Status**: Deprecated, will be removed in v2.0.0
- **Deprecation Headers**: All responses include migration information
- **Migration**: Please upgrade to v1 API

### v1 API Endpoints

**Base URL**: `http://localhost:3001/api/v1`

#### Anime Endpoints
| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /anime` | Search anime with advanced filters | `/anime?query=naruto&format=clean` |
| `GET /anime/:id` | Get anime by MAL ID | `/anime/5?format=standard` |
| `GET /anime/top` | Get top anime by score | `/anime/top?limit=50` |
| `GET /anime/bulk` | Get multiple anime by IDs | `/anime/bulk?ids=1,5,20` |

#### Genre Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /genres` | List all available genres |
| `GET /genres/stats` | Get anime count by genre |

#### Review Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /reviews/anime/:id` | Get paginated reviews for an anime |
| `GET /reviews/anime/:id/summary` | Get review summary statistics |
| `GET /reviews/anime/:id/sample` | Get balanced sample of reviews |

#### Reception & Sentiment Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /reception/anime/:id` | Get sentiment analysis for an anime |
| `GET /reception/search` | Search anime by sentiment patterns |
| `GET /reception/compare` | Compare reception between two anime |
| `GET /reception/insights` | Get database-wide sentiment insights |

#### Search & Discovery Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /search/capabilities` | Discover available search filters |
| `GET /search/seasonal` | Get seasonal anime recommendations |
| `GET /search/current` | Get currently airing anime |

### Response Format Parameter

All v1 endpoints support a `?format` query parameter:

- **`standard`** (default) - Full data with all fields
- **`clean`** - LLM-optimized, essential fields only
- **`compact`** - Ultra-compact for minimal token usage

Example:
```bash
# Get anime in compact format
curl "http://localhost:3001/api/v1/anime/5?format=compact"

# Search with clean format
curl "http://localhost:3001/api/v1/anime?query=naruto&format=clean"
```

### Advanced Search Parameters

The v1 API supports extensive filtering:

**Basic:**
- `query` - Text search in titles and synopsis
- `genres` - Comma-separated genre IDs
- `min_score` / `max_score` - Score range (0-10)
- `page` / `limit` - Pagination (max 25 per page)

**Year Filtering:**
- `year` - Specific year (e.g., 2020)
- `min_year` / `max_year` - Year range
- `decade` - Decade filter (e.g., "2000s")
- `current_year_only` - Only current year anime

**Popularity:**
- `min_popularity` / `max_popularity` - Popularity rank range
- `exclude_very_popular` - Exclude top 100 popular anime

**Other:**
- `airing_status` - `airing`, `finished`, or `upcoming`
- `type` - `TV`, `Movie`, `OVA`, `Special`, `ONA`, `Music`
- `min_episodes` / `max_episodes` - Episode count range
- `order_by` - Sort by `score`, `popularity`, `rank`, etc.
- `sort` - `desc` or `asc`

### Example Requests

```bash
# Search with v1 API (clean format)
curl "http://localhost:3001/api/v1/anime?query=naruto&format=clean"

# Get top action anime from 2010s
curl "http://localhost:3001/api/v1/anime?genres=1&decade=2010s&order_by=score"

# Get anime reception analysis
curl "http://localhost:3001/api/v1/reception/anime/5"

# Compare reception between two anime
curl "http://localhost:3001/api/v1/reception/compare?anime_id_1=5&anime_id_2=1"

# Search by sentiment pattern
curl "http://localhost:3001/api/v1/reception/search?sentiment_pattern=underrated"
```

### Migration Guide (Legacy → v1)

If you're using the legacy `/api/anime/*` endpoints, migrate to v1:

| Legacy Endpoint | v1 Endpoint | Notes |
|----------------|-------------|-------|
| `/api/anime/search` | `/api/v1/anime` | Use `?query=` parameter |
| `/api/anime/clean/search` | `/api/v1/anime?format=clean` | Use format parameter |
| `/api/anime/:id` | `/api/v1/anime/:id` | Same structure |
| `/api/anime/genres` | `/api/v1/genres` | Same response |
| `/api/anime/reviews/:id` | `/api/v1/reviews/anime/:id` | Improved pagination |
| `/api/anime/reception/:id` | `/api/v1/reception/anime/:id` | Enhanced analysis |

**Example Migration:**
```bash
# Before (Legacy)
curl "http://localhost:3001/api/anime/clean/search?query=naruto"

# After (v1)
curl "http://localhost:3001/api/v1/anime?query=naruto&format=clean"
```

## 🗃️ Database Schema

### Core Tables

- **`anime`** - Main anime data with full-text search and reception_data (JSONB)
- **`anime_reviews`** - 111K+ user reviews with sentiment analysis
- **`genres`** - All genres, themes, and demographics
- **`studios`** - Animation studios and producers
- **`anime_genres`** - Many-to-many anime ↔ genres
- **`anime_studios`** - Many-to-many anime ↔ studios

### Key Features

- **Full-text search** on titles and synopsis
- **JSONB fields** for complex nested data (images, statistics)
- **Optimized indexes** for common query patterns
- **Automatic triggers** for search vectors and timestamps

## 🔧 Available Commands

```bash
# Database setup
npm run db:migrate           # Run initial database migration
npm run db:migrate:tv-special # Run TV Special type migration
npm run db:migrate:reviews   # Run review system migration

# Data collection
npm run anime               # Interactive crawler (MAIN COMMAND)

# Development
npm run dev                 # Start API server
npm run build               # Build for production
npm run start               # Start production server

# MCP integration
npm run mcp                 # Run MCP server for Claude integration

# Code quality
npm run lint                # Lint TypeScript code
npm run type-check          # Check TypeScript types
```

## 🔗 MCP Integration

Update your anime-search MCP tool to use the v1 API:

```typescript
// Use v1 API with format parameter
const LOCAL_API_BASE = 'http://localhost:3001/api/v1';

// Search with clean format (LLM-optimized)
const response = await fetch(
  `${LOCAL_API_BASE}/anime?query=${query}&format=clean`
);

// Get specific anime with compact format
const anime = await fetch(
  `${LOCAL_API_BASE}/anime/${malId}?format=compact`
);

// Get reception analysis
const reception = await fetch(
  `${LOCAL_API_BASE}/reception/anime/${malId}`
);
```

### Response Formats for LLM Integration

Choose the format based on your needs:

**Standard Format** (default):
```json
{
  "mal_id": 11061,
  "title": "Hunter x Hunter (2011)",
  "title_english": "Hunter x Hunter",
  "title_japanese": "ハンター×ハンター",
  "image_url": "https://cdn.myanimelist.net/images/anime/1337/99013.jpg",
  "score": 9.04,
  "scored_by": 1234567,
  "rank": 1,
  "popularity": 15,
  "members": 2345678,
  "favorites": 123456,
  "synopsis": "Hunter x Hunter is set in a world...",
  "episodes": 148,
  "duration": "23 min per ep",
  "year": 2011,
  "season": "fall",
  "status": "Finished Airing",
  "rating": "PG-13 - Teens 13 or older",
  "source": "Manga",
  "type": "TV",
  "genres": [{"id": 1, "name": "Action"}, {"id": 2, "name": "Adventure"}],
  "studios": [{"id": 11, "name": "Madhouse"}],
  "themes": [{"id": 31, "name": "Super Power"}],
  "demographics": [{"id": 27, "name": "Shounen"}],
  "url": "https://myanimelist.net/anime/11061"
}
```

**Clean Format** (LLM-optimized):
- Essential fields only
- Simplified structure
- Best for general LLM use

**Compact Format** (Ultra-minimal):
- Shortest field names (e.g., `t` for title, `sc` for score)
- Minimal token usage
- Best for MCP tools with token limits

Benefits of using the v1 API:
- **Faster responses** (no external API calls)
- **Offline capability**
- **Advanced filtering** (year ranges, popularity, sentiment)
- **No rate limiting** issues
- **Multiple formats** (standard, clean, compact)
- **Comprehensive documentation** (OpenAPI + interactive docs)

## 🎮 Usage Examples (v1 API)

### Basic Search

```bash
# Search for "demon slayer"
curl "http://localhost:3001/api/v1/anime?query=demon%20slayer"

# Get top action anime with high scores
curl "http://localhost:3001/api/v1/anime?genres=1&min_score=8&order_by=score&format=clean"
```

### Advanced Filtering

```bash
# Find underrated gems from 2010s (high reviews, lower MAL score)
curl "http://localhost:3001/api/v1/anime?decade=2010s&min_score=7&max_score=7.9&order_by=members"

# Get currently airing anime
curl "http://localhost:3001/api/v1/search/current?limit=20"

# Find movies with high scores
curl "http://localhost:3001/api/v1/anime?type=Movie&min_score=8.5&order_by=score"
```

### Sentiment Analysis

```bash
# Get reception analysis for an anime
curl "http://localhost:3001/api/v1/reception/anime/5"

# Find polarizing anime (divides opinion)
curl "http://localhost:3001/api/v1/reception/search?sentiment_pattern=highly_polarizing"

# Compare reception between two anime
curl "http://localhost:3001/api/v1/reception/compare?anime_id_1=1&anime_id_2=5"
```

### Reviews

```bash
# Get review summary (efficient for context)
curl "http://localhost:3001/api/v1/reviews/anime/5/summary"

# Get balanced sample of reviews
curl "http://localhost:3001/api/v1/reviews/anime/5/sample?limit=10"

# Get paginated reviews
curl "http://localhost:3001/api/v1/reviews/anime/5?page=1&limit=10&sort=helpful"
```

## 🚀 Production Deployment

### Environment Variables

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
PORT=3000
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

## 📝 Development

### Adding New Features

1. **Database changes**: Update `src/database/schema.sql`
2. **Types**: Add to `src/types/anime.ts`
3. **Services**: Extend `src/services/animeService.ts`
4. **API routes**: Add to `src/api/routes/anime.ts`

### Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🌟 Recent Updates

### ✅ v1 API Refactoring Complete (2025-09-30)

The API has been completely refactored with:
- **Clean Architecture**: Separation of routes, controllers, repositories, and validators
- **v1 API**: Modern RESTful structure at `/api/v1/*`
- **Format Support**: Three response formats (standard, clean, compact)
- **Comprehensive Documentation**: OpenAPI 3.0 spec + interactive Scalar UI
- **Backwards Compatibility**: Legacy API still works with deprecation notices
- **16 Endpoints**: Full coverage of anime, reviews, reception, search, and genres
- **Production Ready**: All tests passing, error handling robust

See full details in:
- **Interactive Docs**: http://localhost:3001/api/docs
- **OpenAPI Spec**: `docs/api/openapi.yaml`
- **Refactoring Plan**: `API-REFACTORING-PLAN.md`
- **Test Results**: `TESTING.md`

## 🌟 What's Next?

- **Character/People data** integration
- **User reviews** with sentiment analysis (✅ **IMPLEMENTED**)
- **Recommendation engine** based on review similarity
- **GraphQL API** option
- **Real-time data sync** with MAL
- **Advanced analytics** dashboard
- **Rate limiting** for production
- **Automated integration tests** (Jest/Supertest)

Built with ❤️ for the anime community. 