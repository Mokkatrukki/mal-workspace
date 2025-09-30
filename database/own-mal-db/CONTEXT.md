# own-mal-db - Context

**Your Personal Anime Data Warehouse**

## What Is This?

PostgreSQL database with 5,900+ anime and 111,000+ reviews from MyAnimeList, exposed through a REST API with full OpenAPI documentation. This is the data foundation for the entire workspace.

## One-Liner

Scraped anime data → stored in PostgreSQL → served via Express v1 API → used by MCP servers and chat client.

## Quick Access

- 🎨 **API Docs**: http://localhost:3001/api/docs (Scalar UI - interactive!)
- 📄 **OpenAPI Spec**: `docs/api/openapi.yaml`
- ℹ️ **API Info**: http://localhost:3001/api/v1
- 🏠 **Server Home**: http://localhost:3001

## What It Does

1. **Stores anime data**: Titles, genres, episodes, scores, images, studios
2. **Stores reviews**: 111K+ user reviews with sentiment analysis
3. **Provides v1 REST API**: Clean JSON endpoints with multiple formats
4. **Runs scrapers**: Tools to collect more data from Jikan API
5. **Migration system**: Database schema updates and data management

## API Structure (v1)

**Base URL**: `/api/v1`

| Endpoint | Purpose |
|----------|---------|
| `GET /anime` | Search & filter anime |
| `GET /anime/:id` | Get single anime details |
| `GET /anime/top` | Top rated anime |
| `GET /anime/bulk?ids=1,2,3` | Get multiple anime at once |
| `GET /reviews/anime/:id` | Get anime reviews |
| `GET /reviews/anime/:id/summary` | Review summary (sentiment) |
| `GET /reception/anime/:id` | Reception analysis |
| `GET /reception/search?sentiment_pattern=...` | Find by sentiment |
| `GET /search/capabilities` | List search options |
| `GET /search/seasonal` | Seasonal anime |
| `GET /genres` | List all genres |

**Response Formats** (add `?format=...`):
- `standard` - Full database fields (default)
- `clean` - Simplified field names
- `compact` - Ultra-minimal (token-optimized)

**Legacy API** (`/api/anime/*`):
- ⚠️ **DEPRECATED** - Still works but will be removed
- Use `/api/v1/*` instead

## Database Schema

**Main Tables**:
- `anime` - 5,900+ anime with full metadata
- `genres` - 77 genres/themes/demographics
- `anime_genres` - Many-to-many anime↔genres
- `reviews` - 111K+ user reviews with sentiment
- `recommendations` - Related anime suggestions
- `studios` - Animation studios and producers
- `anime_studios` - Many-to-many anime↔studios

**Key Fields**:
```sql
anime:
  - mal_id (PK)
  - title, title_english, title_japanese
  - type (TV/Movie/OVA/Special/ONA/Music)
  - episodes, score, rank, popularity
  - year, season (winter/spring/summer/fall)
  - synopsis, images (JSONB)
  - search_vector (full-text search)

reviews:
  - id (PK)
  - anime_id (FK → anime.mal_id)
  - review_text, user_score
  - sentiment_score (-1 to 1)
  - sentiment_label (positive/negative/neutral)
  - helpful_count
```

## Directory Structure

```
database/own-mal-db/
├── docs/
│   └── api/
│       └── openapi.yaml      # API documentation spec
├── src/
│   ├── api/
│   │   ├── v1/               # NEW v1 API (use this!)
│   │   │   ├── routes/       # Route definitions
│   │   │   ├── controllers/  # Business logic
│   │   │   └── middleware/   # Format & validation
│   │   ├── repositories/     # Database queries
│   │   ├── validators/       # Input validation
│   │   ├── routes/           # Legacy routes (deprecated)
│   │   └── docs.ts           # Scalar UI setup
│   ├── database/
│   │   ├── schema.sql        # PostgreSQL schema
│   │   ├── migrate.ts        # Migration runner
│   │   └── connection.ts     # DB connection
│   ├── scripts/
│   │   ├── crawlAnime.ts     # Anime scraper
│   │   ├── reviewCrawler.ts  # Review scraper
│   │   └── seedGenres.ts     # Genre seeding
│   ├── services/             # Business logic
│   └── index.ts              # API server entry
├── docker-compose.yml        # PostgreSQL container
└── .env                      # Database credentials
```

## Technology Stack

- **Database**: PostgreSQL 16 (Docker)
- **API**: Express + TypeScript
- **ORM**: Raw SQL with `pg` client
- **Documentation**: Scalar API Reference + OpenAPI 3.0
- **CLI**: inquirer, chalk, cli-progress, ora
- **Data Source**: Jikan API (https://jikan.moe)

## Commands

```bash
# Development
npm run dev              # Start API server (tsx hot reload)
npm run build            # Build TypeScript
npm run start            # Start production server

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed genres

# Scrapers
npm run scraper:anime    # Scrape anime data
npm run scraper:reviews  # Scrape reviews
npm run scraper:check-stats  # Database stats

# CLI
npm run anime            # Interactive crawler CLI

# Docker
npm run docker:up        # Start PostgreSQL
npm run docker:down      # Stop PostgreSQL
```

## Environment Variables

```env
# Database connection
DATABASE_URL=postgresql://mal_user:password@localhost:5433/mal_db
DB_HOST=localhost
DB_PORT=5433
DB_NAME=mal_db
DB_USER=mal_user
DB_PASSWORD=your_password

# API server
PORT=3001
NODE_ENV=development
```

## Data Flow

```
Jikan API (api.jikan.moe)
    ↓
Scrapers (crawlAnime.ts, reviewCrawler.ts)
    ↓
PostgreSQL Database (5.9K anime, 111K reviews)
    ↓
Express v1 API (http://localhost:3001/api/v1)
    ↓
Consumers:
- anime-search-mcp (⚠️ using legacy API - needs migration)
- anime-recommendation-mcp (⚠️ needs migration)
- chat-client
- External tools
```

## Key Features

1. **OpenAPI 3.0 Documentation** - Full spec in `docs/api/openapi.yaml`
2. **Interactive API Docs** - Scalar UI at `/api/docs`
3. **Multiple Response Formats** - standard/clean/compact
4. **Full-text Search** - PostgreSQL tsvector with ranking
5. **Sentiment Analysis** - Reviews analyzed for emotional content
6. **Reception Insights** - Polarization, sentiment patterns
7. **Flexible Queries** - Advanced filtering and sorting

## Data Statistics

- **Anime**: ~5,900 entries
- **Reviews**: ~111,000 entries
- **Genres**: 77 (genres, themes, demographics)
- **Studios**: ~1,000+
- **Coverage**: Popular anime (MAL IDs 1-50000)

## Integration Points

**Currently Used By**:
1. `anime-search-mcp` - ⚠️ Uses legacy API (`/api/anime/*`)
2. `anime-recommendation-mcp` - ⚠️ Needs to use v1 API
3. `chat-client` - Can test all endpoints

**Migration Needed**: All MCP servers should migrate to `/api/v1/*`

## Important Quirks

1. **Rate Limiting**: Jikan API is strict - scrapers have delays
2. **Checkpoints**: Scrapers save progress for resuming
3. **Manual IDs**: `mal_id` from MyAnimeList (not auto-increment)
4. **JSONB Fields**: images, trailer, broadcast use flexible JSON
5. **Full-text Search**: Uses PostgreSQL's tsvector with weighted ranking
6. **Legacy API**: Old `/api/anime/*` endpoints work but deprecated

## Testing

```bash
# Test database connection
npm run dev

# Test v1 API
curl http://localhost:3001/api/v1/anime?limit=5

# Test with format
curl http://localhost:3001/api/v1/anime/20?format=clean

# Test search
curl "http://localhost:3001/api/v1/anime?query=naruto&limit=5"

# Check database stats
npm run scraper:check-stats

# View API documentation
# Open browser: http://localhost:3001/api/docs
```

## Troubleshooting

**Database won't start?**
```bash
docker-compose down && docker-compose up -d
docker ps  # Check container status
```

**API won't start?**
- Port 3001 in use: `lsof -i :3001`
- Check `.env` has correct `DATABASE_URL`
- Verify database is running: `docker ps`

**API docs not loading?**
- Check file exists: `docs/api/openapi.yaml`
- Check server logs for errors
- Try: `curl http://localhost:3001/api/v1`

**Scraper crashes?**
- Check `checkpoint.json` for resume point
- Jikan API may be down: https://jikan.moe
- Rate limits have built-in delays

## Related Files

- `../../CONTEXT.md` - Overall workspace overview
- `./ISSUES.md` - Known bugs and planned features
- `../../QUICKSTART.md` - Fast setup guide
- `../../mcp-servers/anime-search-mcp/ISSUES.md` - API migration needed
