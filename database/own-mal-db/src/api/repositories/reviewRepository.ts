/**
 * Review Repository
 * Handles all database operations for review data
 */

import { db } from '../../database/connection';

export interface ReviewQueryOptions {
  page?: number;
  limit?: number;
  preliminary?: boolean;
  spoilers?: boolean;
  sort?: 'date' | 'helpful' | 'score';
  order?: 'asc' | 'desc';
}

export class ReviewRepository {
  /**
   * Get reviews for a specific anime with filtering and pagination
   */
  async findByAnimeId(animeId: number, options: ReviewQueryOptions) {
    const { page = 1, limit = 10, preliminary, sort = 'date', order = 'desc' } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['r.anime_id = $1'];
    const queryValues: any[] = [animeId];
    let paramIndex = 2;

    if (preliminary !== undefined) {
      whereConditions.push(`r.is_preliminary = $${paramIndex}`);
      queryValues.push(preliminary);
      paramIndex++;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    switch (sort) {
      case 'helpful':
        orderByClause = `r.helpful_count ${order.toUpperCase()}`;
        break;
      case 'score':
        orderByClause = `r.user_score ${order.toUpperCase()} NULLS LAST`;
        break;
      case 'date':
      default:
        orderByClause = `r.date_posted ${order.toUpperCase()} NULLS LAST`;
        break;
    }

    const reviewsQuery = `
      SELECT
        r.id,
        r.anime_id,
        r.username,
        r.user_score,
        r.review_text,
        r.helpful_count,
        r.is_preliminary,
        r.date_posted,
        r.review_length,
        r.sentiment_score,
        r.sentiment_label,
        a.title as anime_title
      FROM anime_reviews r
      JOIN anime a ON r.anime_id = a.mal_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryValues.push(limit, offset);

    const result = await db.query(reviewsQuery, queryValues);
    return result.rows;
  }

  /**
   * Count total reviews for an anime with optional filters
   */
  async countByAnimeId(animeId: number, options: ReviewQueryOptions) {
    let whereConditions = ['r.anime_id = $1'];
    const queryValues: any[] = [animeId];
    let paramIndex = 2;

    if (options.preliminary !== undefined) {
      whereConditions.push(`r.is_preliminary = $${paramIndex}`);
      queryValues.push(options.preliminary);
      paramIndex++;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM anime_reviews r
      WHERE ${whereConditions.join(' AND ')}
    `;

    const result = await db.query(countQuery, queryValues);
    return parseInt(result.rows[0].total);
  }

  /**
   * Get review summary statistics for an anime
   */
  async getSummary(animeId: number) {
    const summaryQuery = `
      SELECT
        COUNT(*) as total_reviews,
        AVG(user_score) as avg_score,
        SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
        SUM(CASE WHEN is_preliminary = true THEN 1 ELSE 0 END) as preliminary_count,
        AVG(review_length) as avg_review_length,
        AVG(helpful_count) as avg_helpful_count
      FROM anime_reviews
      WHERE anime_id = $1
    `;

    const result = await db.query(summaryQuery, [animeId]);
    return result.rows[0];
  }

  /**
   * Get top helpful reviews for an anime
   */
  async getTopReviews(animeId: number, limit: number = 3) {
    const topReviewsQuery = `
      SELECT
        username,
        user_score,
        helpful_count,
        sentiment_label,
        date_posted,
        is_preliminary
      FROM anime_reviews
      WHERE anime_id = $1
      ORDER BY helpful_count DESC, date_posted DESC
      LIMIT $2
    `;

    const result = await db.query(topReviewsQuery, [animeId, limit]);
    return result.rows;
  }

  /**
   * Get balanced sample of reviews (positive, negative, neutral)
   */
  async getBalancedSample(animeId: number, totalLimit: number = 10) {
    const reviewsPerSentiment = Math.ceil(totalLimit / 3);

    const sampleQuery = `
      (SELECT
        id, username, user_score, review_text, helpful_count,
        sentiment_label, sentiment_score, is_preliminary, date_posted, review_length
       FROM anime_reviews
       WHERE anime_id = $1 AND sentiment_label = 'positive'
       ORDER BY helpful_count DESC, date_posted DESC
       LIMIT $2)
      UNION ALL
      (SELECT
        id, username, user_score, review_text, helpful_count,
        sentiment_label, sentiment_score, is_preliminary, date_posted, review_length
       FROM anime_reviews
       WHERE anime_id = $1 AND sentiment_label = 'negative'
       ORDER BY helpful_count DESC, date_posted DESC
       LIMIT $2)
      UNION ALL
      (SELECT
        id, username, user_score, review_text, helpful_count,
        sentiment_label, sentiment_score, is_preliminary, date_posted, review_length
       FROM anime_reviews
       WHERE anime_id = $1 AND sentiment_label = 'neutral'
       ORDER BY helpful_count DESC, date_posted DESC
       LIMIT $2)
      ORDER BY sentiment_label, helpful_count DESC
      LIMIT $3
    `;

    const result = await db.query(sampleQuery, [animeId, reviewsPerSentiment, reviewsPerSentiment, reviewsPerSentiment, totalLimit]);
    return result.rows;
  }
}

export const reviewRepository = new ReviewRepository();