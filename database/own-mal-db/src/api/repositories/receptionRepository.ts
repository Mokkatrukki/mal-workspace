/**
 * Reception Repository
 * Handles all database operations for reception/sentiment analysis
 */

import { db } from '../../database/connection';

export type SentimentPattern =
  | 'mostly_positive'
  | 'mostly_negative'
  | 'highly_polarizing'
  | 'universally_loved'
  | 'underrated'
  | 'overrated'
  | 'mixed_reception';

export type InsightType =
  | 'sentiment_distribution'
  | 'polarization_trends'
  | 'review_engagement'
  | 'genre_sentiment'
  | 'database_overview';

export class ReceptionRepository {
  /**
   * Get reception data for a specific anime
   */
  async findReceptionByAnimeId(animeId: number) {
    const query = 'SELECT reception_data FROM anime WHERE mal_id = $1';
    const result = await db.query(query, [animeId]);
    return result.rows[0]?.reception_data || null;
  }

  /**
   * Search anime by sentiment pattern
   */
  async searchBySentimentPattern(pattern: SentimentPattern, minReviews: number, limit: number) {
    let whereCondition = '';
    let orderBy = '';

    switch (pattern) {
      case 'mostly_positive':
        whereCondition = `
          (reception_data->>'sentiment_ratio')::float > 2.0
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `(reception_data->>'sentiment_ratio')::float DESC`;
        break;

      case 'mostly_negative':
        whereCondition = `
          (reception_data->>'sentiment_ratio')::float < 0.5
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `(reception_data->>'sentiment_ratio')::float ASC`;
        break;

      case 'highly_polarizing':
        whereCondition = `
          (reception_data->>'score_variance')::float > 6.0
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `(reception_data->>'score_variance')::float DESC`;
        break;

      case 'universally_loved':
        whereCondition = `
          (reception_data->>'sentiment_ratio')::float > 3.0
          AND (reception_data->>'score_variance')::float < 3.0
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `(reception_data->>'sentiment_ratio')::float DESC`;
        break;

      case 'underrated':
        whereCondition = `
          (reception_data->>'sentiment_ratio')::float > 1.5
          AND score < 7.5
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `(reception_data->>'sentiment_ratio')::float DESC`;
        break;

      case 'overrated':
        whereCondition = `
          (reception_data->>'sentiment_ratio')::float < 1.0
          AND score > 7.5
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `score DESC`;
        break;

      case 'mixed_reception':
        whereCondition = `
          (reception_data->>'sentiment_ratio')::float BETWEEN 0.7 AND 1.3
          AND (reception_data->>'score_variance')::float > 4.0
          AND (reception_data->>'review_count')::int >= $1
        `;
        orderBy = `(reception_data->>'score_variance')::float DESC`;
        break;
    }

    const query = `
      SELECT
        mal_id, title, score, episodes, status,
        reception_data
      FROM anime
      WHERE reception_data IS NOT NULL
        AND ${whereCondition}
      ORDER BY ${orderBy}
      LIMIT $2
    `;

    const result = await db.query(query, [minReviews, limit]);
    return result.rows;
  }

  /**
   * Compare reception between two anime
   */
  async compareReception(animeId1: number, animeId2: number) {
    const animeQuery = `
      SELECT mal_id, title, score, reception_data
      FROM anime
      WHERE mal_id IN ($1, $2) AND reception_data IS NOT NULL
    `;

    const result = await db.query(animeQuery, [animeId1, animeId2]);
    return result.rows;
  }

  /**
   * Get database insights based on insight type
   */
  async getInsights(insightType: InsightType) {
    let query = '';

    switch (insightType) {
      case 'sentiment_distribution':
        query = `
          SELECT
            COUNT(*) FILTER (WHERE (reception_data->>'sentiment_ratio')::float > 2.0) as mostly_positive,
            COUNT(*) FILTER (WHERE (reception_data->>'sentiment_ratio')::float BETWEEN 0.7 AND 2.0) as mixed,
            COUNT(*) FILTER (WHERE (reception_data->>'sentiment_ratio')::float < 0.7) as mostly_negative,
            COUNT(*) as total_analyzed
          FROM anime
          WHERE reception_data IS NOT NULL
        `;
        break;

      case 'polarization_trends':
        query = `
          SELECT
            COUNT(*) FILTER (WHERE (reception_data->>'score_variance')::float > 6.0) as highly_polarizing,
            COUNT(*) FILTER (WHERE (reception_data->>'score_variance')::float BETWEEN 3.0 AND 6.0) as moderately_polarizing,
            COUNT(*) FILTER (WHERE (reception_data->>'score_variance')::float < 3.0) as consensus,
            AVG((reception_data->>'score_variance')::float) as avg_polarization
          FROM anime
          WHERE reception_data IS NOT NULL
        `;
        break;

      case 'review_engagement':
        query = `
          SELECT
            AVG((reception_data->>'review_count')::int) as avg_reviews_per_anime,
            AVG((reception_data->>'avg_review_length')::float) as avg_review_length,
            COUNT(*) FILTER (WHERE (reception_data->>'review_count')::int > 50) as highly_reviewed,
            COUNT(*) FILTER (WHERE (reception_data->>'avg_review_length')::float > 2000) as detailed_reviews
          FROM anime
          WHERE reception_data IS NOT NULL
        `;
        break;

      case 'database_overview':
        query = `
          SELECT
            COUNT(*) as total_anime,
            COUNT(*) FILTER (WHERE reception_data IS NOT NULL) as analyzed_anime,
            (SELECT COUNT(*) FROM anime_reviews) as total_reviews,
            (SELECT COUNT(DISTINCT anime_id) FROM anime_reviews) as anime_with_reviews
        `;
        break;

      default:
        throw new Error(`Unknown insight type: ${insightType}`);
    }

    const result = await db.query(query);
    return result.rows[0];
  }
}

export const receptionRepository = new ReceptionRepository();