/**
 * Reviews Controller (v1)
 * Business logic for review endpoints
 */

import { Request, Response } from 'express';
import { reviewRepository } from '../../repositories/reviewRepository';
import { db } from '../../../database/connection';
import { ApiResponse } from '../../types/api';

export class ReviewsController {
  /**
   * GET /api/v1/reviews/anime/:id - Get reviews for an anime
   */
  async getReviewsByAnimeId(req: Request, res: Response): Promise<void> {
    try {
      const animeId = parseInt(req.params.id);
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const preliminary = req.query.preliminary === 'true' ? true : req.query.preliminary === 'false' ? false : undefined;
      const sort = (req.query.sort as any) || 'date';
      const order = (req.query.order as any) || 'desc';

      if (isNaN(animeId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid anime ID',
            code: 'INVALID_ID'
          }
        });
        return;
      }

      const [reviews, totalReviews] = await Promise.all([
        reviewRepository.findByAnimeId(animeId, { page, limit, preliminary, sort, order }),
        reviewRepository.countByAnimeId(animeId, { preliminary })
      ]);

      if (reviews.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No reviews found for this anime',
            code: 'NO_REVIEWS'
          }
        });
        return;
      }

      const totalPages = Math.ceil(totalReviews / limit);
      const animeTitle = reviews[0].anime_title;

      const response: ApiResponse<any> = {
        success: true,
        data: {
          anime_id: animeId,
          anime_title: animeTitle,
          reviews: reviews.map(review => ({
            id: review.id,
            username: review.username,
            user_score: review.user_score,
            review_text: review.review_text,
            helpful_count: review.helpful_count,
            is_preliminary: review.is_preliminary,
            date_posted: review.date_posted,
            review_length: review.review_length,
            sentiment_score: review.sentiment_score,
            sentiment_label: review.sentiment_label
          })),
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_reviews: totalReviews,
            per_page: limit,
            has_next: page < totalPages,
            has_prev: page > 1
          }
        },
        meta: {
          format: req.responseFormat,
          page,
          limit,
          total: totalReviews
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  /**
   * GET /api/v1/reviews/anime/:id/summary - Get review summary
   */
  async getReviewSummary(req: Request, res: Response): Promise<void> {
    try {
      const animeId = parseInt(req.params.id);

      if (isNaN(animeId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid anime ID',
            code: 'INVALID_ID'
          }
        });
        return;
      }

      // Get anime title
      const titleQuery = `SELECT title FROM anime WHERE mal_id = $1`;
      const titleResult = await db.query(titleQuery, [animeId]);

      if (titleResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Anime not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      const animeTitle = titleResult.rows[0].title;

      const [summary, topReviews] = await Promise.all([
        reviewRepository.getSummary(animeId),
        reviewRepository.getTopReviews(animeId, 3)
      ]);

      const totalReviews = parseInt(summary.total_reviews);

      if (totalReviews === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No reviews found for this anime',
            code: 'NO_REVIEWS'
          }
        });
        return;
      }

      const positivePercent = (summary.positive_count / totalReviews * 100).toFixed(1);
      const negativePercent = (summary.negative_count / totalReviews * 100).toFixed(1);
      const neutralPercent = (summary.neutral_count / totalReviews * 100).toFixed(1);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          anime_id: animeId,
          anime_title: animeTitle,
          review_summary: {
            total_reviews: totalReviews,
            average_score: summary.avg_score ? parseFloat(summary.avg_score).toFixed(2) : null,
            sentiment_breakdown: {
              positive: `${summary.positive_count} (${positivePercent}%)`,
              negative: `${summary.negative_count} (${negativePercent}%)`,
              neutral: `${summary.neutral_count} (${neutralPercent}%)`
            },
            review_types: {
              preliminary_reviews: summary.preliminary_count,
              regular_reviews: totalReviews - summary.preliminary_count
            },
            engagement_metrics: {
              avg_review_length: summary.avg_review_length ? Math.round(summary.avg_review_length) : null,
              avg_helpful_votes: summary.avg_helpful_count ? parseFloat(summary.avg_helpful_count).toFixed(1) : null
            }
          },
          top_reviewers: topReviews.map(review => ({
            username: review.username,
            score: review.user_score,
            helpful_votes: review.helpful_count,
            sentiment: review.sentiment_label,
            date: review.date_posted,
            is_preliminary: review.is_preliminary
          }))
        },
        meta: {
          format: req.responseFormat,
          note: `Use /api/v1/reviews/anime/${animeId} for full review text and details`
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get review summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }

  /**
   * GET /api/v1/reviews/anime/:id/sample - Get balanced sample of reviews
   */
  async getReviewSample(req: Request, res: Response): Promise<void> {
    try {
      const animeId = parseInt(req.params.id);
      const limitParam = parseInt(req.query.limit as string) || 10;
      const limit = Math.min(limitParam, 15); // Cap at 15

      if (isNaN(animeId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid anime ID',
            code: 'INVALID_ID'
          }
        });
        return;
      }

      // Get anime title
      const titleQuery = `SELECT title FROM anime WHERE mal_id = $1`;
      const titleResult = await db.query(titleQuery, [animeId]);

      if (titleResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Anime not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      const animeTitle = titleResult.rows[0].title;
      const reviews = await reviewRepository.getBalancedSample(animeId, limit);

      if (reviews.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No reviews found for this anime',
            code: 'NO_REVIEWS'
          }
        });
        return;
      }

      const sentimentCounts = {
        positive: reviews.filter(r => r.sentiment_label === 'positive').length,
        negative: reviews.filter(r => r.sentiment_label === 'negative').length,
        neutral: reviews.filter(r => r.sentiment_label === 'neutral').length
      };

      const response: ApiResponse<any> = {
        success: true,
        data: {
          anime_id: animeId,
          anime_title: animeTitle,
          sample_info: {
            total_sampled: reviews.length,
            sentiment_distribution: sentimentCounts,
            sampling_strategy: 'Balanced mix of positive/negative/neutral reviews, prioritized by helpfulness'
          },
          reviews: reviews.map(review => ({
            id: review.id,
            username: review.username,
            user_score: review.user_score,
            review_text: review.review_text,
            helpful_count: review.helpful_count,
            sentiment_label: review.sentiment_label,
            sentiment_score: review.sentiment_score,
            is_preliminary: review.is_preliminary,
            date_posted: review.date_posted,
            review_length: review.review_length
          }))
        },
        meta: {
          format: req.responseFormat,
          note: 'Balanced sample for recommendation analysis with full review text'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get review sample error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
}

export const reviewsController = new ReviewsController();