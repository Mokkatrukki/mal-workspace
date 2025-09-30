/**
 * Stats Controller (v1)
 * Business logic for statistics and genre endpoints
 */

import { Request, Response } from 'express';
import { animeService } from '../../../services/animeService';
import { ApiResponse } from '../../types/api';

export class StatsController {
  /**
   * GET /api/v1/genres - Get all genres
   */
  async getAllGenres(req: Request, res: Response): Promise<void> {
    try {
      const genres = await animeService.getAllGenres();

      const response: ApiResponse<any> = {
        success: true,
        data: {
          total_genres: genres.length,
          genres: genres.map(genre => ({
            id: genre.id,
            name: genre.name,
            count: genre.count || 0,
            url: genre.url
          }))
        },
        meta: {
          format: req.responseFormat,
          note: "Use genre IDs in search endpoint's 'genres' parameter. Example: genres=1 for Action"
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get genres error:', error);
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
   * GET /api/v1/genres/stats - Get genre statistics
   */
  async getGenreStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await animeService.getAnimeCountByGenre();

      const response: ApiResponse<any> = {
        success: true,
        data: {
          total_genres: stats.length,
          statistics: stats
        },
        meta: {
          format: req.responseFormat
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get genre stats error:', error);
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

export const statsController = new StatsController();