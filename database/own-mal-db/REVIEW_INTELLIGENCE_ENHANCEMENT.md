# Review Intelligence Enhancement Guide

## 🎯 Overview

Based on our breakthrough discoveries in anime recommendation intelligence, this guide shows how to enhance your existing MAL database with **review analysis** and **taste compatibility** features.

## 🚀 Why These Enhancements Matter

Your current database has **excellent foundation data** (16K+ anime, genres, metadata). Adding review intelligence will enable:

1. **Taste Compatibility Matching** - Find users with similar preferences
2. **Reception Pattern Analysis** - Understand why anime are liked/disliked
3. **Intelligent Recommendations** - Beyond simple genre matching
4. **Mood-Based Discovery** - Context-aware suggestions

## 📊 Database Schema Enhancements

### 1. Review Data Tables

Add to your `src/database/schema.sql`:

```sql
-- Store anime reviews for sentiment analysis and user matching
CREATE TABLE anime_reviews (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES anime(mal_id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    user_score INTEGER CHECK (user_score >= 1 AND user_score <= 10),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    is_preliminary BOOLEAN DEFAULT FALSE,
    date_posted DATE,
    review_length INTEGER,
    sentiment_score FLOAT, -- Computed sentiment (-1 to 1)
    sentiment_label VARCHAR(20), -- 'positive', 'negative', 'neutral'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_anime_reviews_anime_id ON anime_reviews(anime_id);
CREATE INDEX idx_anime_reviews_username ON anime_reviews(username);
CREATE INDEX idx_anime_reviews_score ON anime_reviews(user_score) WHERE user_score IS NOT NULL;
CREATE INDEX idx_anime_reviews_preliminary ON anime_reviews(is_preliminary);
CREATE INDEX idx_anime_reviews_sentiment ON anime_reviews(sentiment_score) WHERE sentiment_score IS NOT NULL;

-- Store basic user profile data (for taste matching)
CREATE TABLE user_profiles (
    username VARCHAR(100) PRIMARY KEY,
    anime_completed INTEGER DEFAULT 0,
    anime_watching INTEGER DEFAULT 0,
    anime_dropped INTEGER DEFAULT 0,
    mean_score FLOAT,
    profile_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    taste_profile JSONB, -- Store computed taste characteristics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store user's anime ratings (for compatibility analysis)
CREATE TABLE user_anime_ratings (
    username VARCHAR(100) REFERENCES user_profiles(username) ON DELETE CASCADE,
    anime_id INTEGER REFERENCES anime(mal_id) ON DELETE CASCADE,
    user_score INTEGER CHECK (user_score >= 1 AND user_score <= 10),
    watch_status VARCHAR(50), -- 'completed', 'watching', 'dropped', 'on_hold', 'plan_to_watch'
    episodes_watched INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (username, anime_id)
);

-- Indexes
CREATE INDEX idx_user_ratings_anime_id ON user_anime_ratings(anime_id);
CREATE INDEX idx_user_ratings_score ON user_anime_ratings(user_score) WHERE user_score IS NOT NULL;
CREATE INDEX idx_user_ratings_status ON user_anime_ratings(watch_status);

-- Store computed reception metrics for anime
ALTER TABLE anime ADD COLUMN IF NOT EXISTS reception_data JSONB;

-- Example reception_data structure:
-- {
--   "review_count": 150,
--   "score_variance": 2.3,
--   "polarization_score": 1.2,
--   "sentiment_ratio": 0.67,
--   "preliminary_review_count": 45,
--   "avg_review_length": 250,
--   "last_analyzed": "2024-09-18T12:00:00Z"
-- }

-- Create index for reception data queries
CREATE INDEX idx_anime_reception_data ON anime USING GIN (reception_data) WHERE reception_data IS NOT NULL;
```

### 2. Migration Script

Create `src/database/migrations/002_add_review_intelligence.sql`:

```sql
-- Migration to add review intelligence tables
-- Run this after your existing schema

\echo 'Adding review intelligence tables...'

-- Add the tables from above
-- (Copy the CREATE TABLE statements from section 1)

\echo 'Review intelligence tables added successfully!'
```

## 🔧 New Scripts to Add

### 1. Review Crawler Script

Create `src/scripts/crawlReviews.ts`:

```typescript
import { JikanAPI } from '../services/jikanService';
import { pool } from '../database/connection';
import { ReviewAnalyzer } from '../services/reviewAnalyzer';

interface ReviewCrawlConfig {
  maxReviewsPerAnime: number;
  includePreliminary: boolean;
  priorityAnimeList?: number[]; // Specific anime to focus on
}

export class ReviewCrawler {
  private jikan: JikanAPI;
  private analyzer: ReviewAnalyzer;

  constructor() {
    this.jikan = new JikanAPI();
    this.analyzer = new ReviewAnalyzer();
  }

  async crawlReviewsForAnime(animeId: number, config: ReviewCrawlConfig) {
    console.log(`🔍 Crawling reviews for anime ${animeId}`);

    try {
      // Get reviews from Jikan API
      const reviews = await this.jikan.getAnimeReviews(animeId, {
        preliminary: config.includePreliminary
      });

      let savedCount = 0;

      for (const review of reviews.slice(0, config.maxReviewsPerAnime)) {
        // Analyze sentiment
        const sentiment = await this.analyzer.analyzeSentiment(review.review || '');

        // Save to database
        await this.saveReview({
          anime_id: animeId,
          username: review.user.username,
          user_score: review.score,
          review_text: review.review,
          helpful_count: review.votes,
          is_preliminary: review.is_preliminary || false,
          date_posted: new Date(review.date),
          review_length: review.review?.length || 0,
          sentiment_score: sentiment.score,
          sentiment_label: sentiment.label
        });

        savedCount++;
      }

      console.log(`✅ Saved ${savedCount} reviews for anime ${animeId}`);
      return savedCount;

    } catch (error) {
      console.error(`❌ Error crawling reviews for anime ${animeId}:`, error);
      return 0;
    }
  }

  async crawlPriorityAnime() {
    // Focus on anime that would benefit most from review analysis
    const priorityAnime = await this.identifyPriorityAnime();

    console.log(`🎯 Found ${priorityAnime.length} priority anime for review crawling`);

    for (const anime of priorityAnime) {
      await this.crawlReviewsForAnime(anime.mal_id, {
        maxReviewsPerAnime: 50,
        includePreliminary: true
      });

      // Rate limiting
      await this.sleep(1000);
    }
  }

  private async identifyPriorityAnime() {
    // Query for anime that would benefit from review analysis
    const query = `
      SELECT mal_id, title, score, members, airing
      FROM anime
      WHERE
        -- Currently airing anime (need preliminary reviews)
        (airing = true) OR
        -- Popular anime with potential for taste matching
        (members > 50000 AND score IS NOT NULL) OR
        -- Hidden gems (high score, low members)
        (score >= 8.0 AND members BETWEEN 1000 AND 100000) OR
        -- Polarizing anime (around 7.0 score - mixed reception)
        (score BETWEEN 6.5 AND 7.5 AND members > 20000)
      ORDER BY
        CASE WHEN airing THEN 1 ELSE 2 END,
        members DESC
      LIMIT 200
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  private async saveReview(reviewData: any) {
    const query = `
      INSERT INTO anime_reviews (
        anime_id, username, user_score, review_text, helpful_count,
        is_preliminary, date_posted, review_length, sentiment_score, sentiment_label
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (anime_id, username) DO UPDATE SET
        user_score = EXCLUDED.user_score,
        review_text = EXCLUDED.review_text,
        helpful_count = EXCLUDED.helpful_count,
        sentiment_score = EXCLUDED.sentiment_score,
        sentiment_label = EXCLUDED.sentiment_label,
        updated_at = NOW()
    `;

    await pool.query(query, [
      reviewData.anime_id,
      reviewData.username,
      reviewData.user_score,
      reviewData.review_text,
      reviewData.helpful_count,
      reviewData.is_preliminary,
      reviewData.date_posted,
      reviewData.review_length,
      reviewData.sentiment_score,
      reviewData.sentiment_label
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (require.main === module) {
  const crawler = new ReviewCrawler();

  const command = process.argv[2];

  if (command === 'priority') {
    crawler.crawlPriorityAnime()
      .then(() => console.log('✅ Priority anime review crawling completed'))
      .catch(console.error);
  } else if (command === 'anime' && process.argv[3]) {
    const animeId = parseInt(process.argv[3]);
    crawler.crawlReviewsForAnime(animeId, {
      maxReviewsPerAnime: 50,
      includePreliminary: true
    })
      .then(() => console.log(`✅ Review crawling completed for anime ${animeId}`))
      .catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  npm run crawl:reviews priority');
    console.log('  npm run crawl:reviews anime <anime_id>');
  }
}
```

### 2. Review Analyzer Service

Create `src/services/reviewAnalyzer.ts`:

```typescript
export interface SentimentAnalysis {
  score: number; // -1 (negative) to 1 (positive)
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface ReceptionProfile {
  anime_id: number;
  review_count: number;
  score_variance: number;
  polarization_score: number;
  sentiment_ratio: number;
  preliminary_review_count: number;
  avg_review_length: number;
  common_complaints: string[];
  common_praises: string[];
}

export class ReviewAnalyzer {

  async analyzeSentiment(reviewText: string): Promise<SentimentAnalysis> {
    if (!reviewText || reviewText.length < 10) {
      return { score: 0, label: 'neutral', confidence: 0 };
    }

    // Simple keyword-based sentiment analysis
    // In production, you'd use a proper NLP library
    const positiveWords = [
      'amazing', 'excellent', 'fantastic', 'brilliant', 'masterpiece',
      'beautiful', 'perfect', 'incredible', 'outstanding', 'wonderful',
      'love', 'adore', 'enjoy', 'great', 'awesome', 'superb'
    ];

    const negativeWords = [
      'terrible', 'awful', 'horrible', 'boring', 'disappointing',
      'waste', 'trash', 'bad', 'worst', 'hate', 'annoying',
      'stupid', 'ridiculous', 'pointless', 'overrated'
    ];

    const text = reviewText.toLowerCase();
    const words = text.split(/\W+/);

    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    }

    const totalSentimentWords = positiveScore + negativeScore;
    if (totalSentimentWords === 0) {
      return { score: 0, label: 'neutral', confidence: 0.1 };
    }

    const score = (positiveScore - negativeScore) / Math.max(totalSentimentWords, 1);
    const confidence = totalSentimentWords / words.length;

    let label: 'positive' | 'negative' | 'neutral';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';
    else label = 'neutral';

    return { score, label, confidence: Math.min(confidence * 5, 1) };
  }

  async analyzeAnimeReception(animeId: number): Promise<ReceptionProfile> {
    const query = `
      SELECT
        user_score,
        review_text,
        is_preliminary,
        sentiment_score,
        review_length
      FROM anime_reviews
      WHERE anime_id = $1
    `;

    const result = await pool.query(query, [animeId]);
    const reviews = result.rows;

    if (reviews.length === 0) {
      throw new Error(`No reviews found for anime ${animeId}`);
    }

    // Calculate reception metrics
    const scores = reviews.map(r => r.user_score).filter(s => s !== null);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;

    const positiveReviews = reviews.filter(r => r.sentiment_score > 0.2).length;
    const negativeReviews = reviews.filter(r => r.sentiment_score < -0.2).length;
    const sentimentRatio = positiveReviews / Math.max(negativeReviews, 1);

    const preliminaryCount = reviews.filter(r => r.is_preliminary).length;
    const avgReviewLength = reviews.reduce((sum, r) => sum + (r.review_length || 0), 0) / reviews.length;

    // Extract common themes (simplified)
    const allReviewText = reviews.map(r => r.review_text || '').join(' ').toLowerCase();
    const commonComplaints = this.extractCommonThemes(allReviewText, 'negative');
    const commonPraises = this.extractCommonThemes(allReviewText, 'positive');

    return {
      anime_id: animeId,
      review_count: reviews.length,
      score_variance: variance,
      polarization_score: variance, // Simple approximation
      sentiment_ratio: sentimentRatio,
      preliminary_review_count: preliminaryCount,
      avg_review_length: avgReviewLength,
      common_complaints: commonComplaints,
      common_praises: commonPraises
    };
  }

  private extractCommonThemes(text: string, type: 'positive' | 'negative'): string[] {
    // Simplified theme extraction
    const themes = {
      positive: ['animation', 'music', 'story', 'character development', 'plot'],
      negative: ['pacing', 'animation quality', 'plot holes', 'character development', 'ending']
    };

    return themes[type].filter(theme =>
      text.includes(theme) || text.includes(theme.replace(' ', ''))
    ).slice(0, 5);
  }
}
```

### 3. Taste Matching Service

Create `src/services/tasteMatchingService.ts`:

```typescript
export interface TasteCompatibility {
  username: string;
  compatibility_score: number;
  common_anime_count: number;
  score_correlation: number;
}

export interface TasteProfile {
  username: string;
  preferred_genres: string[];
  avg_score: number;
  score_variance: number;
  tolerance_level: 'strict' | 'moderate' | 'forgiving';
  viewing_personality: 'quality_focused' | 'entertainment_focused' | 'discovery_oriented';
}

export class TasteMatchingService {

  async findCompatibleReviewers(animeId: number, userScore: number): Promise<TasteCompatibility[]> {
    // Find reviewers who scored similarly to the user
    const query = `
      SELECT
        username,
        user_score,
        sentiment_score
      FROM anime_reviews
      WHERE anime_id = $1
        AND user_score IS NOT NULL
      ORDER BY ABS(user_score - $2)
    `;

    const result = await pool.query(query, [animeId, userScore]);
    const reviews = result.rows;

    const compatibleUsers: TasteCompatibility[] = [];

    for (const review of reviews) {
      const scoreDiff = Math.abs(review.user_score - userScore);

      // Only consider users with similar scores
      if (scoreDiff <= 1) {
        const compatibility = 1 - (scoreDiff / 5); // Convert to 0-1 scale

        compatibleUsers.push({
          username: review.username,
          compatibility_score: compatibility,
          common_anime_count: 1, // We'll enhance this later
          score_correlation: compatibility
        });
      }
    }

    return compatibleUsers.sort((a, b) => b.compatibility_score - a.compatibility_score);
  }

  async buildTasteProfile(username: string): Promise<TasteProfile> {
    // Get user's ratings and reviews
    const query = `
      SELECT
        r.user_score,
        r.sentiment_score,
        a.mal_id,
        array_agg(g.name) as genres
      FROM anime_reviews r
      JOIN anime a ON r.anime_id = a.mal_id
      LEFT JOIN anime_genres ag ON a.mal_id = ag.anime_id
      LEFT JOIN genres g ON ag.genre_id = g.id
      WHERE r.username = $1 AND r.user_score IS NOT NULL
      GROUP BY r.user_score, r.sentiment_score, a.mal_id
    `;

    const result = await pool.query(query, [username]);
    const userRatings = result.rows;

    if (userRatings.length === 0) {
      throw new Error(`No ratings found for user ${username}`);
    }

    // Calculate taste characteristics
    const scores = userRatings.map(r => r.user_score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;

    // Determine tolerance level
    let toleranceLevel: 'strict' | 'moderate' | 'forgiving';
    if (avgScore >= 8) toleranceLevel = 'strict';
    else if (avgScore >= 6) toleranceLevel = 'moderate';
    else toleranceLevel = 'forgiving';

    // Determine viewing personality
    let viewingPersonality: 'quality_focused' | 'entertainment_focused' | 'discovery_oriented';
    if (variance < 1 && avgScore >= 8) viewingPersonality = 'quality_focused';
    else if (variance > 2) viewingPersonality = 'entertainment_focused';
    else viewingPersonality = 'discovery_oriented';

    // Extract preferred genres
    const genreFrequency: { [key: string]: number } = {};
    userRatings.forEach(rating => {
      if (rating.user_score >= 7 && rating.genres) {
        rating.genres.forEach((genre: string) => {
          if (genre) {
            genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
          }
        });
      }
    });

    const preferredGenres = Object.entries(genreFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    return {
      username,
      preferred_genres: preferredGenres,
      avg_score: avgScore,
      score_variance: variance,
      tolerance_level: toleranceLevel,
      viewing_personality: viewingPersonality
    };
  }

  async getRecommendationsFromCompatibleUsers(compatibleUsers: TasteCompatibility[]): Promise<number[]> {
    if (compatibleUsers.length === 0) return [];

    // Get highly-rated anime from compatible users
    const usernames = compatibleUsers.slice(0, 5).map(u => u.username);

    const query = `
      SELECT anime_id, COUNT(*) as recommendation_count, AVG(user_score) as avg_score
      FROM anime_reviews
      WHERE username = ANY($1)
        AND user_score >= 8
      GROUP BY anime_id
      HAVING COUNT(*) >= 2
      ORDER BY recommendation_count DESC, avg_score DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [usernames]);
    return result.rows.map(row => row.anime_id);
  }
}
```

## 📋 Package.json Scripts to Add

Add these to your `package.json`:

```json
{
  "scripts": {
    "crawl:reviews": "tsx src/scripts/crawlReviews.ts",
    "analyze:reception": "tsx src/scripts/analyzeReception.ts",
    "build:taste-profiles": "tsx src/scripts/buildTasteProfiles.ts"
  }
}
```

## 🎯 Implementation Roadmap

### Week 1: Foundation
1. **Add database schema** - Run migration with new tables
2. **Create ReviewCrawler** - Start with priority anime (Water Magician, currently airing)
3. **Build ReviewAnalyzer** - Basic sentiment analysis
4. **Test with Water Magician** - Validate the approach

### Week 2: Intelligence
1. **Enhance TasteMatchingService** - Build compatibility algorithms
2. **Create API endpoints** - Expose review intelligence via REST API
3. **Add reception analysis** - Understand polarization patterns
4. **Build taste profiles** - User personality analysis

### Week 3: Integration
1. **Connect to anime chat AI** - Use review intelligence in recommendations
2. **Add caching** - Store computed results for performance
3. **Quality assurance** - Validate recommendation quality
4. **Analytics** - Track what works

## 🔥 Usage Examples

### Crawl Reviews for Priority Anime
```bash
npm run crawl:reviews priority
```

### Analyze Specific Anime Reception
```bash
npm run crawl:reviews anime 60732  # Water Magician
```

### Build User Taste Profiles
```bash
npm run build:taste-profiles
```

### Query Review Intelligence via API
```bash
# Get anime with reception analysis
curl "http://localhost:3000/api/anime/60732/reception"

# Find compatible reviewers
curl "http://localhost:3000/api/anime/60732/compatible-reviewers?user_score=6"

# Get taste-based recommendations
curl "http://localhost:3000/api/recommendations/taste-match?anime_id=60732&user_score=6"
```

## 🎉 What This Gives You

1. **Taste Compatibility Engine** - Find users with similar preferences
2. **Reception Intelligence** - Understand why anime are liked/disliked
3. **Intelligent Recommendations** - Beyond basic genre matching
4. **User Psychology Understanding** - Quality-focused vs entertainment-focused users
5. **Mood-Context Awareness** - Recommendations based on viewing context

This transforms your solid database foundation into an **intelligent recommendation system** that understands human psychology and preference patterns!

Ready to start with the database migration and basic review crawler?