/**
 * Anime Controller (v1)
 * Business logic for anime endpoints
 */

import { Request, Response } from 'express';
import { animeService } from '../../../services/animeService';
import { SearchParams } from '../../../types/anime';
import { ApiResponse } from '../../types/api';

export class AnimeController {
  /**
   * GET /api/v1/anime/:id - Get anime by ID
   */
  async getAnimeById(req: Request, res: Response): Promise<void> {
    try {
      const malId = parseInt(req.params.id);

      if (isNaN(malId)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid anime ID',
            code: 'INVALID_ID'
          }
        });
        return;
      }

      const anime = await animeService.getAnimeById(malId);

      if (!anime) {
        res.status(404).json({
          success: false,
          error: {
            message: 'Anime not found',
            code: 'NOT_FOUND'
          }
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        data: anime,
        meta: {
          format: req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get anime error:', error);
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
   * GET /api/v1/anime - Search anime
   */
  async searchAnime(req: Request, res: Response): Promise<void> {
    try {
      const searchParams: SearchParams = {
        query: req.query.query as string,
        genres: req.query.genres as string,
        min_score: req.query.min_score ? parseFloat(req.query.min_score as string) : undefined,
        max_score: req.query.max_score ? parseFloat(req.query.max_score as string) : undefined,
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        min_year: req.query.min_year ? parseInt(req.query.min_year as string) : undefined,
        max_year: req.query.max_year ? parseInt(req.query.max_year as string) : undefined,
        decade: req.query.decade as string,
        min_popularity: req.query.min_popularity ? parseInt(req.query.min_popularity as string) : undefined,
        max_popularity: req.query.max_popularity ? parseInt(req.query.max_popularity as string) : undefined,
        exclude_very_popular: req.query.exclude_very_popular === 'true',
        airing_status: req.query.airing_status as any,
        current_year_only: req.query.current_year_only === 'true',
        season: req.query.season as any,
        min_episodes: req.query.min_episodes ? parseInt(req.query.min_episodes as string) : undefined,
        max_episodes: req.query.max_episodes ? parseInt(req.query.max_episodes as string) : undefined,
        type: req.query.type as any,
        order_by: (req.query.order_by as any) || 'mal_id',
        sort: (req.query.sort as any) || 'desc',
        sfw: req.query.sfw !== 'false',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 25
      };

      const results = await animeService.searchAnime(searchParams);

      const response: ApiResponse<any> = {
        success: true,
        data: results,
        meta: {
          format: req.responseFormat,
          page: searchParams.page,
          limit: searchParams.limit,
          total: results.total_results
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Search anime error:', error);
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
   * GET /api/v1/anime/top - Get top anime
   */
  async getTopAnime(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid limit. Must be between 1 and 100.',
            code: 'INVALID_LIMIT'
          }
        });
        return;
      }

      const topAnime = await animeService.getTopAnime(limit);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          total_results: topAnime.length,
          limit: limit,
          category: 'top_anime',
          results: topAnime
        },
        meta: {
          format: req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get top anime error:', error);
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
   * GET /api/v1/anime/bulk - Get multiple anime by IDs
   */
  async getBulkAnime(req: Request, res: Response): Promise<void> {
    try {
      const idsParam = req.query.ids as string;
      const compact = req.query.compact === 'true';

      if (!idsParam) {
        res.status(400).json({
          success: false,
          error: {
            message: 'IDs parameter is required',
            code: 'MISSING_IDS'
          }
        });
        return;
      }

      const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);

      if (ids.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'No valid anime IDs provided',
            code: 'INVALID_IDS'
          }
        });
        return;
      }

      if (ids.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Too many IDs. Maximum 100 IDs allowed per request',
            code: 'TOO_MANY_IDS'
          }
        });
        return;
      }

      const results = await animeService.getBulkAnimeByIds(ids, compact);
      const foundIds = results.map((anime: any) => anime.mal_id || anime.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));

      const response: ApiResponse<any> = {
        success: true,
        data: {
          total_requested: ids.length,
          total_found: results.length,
          total_missing: missingIds.length,
          missing_ids: missingIds.length > 0 ? missingIds : undefined,
          results
        },
        meta: {
          format: compact ? 'compact' : req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Bulk anime error:', error);
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

export const animeController = new AnimeController();