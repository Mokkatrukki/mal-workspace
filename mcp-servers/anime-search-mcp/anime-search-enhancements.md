# Anime-Search MCP Enhancement Plan

## ✅ COMPLETED: Three-Tier Review System Implementation

**Status:** COMPLETED (2025-09-27)
**Implementation:** All endpoints working and tested
**MCP Integration:** Built and deployed

### Overview

Successfully implemented a three-tier review system to solve the context flooding problem while providing flexible review access for different use cases.

## ✅ Implemented Review Endpoints

### 1. Summary Endpoint (Tier 1) - Context Efficient
**Endpoint:** `GET /api/anime/reviews/:id/summary`
**Purpose:** Quick overview without flooding context
**MCP Tool:** `getAnimeReviews(id)`

**Features:**
- Sentiment breakdown with percentages
- Average scores and engagement metrics
- Top 3 reviewer summaries (no full text)
- Review type distribution (preliminary vs regular)
- **Context usage:** ~1-2k tokens

**Usage:** ALWAYS start here to understand review landscape

### 2. Sample Endpoint (Tier 2) - Balanced Analysis
**Endpoint:** `GET /api/anime/reviews/:id/sample`
**Purpose:** Representative sample for recommendation analysis
**MCP Tool:** `getAnimeReviewsSample(id, limit?)`

**Features:**
- Balanced mix of positive/negative/neutral reviews
- Full review text included
- Prioritizes helpful reviews within each sentiment
- Configurable limit (default 10, max 15)
- **Context usage:** ~5-15k tokens (manageable)

**Usage:** Perfect for future recommendation MCP analysis

### 3. Detailed Endpoint (Tier 3) - Comprehensive Access
**Endpoint:** `GET /api/anime/reviews/:id`
**Purpose:** Full review access when comprehensive data needed
**MCP Tool:** `getAnimeReviewsDetailed(id, options)`

**Features:**
- All reviews with full text (context-heavy)
- Full pagination and filtering support
- Sort by date/helpful/score
- Include/exclude preliminary and spoiler reviews
- **Context usage:** 10-50k+ tokens (use sparingly)

**Usage:** Only when you need extensive review content

## Implementation Notes

### Database Schema
- Used existing `anime_reviews` table from migration 003
- Fields: sentiment_label, sentiment_score, helpful_count, is_preliminary
- No `is_spoiler` column (removed from queries)

### Query Strategy
- **Summary:** Efficient aggregation with SUM/CASE statements
- **Sample:** UNION ALL approach for balanced sentiment sampling
- **Detailed:** Standard pagination with comprehensive filtering

### Context Management
- Summary: No full text, just metadata and top reviewer info
- Sample: Truncates context to manageable size with balanced perspectives
- Detailed: Includes context warnings and token estimates

### MCP Integration
- Built and deployed successfully
- All three tools available in anime-search MCP
- Clear tool descriptions guide appropriate usage
- Capabilities documentation updated

## Strategy Success

The three-tier approach successfully solves the original problem:
- **Before:** 11.4k token responses flooding context on first call
- **After:** Start with 1-2k summary, escalate only when needed

Perfect for future recommendation MCP that needs actual review content without overwhelming context.

---

## Original Enhancement Plan (Pre-Implementation)

#### Basic Reviews Endpoint
```typescript
// GET /api/anime/reviews/:id
router.get('/reviews/:id', async (req: Request, res: Response): Promise<void> => {
  // Query parameters:
  // - page: number (default: 1)
  // - limit: number (default: 10, max: 25)
  // - preliminary: boolean (include preliminary reviews)
  // - spoilers: boolean (include spoiler reviews)
  // - sort: 'date' | 'helpful' | 'score' (default: 'date')
  // - order: 'asc' | 'desc' (default: 'desc')
});
```

#### Reviews Summary Endpoint
```typescript
// GET /api/anime/reviews/:id/summary
router.get('/reviews/:id/summary', async (req: Request, res: Response): Promise<void> => {
  // Returns:
  // - total_reviews: number
  // - sentiment_breakdown: { positive: number, negative: number, neutral: number }
  // - avg_user_score: number
  // - review_length_stats: { avg: number, median: number }
  // - preliminary_count: number
  // - spoiler_count: number
});
```

#### Top Reviews Endpoint
```typescript
// GET /api/anime/reviews/:id/top
router.get('/reviews/:id/top', async (req: Request, res: Response): Promise<void> => {
  // Query parameters:
  // - count: number (default: 3, max: 10)
  // - criteria: 'helpful' | 'detailed' | 'recent' (default: 'helpful')
  //
  // Returns best reviews based on criteria
});
```

### 2. Database Schema Validation

Ensure the existing `anime_reviews` table structure supports all review operations:

```sql
-- Verify these columns exist and add if missing:
ALTER TABLE anime_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE anime_reviews ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT FALSE;
ALTER TABLE anime_reviews ADD COLUMN IF NOT EXISTS review_length INTEGER;
ALTER TABLE anime_reviews ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;
ALTER TABLE anime_reviews ADD COLUMN IF NOT EXISTS sentiment_label VARCHAR(20);

-- Add missing indexes for performance:
CREATE INDEX IF NOT EXISTS idx_anime_reviews_helpful ON anime_reviews(helpful_count DESC);
CREATE INDEX IF NOT EXISTS idx_anime_reviews_sentiment ON anime_reviews(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_anime_reviews_spoiler ON anime_reviews(is_spoiler);
CREATE INDEX IF NOT EXISTS idx_anime_reviews_length ON anime_reviews(review_length);
```

### 3. Review Data Population

The `anime_reviews` table might be empty. Need to:

#### Option A: Scrape Review Data
Create a review scraper service to populate the table:
```typescript
// src/services/reviewScraper.ts
class ReviewScraper {
  async scrapeAnimeReviews(animeId: number): Promise<void>
  async batchScrapeReviews(animeIds: number[]): Promise<void>
  async calculateSentiment(reviewText: string): Promise<SentimentResult>
}
```

#### Option B: Import from Existing Data
If reviews exist elsewhere, create import script:
```typescript
// src/scripts/importReviews.ts
async function importReviewsFromJSON(filePath: string): Promise<void>
async function importReviewsFromCSV(filePath: string): Promise<void>
```

### 4. Enhanced MCP Tool Responses

Update the MCP tools to provide richer review data:

#### Current getAnimeReviews Enhancement
```typescript
// Add more detailed response structure:
{
  success: true,
  data: {
    anime_id: number,
    anime_title: string,
    reviews: ReviewItem[],
    pagination: {
      current_page: number,
      total_pages: number,
      total_reviews: number,
      per_page: number
    },
    summary: {
      avg_score: number,
      sentiment_breakdown: SentimentBreakdown,
      review_stats: ReviewStats
    },
    metadata: {
      filters_applied: FilterOptions,
      last_updated: string
    }
  }
}
```

#### New MCP Tools to Add
```typescript
// Add these tools to anime-search MCP:

server.tool("getAnimeReviewSummary",
  "Get quick summary of reviews for an anime",
  { id: z.number().int().positive() },
  async ({ id }) => {
    // Calls /api/anime/reviews/{id}/summary
  }
);

server.tool("getTopAnimeReviews",
  "Get the most helpful/detailed reviews for an anime",
  {
    id: z.number().int().positive(),
    count: z.number().int().positive().max(10).optional(),
    criteria: z.enum(['helpful', 'detailed', 'recent']).optional()
  },
  async (params) => {
    // Calls /api/anime/reviews/{id}/top
  }
);

server.tool("searchReviewsByUser",
  "Find reviews written by specific user",
  {
    username: z.string(),
    limit: z.number().int().positive().max(25).optional()
  },
  async (params) => {
    // New endpoint: /api/anime/reviews/by-user/{username}
  }
);
```

### 5. Review Analysis Features

Add sentiment and pattern analysis capabilities:

```typescript
// src/services/reviewAnalysis.ts
class ReviewAnalysisService {
  async analyzeSentiment(reviewText: string): Promise<SentimentResult>
  async extractReviewPatterns(animeId: number): Promise<ReviewPatterns>
  async findComparativeReviews(animeId: number): Promise<ComparativeReviews>
  async calculateReviewHelpfulness(reviewId: number): Promise<number>
}
```

### 6. Integration Points for Future Recommendation MCP

Prepare data structures that the recommendation MCP will need:

```typescript
// Enhanced review responses with recommendation-friendly data:
interface ReviewForRecommendations {
  anime_id: number;
  user_score: number;
  sentiment_score: number;
  mentions_other_anime: string[]; // Anime mentioned in review
  review_themes: string[]; // Extracted themes/topics
  user_taste_indicators: UserTasteProfile; // Derived from review history
}
```

## Implementation Priority

### Phase 1 (Immediate - Fix Current Issue)
1. ✅ Identify missing endpoint issue
2. ⏳ Implement basic `/reviews/:id` endpoint
3. ⏳ Add validation schema for review parameters
4. ⏳ Test MCP `getAnimeReviews` functionality

### Phase 2 (Enhanced Review Features)
1. Add `/reviews/:id/summary` endpoint
2. Add `/reviews/:id/top` endpoint
3. Implement review data population strategy
4. Add new MCP tools for enhanced review access

### Phase 3 (Analysis & Preparation)
1. Implement sentiment analysis service
2. Add review pattern analysis
3. Prepare integration points for recommendation MCP
4. Add user-specific review endpoints

### Phase 4 (Cross-Platform Integration Ready)
1. Design external review import system
2. Add normalized rating calculations
3. Implement review quality scoring
4. Add review metadata enrichment

## Database Queries Needed

### Basic Review Retrieval
```sql
-- Main reviews query with filters
SELECT
  r.*,
  a.title as anime_title
FROM anime_reviews r
JOIN anime a ON r.anime_id = a.mal_id
WHERE r.anime_id = $1
  AND ($2::boolean IS NULL OR r.is_preliminary = $2)
  AND ($3::boolean IS NULL OR r.is_spoiler = $3)
ORDER BY
  CASE WHEN $4 = 'helpful' THEN r.helpful_count END DESC,
  CASE WHEN $4 = 'score' THEN r.user_score END DESC,
  CASE WHEN $4 = 'date' THEN r.date_posted END DESC
LIMIT $5 OFFSET $6;
```

### Review Summary Statistics
```sql
-- Summary statistics query
SELECT
  COUNT(*) as total_reviews,
  AVG(user_score) as avg_score,
  COUNT(*) FILTER (WHERE sentiment_label = 'positive') as positive_count,
  COUNT(*) FILTER (WHERE sentiment_label = 'negative') as negative_count,
  COUNT(*) FILTER (WHERE sentiment_label = 'neutral') as neutral_count,
  COUNT(*) FILTER (WHERE is_preliminary = true) as preliminary_count,
  COUNT(*) FILTER (WHERE is_spoiler = true) as spoiler_count,
  AVG(review_length) as avg_review_length
FROM anime_reviews
WHERE anime_id = $1;
```

This plan addresses the immediate issue while setting up the foundation for future recommendation system integration.