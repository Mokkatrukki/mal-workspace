# Requirements for own-mal-db Integration

This document outlines the features and enhancements needed in the **own-mal-db** project to support the anime recommendation system.

## Current Status
The own-mal-db already provides excellent anime data storage with PostgreSQL, review intelligence, and clean API endpoints. The recommendation system needs additional data analysis capabilities and schema extensions.

## Required Database Schema Extensions

### 1. AI Analysis Tables

**New Tables for AI-Generated Content:**
```sql
-- AI-generated anime analyses
CREATE TABLE ai_anime_analyses (
  anime_id INTEGER PRIMARY KEY REFERENCES anime(mal_id),
  themes_analysis TEXT,
  appeal_analysis TEXT,
  target_audience TEXT,
  comparison_points JSONB,
  similarity_vectors JSONB,      -- For similarity calculations
  appeal_factors JSONB,          -- Appeal factor weights
  viewing_context JSONB,         -- Viewing situation recommendations
  generated_at TIMESTAMP,
  model_version VARCHAR(50),
  analysis_confidence FLOAT
);

-- External platform ratings aggregation
CREATE TABLE external_ratings (
  id SERIAL PRIMARY KEY,
  anime_id INTEGER REFERENCES anime(mal_id),
  platform VARCHAR(50),          -- 'crunchyroll', 'anilist', 'kitsu', etc.
  rating FLOAT,
  rating_scale VARCHAR(20),       -- '1-10', '1-5', '0-100'
  sample_size INTEGER,
  platform_specific_data JSONB,  -- Platform-specific metadata
  scraped_at TIMESTAMP,
  last_updated TIMESTAMP
);

-- Normalized cross-platform ratings
CREATE TABLE normalized_ratings (
  anime_id INTEGER PRIMARY KEY REFERENCES anime(mal_id),
  mal_normalized FLOAT,          -- MAL score normalized to 0-1
  crunchyroll_normalized FLOAT,
  anilist_normalized FLOAT,
  kitsu_normalized FLOAT,
  weighted_average FLOAT,        -- Weighted across platforms
  platform_bias_score FLOAT,    -- How much platforms disagree
  confidence_score FLOAT,       -- Confidence in normalized rating
  last_calculated TIMESTAMP
);
```

### 2. Enhanced Anime Metadata

**Extended Anime Table:**
```sql
-- Add new columns to existing anime table
ALTER TABLE anime ADD COLUMN IF NOT EXISTS recommendation_data JSONB;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS mood_tags JSONB;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS viewing_context JSONB;
ALTER TABLE anime ADD COLUMN IF NOT EXISTS content_warnings JSONB;

-- Example data structure for new columns:
-- recommendation_data: {
--   "similarity_computed": true,
--   "theme_weights": {"friendship": 0.8, "action": 0.6},
--   "appeal_factors": {"animation": 0.9, "story": 0.8},
--   "target_audience": ["teen", "young_adult"]
-- }
--
-- mood_tags: ["uplifting", "intense", "relaxing", "thought-provoking"]
--
-- viewing_context: {
--   "binge_worthy": true,
--   "episode_length": "standard",
--   "complexity_level": "moderate",
--   "discussion_potential": "high"
-- }
--
-- content_warnings: ["violence", "psychological_themes", "mature_themes"]
```

### 3. Similarity and Clustering Data

**Anime Similarity Infrastructure:**
```sql
-- Pre-calculated anime similarity matrix
CREATE TABLE anime_similarity_matrix (
  anime_id1 INTEGER REFERENCES anime(mal_id),
  anime_id2 INTEGER REFERENCES anime(mal_id),
  similarity_score FLOAT,
  similarity_type VARCHAR(50),    -- 'genre', 'theme', 'reception', 'hybrid'
  similarity_factors JSONB,       -- Breakdown of similarity components
  calculated_at TIMESTAMP,
  calculation_method VARCHAR(100),
  PRIMARY KEY (anime_id1, anime_id2, similarity_type)
);

-- Anime clustering for discovery
CREATE TABLE anime_clusters (
  id SERIAL PRIMARY KEY,
  cluster_name VARCHAR(100),
  cluster_type VARCHAR(50),       -- 'genre', 'theme', 'mood', 'style'
  description TEXT,
  anime_ids INTEGER[],            -- Array of anime IDs in cluster
  cluster_characteristics JSONB,  -- Common traits of cluster
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Anime recommendation networks
CREATE TABLE anime_recommendation_edges (
  from_anime INTEGER REFERENCES anime(mal_id),
  to_anime INTEGER REFERENCES anime(mal_id),
  edge_weight FLOAT,
  edge_type VARCHAR(50),          -- 'similar', 'progression', 'alternative'
  reasoning TEXT,                 -- Human-readable explanation
  created_at TIMESTAMP,
  PRIMARY KEY (from_anime, to_anime, edge_type)
);
```

## Required API Enhancements

### 1. New API Endpoints for Recommendation Data

**AI Analysis Endpoints:**
```typescript
GET /api/anime/:id/ai-analysis
  // Get AI-generated analysis for specific anime

POST /api/anime/:id/ai-analysis
  // Generate/update AI analysis for anime

GET /api/anime/ai-analysis/batch
  // Get AI analysis for multiple anime (batch operation)

PUT /api/anime/:id/ai-analysis
  // Update existing AI analysis
```

**Similarity Endpoints:**
```typescript
GET /api/anime/:id/similar
  // Get similar anime with similarity scores

GET /api/anime/similarity/:id1/:id2
  // Get similarity score between two specific anime

POST /api/anime/similarity/batch
  // Calculate similarity for multiple anime pairs

GET /api/anime/clusters/:type
  // Get anime clusters by type (genre, theme, mood, etc.)
```

**Enhanced Search Endpoints:**
```typescript
POST /api/anime/search/recommendation
  // Advanced search with recommendation-specific filters

GET /api/anime/discovery/:type
  // Get curated discovery sets (hidden gems, trending, etc.)

POST /api/anime/search/mood
  // Search anime by mood and viewing context

GET /api/anime/:id/recommendation-metadata
  // Get metadata specifically for recommendation algorithms
```

### 2. Enhanced Existing Endpoints

**Extended Clean Endpoints:**
```typescript
GET /api/anime/clean/:id
  // Add recommendation_data to response

GET /api/anime/clean/search
  // Add similarity_score when applicable
  // Add mood_match when mood filtering used

GET /api/anime/clean/top/:limit
  // Add personalization when user context provided
```

**Response Format Extensions:**
```json
{
  "mal_id": 11061,
  "title": "Hunter x Hunter (2011)",
  // ... existing clean data ...
  "recommendation_data": {
    "theme_weights": {
      "friendship": 0.9,
      "coming_of_age": 0.8,
      "adventure": 0.9,
      "power_systems": 0.8
    },
    "appeal_factors": {
      "character_development": 0.95,
      "world_building": 0.9,
      "animation_quality": 0.85,
      "story_complexity": 0.9
    },
    "viewing_context": {
      "binge_worthy": true,
      "episode_commitment": "high",
      "emotional_investment": "high",
      "discussion_potential": "very_high"
    },
    "target_audience": ["shounen_fans", "adventure_lovers", "character_driven_story_fans"],
    "mood_tags": ["epic", "friendship", "growth", "adventure", "strategic"]
  },
  "content_warnings": ["violence", "dark_themes", "character_death"],
  "ai_analysis": {
    "themes_summary": "Epic adventure focusing on friendship, personal growth, and complex power systems...",
    "appeal_explanation": "Appeals to viewers who enjoy character-driven narratives with strategic battles...",
    "comparison_points": ["Similar to Fullmetal Alchemist in character depth", "Adventure scope like One Piece"]
  }
}
```

## Database Performance Optimizations

### 1. New Indexes for Recommendation Queries

**Similarity Query Optimization:**
```sql
-- Indexes for similarity lookups
CREATE INDEX idx_similarity_matrix_anime1 ON anime_similarity_matrix(anime_id1);
CREATE INDEX idx_similarity_matrix_anime2 ON anime_similarity_matrix(anime_id2);
CREATE INDEX idx_similarity_score ON anime_similarity_matrix(similarity_score DESC);
CREATE INDEX idx_similarity_type ON anime_similarity_matrix(similarity_type);

-- Indexes for recommendation data queries
CREATE INDEX idx_anime_recommendation_data ON anime USING GIN(recommendation_data);
CREATE INDEX idx_anime_mood_tags ON anime USING GIN(mood_tags);
CREATE INDEX idx_anime_viewing_context ON anime USING GIN(viewing_context);

-- Indexes for AI analysis
CREATE INDEX idx_ai_analysis_confidence ON ai_anime_analyses(analysis_confidence DESC);
CREATE INDEX idx_ai_analysis_generated ON ai_anime_analyses(generated_at DESC);
```

### 2. Materialized Views for Performance

**Pre-computed Recommendation Views:**
```sql
-- Materialized view for popular similar anime pairs
CREATE MATERIALIZED VIEW popular_anime_similarities AS
SELECT
  asm.anime_id1,
  asm.anime_id2,
  asm.similarity_score,
  a1.title as title1,
  a2.title as title2,
  a1.score as score1,
  a2.score as score2
FROM anime_similarity_matrix asm
JOIN anime a1 ON asm.anime_id1 = a1.mal_id
JOIN anime a2 ON asm.anime_id2 = a2.mal_id
WHERE a1.members > 100000 AND a2.members > 100000
  AND asm.similarity_score > 0.7
ORDER BY asm.similarity_score DESC;

-- Materialized view for genre-based recommendations
CREATE MATERIALIZED VIEW genre_recommendation_matrix AS
SELECT
  g1.genre_id as from_genre,
  g2.genre_id as to_genre,
  COUNT(*) as shared_anime_count,
  AVG(a.score) as avg_score,
  AVG(a.members) as avg_popularity
FROM anime_genres g1
JOIN anime_genres g2 ON g1.anime_id = g2.anime_id
JOIN anime a ON g1.anime_id = a.mal_id
WHERE g1.genre_id != g2.genre_id
GROUP BY g1.genre_id, g2.genre_id
HAVING COUNT(*) > 10;
```

## Data Processing Requirements

### 1. AI Analysis Generation Pipeline

**Batch Processing Scripts:**
```bash
# New npm scripts needed
npm run ai:analyze-batch          # Generate AI analysis for multiple anime
npm run ai:update-stale          # Update analyses older than X days
npm run ai:analyze-popular       # Prioritize popular anime for analysis
npm run ai:validate-analyses     # Validate existing AI analyses for quality
```

**AI Analysis Processing:**
```typescript
interface AIAnalysisJob {
  anime_id: number;
  analysis_type: 'full' | 'themes' | 'appeal' | 'similarity';
  priority: 'high' | 'medium' | 'low';
  force_update: boolean;
}

// Batch processing with rate limiting and error handling
async function processAIAnalysisBatch(jobs: AIAnalysisJob[]): Promise<void>;
```

### 2. Similarity Calculation Pipeline

**Similarity Computing Scripts:**
```bash
npm run similarity:calculate-all     # Calculate similarity for all anime pairs
npm run similarity:update-popular    # Update similarity for popular anime
npm run similarity:validate-matrix   # Validate similarity calculations
npm run similarity:cluster-anime     # Generate anime clusters
```

**Similarity Algorithm Types:**
```typescript
interface SimilarityConfig {
  algorithm: 'cosine' | 'jaccard' | 'euclidean' | 'hybrid';
  factors: {
    genre_weight: number;
    theme_weight: number;
    studio_weight: number;
    reception_weight: number;
    demographic_weight: number;
  };
  min_shared_data: number;  // Minimum shared attributes required
  popularity_bias: number;  // Bias toward popular anime
}
```

### 3. Data Quality and Validation

**Data Validation Scripts:**
```bash
npm run validate:recommendation-data  # Validate recommendation data quality
npm run validate:ai-analyses         # Check AI analysis completeness
npm run validate:similarity-matrix   # Verify similarity calculations
npm run cleanup:stale-data          # Remove outdated analyses
```

## Configuration Requirements

### 1. Environment Variables

```bash
# AI Analysis Configuration
ENABLE_AI_ANALYSIS=true
OPENAI_API_KEY=your_openai_key
AI_MODEL_VERSION=gpt-4
AI_ANALYSIS_BATCH_SIZE=50
AI_RATE_LIMIT_DELAY=1000

# Similarity Calculation
ENABLE_SIMILARITY_CALCULATION=true
SIMILARITY_BATCH_SIZE=100
SIMILARITY_ALGORITHM=hybrid
MIN_SIMILARITY_THRESHOLD=0.1

# External Rating Integration
ENABLE_EXTERNAL_RATINGS=true
CRUNCHYROLL_API_KEY=your_key
ANILIST_API_ENDPOINT=https://graphql.anilist.co

# Performance Settings
RECOMMENDATION_CACHE_SIZE=10000
SIMILARITY_CACHE_TTL=86400
ENABLE_MATERIALIZED_VIEWS=true
```

### 2. New Dependencies

```json
{
  "dependencies": {
    "openai": "^4.20.0",           // For AI analysis generation
    "ml-matrix": "^6.10.4",       // For similarity calculations
    "natural": "^6.1.0",          // For text analysis
    "node-cron": "^3.0.2",        // For scheduled analysis jobs
    "bull": "^4.10.4",            // For job queue management
    "ioredis": "^5.3.2"           // For caching and job queues
  }
}
```

## Migration Strategy

### 1. Database Migrations

**Migration Order:**
```bash
# Phase 1: Core schema extensions
npm run db:migrate:ai-analyses
npm run db:migrate:external-ratings
npm run db:migrate:recommendation-data

# Phase 2: Performance optimizations
npm run db:migrate:similarity-matrix
npm run db:migrate:recommendation-indexes
npm run db:migrate:materialized-views

# Phase 3: Data population
npm run ai:analyze-popular-anime
npm run similarity:calculate-core-matrix
npm run external:sync-ratings
```

### 2. Data Population Strategy

**Phased Data Population:**
```typescript
// Phase 1: Popular anime (members > 500k)
// Phase 2: Well-rated anime (score > 8.0)
// Phase 3: Recently aired anime (last 5 years)
// Phase 4: Complete coverage

interface PopulationPlan {
  phase: number;
  criteria: string;
  estimated_count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_time_hours: number;
}
```

## Testing Requirements

### 1. Unit Tests

```bash
npm run test:ai-analysis          # Test AI analysis generation
npm run test:similarity           # Test similarity calculations
npm run test:recommendation-api   # Test new API endpoints
npm run test:data-validation      # Test data quality checks
```

### 2. Performance Tests

```bash
npm run perf:similarity-queries   # Test similarity query performance
npm run perf:recommendation-api   # Test API response times
npm run perf:ai-analysis-batch    # Test batch processing performance
npm run perf:large-dataset        # Test with full dataset
```

### 3. Integration Tests

```bash
npm run integration:recommendation-system  # Test with recommendation MCP
npm run integration:external-apis         # Test external platform APIs
npm run integration:ai-services           # Test AI service integration
```

## Monitoring and Observability

### 1. Metrics Collection

**Key Metrics:**
- AI analysis generation rate and success rate
- Similarity calculation performance
- API response times for recommendation endpoints
- Cache hit rates for recommendation data
- External API success rates and rate limiting

### 2. Health Checks

**Monitoring Endpoints:**
```typescript
GET /health/recommendation-data    // Check recommendation data completeness
GET /health/ai-analysis           // Check AI analysis coverage
GET /health/similarity-matrix     // Check similarity matrix health
GET /health/external-apis         // Check external service availability
```

## Documentation Updates

### 1. README.md Additions

- New recommendation-focused API endpoints
- AI analysis and similarity calculation features
- Performance considerations for recommendation queries
- External platform integration status

### 2. API Documentation

- Detailed endpoint documentation for recommendation features
- Example requests and responses for new endpoints
- Performance guidelines for recommendation queries
- Data quality and validation information

## Privacy and Compliance

### 1. Data Handling

- **AI Analysis Data** - Generated content attribution and model versioning
- **External Platform Data** - Proper attribution and rate limiting compliance
- **Similarity Data** - Transparent calculation methods and data sources

### 2. Rate Limiting and Ethics

- **External API Compliance** - Respect rate limits of external platforms
- **AI Service Usage** - Monitor and optimize AI API usage costs
- **Data Freshness** - Balance between data freshness and API usage
- **Attribution** - Proper credit for external data sources