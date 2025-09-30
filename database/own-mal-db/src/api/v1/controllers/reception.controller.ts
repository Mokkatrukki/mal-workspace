/**
 * Reception Controller (v1)
 * Business logic for reception/sentiment analysis endpoints
 */

import { Request, Response } from 'express';
import { receptionRepository, SentimentPattern, InsightType } from '../../repositories/receptionRepository';
import { ReviewAnalyzer } from '../../../services/reviewAnalyzer';
import { ApiResponse } from '../../types/api';

const reviewAnalyzer = new ReviewAnalyzer();

// Helper function for sentiment pattern descriptions
function getPatternDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    'mostly_positive': 'Anime with predominantly positive reviews (sentiment ratio > 2.0)',
    'mostly_negative': 'Anime with predominantly negative reviews (sentiment ratio < 0.5)',
    'highly_polarizing': 'Anime that divide opinion strongly (high score variance > 6.0)',
    'universally_loved': 'Anime with high positive sentiment and low polarization',
    'underrated': 'Anime with positive reviews but lower MAL scores (hidden gems)',
    'overrated': 'Anime with high MAL scores but more negative reviews',
    'mixed_reception': 'Anime with balanced but polarized reception'
  };
  return descriptions[pattern] || 'Unknown pattern';
}

export class ReceptionController {
  /**
   * GET /api/v1/reception/anime/:id - Get anime reception analysis
   */
  async getReceptionByAnimeId(req: Request, res: Response): Promise<void> {
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

      const reception = await reviewAnalyzer.analyzeAnimeReception(animeId);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          anime_id: animeId,
          reception_analysis: reception,
          insights: {
            overall_sentiment: reception.sentiment_ratio > 2 ? 'Mostly Positive' :
                             reception.sentiment_ratio > 0.5 ? 'Mixed to Positive' :
                             reception.sentiment_ratio > 0.2 ? 'Mixed' : 'Mostly Negative',
            polarization_level: reception.score_variance > 6 ? 'Highly Polarizing' :
                               reception.score_variance > 3 ? 'Moderately Polarizing' : 'Generally Agreed Upon',
            review_engagement: reception.avg_review_length > 2000 ? 'High Engagement' :
                              reception.avg_review_length > 1000 ? 'Moderate Engagement' : 'Low Engagement'
          },
          metadata: {
            data_source: 'local_review_database',
            last_analyzed: new Date().toISOString()
          }
        },
        meta: {
          format: req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('No reviews found')) {
        res.status(404).json({
          success: false,
          error: {
            message: 'No review data available for this anime',
            code: 'NO_REVIEWS'
          }
        });
        return;
      }

      console.error('Get reception error:', error);
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
   * GET /api/v1/reception/search - Search anime by sentiment patterns
   */
  async searchBySentiment(req: Request, res: Response): Promise<void> {
    try {
      const sentimentPattern = req.query.sentiment_pattern as SentimentPattern;
      const minReviews = req.query.min_reviews ? parseInt(req.query.min_reviews as string) : 10;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!sentimentPattern) {
        res.status(400).json({
          success: false,
          error: {
            message: 'sentiment_pattern is required',
            code: 'MISSING_PARAMETER'
          }
        });
        return;
      }

      const anime = await receptionRepository.searchBySentimentPattern(sentimentPattern, minReviews, limit);

      const formattedResults = anime.map(row => {
        const receptionData = row.reception_data;
        return {
          mal_id: row.mal_id,
          title: row.title,
          score: row.score,
          episodes: row.episodes,
          status: row.status,
          reception_summary: {
            review_count: receptionData.review_count,
            sentiment_ratio: receptionData.sentiment_ratio,
            score_variance: receptionData.score_variance,
            overall_sentiment: receptionData.sentiment_ratio > 2 ? 'Mostly Positive' :
                             receptionData.sentiment_ratio > 0.5 ? 'Mixed to Positive' :
                             receptionData.sentiment_ratio > 0.2 ? 'Mixed' : 'Mostly Negative'
          },
          url: `https://myanimelist.net/anime/${row.mal_id}`
        };
      });

      const response: ApiResponse<any> = {
        success: true,
        data: {
          search_pattern: sentimentPattern,
          criteria: {
            min_reviews: minReviews,
            pattern_description: getPatternDescription(sentimentPattern)
          },
          results_found: formattedResults.length,
          results: formattedResults
        },
        meta: {
          format: req.responseFormat,
          total: formattedResults.length
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Search by sentiment error:', error);
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
   * GET /api/v1/reception/compare - Compare reception between two anime
   */
  async compareReception(req: Request, res: Response): Promise<void> {
    try {
      const animeId1 = parseInt(req.query.anime_id_1 as string);
      const animeId2 = parseInt(req.query.anime_id_2 as string);

      if (isNaN(animeId1) || isNaN(animeId2)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Both anime_id_1 and anime_id_2 are required',
            code: 'MISSING_PARAMETERS'
          }
        });
        return;
      }

      const results = await receptionRepository.compareReception(animeId1, animeId2);

      if (results.length < 2) {
        const foundIds = results.map(r => r.mal_id);
        const missingIds = [animeId1, animeId2].filter(id => !foundIds.includes(id));

        res.status(404).json({
          success: false,
          error: {
            message: 'Could not find reception data for both anime',
            code: 'INCOMPLETE_DATA',
            details: {
              found_anime: results.length,
              missing_anime_ids: missingIds
            }
          }
        });
        return;
      }

      const anime1 = results.find(r => r.mal_id === animeId1)!;
      const anime2 = results.find(r => r.mal_id === animeId2)!;

      const reception1 = anime1.reception_data;
      const reception2 = anime2.reception_data;

      const comparison = {
        anime_1: {
          id: anime1.mal_id,
          title: anime1.title,
          score: anime1.score,
          reception: reception1
        },
        anime_2: {
          id: anime2.mal_id,
          title: anime2.title,
          score: anime2.score,
          reception: reception2
        },
        comparison_analysis: {
          sentiment_comparison: {
            more_positive: reception1.sentiment_ratio > reception2.sentiment_ratio ? anime1.title : anime2.title,
            sentiment_difference: Math.abs(reception1.sentiment_ratio - reception2.sentiment_ratio).toFixed(2)
          },
          polarization_comparison: {
            more_polarizing: reception1.score_variance > reception2.score_variance ? anime1.title : anime2.title,
            polarization_difference: Math.abs(reception1.score_variance - reception2.score_variance).toFixed(2)
          },
          engagement_comparison: {
            more_reviews: reception1.review_count > reception2.review_count ? anime1.title : anime2.title,
            review_count_difference: Math.abs(reception1.review_count - reception2.review_count),
            longer_reviews: reception1.avg_review_length > reception2.avg_review_length ? anime1.title : anime2.title
          }
        }
      };

      const response: ApiResponse<any> = {
        success: true,
        data: comparison,
        meta: {
          format: req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Compare reception error:', error);
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
   * GET /api/v1/reception/insights - Get review insights
   */
  async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const insightType = req.query.insight_type as InsightType;

      if (!insightType) {
        res.status(400).json({
          success: false,
          error: {
            message: 'insight_type is required',
            code: 'MISSING_PARAMETER'
          }
        });
        return;
      }

      const rawInsights = await receptionRepository.getInsights(insightType);

      let insights: any = {
        type: insightType,
        data: rawInsights
      };

      // Add percentages for sentiment distribution
      if (insightType === 'sentiment_distribution') {
        insights.percentages = {
          mostly_positive: (rawInsights.mostly_positive / rawInsights.total_analyzed * 100).toFixed(1),
          mixed: (rawInsights.mixed / rawInsights.total_analyzed * 100).toFixed(1),
          mostly_negative: (rawInsights.mostly_negative / rawInsights.total_analyzed * 100).toFixed(1)
        };
      }

      // Add coverage for database overview
      if (insightType === 'database_overview') {
        insights.coverage = {
          analysis_coverage: (rawInsights.analyzed_anime / rawInsights.total_anime * 100).toFixed(1),
          review_coverage: (rawInsights.anime_with_reviews / rawInsights.total_anime * 100).toFixed(1)
        };
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          insight_type: insightType,
          insights,
          metadata: {
            generated_at: new Date().toISOString(),
            data_source: 'local_review_database'
          }
        },
        meta: {
          format: req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get insights error:', error);
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

export const receptionController = new ReceptionController();