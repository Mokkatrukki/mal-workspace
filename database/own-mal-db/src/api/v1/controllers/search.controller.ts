/**
 * Search Controller (v1)
 * Business logic for search and discovery endpoints
 */

import { Request, Response } from 'express';
import { animeService } from '../../../services/animeService';
import { ApiResponse } from '../../types/api';

export class SearchController {
  /**
   * GET /api/v1/search/capabilities - Get search capabilities
   */
  async getCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const capabilities = await animeService.getSearchCapabilities();

      const response: ApiResponse<any> = {
        success: true,
        data: capabilities,
        meta: {
          format: req.responseFormat,
          note: 'Comprehensive information about available search filters and capabilities'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get capabilities error:', error);
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
   * GET /api/v1/search/seasonal - Get seasonal anime
   */
  async getSeasonalAnime(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const season = req.query.season as string;
      const limit = Math.min(parseInt((req.query.limit as string) || '20'), 25);

      const results = await animeService.getSeasonalRecommendations(year, season, limit);

      const response: ApiResponse<any> = {
        success: true,
        data: results,
        meta: {
          format: req.responseFormat,
          note: 'Seasonal anime recommendations'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get seasonal anime error:', error);
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
   * GET /api/v1/search/current - Get currently airing anime
   */
  async getCurrentAnime(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '20'), 25);

      const results = await animeService.getCurrentSeasonAnime(limit);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          total_results: results.length,
          results
        },
        meta: {
          format: req.responseFormat,
          note: 'Currently airing anime'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get current anime error:', error);
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

export const searchController = new SearchController();