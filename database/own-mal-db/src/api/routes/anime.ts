import { Router, Request, Response } from 'express';
import { animeService } from '../../services/animeService';
import { SearchParams } from '../../types/anime';
import { ReviewAnalyzer } from '../../services/reviewAnalyzer';
import { z } from 'zod';
import { deprecationMiddleware } from '../middleware/deprecationMiddleware';

const router = Router();
const reviewAnalyzer = new ReviewAnalyzer();

// Apply deprecation middleware to all legacy endpoints
router.use(deprecationMiddleware);

// Validation schemas
const searchParamsSchema = z.object({
  query: z.string().optional(),
  genres: z.string().optional(),
  min_score: z.coerce.number().min(0).max(10).optional(),
  max_score: z.coerce.number().min(0).max(10).optional(),
  
  // Year filtering
  year: z.coerce.number().int().min(1900).max(2030).optional(),
  min_year: z.coerce.number().int().min(1900).max(2030).optional(),
  max_year: z.coerce.number().int().min(1900).max(2030).optional(),
  decade: z.string().regex(/^\d{4}s$/).optional(), // e.g., "1990s", "2000s"
  
  // Popularity filtering
  min_popularity: z.coerce.number().int().positive().optional(),
  max_popularity: z.coerce.number().int().positive().optional(),
  exclude_very_popular: z.coerce.boolean().optional(),
  
  // Status and airing filtering
  airing_status: z.enum(['airing', 'finished', 'upcoming']).optional(),
  current_year_only: z.coerce.boolean().optional(),
  season: z.enum(['winter', 'spring', 'summer', 'fall']).optional(),
  
  // Episode count filtering
  min_episodes: z.coerce.number().int().positive().optional(),
  max_episodes: z.coerce.number().int().positive().optional(),
  
  // Type filtering
  type: z.enum(['TV', 'Movie', 'OVA', 'Special', 'ONA', 'Music']).optional(),
  
  order_by: z.enum([
    'mal_id', 'title', 'type', 'rating', 'start_date', 'end_date',
    'episodes', 'score', 'scored_by', 'rank', 'popularity', 'members', 'favorites'
  ]).optional().default('mal_id'),
  sort: z.enum(['desc', 'asc']).optional().default('desc'),
  sfw: z.coerce.boolean().optional().default(true),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(25).optional().default(25)
});

const animeIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

const sentimentPatternSchema = z.object({
  sentiment_pattern: z.enum([
    "mostly_positive", "mostly_negative", "highly_polarizing",
    "universally_loved", "underrated", "overrated", "mixed_reception"
  ]),
  min_reviews: z.coerce.number().int().positive().optional().default(10),
  limit: z.coerce.number().int().positive().max(50).optional().default(20)
});

const insightTypeSchema = z.object({
  insight_type: z.enum([
    "sentiment_distribution", "polarization_trends", "review_engagement",
    "genre_sentiment", "database_overview"
  ]),
  genre_filter: z.string().optional()
});

const compareReceptionSchema = z.object({
  anime_id_1: z.coerce.number().int().positive(),
  anime_id_2: z.coerce.number().int().positive()
});

const bulkAnimeSchema = z.object({
  ids: z.string().transform((str) => {
    const ids = str.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
    if (ids.length === 0) {
      throw new Error('No valid anime IDs provided');
    }
    if (ids.length > 100) {
      throw new Error('Too many IDs. Maximum 100 IDs allowed per request');
    }
    return ids;
  }),
  compact: z.coerce.boolean().optional().default(false)
});

// GET /api/anime/search - Search anime with filters
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = searchParamsSchema.parse(req.query);
    
    const searchParams: SearchParams = {
      query: validatedParams.query,
      genres: validatedParams.genres,
      min_score: validatedParams.min_score,
      max_score: validatedParams.max_score,
      year: validatedParams.year,
      min_year: validatedParams.min_year,
      max_year: validatedParams.max_year,
      decade: validatedParams.decade,
      min_popularity: validatedParams.min_popularity,
      max_popularity: validatedParams.max_popularity,
      exclude_very_popular: validatedParams.exclude_very_popular,
      airing_status: validatedParams.airing_status,
      current_year_only: validatedParams.current_year_only,
      season: validatedParams.season,
      min_episodes: validatedParams.min_episodes,
      max_episodes: validatedParams.max_episodes,
      type: validatedParams.type,
      order_by: validatedParams.order_by,
      sort: validatedParams.sort,
      sfw: validatedParams.sfw,
      page: validatedParams.page,
      limit: validatedParams.limit
    };
    
    const results = await animeService.searchAnime(searchParams);
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }
    
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/capabilities - Get search capabilities for MCP tool discovery
router.get('/capabilities', async (req: Request, res: Response): Promise<void> => {
  try {
    const capabilities = await animeService.getSearchCapabilities();
    
    res.json({
      success: true,
      data: capabilities,
      note: "This endpoint provides comprehensive information about available search filters and capabilities for MCP tools and AI assistants."
    });
    
  } catch (error) {
    console.error('Get capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/top/:limit? - Get top anime by score
router.get('/top/:limit?', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.params.limit ? parseInt(req.params.limit) : 50;
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 100.'
      });
      return;
    }
    
    const topAnime = await animeService.getTopAnime(limit);
    
    res.json({
      success: true,
      data: {
        total_results: topAnime.length,
        limit: limit,
        category: 'top_anime',
        results: topAnime
      }
    });
    
  } catch (error) {
    console.error('Get top anime error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/genres - Get all available genres
router.get('/genres', async (req: Request, res: Response): Promise<void> => {
  try {
    const genres = await animeService.getAllGenres();
    
    res.json({
      success: true,
      data: {
        total_genres: genres.length,
        note: "Use these genre IDs in the search endpoint's 'genres' parameter to filter by genre. Example: genres=1 for Action, or genres=1,4 for Action+Comedy.",
        genres: genres.map(genre => ({
          id: genre.id,
          name: genre.name,
          count: genre.count || 0,
          url: genre.url
        }))
      }
    });
    
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/stats/by-genre - Get anime count statistics by genre
router.get('/stats/by-genre', async (req: Request, res: Response) => {
  try {
    const stats = await animeService.getAnimeCountByGenre();
    
    res.json({
      success: true,
      data: {
        total_genres: stats.length,
        statistics: stats
      }
    });
    
  } catch (error) {
    console.error('Get genre stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Clean data endpoints for LLM consumption

// GET /api/anime/clean/search - Search anime with clean, LLM-optimized data
router.get('/clean/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = searchParamsSchema.parse(req.query);
    
    const searchParams: SearchParams = {
      query: validatedParams.query,
      genres: validatedParams.genres,
      min_score: validatedParams.min_score,
      max_score: validatedParams.max_score,
      year: validatedParams.year,
      min_year: validatedParams.min_year,
      max_year: validatedParams.max_year,
      decade: validatedParams.decade,
      min_popularity: validatedParams.min_popularity,
      max_popularity: validatedParams.max_popularity,
      exclude_very_popular: validatedParams.exclude_very_popular,
      airing_status: validatedParams.airing_status,
      current_year_only: validatedParams.current_year_only,
      season: validatedParams.season,
      min_episodes: validatedParams.min_episodes,
      max_episodes: validatedParams.max_episodes,
      type: validatedParams.type,
      order_by: validatedParams.order_by,
      sort: validatedParams.sort,
      sfw: validatedParams.sfw,
      page: validatedParams.page,
      limit: validatedParams.limit
    };
    
    const results = await animeService.searchCleanAnime(searchParams);
    
    res.json({
      success: true,
      data: results,
      note: "This endpoint returns cleaned, LLM-optimized anime data with essential fields only."
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }
    
    console.error('Clean search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/clean/:id - Get clean anime by MAL ID
router.get('/clean/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = animeIdSchema.parse(req.params);
    
    const anime = await animeService.getCleanAnimeById(id);
    
    if (!anime) {
      res.status(404).json({
        success: false,
        error: 'Anime not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: anime,
      note: "This endpoint returns cleaned, LLM-optimized anime data with essential fields only."
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid anime ID',
        details: error.errors
      });
      return;
    }
    
    console.error('Get clean anime error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/clean/top/:limit? - Get top anime with clean data
router.get('/clean/top/:limit?', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.params.limit ? parseInt(req.params.limit) : 50;
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit. Must be between 1 and 100.'
      });
      return;
    }
    
    const topAnime = await animeService.getTopCleanAnime(limit);
    
    res.json({
      success: true,
      data: {
        total_results: topAnime.length,
        limit: limit,
        category: 'top_anime_clean',
        results: topAnime
      },
      note: "This endpoint returns cleaned, LLM-optimized anime data with essential fields only."
    });
    
  } catch (error) {
    console.error('Get top clean anime error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Review Intelligence Endpoints

// GET /api/anime/reception/:id - Get anime reception analysis
router.get('/reception/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = animeIdSchema.parse(req.params);

    const reception = await reviewAnalyzer.analyzeAnimeReception(id);

    res.json({
      success: true,
      data: {
        anime_id: id,
        reception_analysis: reception,
        insights: {
          overall_sentiment: reception.sentiment_ratio > 2 ? "Mostly Positive" :
                           reception.sentiment_ratio > 0.5 ? "Mixed to Positive" :
                           reception.sentiment_ratio > 0.2 ? "Mixed" : "Mostly Negative",
          polarization_level: reception.score_variance > 6 ? "Highly Polarizing" :
                             reception.score_variance > 3 ? "Moderately Polarizing" : "Generally Agreed Upon",
          review_engagement: reception.avg_review_length > 2000 ? "High Engagement" :
                            reception.avg_review_length > 1000 ? "Moderate Engagement" : "Low Engagement"
        },
        metadata: {
          data_source: "local_review_database",
          last_analyzed: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid anime ID',
        details: error.errors
      });
      return;
    }

    if (error instanceof Error && error.message.includes('No reviews found')) {
      res.status(404).json({
        success: false,
        error: 'No review data available for this anime',
        anime_id: req.params.id
      });
      return;
    }

    console.error('Get reception error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/sentiment/search - Search anime by sentiment patterns
router.get('/sentiment/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = sentimentPatternSchema.parse(req.query);

    // Import db here to avoid circular imports
    const { db } = await import('../../database/connection');

    const { sentiment_pattern, min_reviews, limit } = validatedParams;

    let whereCondition = '';
    let orderBy = '';

    switch (sentiment_pattern) {
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

    const result = await db.query(query, [min_reviews, limit]);

    const anime = result.rows.map(row => {
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
          overall_sentiment: receptionData.sentiment_ratio > 2 ? "Mostly Positive" :
                           receptionData.sentiment_ratio > 0.5 ? "Mixed to Positive" :
                           receptionData.sentiment_ratio > 0.2 ? "Mixed" : "Mostly Negative"
        },
        url: `https://myanimelist.net/anime/${row.mal_id}`
      };
    });

    res.json({
      success: true,
      data: {
        search_pattern: sentiment_pattern,
        criteria: {
          min_reviews,
          pattern_description: getPatternDescription(sentiment_pattern)
        },
        results_found: anime.length,
        results: anime
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    console.error('Search by sentiment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/insights - Get review insights
router.get('/insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = insightTypeSchema.parse(req.query);
    const { insight_type } = validatedParams;

    // Import db here to avoid circular imports
    const { db } = await import('../../database/connection');

    let insights: any = {};

    switch (insight_type) {
      case 'sentiment_distribution':
        const sentimentQuery = `
          SELECT
            COUNT(*) FILTER (WHERE (reception_data->>'sentiment_ratio')::float > 2.0) as mostly_positive,
            COUNT(*) FILTER (WHERE (reception_data->>'sentiment_ratio')::float BETWEEN 0.7 AND 2.0) as mixed,
            COUNT(*) FILTER (WHERE (reception_data->>'sentiment_ratio')::float < 0.7) as mostly_negative,
            COUNT(*) as total_analyzed
          FROM anime
          WHERE reception_data IS NOT NULL
        `;
        const sentimentResult = await db.query(sentimentQuery);
        insights = {
          type: "sentiment_distribution",
          data: sentimentResult.rows[0],
          percentages: {
            mostly_positive: (sentimentResult.rows[0].mostly_positive / sentimentResult.rows[0].total_analyzed * 100).toFixed(1),
            mixed: (sentimentResult.rows[0].mixed / sentimentResult.rows[0].total_analyzed * 100).toFixed(1),
            mostly_negative: (sentimentResult.rows[0].mostly_negative / sentimentResult.rows[0].total_analyzed * 100).toFixed(1)
          }
        };
        break;

      case 'polarization_trends':
        const polarizationQuery = `
          SELECT
            COUNT(*) FILTER (WHERE (reception_data->>'score_variance')::float > 6.0) as highly_polarizing,
            COUNT(*) FILTER (WHERE (reception_data->>'score_variance')::float BETWEEN 3.0 AND 6.0) as moderately_polarizing,
            COUNT(*) FILTER (WHERE (reception_data->>'score_variance')::float < 3.0) as consensus,
            AVG((reception_data->>'score_variance')::float) as avg_polarization
          FROM anime
          WHERE reception_data IS NOT NULL
        `;
        const polarizationResult = await db.query(polarizationQuery);
        insights = {
          type: "polarization_trends",
          data: polarizationResult.rows[0]
        };
        break;

      case 'review_engagement':
        const engagementQuery = `
          SELECT
            AVG((reception_data->>'review_count')::int) as avg_reviews_per_anime,
            AVG((reception_data->>'avg_review_length')::float) as avg_review_length,
            COUNT(*) FILTER (WHERE (reception_data->>'review_count')::int > 50) as highly_reviewed,
            COUNT(*) FILTER (WHERE (reception_data->>'avg_review_length')::float > 2000) as detailed_reviews
          FROM anime
          WHERE reception_data IS NOT NULL
        `;
        const engagementResult = await db.query(engagementQuery);
        insights = {
          type: "review_engagement",
          data: engagementResult.rows[0]
        };
        break;

      case 'database_overview':
        const overviewQuery = `
          SELECT
            COUNT(*) as total_anime,
            COUNT(*) FILTER (WHERE reception_data IS NOT NULL) as analyzed_anime,
            (SELECT COUNT(*) FROM anime_reviews) as total_reviews,
            (SELECT COUNT(DISTINCT anime_id) FROM anime_reviews) as anime_with_reviews
        `;
        const overviewResult = await db.query(overviewQuery);
        insights = {
          type: "database_overview",
          data: overviewResult.rows[0],
          coverage: {
            analysis_coverage: (overviewResult.rows[0].analyzed_anime / overviewResult.rows[0].total_anime * 100).toFixed(1),
            review_coverage: (overviewResult.rows[0].anime_with_reviews / overviewResult.rows[0].total_anime * 100).toFixed(1)
          }
        };
        break;
    }

    res.json({
      success: true,
      data: {
        insight_type,
        insights,
        metadata: {
          generated_at: new Date().toISOString(),
          data_source: "local_review_database"
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/compare-reception - Compare reception between two anime
router.get('/compare-reception', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = compareReceptionSchema.parse(req.query);
    const { anime_id_1, anime_id_2 } = validatedParams;

    // Import db here to avoid circular imports
    const { db } = await import('../../database/connection');

    const animeQuery = `
      SELECT mal_id, title, score, reception_data
      FROM anime
      WHERE mal_id IN ($1, $2) AND reception_data IS NOT NULL
    `;

    const result = await db.query(animeQuery, [anime_id_1, anime_id_2]);

    if (result.rows.length < 2) {
      const foundIds = result.rows.map(r => r.mal_id);
      const missingIds = [anime_id_1, anime_id_2].filter(id => !foundIds.includes(id));

      res.status(404).json({
        success: false,
        error: "Could not find reception data for both anime",
        found_anime: result.rows.length,
        missing_anime_ids: missingIds
      });
      return;
    }

    const anime1 = result.rows.find(r => r.mal_id === anime_id_1);
    const anime2 = result.rows.find(r => r.mal_id === anime_id_2);

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

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    console.error('Compare reception error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Bulk endpoints for MCP tools

// GET /api/anime/bulk - Get multiple anime by MAL IDs
router.get('/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = bulkAnimeSchema.parse(req.query);
    const { ids, compact } = validatedParams;

    const results = await animeService.getBulkAnimeByIds(ids, compact);

    // Separate found and missing IDs
    const foundIds = results.map((anime: any) => anime.mal_id || anime.id);
    const missingIds = ids.filter(id => !foundIds.includes(id));

    res.json({
      success: true,
      data: {
        total_requested: ids.length,
        total_found: results.length,
        total_missing: missingIds.length,
        missing_ids: missingIds.length > 0 ? missingIds : undefined,
        results
      },
      note: compact
        ? "Bulk anime data in ultra-compact format for MCP tools"
        : "Bulk anime data in clean format for LLM consumption"
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
      return;
    }

    console.error('Bulk anime error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Compact endpoints for MCP tools with minimal data transfer

// GET /api/anime/compact/search - Ultra-compact search results
router.get('/compact/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedParams = searchParamsSchema.parse(req.query);

    const searchParams: SearchParams = {
      query: validatedParams.query,
      genres: validatedParams.genres,
      min_score: validatedParams.min_score,
      max_score: validatedParams.max_score,
      year: validatedParams.year,
      min_year: validatedParams.min_year,
      max_year: validatedParams.max_year,
      decade: validatedParams.decade,
      min_popularity: validatedParams.min_popularity,
      max_popularity: validatedParams.max_popularity,
      exclude_very_popular: validatedParams.exclude_very_popular,
      airing_status: validatedParams.airing_status,
      current_year_only: validatedParams.current_year_only,
      season: validatedParams.season,
      min_episodes: validatedParams.min_episodes,
      max_episodes: validatedParams.max_episodes,
      type: validatedParams.type,
      order_by: validatedParams.order_by,
      sort: validatedParams.sort,
      sfw: validatedParams.sfw,
      page: validatedParams.page,
      limit: Math.min(validatedParams.limit, 15) // Force small limit for compact results
    };

    const results = await animeService.getCompactSearch(searchParams);

    res.json({
      success: true,
      total_results: results.length,
      data: results,
      note: "Ultra-compact results optimized for MCP tools with minimal token usage"
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    console.error('Compact search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/compact/seasonal - Current season anime (compact)
router.get('/compact/seasonal', async (req: Request, res: Response): Promise<void> => {
  try {
    const { year, season, limit } = req.query;

    const yearNum = year ? parseInt(year as string) : undefined;
    const limitNum = Math.min(parseInt((limit as string) || '20'), 25);

    const results = await animeService.getSeasonalRecommendations(
      yearNum,
      season as string,
      limitNum
    );

    res.json({
      success: true,
      data: results,
      note: "Seasonal anime recommendations with compact format"
    });

  } catch (error) {
    console.error('Compact seasonal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/compact/current - Currently airing anime (compact)
router.get('/compact/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const limitNum = Math.min(parseInt((limit as string) || '20'), 25);

    const results = await animeService.getCurrentSeasonAnime(limitNum);

    res.json({
      success: true,
      total_results: results.length,
      data: results,
      note: "Currently airing anime in compact format"
    });

  } catch (error) {
    console.error('Compact current error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function for pattern descriptions
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

// Validation schema for reviews endpoint
const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(25).optional().default(10),
  preliminary: z.coerce.boolean().optional(),
  spoilers: z.coerce.boolean().optional(),
  sort: z.enum(['date', 'helpful', 'score']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

// GET /api/anime/reviews/:id - Get reviews for an anime
router.get('/reviews/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = animeIdSchema.parse(req.params);
    const queryParams = reviewsQuerySchema.parse(req.query);

    // Import db here to avoid circular imports
    const { db } = await import('../../database/connection');

    const { page, limit, preliminary, spoilers, sort, order } = queryParams;
    const offset = (page - 1) * limit;

    // Build the WHERE clause dynamically
    let whereConditions = ['r.anime_id = $1'];
    const queryValues: any[] = [id];
    let paramIndex = 2;

    if (preliminary !== undefined) {
      whereConditions.push(`r.is_preliminary = $${paramIndex}`);
      queryValues.push(preliminary);
      paramIndex++;
    }

    // Note: is_spoiler column doesn't exist in current schema, skipping spoiler filter

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

    // Main query to get reviews
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

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM anime_reviews r
      WHERE ${whereConditions.join(' AND ')}
    `;

    const [reviewsResult, countResult] = await Promise.all([
      db.query(reviewsQuery, queryValues),
      db.query(countQuery, queryValues.slice(0, queryValues.length - 2)) // Remove limit and offset for count
    ]);

    const reviews = reviewsResult.rows;
    const totalReviews = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalReviews / limit);

    if (reviews.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No reviews found for this anime',
        anime_id: id
      });
      return;
    }

    // Get anime title from first review
    const animeTitle = reviews[0].anime_title;

    res.json({
      success: true,
      data: {
        anime_id: id,
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
        },
        filters_applied: {
          preliminary: preliminary,
          spoilers: spoilers,
          sort_by: sort,
          sort_order: order
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
      return;
    }

    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/reviews/:id/summary - Get reviews summary for MCP efficiency
router.get('/reviews/:id/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = animeIdSchema.parse(req.params);

    // Import db here to avoid circular imports
    const { db } = await import('../../database/connection');

    // Get anime title first
    const titleQuery = `SELECT title FROM anime WHERE mal_id = $1`;
    const titleResult = await db.query(titleQuery, [id]);

    if (titleResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Anime not found',
        anime_id: id
      });
      return;
    }

    const animeTitle = titleResult.rows[0].title;

    // Get summary statistics
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

    // Get top 3 most helpful reviews (summary only)
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
      LIMIT 3
    `;

    const [summaryResult, topReviewsResult] = await Promise.all([
      db.query(summaryQuery, [id]),
      db.query(topReviewsQuery, [id])
    ]);

    if (summaryResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No reviews found for this anime',
        anime_id: id
      });
      return;
    }

    const summary = summaryResult.rows[0];
    const topReviews = topReviewsResult.rows;

    // Calculate percentages
    const totalReviews = parseInt(summary.total_reviews);
    const positivePercent = totalReviews > 0 ? (summary.positive_count / totalReviews * 100).toFixed(1) : '0';
    const negativePercent = totalReviews > 0 ? (summary.negative_count / totalReviews * 100).toFixed(1) : '0';
    const neutralPercent = totalReviews > 0 ? (summary.neutral_count / totalReviews * 100).toFixed(1) : '0';

    res.json({
      success: true,
      data: {
        anime_id: id,
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
        })),
        next_steps: {
          get_detailed_reviews: `Use /api/anime/reviews/${id} to get full review text and details`,
          filter_options: "Add parameters: ?preliminary=false&spoilers=false&sort=helpful&limit=5",
          note: "This summary gives you an overview without flooding the context. Use the detailed endpoint when you need actual review content."
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid anime ID',
        details: error.errors
      });
      return;
    }

    console.error('Get reviews summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/reviews/:id/sample - Get balanced sample of reviews for recommendation analysis
router.get('/reviews/:id/sample', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = animeIdSchema.parse(req.params);
    const limitParam = parseInt(req.query.limit as string) || 10;
    const limit = Math.min(limitParam, 15); // Cap at 15 for context safety

    // Import db here to avoid circular imports
    const { db } = await import('../../database/connection');

    // Get anime title first
    const titleQuery = `SELECT title FROM anime WHERE mal_id = $1`;
    const titleResult = await db.query(titleQuery, [id]);

    if (titleResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Anime not found',
        anime_id: id
      });
      return;
    }

    const animeTitle = titleResult.rows[0].title;

    // Get balanced sample - take top reviews from each sentiment category
    const reviewsPerSentiment = Math.ceil(limit / 3);

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
      LIMIT $4
    `;

    const result = await db.query(sampleQuery, [id, reviewsPerSentiment, reviewsPerSentiment, reviewsPerSentiment, limit]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No reviews found for this anime',
        anime_id: id
      });
      return;
    }

    const reviews = result.rows;

    // Count by sentiment for context
    const sentimentCounts = {
      positive: reviews.filter(r => r.sentiment_label === 'positive').length,
      negative: reviews.filter(r => r.sentiment_label === 'negative').length,
      neutral: reviews.filter(r => r.sentiment_label === 'neutral').length
    };

    res.json({
      success: true,
      data: {
        anime_id: id,
        anime_title: animeTitle,
        sample_info: {
          total_sampled: reviews.length,
          sentiment_distribution: sentimentCounts,
          sampling_strategy: "Balanced mix of positive/negative/neutral reviews, prioritized by helpfulness"
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
        })),
        usage_note: "This provides a balanced sample for recommendation analysis without overwhelming context. Contains full review text."
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid anime ID',
        details: error.errors
      });
      return;
    }

    console.error('Get sample reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/anime/:id - Get anime by MAL ID (must be last to avoid catching other routes)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = animeIdSchema.parse(req.params);
    
    const anime = await animeService.getAnimeById(id);
    
    if (!anime) {
      res.status(404).json({
        success: false,
        error: 'Anime not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: anime
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid anime ID',
        details: error.errors
      });
      return;
    }
    
    console.error('Get anime error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 